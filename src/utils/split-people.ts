import type { SplitGroup, SplitMember } from '@/types';
import { normalizePhone } from '@/utils/phone';

export type SplitPerson = {
  key: string;
  name: string;
  phone?: string;
  groupNames: string[];
  groupIds: string[];
  friendGroupId?: string;
};

export function peopleKey(name: string, phone?: string | null): string {
  const p = phone ? normalizePhone(phone) : '';
  if (p.length >= 10) return `p:${p}`;
  return `n:${name.trim().toLowerCase()}`;
}

export function uniquePeople(groups: SplitGroup[], members: SplitMember[]): SplitPerson[] {
  const map = new Map<string, SplitPerson>();
  for (const m of members) {
    if (m.isSelf || m.leftAt) continue;
    const g = groups.find((x) => x.id === m.groupId);
    if (!g) continue;
    const key = peopleKey(m.displayName, m.phone);
    const cur = map.get(key);
    if (cur) {
      if (!cur.groupNames.includes(g.name)) cur.groupNames.push(g.name);
      if (!cur.groupIds.includes(g.id)) cur.groupIds.push(g.id);
      if (g.kind === 'friend') cur.friendGroupId = g.id;
      if (m.phone && !cur.phone) cur.phone = normalizePhone(m.phone);
    } else {
      map.set(key, {
        key,
        name: m.displayName,
        phone: m.phone ? normalizePhone(m.phone) : undefined,
        groupNames: [g.name],
        groupIds: [g.id],
        friendGroupId: g.kind === 'friend' ? g.id : undefined,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function personColorIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 6;
  return h;
}
