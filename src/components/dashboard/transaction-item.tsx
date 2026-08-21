import { Borders, Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import type { Category, Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { getIcon } from '@/utils/icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TransactionItemProps {
  expense: Expense;
  category?: Category;
}

export function TransactionItem({ expense, category }: TransactionItemProps) {
  const LucideIcon = getIcon(category?.icon ?? '');

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: category?.color || Colors.surfaceLight }]}>
        <LucideIcon size={18} color={Colors.black} strokeWidth={2.5} />
      </View>
      <View style={styles.info}>
        <Text style={styles.merchant}>{expense.merchant}</Text>
        <Text style={styles.date}>{formatDate(expense.date)}</Text>
      </View>
      <Text style={styles.amount}>-{formatCurrency(expense.amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  info: {
    flex: 1,
  },
  merchant: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  date: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.exceeded,
  },
});
