import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';

const PALETTE = [Colors.pink, Colors.blue, Colors.mint, Colors.yellow, Colors.orange, Colors.purple];

export function chipColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

function firstName(name: string): string {
  const t = name.trim();
  if (!t || t === 'You') return t || 'You';
  return t.split(/\s+/)[0];
}

export function ChipWrap({ children }: { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

export function PersonChip({
  name,
  color,
  selected,
  onPress,
  onRemove,
}: {
  name: string;
  color: string;
  selected: boolean;
  onPress: () => void;
  onRemove?: () => void;
}) {
  const letter = (name.trim()[0] || '?').toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}>
      <View style={[styles.face, { backgroundColor: color }]}>
        <Text style={styles.letter}>{letter}</Text>
      </View>
      <Text style={[styles.label, selected && styles.labelOn]} numberOfLines={1}>
        {firstName(name)}
      </Text>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name}`}>
          <X size={12} color={selected ? Colors.white : Colors.textMuted} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function AddChip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Add people">
      <Plus size={18} color={Colors.white} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: 4,
    paddingRight: Spacing.md,
    paddingVertical: 4,
    minHeight: 40,
    maxWidth: '100%',
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
  },
  chipOn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  face: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  letter: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.black },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    maxWidth: 96,
  },
  labelOn: { color: Colors.white },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
