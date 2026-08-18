import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import {
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

/**
 * Local SQLite schema for Sober.Spend (offline-first).
 *
 * All data lives on-device. When the user logs in, these tables
 * sync to Supabase. The schema mirrors the Supabase Postgres tables
 * so a future sync layer can map rows 1:1.
 *
 * Category identity: expenses store the category **name** (string) in
 * the `category` column, not the numeric DB id. This keeps UPI parsing
 * and keyword matching simple — they produce names, not ids.
 */

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  merchant: text('merchant').notNull(),
  note: text('note'),
  date: text('date').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  budget_limit: real('budget_limit').notNull().default(0),
  keywords: text('keywords').notNull().default('[]'),
  sort_order: integer('sort_order').notNull().default(0),
});

/**
 * Wishlist buckets — optional grouping for wishlist items.
 * If bucket_id is null on an item, it's in the "general" wishlist.
 */
export const wishlistBuckets = sqliteTable('wishlist_buckets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
});

/**
 * Wishlist items — things the user wants to buy.
 * Can be funded from savings over time, or bought directly.
 * `url` is for product link parsing (auto-fills name/price).
 * `funded_amount` tracks how much savings has been allocated.
 * `status`: 'funding' | 'ready' | 'bought'
 */
export const wishlistItems = sqliteTable('wishlist_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  funded_amount: real('funded_amount').notNull().default(0),
  url: text('url'),
  bucket_id: integer('bucket_id'),
  status: text('status').notNull().default('funding'),
  date_created: text('date_created').notNull(),
});

/**
 * VPA → Category map — remembers the category a user chose for a
 * specific UPI VPA (e.g. merchant@paytm). When the same VPA is scanned
 * again, the saved category is used instead of MCC/keyword guessing.
 */
export const vpaCategoryMap = sqliteTable('vpa_category_map', {
  vpa: text('vpa').primaryKey(),
  category: text('category').notNull(),
  updated_at: text('updated_at').notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type WishlistBucketRow = typeof wishlistBuckets.$inferSelect;
export type WishlistItemRow = typeof wishlistItems.$inferSelect;
export type VpaCategoryMapRow = typeof vpaCategoryMap.$inferSelect;

export const sqlite = openDatabaseSync('sober-spend.db');

/**
 * Ensure every table exists before any Drizzle query runs.
 * Each CREATE statement is executed individually so a failure in one
 * does not mask the others, and wrapped in try/catch so a partially
 * initialised DB from a prior crash recovers cleanly.
 */
const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    merchant TEXT NOT NULL,
    note TEXT,
    date TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    budget_limit REAL NOT NULL DEFAULT 0,
    keywords TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS wishlist_buckets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS wishlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    funded_amount REAL NOT NULL DEFAULT 0,
    url TEXT,
    bucket_id INTEGER,
    status TEXT NOT NULL DEFAULT 'funding',
    date_created TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS vpa_category_map (
    vpa TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
];

for (const stmt of CREATE_STATEMENTS) {
  try {
    sqlite.execSync(stmt);
  } catch (err) {
    console.error('[db] Failed to ensure table:', err);
  }
}

// ---------------------------------------------------------------------------
// Migrations — add new columns to existing tables if they don't exist.
// SQLite doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN, so we
// check the table schema first and only add missing columns.
// ---------------------------------------------------------------------------

export const db = drizzle(sqlite);
