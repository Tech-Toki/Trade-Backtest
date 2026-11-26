# Security policy

## Reporting a vulnerability
Please **do not open a public issue** for security problems.
Use GitHub's private reporting: **Security → Report a vulnerability** on this repository.
Include steps to reproduce and the impact. You will get a reply as soon as possible.

## Scope
This is a personal/portfolio project. Hardening that is in place (hashed passwords, httpOnly cookies, CSRF checks,
rate limiting, strict CSP, encrypted database file) is described in the README. Not implemented: email verification,
password reset and two-factor login.

## For anyone deploying it
- Set `JWT_SECRET` and `DATA_KEY` (required when `NODE_ENV=production`) and keep them out of git.
- Serve over HTTPS and set `TRUST_PROXY=1` behind a proxy.
- Never commit `.env`, `data/db.json` or `data/.data-key`.
