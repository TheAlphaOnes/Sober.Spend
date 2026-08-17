import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { exactSharesDifference } from '@/utils/split-engine';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import type { Contact } from '@/types';
import { useRef, useState } from 'react';
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

  /**
   * When one person's slider moves, redistribute the remaining amount
   * equally among everyone else so the total always matches.
   */
  const handleSliderChange = (contactId: number, newValue: number) => {
    redistribute(contactId, newValue);
  };

  /**
   * When one person's amount is typed manually, redistribute the remaining
   * amount equally among everyone else so the total always matches.
   * The typed field keeps the raw input; only others are adjusted.
   */
  const handleTextChange = (contactId: number, rawValue: string) => {
    // Always update the typed field so the user sees what they type
    onChange(contactId, rawValue);

    const parsed = parseFloat(rawValue) || 0;
    redistributeOthers(contactId, parsed);
  };

  function redistribute(contactId: number, newValue: number) {
    const rounded = Math.round(newValue * 100) / 100;
    onChange(contactId, String(rounded));
    redistributeOthers(contactId, rounded);
  }

  function redistributeOthers(contactId: number, primaryValue: number) {
    const remaining = Math.max(0, totalAmount - primaryValue);
    const others = contacts.filter((c) => c.id !== contactId);
    const perPerson = others.length > 0 ? remaining / others.length : 0;
    const perPersonRounded = Math.round(perPerson * 100) / 100;

    // Distribute the remainder — fix last person to absorb rounding errors
    let allocated = primaryValue;
    others.forEach((c, i) => {
      if (i === others.length - 1) {
        // Last person gets whatever's left to ensure exact total
        const lastShare = Math.round((totalAmount - allocated) * 100) / 100;
        onChange(c.id, String(Math.max(0, lastShare)));
      } else {
        onChange(c.id, String(perPersonRounded));
        allocated += perPersonRounded;
      }
    });
  }

  return (
    <View style={styles.container}>
      {contacts.map((contact, index) => (
        <ExactRow
          key={contact.id}
          contact={contact}
          value={values[index]}
          maxValue={totalAmount}
          shareValue={shares[contact.id] || ''}
          onSliderChange={(v) => handleSliderChange(contact.id, v)}
          onTextChange={(val) => handleTextChange(contact.id, val)}
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
  onSliderChange: (v: number) => void;
  onTextChange: (val: string) => void;
}

function ExactRow({ contact, value, maxValue, shareValue, onSliderChange, onTextChange }: ExactRowProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleTextSubmit = () => {
    setEditing(false);
  };

  const sliderValue = Math.min(Math.max(value, 0), maxValue);

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
              onChangeText={(v) => onTextChange(sanitizeNumericInput(v))}
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
        onValueChange={onSliderChange}
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
    flex: 1,
    height: 32,
    marginHorizontal: -4,
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
