import type { Category, DecisionResult, Expense, WarningLevel } from '@/types';
import {
  projectedUsage,
  spentByCategory,
  totalSpent,
  usagePercent,
} from './budget-engine';

/**
 * Evaluate a pending transaction against budget limits.
 * Returns risk assessment with warning level.
 */
export function evaluateTransaction(
  merchant: string,
  amount: number,
  category: Category,
  expenses: Expense[],
  monthlyBudget: number,
  monthlySavingsDeposited: number = 0,
): DecisionResult {
  const byCategory = spentByCategory(expenses);
  const catSpent = byCategory[category.name] || 0;
  // Total used = expenses + savings deposits (savings counts as spent from budget)
  const total = totalSpent(expenses) + monthlySavingsDeposited;

  // If category has no budget limit, fall back to monthly budget for %
  // so the progress bars still show something meaningful.
  const effectiveLimit = category.budgetLimit > 0 ? category.budgetLimit : monthlyBudget;

  const currentPercent = usagePercent(catSpent, effectiveLimit);
  const projectedPercent = projectedUsage(catSpent, amount, effectiveLimit);

  const totalCurrentPercent = usagePercent(total, monthlyBudget);
  const totalProjectedPercent = projectedUsage(total, amount, monthlyBudget);

  let warningLevel: WarningLevel = 'safe';
  let warningMessage = '';

  if (category.budgetLimit > 0 && projectedPercent >= 100) {
    warningLevel = 'exceeded';
    warningMessage = `Exceeds ${category.name} by ₹${Math.abs(category.budgetLimit - (catSpent + amount)).toLocaleString('en-IN')}`;
  } else if (category.budgetLimit > 0 && projectedPercent >= 80) {
    warningLevel = 'near_limit';
    warningMessage = `${projectedPercent}% of ${category.name} budget`;
  } else if (totalProjectedPercent >= 90) {
    warningLevel = 'near_limit';
    warningMessage = `Monthly budget at ${totalProjectedPercent}%`;
  } else {
    warningLevel = 'safe';
    warningMessage = category.budgetLimit > 0
      ? `Within ${category.name} budget`
      : `Within monthly budget`;
  }

  return {
    category,
    currentSpent: catSpent,
    currentPercent,
    projectedSpent: catSpent + amount,
    projectedPercent,
    totalCurrentSpent: total,
    totalCurrentPercent,
    totalProjectedSpent: total + amount,
    totalProjectedPercent,
    warningLevel,
    warningMessage,
  };
}
