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
  splitExpenseId: integer('split_expense_id'),
  isMyShare: integer('is_my_share').notNull().default(0),
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

// ---------------------------------------------------------------------------
// Split feature tables
// ---------------------------------------------------------------------------

/**
 * Contacts — people the user splits expenses with.
 * The self-contact (id=0, is_self=1) represents the user.
 * Phone number doubles as UPI address: phone@paytm, phone@ybl, etc.
 */
export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phone: text('phone').notNull().default(''),
  name: text('name').notNull(),
  vpa_suffix: text('vpa_suffix'),
  vpa: text('vpa'),
  avatar_color: text('avatar_color').notNull().default('#C54770'),
  has_app: integer('has_app').notNull().default(0),
  is_self: integer('is_self').notNull().default(0),
  created_at: text('created_at').notNull(),
});

/**
 * Groups — lightweight containers for recurring split contexts.
 * A flat, a trip, a squad. Expenses can be split within a group or ad-hoc.
 */
export const splitGroups = sqliteTable('split_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull().default('users'),
  template: text('template').notNull().default('custom'),
  created_at: text('created_at').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  is_active: integer('is_active').notNull().default(1),
});

/**
 * Group members — which contacts belong to which groups.
 */
export const groupMembers = sqliteTable('group_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id').notNull(),
  contact_id: integer('contact_id').notNull(),
  joined_at: text('joined_at').notNull(),
});

/**
 * Split expenses — a single expense split among multiple people.
 * paid_by references contacts.id (0 = self).
 * group_id is null for ad-hoc splits with individuals.
 */
export const splitExpenses = sqliteTable('split_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group_id: integer('group_id'),
  total_amount: real('total_amount').notNull(),
  merchant: text('merchant').notNull(),
  category: text('category').notNull(),
  note: text('note'),
  paid_by: integer('paid_by').notNull(),
  date: text('date').notNull(),
  split_type: text('split_type').notNull().default('equal'),
  settled: integer('settled').notNull().default(0),
  created_at: text('created_at').notNull(),
});

/**
 * Split shares — each person's portion of a split expense.
 * contact_id 0 = self. order_amount is for Dutch splits (what they ordered).
 */
export const splitShares = sqliteTable('split_shares', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  split_expense_id: integer('split_expense_id').notNull(),
  contact_id: integer('contact_id').notNull(),
  share_amount: real('share_amount').notNull(),
  order_amount: real('order_amount'),
  settled: integer('settled').notNull().default(0),
  settled_date: text('settled_date'),
});

/**
 * Settlements — payments between contacts to settle balances.
 * from/to reference contacts.id (0 = self).
 */
export const settlements = sqliteTable('settlements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  from_contact_id: integer('from_contact_id').notNull(),
  to_contact_id: integer('to_contact_id').notNull(),
  amount: real('amount').notNull(),
  method: text('method').notNull().default('upi'),
  date: text('date').notNull(),
  note: text('note'),
  created_at: text('created_at').notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type WishlistBucketRow = typeof wishlistBuckets.$inferSelect;
export type WishlistItemRow = typeof wishlistItems.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type SplitGroupRow = typeof splitGroups.$inferSelect;
export type GroupMemberRow = typeof groupMembers.$inferSelect;
export type SplitExpenseRow = typeof splitExpenses.$inferSelect;
export type SplitShareRow = typeof splitShares.$inferSelect;
export type SettlementRow = typeof settlements.$inferSelect;

const sqlite = openDatabaseSync('sober-spend.db');

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
    date TEXT NOT NULL,
    split_expense_id INTEGER,
    is_my_share INTEGER NOT NULL DEFAULT 0
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
  `CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    vpa_suffix TEXT,
    vpa TEXT,
    avatar_color TEXT NOT NULL DEFAULT '#C54770',
    has_app INTEGER NOT NULL DEFAULT 0,
    is_self INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS split_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'users',
    template TEXT NOT NULL DEFAULT 'custom',
    created_at TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    joined_at TEXT NOT NULL,
    UNIQUE(group_id, contact_id)
  )`,
  `CREATE TABLE IF NOT EXISTS split_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    total_amount REAL NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    paid_by INTEGER NOT NULL,
    date TEXT NOT NULL,
    split_type TEXT NOT NULL DEFAULT 'equal',
    settled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS split_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    split_expense_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    share_amount REAL NOT NULL,
    order_amount REAL,
    settled INTEGER NOT NULL DEFAULT 0,
    settled_date TEXT,
    UNIQUE(split_expense_id, contact_id)
  )`,
  `CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_contact_id INTEGER NOT NULL,
    to_contact_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'upi',
    date TEXT NOT NULL,
    note TEXT,
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

// ---------------------------------------------------------------------------
// Migrations — add new columns to existing tables if they don't exist.
// SQLite doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN, so we
// check the table schema first and only add missing columns.
// ---------------------------------------------------------------------------

try {
  const columns = sqlite.getAllSync<{ name: string }>(
    `PRAGMA table_info(expenses)`,
  );
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has('split_expense_id')) {
    sqlite.execSync(`ALTER TABLE expenses ADD COLUMN split_expense_id INTEGER`);
  }
  if (!columnNames.has('is_my_share')) {
    sqlite.execSync(`ALTER TABLE expenses ADD COLUMN is_my_share INTEGER NOT NULL DEFAULT 0`);
  }
} catch (err) {
  console.error('[db] Failed to migrate expenses table:', err);
}

// Migrate split_groups: add is_active column if missing
try {
  const groupColumns = sqlite.getAllSync<{ name: string }>(
    `PRAGMA table_info(split_groups)`,
  );
  const groupColNames = new Set(groupColumns.map((c) => c.name));
  if (!groupColNames.has('is_active')) {
    sqlite.execSync(
      `ALTER TABLE split_groups ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
    );
  }
} catch (err) {
  console.error('[db] Failed to migrate split_groups table:', err);
}

// ---------------------------------------------------------------------------
// Seed the self-contact (id=0). This is the user themself — referenced
// by split_expenses.paid_by and split_shares.contact_id.
// ---------------------------------------------------------------------------

try {
  sqlite.execSync(
    `INSERT OR IGNORE INTO contacts (id, phone, name, avatar_color, has_app, is_self, created_at)
     VALUES (0, '', 'You', '#C54770', 1, 1, datetime('now'))`,
  );
} catch (err) {
  console.error('[db] Failed to seed self-contact:', err);
}

export const db = drizzle(sqlite);
