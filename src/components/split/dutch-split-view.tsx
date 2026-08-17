import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { calculateDutchShares } from '@/utils/split-engine';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import type { Contact } from '@/types';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface DutchSplitViewProps {
  totalAmount: number;
  contacts: Contact[];
  orderAmounts: Record<number, string>;
  sharedCharges: string;
  onOrderChange: (contactId: number, value: string) => void;
  onSharedChargesChange: (value: string) => void;
}

export function DutchSplitView({
  contacts,
  orderAmounts,
  sharedCharges,
  onOrderChange,
  onSharedChargesChange,
}: DutchSplitViewProps) {
  const orderMap = new Map<number, number>();
  for (const c of contacts) {
    orderMap.set(c.id, parseFloat(orderAmounts[c.id] || '0') || 0);
  }
  const charges = parseFloat(sharedCharges || '0') || 0;
  const result = calculateDutchShares(orderMap, [], charges, contacts.map((c) => c.id));
  const subtotal = Array.from(orderMap.values()).reduce((s, v) => s + v, 0);
  const grandTotal = subtotal + charges;

  return (
    <View style={styles.container}>
      {contacts.map((contact) => {
        const r = result.get(contact.id);
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
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.input}
                value={orderAmounts[contact.id] || ''}
                onChangeText={(v) => onOrderChange(contact.id, sanitizeNumericInput(v))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <Text style={styles.finalShare}>
              {formatCurrency(r?.shareAmount || 0)}
            </Text>
          </View>
        );
      })}

      <View style={styles.divider} />

      <View style={styles.chargesRow}>
        <Text style={styles.chargesLabel}>Shared charges (tax, tip)</Text>
        <View style={styles.inputBox}>
          <Text style={styles.currency}>₹</Text>
          <TextInput
            style={styles.input}
            value={sharedCharges}
            onChangeText={(v) => onSharedChargesChange(sanitizeNumericInput(v))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Grand total</Text>
        <Text style={styles.totalValue}>{formatCurrency(Math.round(grandTotal * 100) / 100)}</Text>
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
    minWidth: 90,
  },
  currency: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.accent,
    marginRight: 4,
  },
  input: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    paddingVertical: Spacing.xs + 2,
    flex: 1,
    minWidth: 50,
  },
  finalShare: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    minWidth: 70,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  chargesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  chargesLabel: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
