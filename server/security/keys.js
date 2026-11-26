// Secrets: taken from the environment, otherwise generated once and kept in data/ (mode 600, git-ignored).
// In production (NODE_ENV=production) they MUST come from the environment.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DIR = path.join(__dirname, '..', '..', 'data');

function secret(envName, file, bytes) {
  if (process.env[envName]) return process.env[envName];
  if (process.env.NODE_ENV === 'production') throw new Error(`${envName} must be set in production`);
  const f = path.join(DIR, file);
  try { return fs.readFileSync(f, 'utf8').trim(); } catch {}
  fs.mkdirSync(DIR, { recursive: true });
  const v = crypto.randomBytes(bytes).toString('hex');
  fs.writeFileSync(f, v, { mode: 0o600 });
  return v;
}
module.exports = {
  jwtSecret: () => secret('JWT_SECRET', '.jwt-secret', 48),
  dataKey: () => crypto.createHash('sha256').update(secret('DATA_KEY', '.data-key', 32)).digest(), // 32-byte AES key
};
