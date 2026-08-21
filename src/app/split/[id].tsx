import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, User, Eye, EyeOff, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PayBackSheet } from '@/components/split/pay-back-sheet';
import { SplitRow } from '@/components/split/split-row';
import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useSplitStore } from '@/stores/split-store';
import type { SplitMember } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';

import { balancesForGroup, pairwiseBalancesForUser, memberBalanceCopy, oweLabel, pairRemaining } from '@/utils/split-engine';
import { groupJoinUrl } from '@/utils/split-qr';
import { buildUPIDeepLink } from '@/utils/upi-parser';

export default function GroupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const {
    groups,
    members,
    expenses,
    shares,
    payments,
    loadSplit,
    payBack,
    undoPayment,
    undoExpense,
    setGroupActive,
    deleteGroup,
  } = useSplitStore();

  const [tab, setTab] = useState<'activity' | 'balances'>('activity');
  const [payMember, setPayMember] = useState<SplitMember | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSplit();
    }, [loadSplit]),
  );

  const group = groups.find((g) => g.id === id);
  const groupMembers = useMemo(
    () => members.filter((m) => m.groupId === id && !m.leftAt),
    [members, id],
  );
  const self = groupMembers.find((m) => m.isSelf);
  const groupExpenses = expenses.filter((e) => e.groupId === id && !e.deletedAt);
  const groupPays = payments.filter((p) => p.groupId === id && !p.deletedAt);
  const expIds = new Set(groupExpenses.map((e) => e.id));
  const groupShares = shares.filter((s) => expIds.has(s.expenseId));
  const bals = useMemo(
    () => balancesForGroup(groupMembers, groupExpenses, groupShares, groupPays),
    [groupMembers, groupExpenses, groupShares, groupPays],
  );
  const pairwiseBals = useMemo(
    () => self ? pairwiseBalancesForUser(self.id, groupMembers, groupExpenses, groupShares, groupPays) : {},
    [self, groupMembers, groupExpenses, groupShares, groupPays],
  );
  const mine = self ? (bals[self.id] ?? 0) : 0;
  const net = oweLabel(mine);
  const netColor =
    net.tone === 'owed' ? Colors.safe : net.tone === 'owe' ? Colors.exceeded : Colors.textMuted;

  const activity = useMemo(() => {
    const rows: { key: string; at: string; kind: 'expense' | 'pay'; title: string; sub: string; amount: number }[] =
      [];
    const nameOf = (mid: string) => {
      const m = groupMembers.find((x) => x.id === mid);
      if (!m) return 'Someone';
      return m.isSelf ? 'You' : m.displayName;
    };
    for (const e of groupExpenses) {
      let partitionsStr = '';
      if (e.mode === 'dutch') {
        const parts = groupShares
          .filter((s) => s.expenseId === e.id)
          .map((s) => `${nameOf(s.memberId).split(' ')[0]}: ${formatCurrency(s.amount)}`);
        if (parts.length > 0) {
          partitionsStr = `\n${parts.join(', ')}`;
        }
      }

      rows.push({
        key: `e-${e.id}`,
        at: e.occurredAt,
        kind: 'expense',
        title: `${nameOf(e.paidById)} paid`,
        sub: `${e.merchant} · ${e.mode === 'dutch' ? 'Dutch' : 'Equal'} · ${formatDateTime(e.occurredAt)}${partitionsStr}`,
        amount: e.totalAmount,
      });
    }
    for (const p of groupPays) {
      rows.push({
        key: `p-${p.id}`,
        at: p.occurredAt,
        kind: 'pay',
        title: `${nameOf(p.fromId)} paid ${nameOf(p.toId)}`,
        sub: `${p.method === 'upi' ? 'UPI' : 'Cash'} · ${formatDateTime(p.occurredAt)}`,
        amount: p.amount,
      });
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }, [groupExpenses, groupPays, groupMembers]);

  const undoRow = (key: string) => {
    const kind = key.startsWith('e-') ? 'e' : 'p';
    const rowId = key.slice(2);
    Alert.alert('Undo this?', '', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Undo',
        style: 'destructive',
        onPress: () => {
          if (kind === 'e') undoExpense(rowId);
          else undoPayment(rowId);
        },
      },
    ]);
  };


  if (!group) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <NeoBackButton />
          <Text style={styles.title}>Split</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.empty}>That group’s gone.</Text>
      </View>
    );
  }

  const joinUrl = groupJoinUrl(group.inviteToken);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title} numberOfLines={1} pointerEvents="none">
          {group.name}
        </Text>
        <View style={styles.headerIcons}>
          <Pressable
            onPress={() => {
              Alert.alert(
                group.isActive ? 'Make inactive?' : 'Make active?',
                group.isActive
                  ? 'Hides this group from the main list. You can turn it back on later.'
                  : 'Puts this group back on the list.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: group.isActive ? 'Inactive' : 'Active',
                    onPress: () => {
                      setGroupActive(group.id, !group.isActive);
                      if (group.isActive) router.back();
                    },
                  },
                ]
              );
            }}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Inactive">
            {group.isActive ? (
              <EyeOff size={18} color={Colors.white} strokeWidth={2.5} />
            ) : (
              <Eye size={18} color={Colors.white} strokeWidth={2.5} />
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('Delete group?', 'This wipes it for you completely.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteGroup(group.id);
                    router.back();
                  },
                },
              ]);
            }}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete">
            <Trash2 size={18} color={Colors.exceeded} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            onPress={() => Share.share({ message: `Join ${group.name} on Sober.Spend\n${joinUrl}` })}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Share">
            <Share2 size={18} color={Colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(160)}>
          <Text style={[styles.hero, { color: netColor }]}>
            {net.tone === 'settled' ? 'Settled' : formatCurrency(Math.abs(mine))}
          </Text>
          {net.tone !== 'settled' ? <Text style={styles.sub}>{net.text}</Text> : null}
        </Animated.View>

        {!user ? (
          <Animated.View entering={FadeIn.delay(40).duration(200)}>
            <Pressable onPress={() => router.push('/profile')}>
              <Text style={styles.banner}>Sign in so they can see this.</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        <View style={styles.tabs}>
          {(['activity', 'balances'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'activity' ? 'Activity' : 'Balances'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.list}>
          {tab === 'activity'
            ? activity.map((row, i) => (
                <SplitRow
                  key={row.key}
                  delay={Math.min(i, 6) * 40}
                  title={row.title}
                  subtitle={row.sub}
                  amount={formatCurrency(row.amount)}
                  accent={row.kind === 'pay' ? Colors.mint : Colors.yellow}
                  onLongPress={() => undoRow(row.key)}
                />
              ))
            : (
                <>
                  {groupMembers
                    .filter((m) => !m.isSelf)
                    .map((m, i) => {
                      const their = pairwiseBals[m.id] ?? 0;
                      
                      let subtitle = 'Settled';
                      let tone: string = Colors.textMuted;
                      if (their > 0.009) {
                        subtitle = 'Owes you';
                        tone = Colors.safe;
                      } else if (their < -0.009) {
                        subtitle = 'You owe';
                        tone = Colors.exceeded;
                      }

                      return (
                        <SplitRow
                          key={m.id}
                          delay={Math.min(i, 6) * 35}
                          title={m.displayName}
                          subtitle={subtitle}
                          amount={Math.abs(their) < 0.01 ? undefined : formatCurrency(Math.abs(their))}
                          amountColor={tone}
                          accent={Colors.pink}
                          icon={<User size={16} color={Colors.black} strokeWidth={2.5} />}
                          onPress={() => setPayMember(m)}
                        />
                      );
                    })}
                </>
              )}
        </View>

        {tab === 'activity' && activity.length === 0 ? (
          <Text style={styles.empty}>No expenses yet.</Text>
        ) : null}



        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        {group.isActive ? (
          <NeoButton
            title="Add expense"
            variant="primary"
            size="lg"
            onPress={() => router.push(`/split/expense?groupId=${group.id}`)}
          />
        ) : (
          <Text style={styles.inactiveHint}>This group is inactive.</Text>
        )}
      </View>

      {payMember && self ? (
        <PayBackSheet
          visible
          onClose={() => setPayMember(null)}
          them={payMember}
          remaining={{
            amount: Math.abs(pairwiseBals[payMember.id] ?? 0),
            youOwe: (pairwiseBals[payMember.id] ?? 0) < -0.009
          }}
          onPay={(amount, method, fromSelf) => {
            const from = fromSelf ? self.id : payMember.id;
            const to = fromSelf ? payMember.id : self.id;
            payBack(group.id, from, to, amount, method);
            if (method === 'upi' && fromSelf && payMember.phone) {
              const url = buildUPIDeepLink(payMember.phone, payMember.displayName, amount, 'Split');
              Linking.openURL(url).catch(() => {});
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPayMember(null);
          }}
        />
      ) : null}
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
    position: 'relative',
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { 
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: Fonts.display, 
    fontSize: FontSizes.xl, 
    color: Colors.white, 
    textAlign: 'center',
    zIndex: -1
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.md },
  list: { width: '100%' },
  hero: { fontFamily: Fonts.display, fontSize: FontSizes.hero, color: Colors.white },
  sub: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.textMuted, marginTop: Spacing.xs },
  banner: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    paddingVertical: Spacing.xs,
  },
  tabs: { flexDirection: 'row', gap: Spacing.sm, width: '100%', alignSelf: 'stretch' },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  tabOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.textMuted },
  tabTextOn: { color: Colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowTitle: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.white },
  rowSub: { fontFamily: Fonts.display, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  rowAmt: { fontFamily: Fonts.display, fontSize: FontSizes.lg, color: Colors.white },
  empty: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  addPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 40,
  },
  addPeopleText: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.accent },
  manage: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  manageBtn: { flex: 1 },
  inactiveHint: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.60)',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 52,
  },
  menuText: { fontFamily: Fonts.display, fontSize: FontSizes.lg, color: Colors.white },
  qrSheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  qrName: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.white },
  qrHint: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.textMuted },
  paySheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  payTitle: { fontFamily: Fonts.display, fontSize: FontSizes.lg, color: Colors.white },
  payBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dutchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.sm,
  },
  dutchCur: { fontFamily: Fonts.display, fontSize: FontSizes.lg, color: Colors.accent },
  dutchInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
    paddingVertical: Spacing.sm,
  },
});
