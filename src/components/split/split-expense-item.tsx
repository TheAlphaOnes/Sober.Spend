import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { formatCurrency, formatDate } from '@/utils/format';
import type { SplitExpense } from '@/types';
import { StyleSheet, Text, View } from 'react-native';

interface SplitExpenseItemProps {
  expense: SplitExpense;
  paidByName: string;
  yourShare: number;
  settledCount: number;
  totalCount: number;
}

export function SplitExpenseItem({
  expense,
  paidByName,
  yourShare,
  settledCount,
  totalCount,
}: SplitExpenseItemProps) {
  const allSettled = settledCount === totalCount;
  const progress = totalCount > 0 ? settledCount / totalCount : 0;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.merchant} numberOfLines={1}>{expense.merchant}</Text>
        <Text style={styles.amount}>{formatCurrency(expense.totalAmount)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {formatDate(expense.date)} • {paidByName} paid • {expense.splitType}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.yourShare}>Your share: {formatCurrency(yourShare)}</Text>
        <Text style={[styles.settlement, { color: allSettled ? Colors.safe : Colors.textMuted }]}>
          {settledCount}/{totalCount} settled
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: allSettled ? Colors.safe : Colors.accent },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  merchant: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  metaRow: {
    marginTop: 2,
  },
  meta: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  yourShare: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  settlement: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.bg,
    borderRadius: 2,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
