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

export const splitGroups = sqliteTable('split_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  color: text('color').notNull(),
  invite_token: text('invite_token').notNull(),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const splitMembers = sqliteTable('split_members', {
  id: text('id').primaryKey(),
  group_id: text('group_id').notNull(),
  display_name: text('display_name').notNull(),
  phone: text('phone'),
  user_id: text('user_id'),
  is_self: integer('is_self').notNull().default(0),
  left_at: text('left_at'),
});

export const splitExpenses = sqliteTable('split_expenses', {
  id: text('id').primaryKey(),
  group_id: text('group_id').notNull(),
  paid_by_id: text('paid_by_id').notNull(),
  total_amount: real('total_amount').notNull(),
  merchant: text('merchant').notNull(),
  category: text('category'),
  note: text('note'),
  mode: text('mode').notNull(),
  occurred_at: text('occurred_at').notNull(),
  deleted_at: text('deleted_at'),
});

export const splitShares = sqliteTable('split_shares', {
  id: text('id').primaryKey(),
  expense_id: text('expense_id').notNull(),
  member_id: text('member_id').notNull(),
  amount: real('amount').notNull(),
});

export const splitPayments = sqliteTable('split_payments', {
  id: text('id').primaryKey(),
  group_id: text('group_id').notNull(),
  from_id: text('from_id').notNull(),
  to_id: text('to_id').notNull(),
  amount: real('amount').notNull(),
  method: text('method').notNull(),
  occurred_at: text('occurred_at').notNull(),
  deleted_at: text('deleted_at'),
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
  `CREATE TABLE IF NOT EXISTS split_groups (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    color TEXT NOT NULL,
    invite_token TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS split_members (
    id TEXT PRIMARY KEY NOT NULL,
    group_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    phone TEXT,
    user_id TEXT,
    is_self INTEGER NOT NULL DEFAULT 0,
    left_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS split_expenses (
    id TEXT PRIMARY KEY NOT NULL,
    group_id TEXT NOT NULL,
    paid_by_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT,
    note TEXT,
    mode TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS split_shares (
    id TEXT PRIMARY KEY NOT NULL,
    expense_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    amount REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS split_payments (
    id TEXT PRIMARY KEY NOT NULL,
    group_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    amount REAL NOT NULL,
    amount_rule TEXT NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
];

for (const stmt of CREATE_STATEMENTS) {
  try {
    sqlite.execSync(stmt);
  } catch (err) {
    console.error('[db] Failed to ensure table:', err);
  }
}

try {
  sqlite.execSync(`
    DELETE FROM categories
    WHERE id NOT IN (
      SELECT MIN(id) FROM categories GROUP BY lower(name)
    )
  `);
  sqlite.execSync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`,
  );
} catch (err) {
  console.error('[db] Failed to ensure unique category names:', err);
}

export const db = drizzle(sqlite);

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  amount_rule: text('amount_rule').notNull(),
  merchant: text('merchant').notNull(),
  category: text('category').notNull(),
  frequency: text('frequency').notNull(),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull(),
});
