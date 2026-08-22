import { supabase } from '@/utils/supabase';
import type { Expense, Category } from '@/types';
import type { Subscription } from '@/stores/subscription-store';

/**
 * Sync service — bridges local SQLite (offline-first) with Supabase.
 *
 * Strategy:
 * - pushLocalData: uploads all local expenses, categories, and settings
 *   to Supabase. Called after mutations when the user is logged in.
 * - pullRemoteData: downloads remote data on login. Merges into local DB.
 *
 * Conflicts: remote wins for settings (last-write-wins via updated_at).
 * Expenses use upsert on (user_id, date, merchant, amount) to dedupe.
 */

function getUserId(): string | null {
  // Lazy require to avoid a require cycle
  // (auth-store imports fullSync from this module at module level).
  const { useAuthStore } = require('@/stores/auth-store');
  return useAuthStore.getState().user?.id ?? null;
}

// ---------------------------------------------------------------------------
// PUSH — upload local data to Supabase
// ---------------------------------------------------------------------------

export async function pushExpenses(expenses: Expense[]): Promise<void> {
  const userId = getUserId();
  if (!userId || expenses.length === 0) return;

  const rows = expenses.map((e) => ({
    user_id: userId,
    amount: e.amount,
    category: e.category,
    merchant: e.merchant,
    note: e.note ?? null,
    date: e.date,
  }));

  const { error } = await supabase
    .from('expenses')
    .upsert(rows, { onConflict: 'user_id,date,merchant,amount' });

  if (error) {
    console.error('[sync] pushExpenses failed:', error.message);
  }
}

export async function pushCategories(categories: Category[]): Promise<void> {
  const userId = getUserId();
  if (!userId || categories.length === 0) return;

  const rows = categories.map((c) => ({
    user_id: userId,
    name: c.name,
    color: c.color,
    icon: c.icon,
    budget_limit: c.budgetLimit,
    keywords: JSON.stringify(c.keywords),
    sort_order: c.sortOrder,
  }));

  const { error } = await supabase
    .from('categories')
    .upsert(rows, { onConflict: 'user_id,name' });

  if (error) {
    console.error('[sync] pushCategories failed:', error.message);
  }
}

export async function pushSetting(key: string, value: string): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('settings')
    .upsert(
      { user_id: userId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' },
    );

  if (error) {
    console.error('[sync] pushSetting failed:', error.message);
  }
}

export async function pushAllSettings(settings: Record<string, string>): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  const rows = Object.entries(settings).map(([key, value]) => ({
    user_id: userId,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (error) {
    console.error('[sync] pushAllSettings failed:', error.message);
  }
}


export async function pushSubscriptions(subscriptions: Subscription[]): Promise<void> {
  const userId = getUserId();
  if (!userId || subscriptions.length === 0) return;

  const rows = subscriptions.map((s) => ({
    user_id: userId,
    amount: s.amount,
    amount_rule: s.amount_rule,
    merchant: s.merchant,
    category: s.category,
    frequency: s.frequency,
    start_date: s.start_date,
    end_date: s.end_date,
    is_active: s.is_active,
    created_at: s.created_at,
  }));

  const { error } = await supabase
    .from('subscriptions')
    .upsert(rows, { onConflict: 'user_id,created_at' });

  if (error) {
    console.error('[sync] pushSubscriptions failed:', error.message);
  }
}

// ---------------------------------------------------------------------------
// PULL — download remote data into local stores
// ---------------------------------------------------------------------------

export async function pullExpenses(): Promise<Expense[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, category, merchant, note, date')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('[sync] pullExpenses failed:', error.message);
    return [];
  }

  return (data || []).map((e) => ({
    id: 0, // local DB will assign its own id
    amount: e.amount,
    category: e.category,
    merchant: e.merchant,
    note: e.note,
    date: e.date,
  }));
}

export async function pullCategories(): Promise<Omit<Category, 'id'>[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('categories')
    .select('name, color, icon, budget_limit, keywords, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[sync] pullCategories failed:', error.message);
    return [];
  }

  return (data || []).map((c) => ({
    name: c.name,
    color: c.color,
    icon: c.icon,
    budgetLimit: c.budget_limit,
    keywords: (() => {
      try {
        return JSON.parse(c.keywords);
      } catch {
        return [];
      }
    })(),
    sortOrder: c.sort_order,
  }));
}

export async function pullSettings(): Promise<Record<string, string>> {
  const userId = getUserId();
  if (!userId) return {};

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('user_id', userId);

  if (error) {
    console.error('[sync] pullSettings failed:', error.message);
    return {};
  }

  const result: Record<string, string> = {};
  for (const row of data || []) {
    result[row.key] = row.value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// FULL SYNC — pull remote, then push local (merge)
// ---------------------------------------------------------------------------

function snapshotSettings(budget: {
  monthlyBudget: number;
  monthlySavingsTarget: number;
  savingsBalance: number;
  monthlySavingsDeposited: number;
}): Record<string, string> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    monthly_budget: budget.monthlyBudget.toString(),
    monthly_savings_target: budget.monthlySavingsTarget.toString(),
    savings_balance: budget.savingsBalance.toString(),
    [`savings_deposits_${monthKey}`]: budget.monthlySavingsDeposited.toString(),
  };
}

/**
 * Best-effort upload of the current local snapshot.
 * No-ops when signed out. Never throws to callers.
 */

export async function pullSubscriptions(): Promise<Subscription[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[sync] pullSubscriptions failed:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: 0,
    amount: row.amount,
    amount_rule: row.amount_rule,
    merchant: row.merchant,
    category: row.category,
    frequency: row.frequency,
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: row.is_active,
    created_at: row.created_at,
  }));
}

export function schedulePush(): void {
  if (!getUserId()) return;

  void (async () => {
    try {
      const { useExpenseStore } = await import('@/stores/expense-store');
      const { useBudgetStore } = await import('@/stores/budget-store');
      const { useSubscriptionStore } = await import('@/stores/subscription-store');
      await Promise.all([
        pushExpenses(useExpenseStore.getState().expenses),
        pushCategories(useBudgetStore.getState().categories),
        pushAllSettings(snapshotSettings(useBudgetStore.getState())),
        pushSubscriptions(useSubscriptionStore.getState().subscriptions),
      ]);
    } catch (err) {
      console.error('[sync] schedulePush failed:', err);
    }
  })();
}

export async function fullSync(): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  try {
    // Pull remote data
    const [remoteExpenses, remoteCategories, remoteSettings, remoteSubscriptions] = await Promise.all([
      pullExpenses(),
      pullCategories(),
      pullSettings(),
      pullSubscriptions(),
    ]);

    // Merge into local stores
    const { useExpenseStore } = await import('@/stores/expense-store');
    const { useBudgetStore } = await import('@/stores/budget-store');
    const { useSubscriptionStore } = await import('@/stores/subscription-store');

    // If remote has data, replace local (first sync on a new device)
    if (remoteExpenses.length > 0) {
      useExpenseStore.getState().mergeRemoteExpenses(remoteExpenses);
    }
    if (remoteCategories.length > 0) {
      useBudgetStore.getState().mergeRemoteCategories(remoteCategories);
    }
    if (Object.keys(remoteSettings).length > 0) {
      useBudgetStore.getState().mergeRemoteSettings(remoteSettings);
    }
    if (remoteSubscriptions.length > 0) {
      useSubscriptionStore.getState().mergeRemoteSubscriptions(remoteSubscriptions);
    }

    // Push local data back (catches any local-only mutations)
    await Promise.all([
      pushExpenses(useExpenseStore.getState().expenses),
      pushCategories(useBudgetStore.getState().categories),
      pushAllSettings(snapshotSettings(useBudgetStore.getState())),
      pushSubscriptions(useSubscriptionStore.getState().subscriptions),
    ]);
  } catch (err) {
    console.error('[sync] fullSync failed:', err);
  }
}
