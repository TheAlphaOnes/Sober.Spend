import type { Expense } from '@/types';

/**
 * Calculate total spent from a list of expenses.
 */
export function totalSpent(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Calculate spent per category.
 */
export function spentByCategory(expenses: Expense[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] || 0) + e.amount;
  }
  return map;
}

/**
 * Calculate budget usage percentage.
 * When limit is 0 (not set), returns 0 — caller should handle
 * the no-budget case by showing raw amounts instead of percentages.
 */
export function usagePercent(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((spent / limit) * 100);
}

/**
 * Check if a category has a budget limit set.
 */
export function hasBudget(limit: number): boolean {
  return limit > 0;
}

/**
 * Calculate remaining budget.
 */
export function remaining(spent: number, limit: number): number {
  return Math.max(0, limit - spent);
}

/**
 * Calculate projected usage after a new expense.
 */
export function projectedUsage(
  currentSpent: number,
  newAmount: number,
  limit: number,
): number {
  return usagePercent(currentSpent + newAmount, limit);
}

/**
 * Get expenses from the current month only.
 */
export function currentMonthExpenses(expenses: Expense[]): Expense[] {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

/**
 * Calculate daily average spending.
 */
export function dailyAverage(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  const total = totalSpent(expenses);
  const now = new Date();
  const dayOfMonth = now.getDate();
  return Math.round(total / dayOfMonth);
}
