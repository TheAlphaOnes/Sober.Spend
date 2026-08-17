import type {
  Contact,
  Settlement,
  SimplifiedTransaction,
  SplitExpense,
  SplitShare,
  SharedItem,
} from '@/types';
import { SELF_CONTACT_ID } from '@/types';

// ---------------------------------------------------------------------------
// Split calculations
// ---------------------------------------------------------------------------

/**
 * Calculate equal shares with proper rounding.
 * If the total doesn't divide evenly, the first N people pay 1 paise extra.
 *
 * Example: ₹1,000 split 3 ways → [333.33, 333.33, 333.34]
 */
export function calculateEqualShares(total: number, count: number): number[] {
  if (count <= 0) return [];
  const baseShare = Math.floor((total / count) * 100) / 100;
  const remainder = Math.round((total - baseShare * count) * 100);
  const shares = new Array(count).fill(baseShare);
  for (let i = 0; i < remainder; i++) {
    shares[i] = Math.round((baseShare + 0.01) * 100) / 100;
  }
  return shares;
}

/**
 * Validate that exact shares sum to the total.
 * Returns true if they match (within 1 paise tolerance for float errors).
 */
export function validateExactShares(shares: number[], total: number): boolean {
  const sum = shares.reduce((s, v) => s + v, 0);
  return Math.abs(sum - total) < 0.01;
}

/**
 * Calculate the difference between exact shares and the total.
 * Positive = shares are short of total. Negative = shares exceed total.
 */
export function exactSharesDifference(shares: number[], total: number): number {
  const sum = shares.reduce((s, v) => s + v, 0);
  return Math.round((total - sum) * 100) / 100;
}

/**
 * Validate that percentages sum to 100.
 */
export function validatePercentShares(percents: number[]): boolean {
  const sum = percents.reduce((s, v) => s + v, 0);
  return Math.abs(sum - 100) < 0.5;
}

/**
 * Calculate shares from percentages.
 */
export function calculatePercentShares(
  total: number,
  percents: number[],
): number[] {
  return percents.map((p) => Math.round((total * (p / 100)) * 100) / 100);
}

/**
 * Calculate Dutch shares — each person pays for what they ordered,
 * plus shared items (split among consumers) and shared charges (tax/tip,
 * split proportionally based on each person's subtotal).
 *
 * Returns a map of contactId → { shareAmount, orderAmount }.
 */
export function calculateDutchShares(
  orderAmounts: Map<number, number>,
  sharedItems: SharedItem[],
  sharedCharges: number,
  allContactIds: number[],
): Map<number, { shareAmount: number; orderAmount: number }> {
  const result = new Map<number, { shareAmount: number; orderAmount: number }>();

  // 1. Start with each person's individual order amount
  const subtotals = new Map<number, number>();
  for (const contactId of allContactIds) {
    subtotals.set(contactId, orderAmounts.get(contactId) || 0);
  }

  // 2. Add shared items to the consumers' subtotals (split equally among consumers)
  for (const item of sharedItems) {
    if (item.consumerIds.length === 0) continue;
    const perPerson = item.amount / item.consumerIds.length;
    for (const consumerId of item.consumerIds) {
      subtotals.set(consumerId, (subtotals.get(consumerId) || 0) + perPerson);
    }
  }

  // 3. Calculate subtotal sum for proportional charge distribution
  const subtotalSum = Array.from(subtotals.values()).reduce((s, v) => s + v, 0);

  // 4. Add proportional shared charges to each person
  for (const contactId of allContactIds) {
    const subtotal = subtotals.get(contactId) || 0;
    const proportion =
      subtotalSum > 0 ? subtotal / subtotalSum : 1 / allContactIds.length;
    const shareAmount = subtotal + sharedCharges * proportion;
    result.set(contactId, {
      shareAmount: Math.round(shareAmount * 100) / 100,
      orderAmount: orderAmounts.get(contactId) || 0,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Balance calculations
// ---------------------------------------------------------------------------

/**
 * Calculate the net balance for a single contact.
 * Positive = they owe the user. Negative = the user owes them.
 *
 * netBalance = (owed TO me) - (I owe them)
 *
 * owedToMe = shares where paid_by = self AND contact = them AND settled = 0
 *          - settlements where from = them AND to = self
 * iOweThem = shares where paid_by = them AND contact = self AND settled = 0
 *          - settlements where from = self AND to = them
 */
export function calculateContactBalance(
  contactId: number,
  splitExpenses: SplitExpense[],
  shares: SplitShare[],
  settlements: Settlement[],
): number {
  let owedToMe = 0;
  let iOweThem = 0;

  // Shares where the user fronted the money and this contact hasn't settled
  for (const expense of splitExpenses) {
    if (expense.paidBy !== SELF_CONTACT_ID) continue;
    const share = shares.find(
      (s) => s.splitExpenseId === expense.id && s.contactId === contactId,
    );
    if (share && !share.settled) {
      owedToMe += share.shareAmount;
    }
  }

  // Shares where this contact fronted the money and the user hasn't settled
  for (const expense of splitExpenses) {
    if (expense.paidBy !== contactId) continue;
    const share = shares.find(
      (s) => s.splitExpenseId === expense.id && s.contactId === SELF_CONTACT_ID,
    );
    if (share && !share.settled) {
      iOweThem += share.shareAmount;
    }
  }

  // Settlements reduce the balance
  for (const settlement of settlements) {
    // They paid the user → reduces what they owe
    if (
      settlement.fromContactId === contactId &&
      settlement.toContactId === SELF_CONTACT_ID
    ) {
      owedToMe -= settlement.amount;
    }
    // The user paid them → reduces what the user owes
    if (
      settlement.fromContactId === SELF_CONTACT_ID &&
      settlement.toContactId === contactId
    ) {
      iOweThem -= settlement.amount;
    }
  }

  return Math.round((owedToMe - iOweThem) * 100) / 100;
}

/**
 * Calculate total owed to the user and total the user owes across all contacts.
 */
export function calculateTotalBalances(
  contacts: Contact[],
  splitExpenses: SplitExpense[],
  shares: SplitShare[],
  settlements: Settlement[],
): { owedToMe: number; iOwe: number } {
  let owedToMe = 0;
  let iOwe = 0;

  for (const contact of contacts) {
    if (contact.isSelf) continue;
    const balance = calculateContactBalance(
      contact.id,
      splitExpenses,
      shares,
      settlements,
    );
    if (balance > 0) owedToMe += balance;
    else if (balance < 0) iOwe += Math.abs(balance);
  }

  return {
    owedToMe: Math.round(owedToMe * 100) / 100,
    iOwe: Math.round(iOwe * 100) / 100,
  };
}

/**
 * Get all unsettled shares for a contact (across all split expenses).
 * Sorted oldest first (for settlement oldest-first logic).
 */
export function getUnsettledShares(
  contactId: number,
  splitExpenses: SplitExpense[],
  shares: SplitShare[],
): SplitShare[] {
  const result: SplitShare[] = [];
  for (const expense of splitExpenses) {
    // Shares where user fronted and this contact owes
    if (expense.paidBy === SELF_CONTACT_ID) {
      const share = shares.find(
        (s) => s.splitExpenseId === expense.id && s.contactId === contactId,
      );
      if (share && !share.settled) {
        result.push({ ...share, _expenseDate: expense.date } as SplitShare & { _expenseDate: string });
      }
    }
    // Shares where this contact fronted and user owes
    if (expense.paidBy === contactId) {
      const share = shares.find(
        (s) => s.splitExpenseId === expense.id && s.contactId === SELF_CONTACT_ID,
      );
      if (share && !share.settled) {
        result.push({ ...share, _expenseDate: expense.date } as SplitShare & { _expenseDate: string });
      }
    }
  }
  // Sort oldest first
  result.sort((a, b) => {
    const dateA = (a as SplitShare & { _expenseDate?: string })._expenseDate || '';
    const dateB = (b as SplitShare & { _expenseDate?: string })._expenseDate || '';
    return dateA.localeCompare(dateB);
  });
  return result;
}

// ---------------------------------------------------------------------------
// Simplify debts (minimize transactions within a group)
// ---------------------------------------------------------------------------

/**
 * Simplify debts using a greedy algorithm.
 * Given a map of contactId → net balance (positive = owed to user, negative = user owes),
 * returns the minimum set of transactions to settle everything.
 *
 * Example: A owes ₹800, B owes ₹400, user is owed ₹1,200
 * → [{ from: A, to: 0, amount: 800 }, { from: B, to: 0, amount: 400 }]
 */
export function simplifyDebts(
  balances: Map<number, number>,
): SimplifiedTransaction[] {
  const creditors: { id: number; amount: number }[] = [];
  const debtors: { id: number; amount: number }[] = [];

  for (const [id, balance] of balances) {
    if (balance > 0.01) {
      creditors.push({ id, amount: Math.round(balance * 100) / 100 });
    } else if (balance < -0.01) {
      debtors.push({ id, amount: Math.round(-balance * 100) / 100 });
    }
  }

  // Sort: largest amounts first (greedy approach)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedTransaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.01) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// UPI settlement links
// ---------------------------------------------------------------------------

/**
 * Generate a UPI deep link for settlement.
 * Uses saved VPA if available, otherwise generates from phone number + suffix.
 */
export function generateSettlementLink(
  contact: Contact,
  amount: number,
  note?: string,
): string {
  const phoneDigits = contact.phone.replace(/\D/g, '');
  const vpa =
    contact.vpa ||
    `${phoneDigits}${contact.vpaSuffix || '@paytm'}`;
  const params = new URLSearchParams({
    pa: vpa,
    pn: contact.name,
    am: amount.toFixed(2),
  });
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Phone normalization & avatar color
// ---------------------------------------------------------------------------

/**
 * Normalize a phone number to E.164 format (+91XXXXXXXXXX).
 * Handles Indian numbers: strips leading 0, adds +91 if missing.
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  // Remove leading 91 if present (already has country code as digits)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  // Assume Indian number if 10 digits
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return `+${cleaned}`;
}

/**
 * Deterministic avatar color from a phone number.
 * Uses a simple hash to pick from the palette.
 */
export function colorFromPhone(phone: string): string {
  const palette = [
    '#A8E6CF', // mint
    '#FFD93D', // yellow
    '#C3AED6', // purple
    '#FFB347', // orange
    '#FFB3BA', // pink
    '#87CEEB', // blue
  ];
  const digits = phone.replace(/\D/g, '') || '0';
  const hash = digits.split('').reduce((sum, d) => sum + parseInt(d, 10), 0);
  return palette[hash % palette.length];
}

// ---------------------------------------------------------------------------
// VPA suffix list
// ---------------------------------------------------------------------------

export const VPA_SUFFIXES: Array<{ suffix: string; label: string; popular?: boolean }> = [
  { suffix: '@paytm', label: 'Paytm', popular: true },
  { suffix: '@ybl', label: 'PhonePe', popular: true },
  { suffix: '@okhdfcbank', label: 'HDFC (GPay)', popular: true },
  { suffix: '@oksbi', label: 'SBI (GPay)' },
  { suffix: '@okaxis', label: 'Axis (GPay)' },
  { suffix: '@okicici', label: 'ICICI (GPay)' },
  { suffix: '@upi', label: 'BHIM UPI' },
  { suffix: '@apl', label: 'Amazon Pay' },
  { suffix: '@custom', label: 'Enter manually' },
];

// ---------------------------------------------------------------------------
// Group templates
// ---------------------------------------------------------------------------

export const GROUP_TEMPLATES = [
  { key: 'flat', label: 'Flat', icon: 'home', color: '#87CEEB', hint: 'Add your flatmates' },
  { key: 'trip', label: 'Trip', icon: 'plane', color: '#FFD93D', hint: 'Add your travel crew' },
  { key: 'couple', label: 'Couple', icon: 'heart', color: '#FFB3BA', hint: 'Add your partner' },
  { key: 'squad', label: 'Squad', icon: 'users', color: '#A8E6CF', hint: 'Add your friend group' },
  { key: 'office', label: 'Office', icon: 'briefcase', color: '#C3AED6', hint: 'Add your colleagues' },
  { key: 'custom', label: 'Custom', icon: 'plus', color: '#C54770', hint: 'Name it yourself' },
] as const;
