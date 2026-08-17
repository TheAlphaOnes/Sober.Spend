import { NeoCard } from '@/components/ui/neo-card';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import { StyleSheet, Text, View } from 'react-native';

interface SplitBalanceCardProps {
  owedToMe: number;
  iOwe: number;
}

export function SplitBalanceCard({ owedToMe, iOwe }: SplitBalanceCardProps) {
  const netBalance = owedToMe - iOwe;
  const isOwed = netBalance > 0;
  const isSettled = Math.abs(netBalance) < 0.01;

  const label = isSettled
    ? 'ALL SETTLED'
    : isOwed
      ? "THEY OWE YOU"
      : 'YOU OWE THEM';

  const amount = Math.abs(netBalance);
  const color = isSettled
    ? Colors.textSecondary
    : isOwed
      ? Colors.safe
      : Colors.exceeded;

  const sublabel = isSettled
    ? 'Look at you being responsible.'
    : isOwed
      ? 'Time to collect'
      : 'Pay up before they remind you';

  return (
    <NeoCard color={Colors.surface} offset="sm" textured style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color }]}>
        {isSettled ? '₹0' : formatCurrency(amount)}
      </Text>
      <Text style={styles.sublabel}>{sublabel}</Text>
      {!isSettled && (
        <View style={styles.breakdown}>
          {owedToMe > 0 && (
            <Text style={styles.breakdownText}>
              Owed to you: {formatCurrency(owedToMe)}
            </Text>
          )}
          {iOwe > 0 && (
            <Text style={[styles.breakdownText, { color: Colors.exceeded }]}>
              You owe: {formatCurrency(iOwe)}
            </Text>
          )}
        </View>
      )}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: 40,
    color: Colors.white,
  },
  sublabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  breakdown: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  breakdownText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.safe,
  },
});
