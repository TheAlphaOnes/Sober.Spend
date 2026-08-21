import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Borders, Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

export function SplitRow({
  delay = 0,
  icon,
  initial,
  accent = Colors.blue,
  title,
  subtitle,
  amount,
  amountColor = Colors.white,
  onPress,
  onLongPress,
}: {
  delay?: number;
  icon?: ReactNode;
  initial?: string;
  accent?: string;
  title: string;
  subtitle: string;
  amount?: string;
  amountColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const letter = (initial || title.trim()[0] || '?').toUpperCase();

  return (
    <Animated.View entering={FadeIn.delay(delay).duration(180)}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${subtitle}, ${amount}`}>
        <View style={[styles.avatar, { backgroundColor: accent }]}>
          {icon ?? <Text style={styles.letter}>{letter}</Text>}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {amount ? <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text> : null}
      </Pressable>
    </Animated.View>
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
    minHeight: 56,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  letter: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.black },
  info: { flex: 1, minWidth: 0 },
  title: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.white },
  sub: { fontFamily: Fonts.display, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  amount: { fontFamily: Fonts.display, fontSize: FontSizes.md },
});
