import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { exactSharesDifference } from '@/utils/split-engine';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import type { Contact } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';

interface ExactSplitViewProps {
  totalAmount: number;
  contacts: Contact[];
  shares: Record<number, string>;
  onChange: (contactId: number, value: string) => void;
}

export function ExactSplitView({ totalAmount, contacts, shares, onChange }: ExactSplitViewProps) {
  const values = contacts.map((c) => parseFloat(shares[c.id] || '0') || 0);
  const diff = exactSharesDifference(values, totalAmount);
  const sum = values.reduce((s, v) => s + v, 0);
  const isValid = Math.abs(diff) < 0.01;

  return (
    <View style={styles.container}>
      {contacts.map((contact, index) => (
        <ExactRow
          key={contact.id}
          contact={contact}
          value={values[index]}
          maxValue={totalAmount}
          shareValue={shares[contact.id] || ''}
          onChange={(val) => onChange(contact.id, val)}
        />
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={[styles.totalValue, { color: isValid ? Colors.safe : Colors.exceeded }]}>
          {formatCurrency(Math.round(sum * 100) / 100)}
          {isValid
            ? ' ✓'
            : ` — ${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'short' : 'over'}`}
        </Text>
      </View>
    </View>
  );
}

interface ExactRowProps {
  contact: Contact;
  value: number;
  maxValue: number;
  shareValue: string;
  onChange: (val: string) => void;
}

function ExactRow({ contact, value, maxValue, shareValue, onChange }: ExactRowProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Close edit mode when value changes externally (e.g. slider reset)
  useEffect(() => {
    if (!editing && shareValue === '') {
      // no-op, just keep in sync
    }
  }, [shareValue, editing]);

  const handleSliderChange = (v: number) => {
    onChange(String(Math.round(v * 100) / 100));
  };

  const handleTextSubmit = () => {
    setEditing(false);
  };

  const sliderValue = Math.min(value, maxValue);

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
          <Text style={styles.avatarText}>
            {contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {contact.isSelf ? 'You' : contact.name}
        </Text>
        <Pressable onPress={() => setEditing(true)} style={styles.amountBox}>
          <Text style={styles.currency}>₹</Text>
          {editing ? (
            <TextInput
              ref={inputRef}
              style={styles.amountInput}
              value={shareValue}
              onChangeText={(v) => onChange(sanitizeNumericInput(v))}
              onSubmitEditing={handleTextSubmit}
              onBlur={handleTextSubmit}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
          ) : (
            <Text style={styles.amountText}>
              {value > 0 ? formatCurrency(Math.round(value * 100) / 100) : '0'}
            </Text>
          )}
        </Pressable>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={maxValue > 0 ? maxValue : 1}
        value={sliderValue}
        onValueChange={handleSliderChange}
        minimumTrackTintColor={Colors.accent}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  row: {
    gap: Spacing.xs,
  },
  rowTop: {
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
  amountBox: {
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
  amountInput: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    paddingVertical: Spacing.xs + 2,
    flex: 1,
  },
  amountText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    paddingVertical: Spacing.xs + 2,
  },
  slider: {
    width: '100%',
    height: 32,
    marginLeft: 36,
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
