// bcrypt (cost 12) over a SHA-256 pre-hash, so long passwords are not silently truncated at 72 bytes.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pre = (p) => crypto.createHash('sha256').update(p).digest('base64');
const COMMON = new Set(['password', 'password1', 'password123', '1234567890', 'qwertyuiop', 'iloveyou12', 'letmein123', 'admin12345', 'welcome123', '0123456789']);

module.exports = {
  hash: (p) => bcrypt.hash(pre(p), 12),
  DUMMY: bcrypt.hashSync(pre('timing-equaliser'), 12), // compared when the email is unknown, so timing does not reveal accounts
  async verify(p, hash) { // also accepts hashes made by earlier versions (raw bcrypt) and flags them for upgrade
    if (await bcrypt.compare(pre(p), hash)) return { ok: true, legacy: false };
    if (await bcrypt.compare(p, hash)) return { ok: true, legacy: true };
    return { ok: false };
  },
  problem(p, email) {
    const local = email.split('@')[0].toLowerCase();
    if (p.length < 10) return 'Password must be at least 10 characters';
    if (p.length > 128) return 'Password is too long (max 128)';
    if (COMMON.has(p.toLowerCase()) || (local.length > 3 && p.toLowerCase().includes(local))) return 'Password is too easy to guess';
    return null;
  },
};
