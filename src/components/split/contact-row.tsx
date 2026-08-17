import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import type { Contact } from '@/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ContactRowProps {
  contact: Contact;
  balance: number;
  onPress: () => void;
}

export function ContactRow({ contact, balance, onPress }: ContactRowProps) {
  const isOwed = balance > 0;
  const isOwe = balance < 0;
  const initial = contact.name.charAt(0).toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
        <Text style={styles.balanceText}>
          {isOwed
            ? `owes you ${formatCurrency(Math.abs(balance))}`
            : isOwe
              ? `you owe ${formatCurrency(Math.abs(balance))}`
              : 'settled'}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: isOwed ? Colors.safe : isOwe ? Colors.exceeded : Colors.textMuted },
        ]}>
        {isOwed ? '+' : isOwe ? '-' : ''}{formatCurrency(Math.abs(balance))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: Borders.medium,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.black,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  balanceText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
  },
});
