// Sessions live in an httpOnly, SameSite=Strict cookie (JavaScript cannot read it, so XSS cannot steal it).
// A per-user token version (`tv`) lets "change password" / "log out everywhere" invalidate every old session.
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../security/keys');
const { db } = require('../db');

const SECRET = jwtSecret(), COOKIE = 'tb_session', ISS = 'backtest-pro';
const opts = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' };
const readCookie = (req) => {
  const m = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
};

exports.issue = (res, u) => res.cookie(COOKIE, jwt.sign({ sub: u.id, tv: u.tv || 0 }, SECRET, { expiresIn: '7d', issuer: ISS, algorithm: 'HS256' }), { ...opts, maxAge: 7 * 864e5 });
exports.clear = (res) => res.clearCookie(COOKIE, opts);
exports.requireAuth = (req, res, next) => {
  try {
    const p = jwt.verify(readCookie(req), SECRET, { issuer: ISS, algorithms: ['HS256'] });
    const u = db.users.find((x) => x.id === p.sub);
    if (!u || (u.tv || 0) !== p.tv) throw new Error('revoked');
    req.user = { id: u.id, email: u.email, name: u.name };
    next();
  } catch { res.status(401).json({ error: 'Not signed in' }); }
};
// CSRF defence in depth (on top of SameSite=Strict): state-changing requests need our header and a same-origin Origin.
exports.csrfGuard = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  let bad = req.headers['x-requested-with'] !== 'backtest';
  if (req.headers.origin) { try { bad = bad || new URL(req.headers.origin).host !== req.headers.host; } catch { bad = true; } }
  return bad ? res.status(403).json({ error: 'Blocked' }) : next();
};
