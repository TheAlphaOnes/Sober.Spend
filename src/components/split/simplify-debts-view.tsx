import { NeoCard } from '@/components/ui/neo-card';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import type { Contact, SimplifiedTransaction } from '@/types';
import { SELF_CONTACT_ID } from '@/types';
import { StyleSheet, Text, View } from 'react-native';

interface SimplifyDebtsViewProps {
  transactions: SimplifiedTransaction[];
  contacts: Contact[];
}

export function SimplifyDebtsView({ transactions, contacts }: SimplifyDebtsViewProps) {
  const getName = (id: number) => {
    const contact = contacts.find((c) => c.id === id);
    return contact?.isSelf ? 'You' : contact?.name || 'Unknown';
  };

  return (
    <NeoCard color={Colors.surface} offset="sm" style={styles.card}>
      <Text style={styles.header}>SIMPLIFIED SETTLEMENTS</Text>
      <Text style={styles.count}>{transactions.length} transactions instead of more</Text>
      {transactions.length === 0 ? (
        <Text style={styles.settled}>Everyone's settled. Clean.</Text>
      ) : (
        <View style={styles.list}>
          {transactions.map((tx, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.fromName}>{getName(tx.from)}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.toName}>{getName(tx.to)}</Text>
              <Text style={styles.amount}>{formatCurrency(tx.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  header: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  count: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  settled: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.safe,
    paddingVertical: Spacing.sm,
  },
  list: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fromName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  arrow: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  toName: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
});
