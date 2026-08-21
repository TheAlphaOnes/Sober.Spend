import { useRouter } from 'expo-router';
import { ChevronRight, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NeoCard } from '@/components/ui/neo-card';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useSplitStore } from '@/stores/split-store';
import { formatCurrency } from '@/utils/format';
import { balancesForGroup, oweLabel } from '@/utils/split-engine';

export function SplitDashboardCard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { groups, members, expenses, shares, payments, draft } = useSplitStore();
  const active = groups.filter((g) => g.isActive);

  let net = 0;
  for (const g of active) {
    const ms = members.filter((m) => m.groupId === g.id);
    const self = ms.find((m) => m.isSelf);
    if (!self) continue;
    const es = expenses.filter((e) => e.groupId === g.id);
    const ids = new Set(es.map((e) => e.id));
    const sh = shares.filter((s) => ids.has(s.expenseId));
    const py = payments.filter((p) => p.groupId === g.id);
    const bal = balancesForGroup(ms, es, sh, py);
    net += bal[self.id] ?? 0;
  }
  const label = oweLabel(net);
  const tone =
    label.tone === 'owed' ? Colors.safe : label.tone === 'owe' ? Colors.exceeded : Colors.textMuted;

  return (
    <Pressable onPress={() => router.push(user ? '/split' : '/profile')}>
      <NeoCard color={Colors.surface} offset="sm" textured>
        {user && draft ? (
          <Text style={styles.draft}>
            You paid {formatCurrency(draft.amount)}. Split it or keep the full bill.
          </Text>
        ) : null}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.kickerRow}>
              <Users size={16} color={Colors.accent} strokeWidth={2.5} />
              <Text style={styles.kicker}>SPLIT</Text>
            </View>
            {!user ? (
              <Text style={styles.empty}>Sign in to split with friends.</Text>
            ) : active.length === 0 ? (
              <Text style={styles.empty}>No splits yet.</Text>
            ) : (
              <>
                <Text style={[styles.hero, { color: tone }]}>
                  {label.tone === 'settled' ? 'Settled' : formatCurrency(Math.abs(net))}
                </Text>
                <Text style={styles.sub}>{label.text}</Text>
              </>
            )}
          </View>
          <View style={styles.right}>
            {user && active.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{active.length}</Text>
              </View>
            ) : null}
            <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.5} />
          </View>
        </View>
      </NeoCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  draft: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  kicker: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  empty: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.textMuted },
  hero: { fontFamily: Fonts.display, fontSize: FontSizes.xxl },
  sub: { fontFamily: Fonts.display, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  badgeText: { fontFamily: Fonts.display, fontSize: FontSizes.xs, color: Colors.white },
});
