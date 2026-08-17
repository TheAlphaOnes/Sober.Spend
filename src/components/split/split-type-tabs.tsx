import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import type { SplitType } from '@/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TABS: { key: SplitType; label: string }[] = [
  { key: 'equal', label: 'EQUAL' },
  { key: 'exact', label: 'EXACT' },
];

interface SplitTypeTabsProps {
  activeType: SplitType;
  onChange: (type: SplitType) => void;
}

export function SplitTypeTabs({ activeType, onChange }: SplitTypeTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeType === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: Colors.white,
  },
});
