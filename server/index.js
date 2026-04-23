import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  init, getAllTransactions, createTransaction, updateTransaction,
  deleteTransaction, getSetting, setSetting,
} from './db.js';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';
import { setupImportRoute } from './import.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// --- Transactions ---
app.get('/api/transactions', async (req, res) => {
  res.json(await getAllTransactions());
});

app.post('/api/transactions', async (req, res) => {
  const tx = await createTransaction(req.body);
  res.status(201).json(tx);
});

app.put('/api/transactions/:id', async (req, res) => {
  await updateTransaction(req.params.id, req.body);
  res.json({ ok: true });
});

app.delete('/api/transactions/:id', async (req, res) => {
  await deleteTransaction(req.params.id);
  res.json({ ok: true });
});

// --- Settings ---
app.get('/api/settings', async (req, res) => {
  res.json({
    categories:    await getSetting('categories',    DEFAULT_CATEGORIES),
    subcategories: await getSetting('subcategories', DEFAULT_SUBCATEGORIES),
  });
});

app.put('/api/settings', async (req, res) => {
  const { categories, subcategories } = req.body;
  if (categories)    await setSetting('categories',    categories);
  if (subcategories) await setSetting('subcategories', subcategories);
  res.json({ ok: true });
});

setupImportRoute(app);

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

init().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
