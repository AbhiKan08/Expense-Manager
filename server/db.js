import pg from 'pg';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL,
      amount       NUMERIC NOT NULL,
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
}

function rowToTx(row) {
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    date: row.date,
    category: row.category,
    subCategory: row.sub_category,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getAllTransactions() {
  const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
  return rows.map(rowToTx);
}

export async function createTransaction(tx) {
  await pool.query(
    `INSERT INTO transactions (id, type, amount, date, category, sub_category, notes, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [tx.id, tx.type, tx.amount, tx.date, tx.category, tx.subCategory ?? '', tx.notes ?? '', tx.createdAt]
  );
  return tx;
}

export async function updateTransaction(id, u) {
  await pool.query(
    `UPDATE transactions SET amount=$1, date=$2, category=$3, sub_category=$4, notes=$5 WHERE id=$6`,
    [u.amount, u.date, u.category, u.subCategory ?? '', u.notes ?? '', id]
  );
}

export async function deleteTransaction(id) {
  await pool.query('DELETE FROM transactions WHERE id=$1', [id]);
}

export async function getSetting(key, fallback) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE key=$1', [key]);
  return rows.length ? JSON.parse(rows[0].value) : fallback;
}

export async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [key, JSON.stringify(value)]
  );
}
