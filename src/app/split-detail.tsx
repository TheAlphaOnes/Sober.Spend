import { GroupAvatarStack } from '@/components/split/group-avatar-stack';
import { SettleUpSheet } from '@/components/split/settle-up-sheet';
import { SimplifyDebtsView } from '@/components/split/simplify-debts-view';
import { SplitExpenseItem } from '@/components/split/split-expense-item';
import { SplitSetupSheet } from '@/components/split/split-setup-sheet';
import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { useSplitStore } from '@/stores/split-store';
import { formatCurrency } from '@/utils/format';
import { useLocalSearchParams } from 'expo-router';
import { Plus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SELF_CONTACT_ID } from '@/types';

export default function SplitDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type: string; id: string }>();

  const {
    contacts,
    groups,
    shares,
    loadAll,
    getGroupMembers,
    getGroupExpenses,
    getContactExpenses,
    getGroupBalance,
    getContactBalance,
    getSimplifiedGroupSettlements,
    settleBalance,
    setGroupActive,
  } = useSplitStore();

  const [showSetup, setShowSetup] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const type = params.type as 'group' | 'contact';
  const id = parseInt(params.id, 10);

  // Get the relevant entity
  const group = type === 'group' ? groups.find((g) => g.id === id) : null;
  const contact = type === 'contact' ? contacts.find((c) => c.id === id) : null;

  // Get expenses
  const expenses = type === 'group' ? getGroupExpenses(id) : getContactExpenses(id);

  // Get balance
  const balance =
    type === 'group'
      ? getGroupBalance(id)
      : {
          owedToMe: Math.max(0, getContactBalance(id)),
          iOwe: Math.max(0, -getContactBalance(id)),
        };
  const netBalance = balance.owedToMe - balance.iOwe;

  // Get members (for groups)
  const members = type === 'group' ? getGroupMembers(id) : [];

  // Get simplified settlements (for groups)
  const simplifiedSettlements =
    type === 'group' ? getSimplifiedGroupSettlements(id) : [];

  const getName = (contactId: number) => {
    const c = contacts.find((c) => c.id === contactId);
    return c?.isSelf ? 'You' : c?.name || 'Unknown';
  };

  const title = type === 'group' ? group?.name || 'Group' : contact?.name || 'Contact';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>{title}</Text>
        {type === 'group' && group ? (
          <Pressable
            onPress={() => setGroupActive(group.id, !group.isActive)}
            style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, group.isActive ? styles.closeBtnActive : styles.closeBtnReopen]}>
              {group.isActive ? 'CLOSE' : 'REOPEN'}
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <NeoCard color={Colors.surface} offset="sm" textured style={styles.balanceCard}>
            {type === 'group' && (
              <View style={styles.groupHeader}>
                <View style={styles.groupInfo}>
                  <Users size={16} color={Colors.textMuted} strokeWidth={2.5} />
                  <Text style={styles.memberCount}>{members.length} members</Text>
                </View>
                <GroupAvatarStack contacts={members.filter((m) => !m.isSelf)} max={4} />
              </View>
            )}
            <Text style={styles.balanceLabel}>
              {netBalance > 0
                ? "THEY OWE YOU"
                : netBalance < 0
                  ? 'YOU OWE THEM'
                  : 'ALL SETTLED'}
            </Text>
            <Text
              style={[
                styles.balanceAmount,
                {
                  color:
                    netBalance > 0
                      ? Colors.safe
                      : netBalance < 0
                        ? Colors.exceeded
                        : Colors.textMuted,
                },
              ]}>
              {formatCurrency(Math.abs(netBalance))}
            </Text>
          </NeoCard>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          {type === 'group' && group?.isActive !== false && (
            <NeoButton
              title="Add Expense"
              variant="primary"
              size="md"
              onPress={() => setShowSetup(true)}
            />
          )}
          {type === 'contact' && (
            <NeoButton
              title="Add Expense"
              variant="primary"
              size="md"
              onPress={() => setShowSetup(true)}
            />
          )}
          {Math.abs(netBalance) > 0.01 && (
            <NeoButton
              title="Settle Up"
              variant="outline"
              size="md"
              onPress={() => setShowSettleUp(true)}
            />
          )}
        </View>

        {/* Simplified settlements (groups only) */}
        {type === 'group' && simplifiedSettlements.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <SimplifyDebtsView transactions={simplifiedSettlements} contacts={contacts} />
          </Animated.View>
        )}

        {/* Expense list */}
        <Text style={styles.sectionTitle}>EXPENSES</Text>
        <View style={styles.expenseList}>
          {expenses.map((expense, index) => {
            const yourShare =
              shares.find(
                (s) => s.splitExpenseId === expense.id && s.contactId === SELF_CONTACT_ID,
              )?.shareAmount || 0;
            const expenseShares = shares.filter(
              (s) => s.splitExpenseId === expense.id,
            );
            const settledCount = expenseShares.filter((s) => s.settled).length;
            return (
              <Animated.View
                key={expense.id}
                entering={FadeInDown.delay(150 + index * 40).duration(250)}>
                <SplitExpenseItem
                  expense={expense}
                  paidByName={getName(expense.paidBy)}
                  yourShare={yourShare}
                  settledCount={settledCount}
                  totalCount={expenseShares.length}
                />
              </Animated.View>
            );
          })}
          {expenses.length === 0 && (
            <Text style={styles.emptyText}>No expenses yet. Add one to get started.</Text>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB — hidden for closed groups */}
      {!(type === 'group' && group?.isActive === false) && (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + Spacing.lg }]}
          onPress={() => setShowSetup(true)}>
          <Plus size={24} color={Colors.black} strokeWidth={3} />
        </Pressable>
      )}

      {/* Sheets */}
      <SplitSetupSheet visible={showSetup} onClose={() => setShowSetup(false)} />

      {contact && (
        <SettleUpSheet
          visible={showSettleUp}
          onClose={() => setShowSettleUp(false)}
          contact={contact}
          balance={netBalance}
          onSettled={(method) => {
            settleBalance(contact.id, Math.abs(netBalance), method);
            loadAll();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  closeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 6,
  },
  closeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 1,
  },
  closeBtnActive: {
    color: Colors.exceeded,
  },
  closeBtnReopen: {
    color: Colors.accent,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  balanceCard: {
    gap: Spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  memberCount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  balanceLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  balanceAmount: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.white,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  expenseList: {
    gap: 0,
  },
  emptyText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
