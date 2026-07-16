const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Data storage ----------
// DATA_DIR should point at a Railway Volume so edits survive redeploys.
// If no volume is attached, data still works but resets on every deploy.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(__dirname, 'data', 'seed.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  }
}
function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
ensureDb();

// ---------- Auth ----------
// Set ADMIN_PASSWORD as an env var in Railway. It's hashed in memory at boot.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '27e30filhos';
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[AVISO] ADMIN_PASSWORD nao definida, usando senha padrao. Configure a variavel de ambiente no Railway!');
}
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json({ limit: '2mb' }));
app.use(cookieSession({
  name: 'wario_admin_session',
  secret: SESSION_SECRET,
  maxAge: 12 * 60 * 60 * 1000, // 12h
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  return res.status(401).json({ error: 'not_authenticated' });
}

// Basic rate limiting for login attempts
const loginAttempts = new Map();
function tooManyAttempts(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, ts: Date.now() };
  if (Date.now() - entry.ts > 15 * 60 * 1000) { entry.count = 0; entry.ts = Date.now(); }
  return entry.count >= 8;
}
function registerAttempt(ip, success) {
  const entry = loginAttempts.get(ip) || { count: 0, ts: Date.now() };
  if (success) { loginAttempts.delete(ip); return; }
  entry.count += 1;
  loginAttempts.set(ip, entry);
}

app.post('/api/admin/login', (req, res) => {
  const ip = req.ip;
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: 'too_many_attempts' });
  }
  const { password } = req.body || {};
  const ok = typeof password === 'string' && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  registerAttempt(ip, ok);
  if (!ok) return res.status(401).json({ error: 'invalid_password' });
  req.session.loggedIn = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/admin/session', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.loggedIn) });
});

// ---------- Public menu API ----------
// Only sends items that are not marked soldOut, mirrors the shape the front-end expects.
app.get('/api/menu', (req, res) => {
  const db = readDb();
  res.json({
    menuCategories: db.menuCategories,
    menuProducts: db.menuProducts.filter(p => !p.soldOut),
    promoProducts: db.promoProducts.filter(p => !p.soldOut)
  });
});

// ---------- Admin menu API (full data, including sold-out items) ----------
app.get('/api/admin/menu', requireAuth, (req, res) => {
  res.json(readDb());
});

function validateProduct(body) {
  if (!body || typeof body !== 'object') return 'invalid_body';
  if (!body.name || typeof body.name !== 'string') return 'name_required';
  if (!body.category || typeof body.category !== 'string') return 'category_required';
  if (!Array.isArray(body.variants) || body.variants.length === 0) return 'variants_required';
  for (const v of body.variants) {
    if (!v.label || typeof v.label !== 'string') return 'variant_label_required';
    if (typeof v.price !== 'number' || isNaN(v.price) || v.price < 0) return 'variant_price_invalid';
  }
  return null;
}

function slugify(str) {
  return String(str).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function collectionFor(kind, db) {
  return kind === 'promo' ? db.promoProducts : db.menuProducts;
}

app.param('kind', (req, res, next, kind) => {
  if (kind !== 'product' && kind !== 'promo') return res.status(404).json({ error: 'invalid_kind' });
  next();
});

// Create
app.post('/api/admin/menu/:kind', requireAuth, (req, res) => {
  const err = validateProduct(req.body);
  if (err) return res.status(400).json({ error: err });
  const db = readDb();
  const list = collectionFor(req.params.kind, db);
  let id = slugify(req.body.id || req.body.name);
  if (!id) id = 'item-' + Date.now();
  let uniqueId = id, n = 2;
  while (list.some(p => p.id === uniqueId)) { uniqueId = `${id}-${n}`; n++; }
  const product = {
    id: uniqueId,
    name: req.body.name,
    label: req.body.label || '',
    category: req.body.category,
    badge: req.body.badge || '',
    desc: req.body.desc || '',
    composition: req.body.composition || '',
    details: Array.isArray(req.body.details) ? req.body.details : [],
    variants: req.body.variants.map(v => ({ id: slugify(v.id || v.label), label: v.label, price: Number(v.price) })),
    meta: Array.isArray(req.body.meta) ? req.body.meta : [],
    image: req.body.image || 'logo_wariobranca - Editado.png',
    soldOut: !!req.body.soldOut
  };
  list.push(product);
  writeDb(db);
  res.json({ ok: true, product });
});

// Update
app.put('/api/admin/menu/:kind/:id', requireAuth, (req, res) => {
  const err = validateProduct(req.body);
  if (err) return res.status(400).json({ error: err });
  const db = readDb();
  const list = collectionFor(req.params.kind, db);
  const idx = list.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  const existing = list[idx];
  list[idx] = {
    ...existing,
    name: req.body.name,
    label: req.body.label || '',
    category: req.body.category,
    badge: req.body.badge || '',
    desc: req.body.desc || '',
    composition: req.body.composition || '',
    details: Array.isArray(req.body.details) ? req.body.details : [],
    variants: req.body.variants.map(v => ({ id: slugify(v.id || v.label), label: v.label, price: Number(v.price) })),
    meta: Array.isArray(req.body.meta) ? req.body.meta : [],
    image: req.body.image || existing.image,
    soldOut: !!req.body.soldOut
  };
  writeDb(db);
  res.json({ ok: true, product: list[idx] });
});

// Toggle sold-out only (quick action)
app.patch('/api/admin/menu/:kind/:id/soldout', requireAuth, (req, res) => {
  const db = readDb();
  const list = collectionFor(req.params.kind, db);
  const item = list.find(p => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not_found' });
  item.soldOut = !!req.body.soldOut;
  writeDb(db);
  res.json({ ok: true, product: item });
});

// Delete
app.delete('/api/admin/menu/:kind/:id', requireAuth, (req, res) => {
  const db = readDb();
  const list = collectionFor(req.params.kind, db);
  const idx = list.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  list.splice(idx, 1);
  writeDb(db);
  res.json({ ok: true });
});

// Reorder categories list is intentionally not exposed yet (kept static) to limit scope.
app.get('/api/admin/categories', requireAuth, (req, res) => {
  const db = readDb();
  res.json(db.menuCategories);
});

// ---------- Static files ----------
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wario_sushi_v2_16.html'));
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`WA RIO Sushi rodando na porta ${PORT}`);
});
