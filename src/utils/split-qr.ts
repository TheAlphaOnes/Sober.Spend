export type SplitQR =
  | { type: 'join'; token: string }
  | { type: 'me'; name: string; phone?: string; userId?: string };

const JOIN = 'soberspend://split/join';
const ME = 'soberspend://split/me';

export function groupJoinUrl(token: string): string {
  return `${JOIN}?t=${encodeURIComponent(token)}`;
}

export function meUrl(name: string, phone?: string, userId?: string): string {
  const q = new URLSearchParams({ n: name });
  if (phone) q.set('p', phone);
  if (userId) q.set('u', userId);
  return `${ME}?${q.toString()}`;
}

export function parseSplitQR(raw: string): SplitQR | null {
  const t = raw.trim();
  if (t.toLowerCase().startsWith('upi://')) return null;

  try {
    const url = t.includes('://') ? t : `soberspend://${t}`;
    const u = new URL(url.replace(/^soberspend:/i, 'https:'));
    const hostPath = `${u.host}${u.pathname}`.replace(/\/+$/, '');
    if (hostPath === 'split/join' || hostPath.endsWith('split/join')) {
      const token = u.searchParams.get('t') || u.searchParams.get('token');
      if (!token) return null;
      return { type: 'join', token };
    }
    if (hostPath === 'split/me' || hostPath.endsWith('split/me')) {
      const name = u.searchParams.get('n') || u.searchParams.get('name') || 'Friend';
      const phone = u.searchParams.get('p') || u.searchParams.get('phone') || undefined;
      const userId = u.searchParams.get('u') || undefined;
      return { type: 'me', name, phone, userId };
    }
  } catch {
    return null;
  }
  return null;
}
