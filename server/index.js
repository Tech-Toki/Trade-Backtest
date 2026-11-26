require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const market = require('./services/market');
const { csrfGuard } = require('./middleware/auth');

const PROD = process.env.NODE_ENV === 'production';
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY); // set when behind nginx / a host's proxy
if (PROD) app.use((req, res, next) => (req.secure ? next() : res.redirect(301, 'https://' + req.headers.host + req.url)));

app.use(helmet({
  contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"], connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'none'"], formAction: ["'self'"], frameAncestors: ["'none'"] } },
  hsts: PROD ? { maxAge: 15552000, includeSubDomains: true } : false,
  crossOriginEmbedderPolicy: false,
}));
app.use((req, res, next) => { res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); next(); });

app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api', rateLimit({ windowMs: 15 * 60e3, limit: 1500, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.json({ limit: '50kb' }));
app.use('/api', csrfGuard);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/candles', require('./routes/candles'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'ignore', maxAge: PROD ? '1h' : 0 }));
app.use((err, req, res, next) => { console.error(err.message); res.status(err.status || 500).json({ error: err.status === 400 ? 'Bad request' : 'Server error' }); });

const port = process.env.PORT || 3000;
console.log('Loading market data...');
market.init().then(() => app.listen(port, () => console.log(`Backtest Pro running at http://localhost:${port}`)));
