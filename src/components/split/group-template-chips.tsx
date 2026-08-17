import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { GROUP_TEMPLATES } from '@/utils/split-engine';
import { Briefcase, Heart, Home, Plane, Plus, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

const iconMap: Record<string, typeof Users> = {
  home: Home,
  plane: Plane,
  heart: Heart,
  users: Users,
  briefcase: Briefcase,
  plus: Plus,
};

interface GroupTemplateChipsProps {
  onSelect: (template: (typeof GROUP_TEMPLATES)[number]) => void;
}

export function GroupTemplateChips({ onSelect }: GroupTemplateChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {GROUP_TEMPLATES.map((template) => {
        const Icon = iconMap[template.icon] || Users;
        return (
          <Pressable
            key={template.key}
            onPress={() => onSelect(template)}
            style={styles.chip}>
            <Icon size={14} color={Colors.white} strokeWidth={2.5} />
            <Text style={styles.chipText}>{template.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
});
