import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { VPA_SUFFIXES } from '@/utils/split-engine';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface VpaSuffixPickerProps {
  phone: string;
  onSelect: (suffix: string) => void;
}

export function VpaSuffixPicker({ phone, onSelect }: VpaSuffixPickerProps) {
  const phoneDigits = phone.replace(/\D/g, '');
  const sorted = [...VPA_SUFFIXES].sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return 0;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick a UPI</Text>
      <Text style={styles.subtitle}>
        {phoneDigits}
        <Text style={styles.suffixHint}>@...</Text>
      </Text>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {sorted.map((entry) => {
          const fullVpa =
            entry.suffix === '@custom'
              ? 'Enter manually'
              : `${phoneDigits}${entry.suffix}`;
          return (
            <Pressable
              key={entry.suffix}
              onPress={() => onSelect(entry.suffix)}
              style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.vpa}>{fullVpa}</Text>
                <Text style={styles.label}>{entry.label}</Text>
              </View>
              {entry.popular && <Text style={styles.popular}>POPULAR</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  suffixHint: {
    color: Colors.textMuted,
  },
  list: {
    maxHeight: 300,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  rowLeft: {
    flex: 1,
  },
  vpa: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  popular: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: Colors.accent,
    letterSpacing: 1,
  },
});
