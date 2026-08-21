import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, UserPlus, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SplitRow } from '@/components/split/split-row';
import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useExpenseStore } from '@/stores/expense-store';
import { useSplitStore } from '@/stores/split-store';
import { pickContact } from '@/utils/contacts';
import { formatCurrency } from '@/utils/format';
import { chipColor } from '@/components/split/person-chips';
import { balancesForGroup, pairwiseBalancesForUser, oweLabel } from '@/utils/split-engine';
import { peopleKey, personColorIndex, uniquePeople } from '@/utils/split-people';

export default function SplitListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    groups,
    members,
    expenses,
    shares,
    payments,
    loadSplit,
    draft,
    setDraft,
    setPendingPerson,
  } = useSplitStore();
  const user = useAuthStore((s) => s.user);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const [tab, setTab] = useState<'group' | 'friend'>('group');
  const [addOpen, setAddOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSplit();
    }, [loadSplit]),
  );

  const listed = useMemo(
    () =>
      groups
        .filter((g) => g.kind === 'group')
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return b.updatedAt.localeCompare(a.updatedAt);
        }),
    [groups],
  );

  const friends = useMemo(() => uniquePeople(groups, members), [groups, members]);

  if (!user) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <NeoBackButton />
          <Text style={styles.title}>Split</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>Split is online</Text>
          <Text style={styles.lockedDesc}>Sign in so friends can see the same group.</Text>
          <NeoButton title="Sign in" variant="primary" size="lg" onPress={() => router.push('/profile')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Split</Text>
        <Pressable
          onPress={() => setAddOpen(true)}
          style={styles.add}
          accessibilityRole="button"
          accessibilityLabel="Add">
          <Plus size={20} color={Colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {draft ? (
          <NeoCard color={Colors.surface} offset="sm">
            <Text style={styles.draft}>
              You paid {formatCurrency(draft.amount)}. Split it or keep the full bill.
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
              <NeoButton title="Split it" variant="primary" size="sm" onPress={() => router.push('/split/expense')} />
              <NeoButton
                title="Keep the full bill"
                variant="outline"
                size="sm"
                onPress={() => {
                  addExpense({
                    amount: draft.amount,
                    category: draft.category,
                    merchant: draft.merchant,
                    note: draft.note ?? null,
                  });
                  setDraft(null);
                }}
              />
            </View>
          </NeoCard>
        ) : null}

        <View style={styles.tabs}>
          {(['group', 'friend'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'group' ? 'Groups' : 'Friends'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.list}>
        {tab === 'group'
          ? listed.map((g, i) => {
              const ms = members.filter((m) => m.groupId === g.id);
              const self = ms.find((m) => m.isSelf);
              const es = expenses.filter((e) => e.groupId === g.id);
              const ids = new Set(es.map((e) => e.id));
              const bal = balancesForGroup(
                ms,
                es,
                shares.filter((s) => ids.has(s.expenseId)),
                payments.filter((p) => p.groupId === g.id),
              );
              const mine = self ? (bal[self.id] ?? 0) : 0;
              const label = oweLabel(mine);
              const tone =
                label.tone === 'owed' ? Colors.safe : label.tone === 'owe' ? Colors.exceeded : Colors.textMuted;
              return (
                <SplitRow
                  key={g.id}
                  delay={Math.min(i, 5) * 40}
                  title={g.name}
                  subtitle={g.isActive ? label.text : 'Inactive'}
                  amount={g.isActive && label.tone !== 'settled' ? formatCurrency(Math.abs(mine)) : undefined}
                  amountColor={tone}
                  accent={g.color}
                  icon={<Users size={16} color={Colors.black} strokeWidth={2.5} />}
                  onPress={() => router.push(`/split/${g.id}`)}
                />
              );
            })
          : friends.map((f, i) => {
              let totalMine = 0;
              const myMembers = members.filter(m => m.isSelf);
              
              for (const mySelf of myMembers) {
                const friendsInGroup = members.filter(m => m.groupId === mySelf.groupId && !m.isSelf && peopleKey(m.displayName, m.phone) === f.key);
                if (friendsInGroup.length === 0) continue;
                
                const es = expenses.filter(e => e.groupId === mySelf.groupId);
                const ids = new Set(es.map(e => e.id));
                const groupShares = shares.filter(s => ids.has(s.expenseId));
                const groupPayments = payments.filter(p => p.groupId === mySelf.groupId);
                
                const pairwise = pairwiseBalancesForUser(mySelf.id, members.filter(m => m.groupId === mySelf.groupId), es, groupShares, groupPayments);
                
                for (const friend of friendsInGroup) {
                  totalMine += (pairwise[friend.id] ?? 0);
                }
              }
              
              const label = oweLabel(totalMine);
              let amount: string | undefined;
              let amountColor: string = Colors.textMuted;
              
              if (label.tone !== 'settled') {
                amount = formatCurrency(Math.abs(totalMine));
                amountColor = label.tone === 'owed' ? Colors.safe : Colors.exceeded;
              }
              
              return (
                <SplitRow
                  key={f.key}
                  delay={Math.min(i, 5) * 40}
                  title={f.name}
                  subtitle={f.groupNames.join(' · ')}
                  amount={amount}
                  amountColor={amountColor}
                  accent={chipColor(personColorIndex(f.name))}
                  onPress={() =>
                    router.push(
                      `/split/person?n=${encodeURIComponent(f.name)}&p=${encodeURIComponent(f.phone || '')}`,
                    )
                  }
                />
              );
            })}
        </View>

        {tab === 'group' && listed.length === 0 ? <Text style={styles.empty}>No splits yet.</Text> : null}
        {tab === 'friend' && friends.length === 0 ? (
          <Text style={styles.empty}>No people yet.</Text>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddOpen(false)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setAddOpen(false);
                router.push('/split/new');
              }}>
              <Users size={18} color={Colors.white} strokeWidth={2.5} />
              <Text style={styles.sheetText}>New group</Text>
            </Pressable>
            <View style={styles.sheetLine} />
            <Pressable
              style={styles.sheetRow}
              onPress={async () => {
                setAddOpen(false);
                const picked = await pickContact();
                if (!picked) return;
                setPendingPerson(picked);
                router.push('/split/expense');
              }}>
              <UserPlus size={18} color={Colors.white} strokeWidth={2.5} />
              <Text style={styles.sheetText}>From contacts</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.white },
  add: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  list: { width: '100%' },
  draft: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.white, marginBottom: Spacing.md },
  tabs: { flexDirection: 'row', gap: Spacing.sm },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
  },
  tabOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.textMuted },
  tabTextOn: { color: Colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  name: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.white },
  hint: { fontFamily: Fonts.display, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  amt: { fontFamily: Fonts.display, fontSize: FontSizes.lg },
  locked: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  lockedTitle: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.white },
  lockedDesc: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.textMuted, marginBottom: Spacing.md },
  empty: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.60)',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
  sheetText: { fontFamily: Fonts.display, fontSize: FontSizes.lg, color: Colors.white },
  sheetLine: { height: 1, backgroundColor: Colors.border },
});
