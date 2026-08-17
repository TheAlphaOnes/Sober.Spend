import { NeoCard } from '@/components/ui/neo-card';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import { StyleSheet, Text } from 'react-native';

interface SplitPreviewProps {
  totalAmount: number;
  yourShare: number;
  toCollect: number;
  paidByName: string;
}

export function SplitPreview({ totalAmount, yourShare, toCollect, paidByName }: SplitPreviewProps) {
  return (
    <NeoCard color={Colors.surface} offset="sm" style={styles.card}>
      <Text style={styles.paidByText}>
        {paidByName} pays {formatCurrency(totalAmount)}
      </Text>
      <Text style={styles.yourShareText}>
        Your share: {formatCurrency(yourShare)}
      </Text>
      {toCollect > 0 ? (
        <Text style={styles.toCollectText}>
          {formatCurrency(toCollect)} to collect
        </Text>
      ) : (
        <Text style={styles.noCollectText}>Nothing to collect</Text>
      )}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  paidByText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  yourShareText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  toCollectText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  noCollectText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
});
