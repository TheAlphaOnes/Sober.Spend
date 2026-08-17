import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import type { Contact } from '@/types';
import { Check, Search } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface ContactPickerProps {
  contacts: Contact[];
  selectedIds: Set<number>;
  onToggle: (contactId: number) => void;
}

export function ContactPicker({ contacts, selectedIds, onToggle }: ContactPickerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search size={16} color={Colors.textMuted} strokeWidth={2.5} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {contacts.map((contact) => {
          const isSelected = selectedIds.has(contact.id);
          return (
            <Pressable
              key={contact.id}
              onPress={() => onToggle(contact.id)}
              style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
                <Text style={styles.avatarText}>
                  {contact.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {contact.isSelf ? 'You' : contact.name}
                </Text>
                {contact.phone && (
                  <Text style={styles.phone}>{contact.phone}</Text>
                )}
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected && <Check size={14} color={Colors.black} strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}
        {contacts.length === 0 && (
          <Text style={styles.empty}>No contacts yet. Import from settings.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    paddingVertical: 0,
  },
  list: {
    maxHeight: 300,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.black,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  phone: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.black,
  },
  empty: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
