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

export type SplitKind = 'friend' | 'group';
export type SplitMode = 'equal' | 'dutch';
export type PayMethod = 'upi' | 'cash';

export interface SplitGroup {
  id: string;
  name: string;
  kind: SplitKind;
  color: string;
  inviteToken: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SplitMember {
  id: string;
  groupId: string;
  displayName: string;
  phone?: string | null;
  userId?: string | null;
  isSelf: boolean;
  leftAt?: string | null;
}

export interface SplitExpense {
  id: string;
  groupId: string;
  paidById: string;
  totalAmount: number;
  merchant: string;
  category?: string | null;
  note?: string | null;
  mode: SplitMode;
  occurredAt: string;
  deletedAt?: string | null;
}

export interface SplitShare {
  id: string;
  expenseId: string;
  memberId: string;
  amount: number;
}

export interface SplitPayment {
  id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  method: PayMethod;
  occurredAt: string;
  deletedAt?: string | null;
}

export interface SplitDraft {
  amount: number;
  merchant: string;
  category: string;
  note?: string;
  paidAt: string;
}

export type SplitScanIntent =
  | { kind: 'expense' }
  | { kind: 'list' }
  | { kind: 'group'; groupId: string };

export interface SplitPendingPerson {
  name: string;
  phone?: string;
  userId?: string;
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
