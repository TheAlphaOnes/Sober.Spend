import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { calculateEqualShares } from '@/utils/split-engine';
import { formatCurrency } from '@/utils/format';
import type { Contact } from '@/types';
import { StyleSheet, Text, View } from 'react-native';

interface EqualSplitViewProps {
  totalAmount: number;
  contacts: Contact[];
}

export function EqualSplitView({ totalAmount, contacts }: EqualSplitViewProps) {
  const shares = calculateEqualShares(totalAmount, contacts.length);

  return (
    <View style={styles.container}>
      {contacts.map((contact, i) => (
        <View key={contact.id} style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
            <Text style={styles.avatarText}>
              {contact.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {contact.isSelf ? 'You' : contact.name}
          </Text>
          <Text style={styles.amount}>{formatCurrency(shares[i] || 0)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  name: {
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
