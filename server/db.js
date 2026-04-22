import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir);

const db = new DatabaseSync(join(dataDir, 'expenses.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS transactions (
    id           TEXT PRIMARY KEY,
    type         TEXT NOT NULL,
    amount       REAL NOT NULL,
    date         TEXT NOT NULL,
    category     TEXT NOT NULL,
    sub_category TEXT DEFAULT '',
    notes        TEXT DEFAULT '',
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

function rowToTx(row) {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    date: row.date,
    category: row.category,
    subCategory: row.sub_category,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function getAllTransactions() {
  return db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all().map(rowToTx);
}

export function createTransaction(tx) {
  db.prepare(`
    INSERT INTO transactions (id, type, amount, date, category, sub_category, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tx.id, tx.type, tx.amount, tx.date, tx.category, tx.subCategory ?? '', tx.notes ?? '', tx.createdAt);
  return tx;
}

export function updateTransaction(id, u) {
  db.prepare(`
    UPDATE transactions SET amount=?, date=?, category=?, sub_category=?, notes=? WHERE id=?
  `).run(u.amount, u.date, u.category, u.subCategory ?? '', u.notes ?? '', id);
}

export function deleteTransaction(id) {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

export function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : fallback;
}

export function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}
