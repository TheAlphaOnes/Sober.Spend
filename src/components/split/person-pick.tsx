import type { ReactNode } from 'react';
import { Check, Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';

const AVATAR = [Colors.pink, Colors.blue, Colors.mint, Colors.yellow, Colors.orange, Colors.purple];

export function avatarColor(index: number): string {
  return AVATAR[index % AVATAR.length];
}

export function PersonList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

export function PersonPickRow({
  name,
  color,
  selected,
  mode,
  onPress,
  onRemove,
}: {
  name: string;
  color: string;
  selected: boolean;
  mode: 'radio' | 'check' | 'guest';
  onPress: () => void;
  onRemove?: () => void;
}) {
  const letter = (name.trim()[0] || '?').toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={mode === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.letter}>{letter}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {mode === 'guest' ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name}`}>
          <X size={14} color={Colors.white} strokeWidth={2.5} />
        </Pressable>
      ) : mode === 'radio' ? (
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      ) : (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected ? <Check size={14} color={Colors.white} strokeWidth={3} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function PersonAddRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Add people">
      <View style={styles.addAvatar}>
        <Plus size={16} color={Colors.accent} strokeWidth={2.5} />
      </View>
      <Text style={styles.addLabel}>Add people</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  letter: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.black },
  name: { flex: 1, minWidth: 0, fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.white },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: Borders.medium,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: Borders.medium,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 52,
  },
  addAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.accent },
});
