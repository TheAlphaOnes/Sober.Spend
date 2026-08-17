import { and, eq } from 'drizzle-orm';
import { create } from 'zustand';

import {
  db,
  contacts as contactsTable,
  splitGroups as groupsTable,
  groupMembers as membersTable,
  splitExpenses as expensesTable,
  splitShares as sharesTable,
  settlements as settlementsTable,
} from '@/db/schema';
import type {
  Contact,
  CreateSplitExpenseInput,
  Group,
  Settlement,
  SettlementMethod,
  SimplifiedTransaction,
  SplitExpense,
  SplitShare,
} from '@/types';
import { SELF_CONTACT_ID } from '@/types';
import {
  calculateContactBalance,
  calculateTotalBalances,
  getUnsettledShares,
  simplifyDebts,
} from '@/utils/split-engine';

// ---------------------------------------------------------------------------
// Row → domain mappers
// ---------------------------------------------------------------------------

function rowToContact(row: typeof contactsTable.$inferSelect): Contact {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    vpaSuffix: row.vpa_suffix,
    vpa: row.vpa,
    avatarColor: row.avatar_color,
    hasApp: row.has_app === 1,
    isSelf: row.is_self === 1,
    createdAt: row.created_at,
  };
}

function rowToGroup(row: typeof groupsTable.$inferSelect): Group {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    template: row.template,
    createdAt: row.created_at,
    sortOrder: row.sort_order,
  };
}

function rowToSplitExpense(row: typeof expensesTable.$inferSelect): SplitExpense {
  return {
    id: row.id,
    groupId: row.group_id,
    totalAmount: row.total_amount,
    merchant: row.merchant,
    category: row.category,
    note: row.note,
    paidBy: row.paid_by,
    date: row.date,
    splitType: row.split_type as SplitExpense['splitType'],
    settled: row.settled === 1,
    createdAt: row.created_at,
  };
}

function rowToSplitShare(row: typeof sharesTable.$inferSelect): SplitShare {
  return {
    id: row.id,
    splitExpenseId: row.split_expense_id,
    contactId: row.contact_id,
    shareAmount: row.share_amount,
    orderAmount: row.order_amount,
    settled: row.settled === 1,
    settledDate: row.settled_date,
  };
}

function rowToSettlement(row: typeof settlementsTable.$inferSelect): Settlement {
  return {
    id: row.id,
    fromContactId: row.from_contact_id,
    toContactId: row.to_contact_id,
    amount: row.amount,
    method: row.method as SettlementMethod,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// DB loaders
// ---------------------------------------------------------------------------

function loadContactsFromDB(): Contact[] {
  try {
    const rows = db.select().from(contactsTable).all();
    return rows.map(rowToContact);
  } catch (err) {
    console.error('[split-store] loadContacts failed:', err);
    return [];
  }
}

function loadGroupsFromDB(): Group[] {
  try {
    const rows = db.select().from(groupsTable).all();
    return rows.map(rowToGroup);
  } catch (err) {
    console.error('[split-store] loadGroups failed:', err);
    return [];
  }
}

function loadSplitExpensesFromDB(): SplitExpense[] {
  try {
    const rows = db.select().from(expensesTable).all();
    return rows.map(rowToSplitExpense);
  } catch (err) {
    console.error('[split-store] loadSplitExpenses failed:', err);
    return [];
  }
}

function loadSharesFromDB(): SplitShare[] {
  try {
    const rows = db.select().from(sharesTable).all();
    return rows.map(rowToSplitShare);
  } catch (err) {
    console.error('[split-store] loadShares failed:', err);
    return [];
  }
}

function loadSettlementsFromDB(): Settlement[] {
  try {
    const rows = db.select().from(settlementsTable).all();
    return rows.map(rowToSettlement);
  } catch (err) {
    console.error('[split-store] loadSettlements failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface SplitState {
  contacts: Contact[];
  groups: Group[];
  splitExpenses: SplitExpense[];
  shares: SplitShare[];
  settlements: Settlement[];
  preferredMode: 'groups' | 'people';

  // Loading
  loadAll: () => void;

  // Mode
  setPreferredMode: (mode: 'groups' | 'people') => void;

  // Contact operations
  addContact: (data: { phone: string; name: string; avatarColor: string }) => number;
  getContactByPhone: (phone: string) => Contact | undefined;
  getSelfContact: () => Contact | undefined;
  setContactVpa: (contactId: number, vpa: string) => void;
  setSelfPhone: (phone: string) => void;

  // Group operations
  createGroup: (data: {
    name: string;
    color: string;
    icon: string;
    template: string;
  }) => number;
  deleteGroup: (groupId: number) => void;
  addMember: (groupId: number, contactId: number) => void;
  removeMember: (groupId: number, contactId: number) => void;
  getGroupMembers: (groupId: number) => Contact[];

  // Split expense operations
  createSplitExpense: (data: CreateSplitExpenseInput) => number;
  deleteSplitExpense: (id: number) => void;
  markShareSettled: (splitExpenseId: number, contactId: number) => void;
  isSplitLocked: (splitExpenseId: number) => boolean;

  // Settlement operations
  recordSettlement: (data: {
    fromContactId: number;
    toContactId: number;
    amount: number;
    method: SettlementMethod;
    note?: string;
  }) => void;
  settleBalance: (
    contactId: number,
    amount: number,
    method: SettlementMethod,
  ) => void;

  // Computed
  getContactBalance: (contactId: number) => number;
  getGroupBalance: (groupId: number) => { owedToMe: number; iOwe: number };
  getTotalOwed: () => { owedToMe: number; iOwe: number };
  getGroupExpenses: (groupId: number) => SplitExpense[];
  getContactExpenses: (contactId: number) => SplitExpense[];
  getUnsettledSharesForContact: (contactId: number) => SplitShare[];
  getSimplifiedGroupSettlements: (groupId: number) => SimplifiedTransaction[];
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useSplitStore = create<SplitState>((set, get) => ({
  contacts: [],
  groups: [],
  splitExpenses: [],
  shares: [],
  settlements: [],
  preferredMode: 'groups',

  loadAll: () => {
    set({
      contacts: loadContactsFromDB(),
      groups: loadGroupsFromDB(),
      splitExpenses: loadSplitExpensesFromDB(),
      shares: loadSharesFromDB(),
      settlements: loadSettlementsFromDB(),
    });
  },

  setPreferredMode: (mode) => {
    set({ preferredMode: mode });
  },

  // --- Contact operations ---

  addContact: (data) => {
    const now = new Date().toISOString();
    try {
      db.insert(contactsTable)
        .values({
          phone: data.phone,
          name: data.name,
          avatar_color: data.avatarColor,
          has_app: 0,
          is_self: 0,
          created_at: now,
        })
        .run();
      const rows = db.select().from(contactsTable).all();
      const inserted = rows.find((r) => r.phone === data.phone);
      set({ contacts: loadContactsFromDB() });
      return inserted?.id ?? -1;
    } catch (err) {
      console.error('[split-store] addContact failed:', err);
      return -1;
    }
  },

  getContactByPhone: (phone) => {
    return get().contacts.find((c) => c.phone === phone);
  },

  getSelfContact: () => {
    return get().contacts.find((c) => c.isSelf);
  },

  setContactVpa: (contactId, vpa) => {
    try {
      db.update(contactsTable)
        .set({ vpa })
        .where(eq(contactsTable.id, contactId))
        .run();
      set({ contacts: loadContactsFromDB() });
    } catch (err) {
      console.error('[split-store] setContactVpa failed:', err);
    }
  },

  setSelfPhone: (phone) => {
    try {
      db.update(contactsTable)
        .set({ phone })
        .where(eq(contactsTable.id, SELF_CONTACT_ID))
        .run();
      set({ contacts: loadContactsFromDB() });
    } catch (err) {
      console.error('[split-store] setSelfPhone failed:', err);
    }
  },

  // --- Group operations ---

  createGroup: (data) => {
    const now = new Date().toISOString();
    const sortOrder = get().groups.length;
    try {
      db.insert(groupsTable)
        .values({
          name: data.name,
          color: data.color,
          icon: data.icon,
          template: data.template,
          created_at: now,
          sort_order: sortOrder,
        })
        .run();
      const rows = db.select().from(groupsTable).all();
      const inserted = rows.find((r) => r.name === data.name && r.sort_order === sortOrder);
      set({ groups: loadGroupsFromDB() });
      return inserted?.id ?? -1;
    } catch (err) {
      console.error('[split-store] createGroup failed:', err);
      return -1;
    }
  },

  deleteGroup: (groupId) => {
    try {
      // Unassign expenses from this group before deleting
      db.update(expensesTable)
        .set({ group_id: null })
        .where(eq(expensesTable.group_id, groupId))
        .run();
      db.delete(membersTable).where(eq(membersTable.group_id, groupId)).run();
      db.delete(groupsTable).where(eq(groupsTable.id, groupId)).run();
    } catch (err) {
      console.error('[split-store] deleteGroup failed:', err);
    }
    set({
      groups: loadGroupsFromDB(),
      splitExpenses: loadSplitExpensesFromDB(),
    });
  },

  addMember: (groupId, contactId) => {
    const now = new Date().toISOString();
    try {
      db.insert(membersTable)
        .values({
          group_id: groupId,
          contact_id: contactId,
          joined_at: now,
        })
        .onConflictDoNothing()
        .run();
    } catch (err) {
      console.error('[split-store] addMember failed:', err);
    }
  },

  removeMember: (groupId, contactId) => {
    try {
      db.delete(membersTable)
        .where(
          and(
            eq(membersTable.group_id, groupId),
            eq(membersTable.contact_id, contactId),
          ),
        )
        .run();
    } catch (err) {
      console.error('[split-store] removeMember failed:', err);
    }
  },

  getGroupMembers: (groupId) => {
    try {
      const memberRows = db.select().from(membersTable).all();
      const groupMemberRows = memberRows.filter((m) => m.group_id === groupId);
      const allContacts = get().contacts;
      const self = allContacts.find((c) => c.isSelf);
      const members: Contact[] = [];

      // Always include self in group members
      if (self) members.push(self);

      for (const memberRow of groupMemberRows) {
        const contact = allContacts.find((c) => c.id === memberRow.contact_id);
        if (contact && !contact.isSelf) {
          members.push(contact);
        }
      }
      return members;
    } catch (err) {
      console.error('[split-store] getGroupMembers failed:', err);
      return [];
    }
  },

  // --- Split expense operations ---

  createSplitExpense: (data) => {
    const now = new Date().toISOString();
    try {
      // 1. Insert the split expense
      db.insert(expensesTable)
        .values({
          group_id: data.groupId ?? null,
          total_amount: data.totalAmount,
          merchant: data.merchant,
          category: data.category,
          note: data.note ?? null,
          paid_by: data.paidByContactId,
          date: now,
          split_type: data.splitType,
          settled: 0,
          created_at: now,
        })
        .run();
      // Query the last inserted split expense
      const allRows = db.select().from(expensesTable).all();
      const inserted = allRows.find(
        (r) => r.merchant === data.merchant && r.date === now,
      );
      const splitExpenseId = inserted?.id ?? -1;
      if (splitExpenseId === -1) return -1;

      // 2. Insert shares for each person
      for (const share of data.shares) {
        // If the user paid and this is their own share, mark as settled
        const isOwnShareSettled =
          data.paidByContactId === SELF_CONTACT_ID &&
          share.contactId === SELF_CONTACT_ID;

        db.insert(sharesTable)
          .values({
            split_expense_id: splitExpenseId,
            contact_id: share.contactId,
            share_amount: share.amount,
            order_amount: share.orderAmount ?? null,
            settled: isOwnShareSettled ? 1 : 0,
            settled_date: isOwnShareSettled ? now : null,
          })
          .run();
      }

      set({
        splitExpenses: loadSplitExpensesFromDB(),
        shares: loadSharesFromDB(),
      });
      return splitExpenseId;
    } catch (err) {
      console.error('[split-store] createSplitExpense failed:', err);
      return -1;
    }
  },

  deleteSplitExpense: (id) => {
    try {
      // Delete shares first (cascade)
      db.delete(sharesTable)
        .where(eq(sharesTable.split_expense_id, id))
        .run();
      // Delete the expense
      db.delete(expensesTable).where(eq(expensesTable.id, id)).run();
    } catch (err) {
      console.error('[split-store] deleteSplitExpense failed:', err);
    }
    set({
      splitExpenses: loadSplitExpensesFromDB(),
      shares: loadSharesFromDB(),
    });
  },

  markShareSettled: (splitExpenseId, contactId) => {
    const now = new Date().toISOString();
    try {
      db.update(sharesTable)
        .set({ settled: 1, settled_date: now })
        .where(
          and(
            eq(sharesTable.split_expense_id, splitExpenseId),
            eq(sharesTable.contact_id, contactId),
          ),
        )
        .run();

      // Check if all shares are settled → mark expense as settled
      const allShares = db.select().from(sharesTable).all();
      const expenseShares = allShares.filter(
        (s) => s.split_expense_id === splitExpenseId,
      );
      const allSettled = expenseShares.every((s) => s.settled === 1);
      if (allSettled) {
        db.update(expensesTable)
          .set({ settled: 1 })
          .where(eq(expensesTable.id, splitExpenseId))
          .run();
      }

      set({
        shares: loadSharesFromDB(),
        splitExpenses: loadSplitExpensesFromDB(),
      });
    } catch (err) {
      console.error('[split-store] markShareSettled failed:', err);
    }
  },

  isSplitLocked: (splitExpenseId) => {
    const shares = get().shares.filter(
      (s) => s.splitExpenseId === splitExpenseId,
    );
    return shares.some((s) => s.settled);
  },

  // --- Settlement operations ---

  recordSettlement: (data) => {
    const now = new Date().toISOString();
    try {
      db.insert(settlementsTable)
        .values({
          from_contact_id: data.fromContactId,
          to_contact_id: data.toContactId,
          amount: data.amount,
          method: data.method,
          date: now,
          note: data.note ?? null,
          created_at: now,
        })
        .run();
      set({ settlements: loadSettlementsFromDB() });
    } catch (err) {
      console.error('[split-store] recordSettlement failed:', err);
    }
  },

  settleBalance: (contactId, amount, method) => {
    const state = get();
    const balance = state.getContactBalance(contactId);

    if (Math.abs(balance) < 0.01 || amount <= 0) return;

    // Record the settlement
    if (balance > 0) {
      // They owe the user → settlement from them to self
      state.recordSettlement({
        fromContactId: contactId,
        toContactId: SELF_CONTACT_ID,
        amount: Math.min(amount, balance),
        method,
      });
    } else {
      // User owes them → settlement from self to them
      state.recordSettlement({
        fromContactId: SELF_CONTACT_ID,
        toContactId: contactId,
        amount: Math.min(amount, Math.abs(balance)),
        method,
      });
    }

    // Mark shares as settled (oldest first)
    const unsettledShares = getUnsettledShares(
      contactId,
      state.splitExpenses,
      state.shares,
    );

    let remaining = Math.min(amount, Math.abs(balance));
    for (const share of unsettledShares) {
      if (remaining < 0.01) break;
      const settleAmount = Math.min(remaining, share.shareAmount);
      if (settleAmount >= share.shareAmount - 0.01) {
        // Full share settled
        state.markShareSettled(share.splitExpenseId, contactId);
      }
      remaining -= settleAmount;
    }
  },

  // --- Computed ---

  getContactBalance: (contactId) => {
    const state = get();
    return calculateContactBalance(
      contactId,
      state.splitExpenses,
      state.shares,
      state.settlements,
    );
  },

  getGroupBalance: (groupId) => {
    const state = get();
    const groupExpenses = state.splitExpenses.filter(
      (e) => e.groupId === groupId,
    );
    const groupShareIds = new Set(
      state.shares
        .filter((s) =>
          groupExpenses.some((e) => e.id === s.splitExpenseId),
        )
        .map((s) => s.id),
    );
    const groupShares = state.shares.filter((s) => groupShareIds.has(s.id));
    const groupSettlementIds = new Set(
      state.settlements
        .filter((st) => {
          // This is a simplification — group-level settlements are harder to
          // attribute. For now, we compute balance from shares only.
          return false;
        })
        .map((s) => s.id),
    );
    const groupSettlements = state.settlements.filter((s) =>
      groupSettlementIds.has(s.id),
    );

    // Calculate per-member balances
    const members = state.getGroupMembers(groupId);
    let owedToMe = 0;
    let iOwe = 0;

    for (const member of members) {
      if (member.isSelf) continue;
      const balance = calculateContactBalance(
        member.id,
        groupExpenses,
        groupShares,
        groupSettlements,
      );
      if (balance > 0) owedToMe += balance;
      else if (balance < 0) iOwe += Math.abs(balance);
    }

    return {
      owedToMe: Math.round(owedToMe * 100) / 100,
      iOwe: Math.round(iOwe * 100) / 100,
    };
  },

  getTotalOwed: () => {
    const state = get();
    return calculateTotalBalances(
      state.contacts,
      state.splitExpenses,
      state.shares,
      state.settlements,
    );
  },

  getGroupExpenses: (groupId) => {
    return get()
      .splitExpenses.filter((e) => e.groupId === groupId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getContactExpenses: (contactId) => {
    const state = get();
    // Expenses where either the user fronted and this contact has a share,
    // or this contact fronted and the user has a share
    const relevantExpenseIds = new Set<number>();
    for (const share of state.shares) {
      if (share.contactId === contactId || share.contactId === SELF_CONTACT_ID) {
        const expense = state.splitExpenses.find(
          (e) => e.id === share.splitExpenseId,
        );
        if (expense) {
          // Check if this expense involves both the user and this contact
          const expenseShares = state.shares.filter(
            (s) => s.splitExpenseId === expense.id,
          );
          const involvesUser = expenseShares.some(
            (s) => s.contactId === SELF_CONTACT_ID,
          );
          const involvesContact = expenseShares.some(
            (s) => s.contactId === contactId,
          );
          if (involvesUser && involvesContact) {
            relevantExpenseIds.add(expense.id);
          }
        }
      }
    }
    return state.splitExpenses
      .filter((e) => relevantExpenseIds.has(e.id))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getUnsettledSharesForContact: (contactId) => {
    const state = get();
    return getUnsettledShares(
      contactId,
      state.splitExpenses,
      state.shares,
    );
  },

  getSimplifiedGroupSettlements: (groupId) => {
    const state = get();
    const members = state.getGroupMembers(groupId);
    const groupExpenses = state.splitExpenses.filter(
      (e) => e.groupId === groupId,
    );
    const groupShareIds = new Set(
      state.shares
        .filter((s) => groupExpenses.some((e) => e.id === s.splitExpenseId))
        .map((s) => s.id),
    );
    const groupShares = state.shares.filter((s) => groupShareIds.has(s.id));

    // Calculate net balance for each member
    const balances = new Map<number, number>();
    for (const member of members) {
      const balance = calculateContactBalance(
        member.id,
        groupExpenses,
        groupShares,
        [], // No settlements for group-level simplification
      );
      balances.set(member.id, balance);
    }

    return simplifyDebts(balances);
  },
}));
