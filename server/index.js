import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getAllTransactions, createTransaction, updateTransaction,
  deleteTransaction, getSetting, setSetting,
} from './db.js';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve built frontend in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// --- Transactions ---
app.get('/api/transactions', (req, res) => {
  res.json(getAllTransactions());
});

app.post('/api/transactions', (req, res) => {
  const tx = req.body;
  createTransaction(tx);
  res.status(201).json(tx);
});

app.put('/api/transactions/:id', (req, res) => {
  updateTransaction(req.params.id, req.body);
  res.json({ ok: true });
});

app.delete('/api/transactions/:id', (req, res) => {
  deleteTransaction(req.params.id);
  res.json({ ok: true });
});

// --- Settings ---
app.get('/api/settings', (req, res) => {
  res.json({
    categories:    getSetting('categories',    DEFAULT_CATEGORIES),
    subcategories: getSetting('subcategories', DEFAULT_SUBCATEGORIES),
  });
});

app.put('/api/settings', (req, res) => {
  const { categories, subcategories } = req.body;
  if (categories)    setSetting('categories',    categories);
  if (subcategories) setSetting('subcategories', subcategories);
  res.json({ ok: true });
});

// SPA fallback (production)
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
