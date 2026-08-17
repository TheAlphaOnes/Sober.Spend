import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import type { Contact } from '@/types';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

interface PaidBySelectorProps {
  contacts: Contact[];
  selectedId: number;
  onChange: (id: number) => void;
}

export function PaidBySelector({ contacts, selectedId, onChange }: PaidBySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {contacts.map((contact) => {
        const isSelected = contact.id === selectedId;
        const label = contact.isSelf ? 'You' : contact.name;
        return (
          <Pressable
            key={contact.id}
            onPress={() => onChange(contact.id)}
            style={[styles.chip, isSelected && styles.chipActive]}>
            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.black,
  },
  chipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
});
