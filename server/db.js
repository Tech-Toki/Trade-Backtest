// JSON-file store, ENCRYPTED AT REST (AES-256-GCM) and written atomically.
// A wrong/missing key aborts start-up instead of silently creating an empty database.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dataKey } = require('./security/keys');

const FILE = path.join(__dirname, '..', 'data', 'db.json'), MAGIC = Buffer.from('BTE1'), KEY = dataKey();
const db = { users: [], profiles: [], trades: [] };

function load() {
  if (!fs.existsSync(FILE)) return;
  const buf = fs.readFileSync(FILE);
  if (buf.subarray(0, 4).equals(MAGIC)) {
    try {
      const d = crypto.createDecipheriv('aes-256-gcm', KEY, buf.subarray(4, 16));
      d.setAuthTag(buf.subarray(16, 32));
      Object.assign(db, JSON.parse(Buffer.concat([d.update(buf.subarray(32)), d.final()]).toString('utf8')));
    } catch { throw new Error('Cannot decrypt data/db.json. Is DATA_KEY (or data/.data-key) the one it was created with?'); }
  } else Object.assign(db, JSON.parse(buf.toString('utf8'))); // old unencrypted file: upgraded on next save
}
load();

const save = () => {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(db), 'utf8'), c.final()]);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, Buffer.concat([MAGIC, iv, c.getAuthTag(), enc]), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
};
if (fs.existsSync(FILE) && !fs.readFileSync(FILE).subarray(0, 4).equals(MAGIC)) save(); // upgrade a plaintext file now
module.exports = { db, save };
