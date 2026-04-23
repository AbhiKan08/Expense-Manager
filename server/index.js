import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  init, getAllTransactions, createTransaction, updateTransaction,
  deleteTransaction, getSetting, setSetting,
} from './db.js';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';
import { setupAuthRoutes, requireAuth } from './auth.js';
import { setupImportRoute } from './import.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'dist')));

// ── Public: auth + config ──────────────────────────────────────────────────
setupAuthRoutes(app);

// ── Protected API (all routes below require a valid JWT) ───────────────────
app.use('/api', requireAuth);

// Transactions
app.get('/api/transactions', async (req, res) => {
  res.json(await getAllTransactions(req.user.userId));
});

app.post('/api/transactions', async (req, res) => {
  const tx = await createTransaction(req.body, req.user.userId);
  res.status(201).json(tx);
});

app.put('/api/transactions/:id', async (req, res) => {
  await updateTransaction(req.params.id, req.body, req.user.userId);
  res.json({ ok: true });
});

app.delete('/api/transactions/:id', async (req, res) => {
  await deleteTransaction(req.params.id, req.user.userId);
  res.json({ ok: true });
});

// Settings
app.get('/api/settings', async (req, res) => {
  res.json({
    categories:    await getSetting(req.user.userId, 'categories',    DEFAULT_CATEGORIES),
    subcategories: await getSetting(req.user.userId, 'subcategories', DEFAULT_SUBCATEGORIES),
  });
});

app.put('/api/settings', async (req, res) => {
  const { categories, subcategories } = req.body;
  if (categories)    await setSetting(req.user.userId, 'categories',    categories);
  if (subcategories) await setSetting(req.user.userId, 'subcategories', subcategories);
  res.json({ ok: true });
});

// Import (Claude AI)
setupImportRoute(app);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

init().then(() => {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
});
