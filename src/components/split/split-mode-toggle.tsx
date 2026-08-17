import { Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SplitModeToggleProps {
  activeMode: 'groups' | 'people';
  onModeChange: (mode: 'groups' | 'people') => void;
}

export function SplitModeToggle({ activeMode, onModeChange }: SplitModeToggleProps) {
  return (
    <View style={styles.container}>
      {(['groups', 'people'] as const).map((mode) => {
        const isActive = activeMode === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onModeChange(mode)}
            style={[styles.tab, isActive && styles.tabActive]}>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {mode === 'groups' ? 'GROUPS' : 'PEOPLE'}
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
    backgroundColor: Colors.surface,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.pill,
  },
  tabActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: Colors.white,
  },
});
