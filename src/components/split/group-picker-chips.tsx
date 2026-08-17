import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import type { Group } from '@/types';
import { Briefcase, Heart, Home, Plane, Plus, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

const iconMap: Record<string, typeof Users> = {
  home: Home,
  plane: Plane,
  heart: Heart,
  users: Users,
  briefcase: Briefcase,
};

interface GroupPickerChipsProps {
  groups: Group[];
  selectedId: number | null;
  onSelect: (groupId: number) => void;
  onCreateNew: () => void;
}

export function GroupPickerChips({ groups, selectedId, onSelect, onCreateNew }: GroupPickerChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {groups.map((group) => {
        const Icon = iconMap[group.icon] || Users;
        const isSelected = group.id === selectedId;
        return (
          <Pressable
            key={group.id}
            onPress={() => onSelect(group.id)}
            style={[
              styles.chip,
              isSelected && { backgroundColor: group.color, borderColor: Colors.black },
            ]}>
            <Icon size={14} color={isSelected ? Colors.black : Colors.white} strokeWidth={2.5} />
            <Text style={[styles.chipText, isSelected && { color: Colors.black }]}>
              {group.name}
            </Text>
          </Pressable>
        );
      })}
      <Pressable onPress={onCreateNew} style={styles.newChip}>
        <Plus size={14} color={Colors.white} strokeWidth={2.5} />
        <Text style={styles.chipText}>New</Text>
      </Pressable>
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
  newChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: Borders.medium,
    borderColor: Colors.accent,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderStyle: 'dashed',
  },
  chipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
});
