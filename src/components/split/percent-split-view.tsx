import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import type { Contact } from '@/types';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface PercentSplitViewProps {
  totalAmount: number;
  contacts: Contact[];
  percents: Record<number, string>;
  onChange: (contactId: number, value: string) => void;
}

export function PercentSplitView({ totalAmount, contacts, percents, onChange }: PercentSplitViewProps) {
  const values = contacts.map((c) => parseFloat(percents[c.id] || '0') || 0);
  const sum = values.reduce((s, v) => s + v, 0);
  const isValid = Math.abs(sum - 100) < 0.5;

  return (
    <View style={styles.container}>
      {contacts.map((contact) => {
        const pct = parseFloat(percents[contact.id] || '0') || 0;
        const amount = (totalAmount * pct) / 100;
        return (
          <View key={contact.id} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
              <Text style={styles.avatarText}>
                {contact.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {contact.isSelf ? 'You' : contact.name}
            </Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={percents[contact.id] || ''}
                onChangeText={(v) => onChange(contact.id, sanitizeNumericInput(v))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.percentSign}>%</Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(Math.round(amount * 100) / 100)}</Text>
          </View>
        );
      })}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={[styles.totalValue, { color: isValid ? Colors.safe : Colors.exceeded }]}>
          {Math.round(sum * 10) / 10}%
          {isValid ? ' ✓' : ` — ${Math.abs(Math.round((100 - sum) * 10) / 10)}% ${sum < 100 ? 'short' : 'over'}`}
        </Text>
      </View>
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
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.sm,
    minWidth: 70,
  },
  input: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    paddingVertical: Spacing.xs + 2,
    flex: 1,
    minWidth: 40,
  },
  percentSign: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    minWidth: 70,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  totalValue: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
  },
});
