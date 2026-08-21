import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { chipColor } from '@/components/split/person-chips';
import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useSplitStore } from '@/stores/split-store';
import { formatCurrency } from '@/utils/format';
import { SplitRow } from '@/components/split/split-row';
import { formatDate } from '@/utils/format';
import { balancesForGroup, oweLabel, pairwiseBalancesForUser } from '@/utils/split-engine';
import { peopleKey, personColorIndex, uniquePeople } from '@/utils/split-people';

export default function PersonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { n, p } = useLocalSearchParams<{ n?: string; p?: string }>();
  const name = n || 'Friend';
  const phone = p || '';
  const { groups, members, expenses, shares, payments, loadSplit, setPendingPerson } = useSplitStore();

  useFocusEffect(
    useCallback(() => {
      loadSplit();
    }, [loadSplit]),
  );

  const key = peopleKey(name, phone || undefined);
  const person = useMemo(
    () => uniquePeople(groups, members).find((x) => x.key === key),
    [groups, members, key],
  );
  const displayName = person?.name || name;
  const displayPhone = person?.phone || phone || undefined;
  const color = chipColor(personColorIndex(displayName));
  const letter = (displayName.trim()[0] || '?').toUpperCase();

  const friendGroup = groups.find((g) => g.id === person?.friendGroupId);
  
  const overallBalance = useMemo(() => {
    if (!person) return null;
    // Find my members in all groups
    const myMembers = members.filter(m => m.isSelf);
    let totalMine = 0;
    
    for (const mySelf of myMembers) {
      // Find friend's members in this group
      const friendsInGroup = members.filter(m => m.groupId === mySelf.groupId && !m.isSelf && peopleKey(m.displayName, m.phone) === person.key);
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
    
    return { mine: totalMine, label: oweLabel(totalMine) };
  }, [person, members, expenses, shares, payments]);

  
  const history = useMemo(() => {
    if (!person) return [];
    const myMembers = members.filter(m => m.isSelf);
    
    type TimelineItem = {
      type: 'expense' | 'payment';
      id: string;
      date: string;
      title: string;
      subtitle: string;
      amount: number;
      tone: string;
    };
    
    const items: TimelineItem[] = [];
    
    for (const mySelf of myMembers) {
      const friendsInGroup = members.filter(m => m.groupId === mySelf.groupId && !m.isSelf && peopleKey(m.displayName, m.phone) === person.key);
      if (friendsInGroup.length === 0) continue;
      
      const groupName = groups.find(g => g.id === mySelf.groupId)?.name || '';
      
      for (const friend of friendsInGroup) {
        // Find expenses where one paid and the other owes
        const es = expenses.filter(e => e.groupId === mySelf.groupId);
        for (const e of es) {
          const s = shares.filter(sh => sh.expenseId === e.id);
          
          let involvesUs = false;
          let myImpact = 0;
          
          if (e.paidById === mySelf.id) {
            const friendShare = s.find(sh => sh.memberId === friend.id);
            if (friendShare) {
              involvesUs = true;
              myImpact = friendShare.amount; // friend owes me
            }
          } else if (e.paidById === friend.id) {
            const myShare = s.find(sh => sh.memberId === mySelf.id);
            if (myShare) {
              involvesUs = true;
              myImpact = -myShare.amount; // I owe friend
            }
          }
          
          if (involvesUs) {
            items.push({
              type: 'expense',
              id: e.id,
              date: e.occurredAt,
              title: e.merchant,
              subtitle: groupName,
              amount: myImpact,
              tone: myImpact > 0 ? Colors.safe : Colors.exceeded,
            });
          }
        }
        
        // Find payments between us
        const ps = payments.filter(p => p.groupId === mySelf.groupId);
        for (const p of ps) {
          if (p.fromId === mySelf.id && p.toId === friend.id) {
            items.push({
              type: 'payment',
              id: p.id,
              date: p.occurredAt,
              title: 'Payment to ' + friend.displayName,
              subtitle: groupName,
              amount: p.amount,
              tone: Colors.safe,
            });
          } else if (p.fromId === friend.id && p.toId === mySelf.id) {
            items.push({
              type: 'payment',
              id: p.id,
              date: p.occurredAt,
              title: 'Payment from ' + friend.displayName,
              subtitle: groupName,
              amount: -p.amount,
              tone: Colors.exceeded,
            });
          }
        }
      }
    }
    
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [person, members, expenses, shares, payments, groups]);

  const sharedGroups = groups.filter((g) => person?.groupIds.includes(g.id) && g.kind === 'group');

  const addExpense = () => {
    setPendingPerson({ name: displayName, phone: displayPhone });
    if (friendGroup) router.push(`/split/expense?groupId=${friendGroup.id}`);
    else router.push('/split/expense');
  };

  const tone =
    overallBalance?.label.tone === 'owed'
      ? Colors.safe
      : overallBalance?.label.tone === 'owe'
        ? Colors.exceeded
        : Colors.textMuted;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.headerTitle}>Friend</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.hero}>
          <View style={[styles.face, { backgroundColor: color }]}>
            <Text style={styles.letter}>{letter}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {displayPhone ? <Text style={styles.phone}>{displayPhone}</Text> : null}
        </Animated.View>

        {overallBalance && overallBalance.label.tone !== 'settled' ? (
          <Animated.View entering={FadeIn.delay(60).duration(200)}>
            <Text style={[styles.net, { color: tone }]}>{formatCurrency(Math.abs(overallBalance?.mine || 0))}</Text>
            <Text style={styles.netSub}>{overallBalance?.label?.text || ''}</Text>
          </Animated.View>
        ) : (
          <Text style={styles.netSub}>No expenses yet. Add an expense between you two.</Text>
        )}

        {sharedGroups.length > 0 ? (
          <Animated.View entering={FadeIn.delay(100).duration(200)}>
            <Text style={styles.label}>GROUPS</Text>
            <View style={styles.groupList}>
              {sharedGroups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => router.push(`/split/${g.id}`)}
                  style={styles.groupRow}
                  accessibilityRole="button">
                  <View style={[styles.groupIcon, { backgroundColor: g.color }]}>
                    <Users size={14} color={Colors.black} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.groupName}>{g.name}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}

        
        {history.length > 0 ? (
          <Animated.View entering={FadeIn.delay(120).duration(200)}>
            <Text style={styles.label}>HISTORY</Text>
            <View style={styles.groupList}>
              {history.map((item, i) => (
                <SplitRow
                  key={`${item.type}-${item.id}`}
                  title={item.title}
                  subtitle={`${formatDate(item.date)} • ${item.subtitle}`}
                  amount={formatCurrency(Math.abs(item.amount))}
                  amountColor={item.tone}
                  initial={item.type === 'payment' ? '₹' : undefined}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.delay(160).duration(220)} style={styles.cta}>
          <NeoButton title="Add expense" variant="primary" size="lg" onPress={addExpense} />
        </Animated.View>
      </ScrollView>
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
  headerTitle: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.white },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  hero: { alignItems: 'center', paddingTop: Spacing.md },
  face: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.medium,
    borderColor: Colors.black,
    marginBottom: Spacing.md,
  },
  letter: { fontFamily: Fonts.display, fontSize: FontSizes.hero, color: Colors.black },
  name: { fontFamily: Fonts.display, fontSize: FontSizes.xxl, color: Colors.white },
  phone: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.textMuted, marginTop: 4 },
  net: { fontFamily: Fonts.display, fontSize: FontSizes.xxl },
  netSub: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.textMuted },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  groupList: { gap: Spacing.sm },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
  },
  groupIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  groupName: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.white },
  cta: { marginTop: Spacing.md },
});
