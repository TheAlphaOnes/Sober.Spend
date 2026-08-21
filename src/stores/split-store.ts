import { eq } from 'drizzle-orm';
import { create } from 'zustand';

import {
  db,
  expenses as expensesTable,
  settings,
  splitExpenses as expensesSplitTable,
  splitGroups,
  splitMembers,
  splitPayments,
  splitShares,
} from '@/db/schema';
import { Colors } from '@/constants/theme';
import type {
  PayMethod,
  SplitDraft,
  SplitExpense,
  SplitGroup,
  SplitKind,
  SplitMember,
  SplitMode,
  SplitPayment,
  SplitPendingPerson,
  SplitScanIntent,
  SplitShare,
} from '@/types';
import { dutchShares, equalShares, SPLIT_SELF } from '@/utils/split-engine';
import { newId } from '@/utils/id';
import { normalizePhone } from '@/utils/phone';

const DRAFT_KEY = 'split_decision_draft';
const ME_NAME = 'split_me_name';
const ME_PHONE = 'split_me_phone';
const PENDING_ME = 'split_pending_me';

function nowIso() {
  return new Date().toISOString();
}

function readSetting(key: string): string | null {
  try {
    return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

function rowGroup(r: typeof splitGroups.$inferSelect): SplitGroup {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind as SplitKind,
    color: r.color,
    inviteToken: r.invite_token,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowMember(r: typeof splitMembers.$inferSelect): SplitMember {
  return {
    id: r.id,
    groupId: r.group_id,
    displayName: r.display_name,
    phone: r.phone,
    userId: r.user_id,
    isSelf: r.is_self === 1,
    leftAt: r.left_at,
  };
}

function rowExpense(r: typeof expensesSplitTable.$inferSelect): SplitExpense {
  return {
    id: r.id,
    groupId: r.group_id,
    paidById: r.paid_by_id,
    totalAmount: r.total_amount,
    merchant: r.merchant,
    category: r.category,
    note: r.note,
    mode: r.mode as SplitMode,
    occurredAt: r.occurred_at,
    deletedAt: r.deleted_at,
  };
}

function rowShare(r: typeof splitShares.$inferSelect): SplitShare {
  return {
    id: r.id,
    expenseId: r.expense_id,
    memberId: r.member_id,
    amount: r.amount,
  };
}

function rowPay(r: typeof splitPayments.$inferSelect): SplitPayment {
  return {
    id: r.id,
    groupId: r.group_id,
    fromId: r.from_id,
    toId: r.to_id,
    amount: r.amount,
    method: r.method as PayMethod,
    occurredAt: r.occurred_at,
    deletedAt: r.deleted_at,
  };
}

function insertSelf(groupId: string): string {
  const id = newId();
  db.insert(splitMembers)
    .values({
      id,
      group_id: groupId,
      display_name: 'You',
      phone: readSetting(ME_PHONE),
      user_id: null,
      is_self: 1,
      left_at: null,
    })
    .run();
  return id;
}

export interface AddExpenseInput {
  groupId?: string;
  kind?: SplitKind;
  groupName?: string;
  amount: number;
  merchant: string;
  category?: string;
  note?: string;
  paidById?: string;
  inMemberIds: string[];
  guests: { name: string; phone?: string; userId?: string; dutch?: number }[];
  mode: SplitMode;
  dutchAmounts?: Record<string, number>;
  occurredAt?: string;
}

interface SplitState {
  groups: SplitGroup[];
  members: SplitMember[];
  expenses: SplitExpense[];
  shares: SplitShare[];
  payments: SplitPayment[];
  draft: SplitDraft | null;
  meName: string;
  mePhone: string;
  pendingPerson: SplitPendingPerson | null;
  scanIntent: SplitScanIntent | null;

  loadSplit: () => void;
  setMe: (name: string, phone: string) => void;
  setDraft: (draft: SplitDraft | null) => void;
  setPendingPerson: (p: SplitPendingPerson | null) => void;
  setScanIntent: (intent: SplitScanIntent | null) => void;
  createGroup: (name: string) => string;
  addMember: (groupId: string, name: string, phone?: string, userId?: string) => string;
  addExpense: (input: AddExpenseInput) => string;
  payBack: (groupId: string, fromId: string, toId: string, amount: number, method: PayMethod) => void;
  undoPayment: (id: string) => void;
  undoExpense: (id: string) => void;
  rotateToken: (groupId: string) => void;
  setGroupActive: (groupId: string, active: boolean) => void;
  deleteGroup: (groupId: string) => void;
  findGroupByToken: (token: string) => SplitGroup | undefined;
  joinByToken: (token: string) => string | null;
}

export const useSplitStore = create<SplitState>((set, get) => ({
  groups: [],
  members: [],
  expenses: [],
  shares: [],
  payments: [],
  draft: null,
  meName: 'You',
  mePhone: '',
  pendingPerson: null,
  scanIntent: null,

  loadSplit: () => {
    try {
      const draftRaw = readSetting(DRAFT_KEY);
      let draft: SplitDraft | null = null;
      if (draftRaw) {
        try {
          draft = JSON.parse(draftRaw) as SplitDraft;
        } catch {
          draft = null;
        }
      }
      const pendingRaw = readSetting(PENDING_ME);
      let pendingPerson: SplitPendingPerson | null = null;
      if (pendingRaw) {
        try {
          pendingPerson = JSON.parse(pendingRaw);
        } catch {
          pendingPerson = null;
        }
      }
      set({
        groups: db.select().from(splitGroups).all().map(rowGroup),
        members: db.select().from(splitMembers).all().map(rowMember),
        expenses: db.select().from(expensesSplitTable).all().map(rowExpense),
        shares: db.select().from(splitShares).all().map(rowShare),
        payments: db.select().from(splitPayments).all().map(rowPay),
        draft,
        meName: readSetting(ME_NAME) || 'You',
        mePhone: readSetting(ME_PHONE) || '',
        pendingPerson,
      });
    } catch (err) {
      console.error('[split-store] load failed:', err);
    }
  },

  setMe: (name, phone) => {
    writeSetting(ME_NAME, name.trim() || 'You');
    writeSetting(ME_PHONE, normalizePhone(phone));
    set({ meName: name.trim() || 'You', mePhone: normalizePhone(phone) });
  },

  setDraft: (draft) => {
    writeSetting(DRAFT_KEY, draft ? JSON.stringify(draft) : '');
    set({ draft });
  },

  setPendingPerson: (p) => {
    writeSetting(PENDING_ME, p ? JSON.stringify(p) : '');
    set({ pendingPerson: p });
  },

  setScanIntent: (intent) => set({ scanIntent: intent }),

  createGroup: (name) => {
    const id = newId();
    const ts = nowIso();
    db.insert(splitGroups)
      .values({
        id,
        name: name.trim() || 'Group',
        kind: 'group',
        color: Colors.blue,
        invite_token: newId().replace(/-/g, '').slice(0, 16),
        is_active: 1,
        created_at: ts,
        updated_at: ts,
      })
      .run();
    insertSelf(id);
    get().loadSplit();
    return id;
  },

  addMember: (groupId, name, phone, userId) => {
    const normalized = phone ? normalizePhone(phone) : null;
    if (normalized) {
      const existing = db
        .select()
        .from(splitMembers)
        .where(eq(splitMembers.group_id, groupId))
        .all()
        .find((m) => m.phone === normalized && m.is_self !== 1);
      if (existing) return existing.id;
    }
    const id = newId();
    db.insert(splitMembers)
      .values({
        id,
        group_id: groupId,
        display_name: name.trim() || 'Friend',
        phone: normalized,
        user_id: userId ?? null,
        is_self: 0,
        left_at: null,
      })
      .run();
    get().loadSplit();
    return id;
  },

  addExpense: (input) => {
    const ts = input.occurredAt ?? nowIso();
    let groupId = input.groupId;
    let paidById = input.paidById;
    let selfId: string | undefined;
    const guestIds: string[] = [];
    const dutchMap: Record<string, number> = { ...(input.dutchAmounts ?? {}) };

    const addGuestRow = (gid: string, g: AddExpenseInput['guests'][number]) => {
      const phone = g.phone ? normalizePhone(g.phone) : null;
      if (phone) {
        const existing = db
          .select()
          .from(splitMembers)
          .where(eq(splitMembers.group_id, gid))
          .all()
          .find((m) => m.phone === phone && m.is_self !== 1);
        if (existing) {
          if (g.dutch != null) dutchMap[existing.id] = g.dutch;
          guestIds.push(existing.id);
          return;
        }
      }
      const mid = newId();
      db.insert(splitMembers)
        .values({
          id: mid,
          group_id: gid,
          display_name: g.name.trim() || 'Friend',
          phone,
          user_id: g.userId ?? null,
          is_self: 0,
          left_at: null,
        })
        .run();
      if (g.dutch != null) dutchMap[mid] = g.dutch;
      guestIds.push(mid);
    };

    if (!groupId) {
      groupId = newId();
      const kind = input.kind ?? (input.guests.length <= 1 ? 'friend' : 'group');
      const name =
        input.groupName?.trim() ||
        (kind === 'friend'
          ? input.guests[0]?.name || 'Friend'
          : input.guests.map((g) => g.name).slice(0, 3).join(', ') || 'Group');
      db.insert(splitGroups)
        .values({
          id: groupId,
          name,
          kind,
          color: kind === 'friend' ? Colors.pink : Colors.blue,
          invite_token: newId().replace(/-/g, '').slice(0, 16),
          is_active: 1,
          created_at: ts,
          updated_at: ts,
        })
        .run();
      selfId = insertSelf(groupId);
      paidById = selfId;
      for (const g of input.guests) addGuestRow(groupId, g);
    } else {
      const all = db
        .select()
        .from(splitMembers)
        .where(eq(splitMembers.group_id, groupId))
        .all();
      selfId = all.find((m) => m.is_self === 1)?.id;
      paidById = input.paidById || selfId;
      for (const g of input.guests) addGuestRow(groupId, g);
    }

    if (!paidById) throw new Error('No payer');

    if (selfId && dutchMap[SPLIT_SELF] != null) {
      dutchMap[selfId] = dutchMap[SPLIT_SELF];
      delete dutchMap[SPLIT_SELF];
    }

    const includeSelf =
      input.inMemberIds.includes(SPLIT_SELF) ||
      (selfId != null && input.inMemberIds.includes(selfId));
    const inIds = [
      ...(includeSelf && selfId ? [selfId] : []),
      ...input.inMemberIds.filter((id) => id !== SPLIT_SELF && id !== selfId),
      ...guestIds,
    ];
    const uniqueIn = [...new Set(inIds)];

    const shareMap =
      input.mode === 'dutch'
        ? dutchShares(input.amount, dutchMap, paidById)
        : equalShares(input.amount, uniqueIn.length ? uniqueIn : [paidById], paidById);

    const expenseId = newId();
    db.insert(expensesSplitTable)
      .values({
        id: expenseId,
        group_id: groupId,
        paid_by_id: paidById,
        total_amount: input.amount,
        merchant: input.merchant.trim() || 'Split',
        category: input.category ?? null,
        note: input.note ?? null,
        mode: input.mode,
        occurred_at: ts,
        deleted_at: null,
      })
      .run();

    for (const [memberId, amount] of Object.entries(shareMap)) {
      if (amount <= 0) continue;
      db.insert(splitShares)
        .values({ id: newId(), expense_id: expenseId, member_id: memberId, amount })
        .run();
    }

    db.update(splitGroups)
      .set({ updated_at: ts })
      .where(eq(splitGroups.id, groupId))
      .run();

    const myShare = selfId ? (shareMap[selfId] ?? 0) : 0;
    if (myShare > 0) {
      db.insert(expensesTable)
        .values({
          amount: myShare,
          category: input.category || 'Other',
          merchant: input.merchant.trim() || 'Split',
          note: 'Split',
          date: ts,
        })
        .run();
    }

    writeSetting(DRAFT_KEY, '');
    writeSetting(PENDING_ME, '');
    get().loadSplit();
    try {
      const { useExpenseStore } = require('@/stores/expense-store') as typeof import('@/stores/expense-store');
      useExpenseStore.getState().loadExpenses();
    } catch {
      /* ignore */
    }
    return groupId;
  },

  payBack: (groupId, fromId, toId, amount, method) => {
    const ts = nowIso();
    db.insert(splitPayments)
      .values({
        id: newId(),
        group_id: groupId,
        from_id: fromId,
        to_id: toId,
        amount,
        method,
        occurred_at: ts,
        deleted_at: null,
      })
      .run();
    db.update(splitGroups)
      .set({ updated_at: ts })
      .where(eq(splitGroups.id, groupId))
      .run();
    get().loadSplit();
  },

  undoPayment: (id) => {
    db.update(splitPayments)
      .set({ deleted_at: nowIso() })
      .where(eq(splitPayments.id, id))
      .run();
    get().loadSplit();
  },

  undoExpense: (id) => {
    db.update(expensesSplitTable)
      .set({ deleted_at: nowIso() })
      .where(eq(expensesSplitTable.id, id))
      .run();
    get().loadSplit();
  },

  rotateToken: (groupId) => {
    db.update(splitGroups)
      .set({ invite_token: newId().replace(/-/g, '').slice(0, 16), updated_at: nowIso() })
      .where(eq(splitGroups.id, groupId))
      .run();
    get().loadSplit();
  },

  setGroupActive: (groupId, active) => {
    db.update(splitGroups)
      .set({ is_active: active ? 1 : 0, updated_at: nowIso() })
      .where(eq(splitGroups.id, groupId))
      .run();
    get().loadSplit();
  },

  deleteGroup: (groupId) => {
    const exp = db
      .select()
      .from(expensesSplitTable)
      .where(eq(expensesSplitTable.group_id, groupId))
      .all();
    for (const e of exp) {
      db.delete(splitShares).where(eq(splitShares.expense_id, e.id)).run();
    }
    db.delete(expensesSplitTable).where(eq(expensesSplitTable.group_id, groupId)).run();
    db.delete(splitPayments).where(eq(splitPayments.group_id, groupId)).run();
    db.delete(splitMembers).where(eq(splitMembers.group_id, groupId)).run();
    db.delete(splitGroups).where(eq(splitGroups.id, groupId)).run();
    get().loadSplit();
  },

  findGroupByToken: (token) => get().groups.find((g) => g.inviteToken === token && g.isActive),

  joinByToken: (token) => {
    const g = get().findGroupByToken(token);
    return g?.id ?? null;
  },
}));
