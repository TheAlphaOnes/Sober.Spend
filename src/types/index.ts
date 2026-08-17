export type WarningLevel = 'safe' | 'near_limit' | 'exceeded';

/**
 * Category identity is the **name** string (e.g. "Food", "Travel").
 * Expenses store this name in their `category` column.
 * UPI parsing and keyword matching produce names, not numeric ids.
 */
export type CategoryId = string;

export interface Category {
  id: number;
  name: string;
  budgetLimit: number;
  color: string;
  icon: string;
  keywords: string[];
  sortOrder: number;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  merchant: string;
  note?: string | null;
  date: string;
}

export interface Budget {
  monthlyTotal: number;
  categories: Category[];
}

export interface DecisionResult {
  category: Category;
  currentSpent: number;
  currentPercent: number;
  projectedSpent: number;
  projectedPercent: number;
  totalCurrentSpent: number;
  totalCurrentPercent: number;
  totalProjectedSpent: number;
  totalProjectedPercent: number;
  warningLevel: WarningLevel;
  warningMessage: string;
}

export interface PendingTransaction {
  merchant: string;
  amount: number;
  category: string;
  note?: string;
  /** UPI VPA (Virtual Payment Address) from the scanned QR code. */
  pa?: string;
  aiRoast?: string;
  budgetStatus?: string;
}

export interface UPIData {
  pa?: string;
  pn?: string;
  am?: string;
  cu?: string;
  mc?: string;
  tr?: string;
  tn?: string;
  mam?: string;
  tid?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// Wishlist & Savings
// ---------------------------------------------------------------------------

export type WishlistItemStatus = 'funding' | 'ready' | 'bought';

export interface WishlistBucket {
  id: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface WishlistItem {
  id: number;
  name: string;
  price: number;
  fundedAmount: number;
  url?: string | null;
  bucketId?: number | null;
  status: WishlistItemStatus;
  dateCreated: string;
}

// ---------------------------------------------------------------------------
// Split Feature
// ---------------------------------------------------------------------------

/** Reserved contact id for the user themself. */
export const SELF_CONTACT_ID = 0;

export type SplitType = 'equal' | 'exact' | 'percent' | 'dutch';
export type SettlementMethod = 'upi' | 'cash' | 'other';

export interface Contact {
  id: number;
  phone: string;
  name: string;
  vpaSuffix?: string | null;
  vpa?: string | null;
  avatarColor: string;
  hasApp: boolean;
  isSelf: boolean;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  color: string;
  icon: string;
  template: string;
  createdAt: string;
  sortOrder: number;
}

export interface GroupMember {
  id: number;
  groupId: number;
  contactId: number;
  joinedAt: string;
}

export interface SplitExpense {
  id: number;
  groupId: number | null;
  totalAmount: number;
  merchant: string;
  category: string;
  note?: string | null;
  paidBy: number;
  date: string;
  splitType: SplitType;
  settled: boolean;
  createdAt: string;
}

export interface SplitShare {
  id: number;
  splitExpenseId: number;
  contactId: number;
  shareAmount: number;
  orderAmount: number | null;
  settled: boolean;
  settledDate?: string | null;
}

export interface Settlement {
  id: number;
  fromContactId: number;
  toContactId: number;
  amount: number;
  method: SettlementMethod;
  date: string;
  note?: string | null;
  createdAt: string;
}

/** A shared item in a Dutch split (e.g. garlic bread that 3 of 4 people ate). */
export interface SharedItem {
  amount: number;
  consumerIds: number[];
}

/** Input for creating a split expense. */
export interface CreateSplitExpenseInput {
  totalAmount: number;
  merchant: string;
  category: string;
  note?: string;
  paidByContactId: number;
  groupId?: number | null;
  splitType: SplitType;
  shares: { contactId: number; amount: number; orderAmount?: number }[];
}

/** Result of simplifying debts within a group. */
export interface SimplifiedTransaction {
  from: number;
  to: number;
  amount: number;
}

/** Premade group template definition. */
export interface GroupTemplate {
  key: string;
  label: string;
  icon: string;
  color: string;
  hint: string;
}
