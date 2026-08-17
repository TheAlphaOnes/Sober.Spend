import { eq, gte } from 'drizzle-orm';
import { create } from 'zustand';

import { db, expenses } from '@/db/schema';
import type { Expense, PendingTransaction } from '@/types';

interface ExpenseState {
  expenses: Expense[];
  pendingTransaction: PendingTransaction | null;

  loadExpenses: () => void;
  addExpense: (expense: Omit<typeof expenses.$inferInsert, 'id' | 'date'>) => void;
  removeExpense: (id: number) => void;
  setPendingTransaction: (tx: PendingTransaction | null) => void;
  confirmPendingTransaction: () => Promise<void>;
  clearAll: () => void;
  /** Delete all expenses from the current calendar month. Budget, categories, savings untouched. */
  resetCurrentMonth: () => void;
  mergeRemoteExpenses: (remote: Expense[]) => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  pendingTransaction: null,

  loadExpenses: () => {
    const rows = db.select().from(expenses).all();
    set({ expenses: rows });
  },

  addExpense: (expense) => {
    const date = new Date().toISOString();
    db.insert(expenses)
      .values({ ...expense, date })
      .run();
    get().loadExpenses();
  },

  removeExpense: (id) => {
    db.delete(expenses).where(eq(expenses.id, id)).run();
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
  },

  setPendingTransaction: (tx) => {
    set({ pendingTransaction: tx });
  },

  confirmPendingTransaction: async () => {
    const { pendingTransaction } = get();
    if (!pendingTransaction) return;

    const date = new Date().toISOString();
    db.insert(expenses)
      .values({
        amount: pendingTransaction.amount,
        category: pendingTransaction.category,
        merchant: pendingTransaction.merchant,
        note: pendingTransaction.note ?? null,
        date,
      })
      .run();

    set({ pendingTransaction: null });
    get().loadExpenses();
  },

  clearAll: () => {
    set({ expenses: [], pendingTransaction: null });
  },

  resetCurrentMonth: () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      db.delete(expenses).where(gte(expenses.date, monthStart)).run();
      get().loadExpenses();
    } catch (err) {
      console.error('[expense-store] resetCurrentMonth failed:', err);
    }
  },

  mergeRemoteExpenses: (remote) => {
    // Insert remote expenses that don't already exist locally
    // (match by date + merchant + amount to dedupe)
    const local = get().expenses;
    const existingKeys = new Set(
      local.map((e) => `${e.date}|${e.merchant}|${e.amount}`),
    );

    for (const r of remote) {
      const key = `${r.date}|${r.merchant}|${r.amount}`;
      if (!existingKeys.has(key)) {
        try {
          db.insert(expenses)
            .values({
              amount: r.amount,
              category: r.category,
              merchant: r.merchant,
              note: r.note ?? null,
              date: r.date,
            })
            .run();
        } catch (err) {
          console.error('[expense-store] mergeRemoteExpenses insert failed:', err);
        }
      }
    }

    get().loadExpenses();
  },
}));
