import pg from 'pg';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Schema ────────────────────────────────────────────────────────────────
export async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      google_id  TEXT UNIQUE NOT NULL,
      email      TEXT NOT NULL,
      name       TEXT NOT NULL,
      picture    TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      type         TEXT NOT NULL,
      amount       NUMERIC NOT NULL,
      date         TEXT NOT NULL,
      category     TEXT NOT NULL,
      sub_category TEXT DEFAULT '',
      notes        TEXT DEFAULT '',
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT NOT NULL,
      key     TEXT NOT NULL,
      value   TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
  `);

  // Migrate: add user_id to transactions if not present (idempotent)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE transactions ADD COLUMN user_id TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
}

// ─── Users ─────────────────────────────────────────────────────────────────
export async function findOrCreateUser({ googleId, email, name, picture }) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE google_id = $1', [googleId]
  );
  if (rows[0]) return rows[0];

  const id = `u-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const { rows: created } = await pool.query(
    `INSERT INTO users (id, google_id, email, name, picture, created_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, googleId, email, name, picture, now]
  );
  return created[0];
}

// ─── Transactions ──────────────────────────────────────────────────────────
function rowToTx(row) {
  return {
    id:          row.id,
    type:        row.type,
    amount:      parseFloat(row.amount),
    date:        row.date,
    category:    row.category,
    subCategory: row.sub_category,
    notes:       row.notes,
    createdAt:   row.created_at,
  };
}

export async function getAllTransactions(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM transactions WHERE user_id=$1 ORDER BY date DESC, created_at DESC',
    [userId]
  );
  return rows.map(rowToTx);
}

export async function createTransaction(tx, userId) {
  await pool.query(
    `INSERT INTO transactions (id,user_id,type,amount,date,category,sub_category,notes,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [tx.id, userId, tx.type, tx.amount, tx.date,
     tx.category, tx.subCategory ?? '', tx.notes ?? '', tx.createdAt]
  );
  return tx;
}

export async function updateTransaction(id, u, userId) {
  await pool.query(
    `UPDATE transactions SET amount=$1,date=$2,category=$3,sub_category=$4,notes=$5
     WHERE id=$6 AND user_id=$7`,
    [u.amount, u.date, u.category, u.subCategory ?? '', u.notes ?? '', id, userId]
  );
}

export async function deleteTransaction(id, userId) {
  await pool.query(
    'DELETE FROM transactions WHERE id=$1 AND user_id=$2', [id, userId]
  );
}

// ─── Settings ──────────────────────────────────────────────────────────────
export async function getSetting(userId, key, fallback) {
  const { rows } = await pool.query(
    'SELECT value FROM user_settings WHERE user_id=$1 AND key=$2', [userId, key]
  );
  return rows.length ? JSON.parse(rows[0].value) : fallback;
}

export async function setSetting(userId, key, value) {
  await pool.query(
    `INSERT INTO user_settings (user_id,key,value) VALUES ($1,$2,$3)
     ON CONFLICT (user_id,key) DO UPDATE SET value=EXCLUDED.value`,
    [userId, key, JSON.stringify(value)]
  );
}
