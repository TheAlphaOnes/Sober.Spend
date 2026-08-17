import { eq, gte, lt } from 'drizzle-orm';
import { create } from 'zustand';

import { db, categories as categoriesTable, expenses as expensesTable, settings } from '@/db/schema';
import { DEFAULT_CATEGORIES, DEFAULT_MONTHLY_BUDGET } from '@/constants/categories';
import type { Category } from '@/types';

const SETTINGS_KEYS = {
  monthlyBudget: 'monthly_budget',
  monthlySavingsTarget: 'monthly_savings_target',
  savingsBalance: 'savings_balance',
  seeded: 'categories_seeded',
  lastRolloverMonth: 'last_rollover_month',
} as const;

/**
 * Build the settings key for a specific month's savings deposits.
 * Format: `savings_deposits_2026-08` — one counter per calendar month.
 * This lets us track how much was moved into savings each month, so
 * it counts as "used" from the monthly budget.
 */
function savingsDepositKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `savings_deposits_${y}-${m}`;
}

/**
 * Get the current month's total savings deposits.
 */
function readMonthlySavingsDeposits(): number {
  const key = savingsDepositKey(new Date());
  const val = readSetting(key);
  return val ? parseFloat(val) : 0;
}

/**
 * Add to the current month's savings deposit counter.
 */
function addMonthlySavingsDeposit(amount: number): void {
  const key = savingsDepositKey(new Date());
  const current = readMonthlySavingsDeposits();
  writeSetting(key, (current + amount).toString());
}

/**
 * Subtract from the current month's savings deposit counter
 * (when withdrawing from savings).
 */
function subtractMonthlySavingsDeposit(amount: number): void {
  const key = savingsDepositKey(new Date());
  const current = readMonthlySavingsDeposits();
  writeSetting(key, Math.max(0, current - amount).toString());
}

interface BudgetState {
  monthlyBudget: number;
  monthlySavingsTarget: number;
  /** Accumulated savings available to spend on wishlist items. */
  savingsBalance: number;
  /** Total deposits into savings during the current month. Counts as "used" from budget. */
  monthlySavingsDeposited: number;
  categories: Category[];

  loadSettings: () => void;
  setMonthlyBudget: (amount: number) => void;
  setMonthlySavingsTarget: (amount: number) => void;
  setCategoryLimit: (categoryId: number, limit: number) => void;
  addCategory: (data: Omit<Category, 'id'>) => void;
  deleteCategory: (categoryId: number) => void;
  getCategoryById: (id: number) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  mergeRemoteCategories: (remote: Omit<Category, 'id'>[]) => void;
  mergeRemoteSettings: (settings: Record<string, string>) => void;
  /** Add to savings balance (e.g. unfunding a wishlist item). */
  addToSavings: (amount: number) => void;
  /** Deduct from savings balance (e.g. funding a wishlist item). */
  deductFromSavings: (amount: number) => void;
  /**
   * Spend from savings to buy a wishlist item. Reduces the savings
   * balance but does NOT reduce the monthly deposit counter — the
   * money was already counted as "used" from the budget when it was
   * deposited. Using it to buy something should not double-count.
   */
  spendFromSavings: (amount: number) => void;
  /**
   * Roll over leftover budget from the previous month into savings.
   * Called on app load — checks if we've crossed into a new month
   * since the last rollover. If so, calculates (budget - spent -
   * savingsDeposits) for the previous month and adds the remainder
   * to the savings balance. Only runs once per month.
   */
  rolloverIfNeeded: () => void;
  /**
   * Reset the current month's tracking — clears the monthly savings
   * deposit counter so the budget-used calculation starts fresh.
   * Does NOT touch the savings balance (that's a persistent wallet).
   * Called when the user taps "Reset This Month" in settings.
   */
  resetMonth: () => void;
}

function readSetting(key: string): string | null {
  try {
    const row = db.select().from(settings).where(eq(settings.key, key)).get();
    return row?.value ?? null;
  } catch (err) {
    console.error('[budget-store] readSetting failed:', err);
    return null;
  }
}

function writeSetting(key: string, value: string): void {
  try {
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  } catch (err) {
    console.error('[budget-store] writeSetting failed:', err);
  }
}

function rowToCategory(row: typeof categoriesTable.$inferSelect): Category {
  let keywords: string[] = [];
  try {
    keywords = JSON.parse(row.keywords);
  } catch {
    keywords = [];
  }
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    budgetLimit: row.budget_limit,
    keywords,
    sortOrder: row.sort_order,
  };
}

function loadCategoriesFromDB(): Category[] {
  try {
    const rows = db.select().from(categoriesTable).all();
    // Dedupe by name at the application layer — the DB has no unique
    // constraint on name, so duplicate rows from earlier seeding bugs
    // may still exist. Keep the first (lowest id) row per name.
    const seen = new Set<string>();
    const deduped: Category[] = [];
    for (const row of rows) {
      const nameKey = row.name.toLowerCase();
      if (seen.has(nameKey)) continue;
      seen.add(nameKey);
      deduped.push(rowToCategory(row));
    }
    return deduped;
  } catch (err) {
    console.error('[budget-store] loadCategoriesFromDB failed:', err);
    return [];
  }
}

function seedDefaultCategories(): void {
  const existing = loadCategoriesFromDB();
  const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

  for (const cat of DEFAULT_CATEGORIES) {
    if (existingNames.has(cat.name.toLowerCase())) continue;
    try {
      db.insert(categoriesTable)
        .values({
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          budget_limit: cat.budgetLimit,
          keywords: JSON.stringify(cat.keywords),
          sort_order: cat.sortOrder,
        })
        .run();
    } catch (err) {
      console.error('[budget-store] seedDefaultCategories failed for', cat.name, err);
    }
  }
  writeSetting(SETTINGS_KEYS.seeded, 'true');
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  monthlyBudget: DEFAULT_MONTHLY_BUDGET,
  monthlySavingsTarget: 0,
  savingsBalance: 0,
  monthlySavingsDeposited: 0,
  categories: [],

  loadSettings: () => {
    try {
      const seeded = readSetting(SETTINGS_KEYS.seeded);
      if (!seeded) {
        seedDefaultCategories();
      }

      const budgetStr = readSetting(SETTINGS_KEYS.monthlyBudget);
      const monthlyBudget = budgetStr ? parseFloat(budgetStr) : DEFAULT_MONTHLY_BUDGET;
      const savingsStr = readSetting(SETTINGS_KEYS.monthlySavingsTarget);
      const monthlySavingsTarget = savingsStr ? parseFloat(savingsStr) : 0;
      const balanceStr = readSetting(SETTINGS_KEYS.savingsBalance);
      const savingsBalance = balanceStr ? parseFloat(balanceStr) : 0;
      const monthlySavingsDeposited = readMonthlySavingsDeposits();
      const categories = loadCategoriesFromDB();

      set({ monthlyBudget, monthlySavingsTarget, savingsBalance, monthlySavingsDeposited, categories });
    } catch (err) {
      console.error('[budget-store] loadSettings failed:', err);
      set({ monthlyBudget: DEFAULT_MONTHLY_BUDGET, monthlySavingsTarget: 0, savingsBalance: 0, monthlySavingsDeposited: 0, categories: [] });
    }
  },

  setMonthlyBudget: (amount) => {
    writeSetting(SETTINGS_KEYS.monthlyBudget, amount.toString());
    set({ monthlyBudget: amount });
  },

  setMonthlySavingsTarget: (amount) => {
    writeSetting(SETTINGS_KEYS.monthlySavingsTarget, amount.toString());
    set({ monthlySavingsTarget: amount });
  },

  setCategoryLimit: (categoryId, limit) => {
    try {
      db.update(categoriesTable)
        .set({ budget_limit: limit })
        .where(eq(categoriesTable.id, categoryId))
        .run();
    } catch (err) {
      console.error('[budget-store] setCategoryLimit failed:', err);
    }

    set({
      categories: get().categories.map((cat) =>
        cat.id === categoryId ? { ...cat, budgetLimit: limit } : cat,
      ),
    });
  },

  addCategory: (data) => {
    const sortOrder = get().categories.length;
    try {
      db.insert(categoriesTable)
        .values({
          name: data.name,
          color: data.color,
          icon: data.icon,
          budget_limit: data.budgetLimit,
          keywords: JSON.stringify(data.keywords),
          sort_order: data.sortOrder ?? sortOrder,
        })
        .run();
    } catch (err) {
      console.error('[budget-store] addCategory failed:', err);
    }

    set({ categories: loadCategoriesFromDB() });
  },

  deleteCategory: (categoryId) => {
    try {
      db.delete(categoriesTable)
        .where(eq(categoriesTable.id, categoryId))
        .run();
    } catch (err) {
      console.error('[budget-store] deleteCategory failed:', err);
    }

    set({
      categories: get().categories.filter((cat) => cat.id !== categoryId),
    });
  },

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },

  getCategoryByName: (name) => {
    return get().categories.find((c) => c.name === name);
  },

  mergeRemoteCategories: (remote) => {
    const local = get().categories;
    const localNames = new Set(local.map((c) => c.name.toLowerCase()));

    for (const r of remote) {
      if (!localNames.has(r.name.toLowerCase())) {
        try {
          db.insert(categoriesTable)
            .values({
              name: r.name,
              color: r.color,
              icon: r.icon,
              budget_limit: r.budgetLimit,
              keywords: JSON.stringify(r.keywords),
              sort_order: r.sortOrder,
            })
            .onConflictDoNothing({ target: categoriesTable.name })
            .run();
        } catch (err) {
          console.error('[budget-store] mergeRemoteCategories insert failed:', err);
        }
      }
    }

    set({ categories: loadCategoriesFromDB() });
  },

  mergeRemoteSettings: (settings) => {
    for (const [key, value] of Object.entries(settings)) {
      writeSetting(key, value);
    }

    const budgetStr = readSetting(SETTINGS_KEYS.monthlyBudget);
    const savingsStr = readSetting(SETTINGS_KEYS.monthlySavingsTarget);
    const balanceStr = readSetting(SETTINGS_KEYS.savingsBalance);
    set({
      monthlyBudget: budgetStr ? parseFloat(budgetStr) : get().monthlyBudget,
      monthlySavingsTarget: savingsStr ? parseFloat(savingsStr) : get().monthlySavingsTarget,
      savingsBalance: balanceStr ? parseFloat(balanceStr) : get().savingsBalance,
    });
  },

  addToSavings: (amount) => {
    const newBalance = get().savingsBalance + amount;
    writeSetting(SETTINGS_KEYS.savingsBalance, newBalance.toString());
    addMonthlySavingsDeposit(amount);
    set({ savingsBalance: newBalance, monthlySavingsDeposited: get().monthlySavingsDeposited + amount });
  },

  deductFromSavings: (amount) => {
    const newBalance = Math.max(0, get().savingsBalance - amount);
    writeSetting(SETTINGS_KEYS.savingsBalance, newBalance.toString());
    subtractMonthlySavingsDeposit(amount);
    set({
      savingsBalance: newBalance,
      monthlySavingsDeposited: Math.max(0, get().monthlySavingsDeposited - amount),
    });
  },

  spendFromSavings: (amount) => {
    const newBalance = Math.max(0, get().savingsBalance - amount);
    writeSetting(SETTINGS_KEYS.savingsBalance, newBalance.toString());
    // Do NOT subtract from monthly deposit counter — the deposit was
    // already counted as "used" from the budget when it was made.
    // Spending it now should not reduce the budget-used figure.
    set({ savingsBalance: newBalance });
  },

  rolloverIfNeeded: () => {
    try {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastRollover = readSetting(SETTINGS_KEYS.lastRolloverMonth);

      // Already rolled over for this month
      if (lastRollover === currentMonthKey) return;

      // On first run there's no previous month to roll over
      if (lastRollover) {
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const prevDepositsStr = readSetting(`savings_deposits_${prevMonthKey}`);
        const prevDeposits = prevDepositsStr ? parseFloat(prevDepositsStr) : 0;

        // Get previous month's expenses from DB
        // Use string comparison on ISO dates to avoid timezone drift.
        // ISO strings sort lexicographically, so date >= prevMonthStart
        // AND date < monthStart gives us exactly the previous month.
        const prevMonthStart = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const prevExpenses = db.select()
          .from(expensesTable)
          .where(gte(expensesTable.date, prevMonthStart))
          .all()
          .filter((e) => e.date < monthStart);

        const prevSpent = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

        const budget = get().monthlyBudget;
        const leftover = budget - prevSpent - prevDeposits;

        if (leftover > 0) {
          const newBalance = get().savingsBalance + leftover;
          writeSetting(SETTINGS_KEYS.savingsBalance, newBalance.toString());
          set({ savingsBalance: newBalance });
        }
      }

      // Mark this month as rolled over
      writeSetting(SETTINGS_KEYS.lastRolloverMonth, currentMonthKey);
    } catch (err) {
      console.error('[budget-store] rolloverIfNeeded failed:', err);
    }
  },

  resetMonth: () => {
    // Clear the current month's savings deposit counter so the
    // budget-used calculation starts fresh. The savings balance
    // (the persistent wallet) is NOT touched.
    const key = savingsDepositKey(new Date());
    writeSetting(key, '0');
    set({ monthlySavingsDeposited: 0 });
  },
}));
