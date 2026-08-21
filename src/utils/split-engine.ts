import type { SplitExpense, SplitMember, SplitPayment, SplitShare } from '@/types';

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function equalShares(
  total: number,
  memberIds: string[],
  payerId: string,
): Record<string, number> {
  if (memberIds.length === 0) return {};
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / memberIds.length);
  let rem = cents - base * memberIds.length;
  const out: Record<string, number> = {};
  for (const id of memberIds) out[id] = base / 100;
  const target = memberIds.includes(payerId) ? payerId : memberIds[0];
  out[target] = roundMoney(out[target] + rem / 100);
  return out;
}

/** Locked amounts stay put; everyone else splits what's left of the total. */
export function spreadDutch(
  total: number,
  memberIds: string[],
  locked: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (memberIds.length === 0) return out;
  let lockedSum = 0;
  const unlocked: string[] = [];
  for (const id of memberIds) {
    if (Object.prototype.hasOwnProperty.call(locked, id)) {
      const v = roundMoney(locked[id] || 0);
      out[id] = v;
      lockedSum += v;
    } else {
      unlocked.push(id);
    }
  }
  const remaining = roundMoney(total - lockedSum);
  if (unlocked.length === 0) return out;
  if (remaining <= 0) {
    for (const id of unlocked) out[id] = 0;
    return out;
  }
  const cents = Math.round(remaining * 100);
  const base = Math.floor(cents / unlocked.length);
  let rem = cents - base * unlocked.length;
  for (const id of unlocked) {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    out[id] = (base + extra) / 100;
  }
  return out;
}

export function moneyInput(n: number): string {
  const r = roundMoney(n);
  if (!Number.isFinite(r) || r === 0) return '0';
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

export function dutchShares(
  total: number,
  assignments: Record<string, number>,
  payerId: string,
): Record<string, number> {
  const keys = Object.keys(assignments);
  const assigned = keys.reduce((s, k) => s + (assignments[k] || 0), 0);
  const leftover = roundMoney(total - assigned);
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = roundMoney(assignments[k] || 0);
  if (leftover < 0) throw new Error('Dutch leftover is negative');
  if (leftover > 0) {
    if (!(payerId in out)) out[payerId] = 0;
    out[payerId] = roundMoney(out[payerId] + leftover);
  }
  return out;
}

export function balancesForGroup(
  members: SplitMember[],
  expenses: SplitExpense[],
  shares: SplitShare[],
  payments: SplitPayment[],
): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const m of members) bal[m.id] = 0;

  for (const e of expenses.filter((x) => !x.deletedAt)) {
    if (bal[e.paidById] === undefined) bal[e.paidById] = 0;
    bal[e.paidById] = roundMoney(bal[e.paidById] + e.totalAmount);
    for (const s of shares.filter((x) => x.expenseId === e.id)) {
      if (bal[s.memberId] === undefined) bal[s.memberId] = 0;
      bal[s.memberId] = roundMoney(bal[s.memberId] - s.amount);
    }
  }

  for (const p of payments.filter((x) => !x.deletedAt)) {
    if (bal[p.fromId] === undefined) bal[p.fromId] = 0;
    if (bal[p.toId] === undefined) bal[p.toId] = 0;
    bal[p.fromId] = roundMoney(bal[p.fromId] + p.amount);
    bal[p.toId] = roundMoney(bal[p.toId] - p.amount);
  }
  return bal;
}

export function pairwiseBalancesForUser(
  meId: string,
  members: SplitMember[],
  expenses: SplitExpense[],
  shares: SplitShare[],
  payments: SplitPayment[],
): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const m of members) {
    if (m.id !== meId) bal[m.id] = 0;
  }

  for (const e of expenses.filter((x) => !x.deletedAt)) {
    if (e.paidById === meId) {
      for (const s of shares.filter((x) => x.expenseId === e.id && x.memberId !== meId)) {
        if (bal[s.memberId] !== undefined) {
          bal[s.memberId] = roundMoney(bal[s.memberId] + s.amount);
        }
      }
    } else {
      const myShare = shares.find((x) => x.expenseId === e.id && x.memberId === meId);
      if (myShare && bal[e.paidById] !== undefined) {
        bal[e.paidById] = roundMoney(bal[e.paidById] - myShare.amount);
      }
    }
  }

  for (const p of payments.filter((x) => !x.deletedAt)) {
    if (p.toId === meId && bal[p.fromId] !== undefined) {
      bal[p.fromId] = roundMoney(bal[p.fromId] - p.amount);
    }
    if (p.fromId === meId && bal[p.toId] !== undefined) {
      bal[p.toId] = roundMoney(bal[p.toId] + p.amount);
    }
  }
  return bal;
}

export const SPLIT_SELF = '__self';

export function remainingPayable(me: number, them: number): number {
  return roundMoney(Math.min(Math.max(-me, 0), Math.max(them, 0)));
}

/** Pairwise cap: you owe them, or they owe you. Zero if balances don't oppose. */
export function pairRemaining(
  selfBal: number,
  themBal: number,
): { amount: number; youOwe: boolean } {
  const youOwe = remainingPayable(selfBal, themBal);
  const theyOwe = remainingPayable(themBal, selfBal);
  if (youOwe > 0.009) return { amount: youOwe, youOwe: true };
  if (theyOwe > 0.009) return { amount: theyOwe, youOwe: false };
  return { amount: 0, youOwe: false };
}

export function oweLabel(amount: number): { text: string; tone: 'owe' | 'owed' | 'settled' } {
  if (amount > 0.009) return { text: 'They owe you', tone: 'owed' };
  if (amount < -0.009) return { text: 'You owe', tone: 'owe' };
  return { text: 'Settled', tone: 'settled' };
}

/** That person's net in the group — not pairwise vs you. */
export function memberBalanceCopy(amount: number): { text: string; tone: 'owe' | 'owed' | 'settled' } {
  if (amount > 0.009) return { text: 'Is owed', tone: 'owed' };
  if (amount < -0.009) return { text: 'Owes', tone: 'owe' };
  return { text: 'Settled', tone: 'settled' };
}
