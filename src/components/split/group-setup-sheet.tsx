import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { GROUP_TEMPLATES } from '@/utils/split-engine';
import { useSplitStore } from '@/stores/split-store';
import { pickPhoneContact } from '@/utils/contacts';
import { Briefcase, Heart, Home, Plane, Plus, UserPlus, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const iconMap: Record<string, typeof Users> = {
  home: Home,
  plane: Plane,
  heart: Heart,
  users: Users,
  briefcase: Briefcase,
  plus: Plus,
};

interface GroupSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (groupId: number) => void;
}

export function GroupSetupSheet({ visible, onClose, onCreated }: GroupSetupSheetProps) {
  const { contacts, createGroup, addMember, addContact } = useSplitStore();
  const [selectedTemplate, setSelectedTemplate] = useState<typeof GROUP_TEMPLATES[number] | null>(null);
  const [name, setName] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());

  const handleTemplateSelect = (template: typeof GROUP_TEMPLATES[number]) => {
    setSelectedTemplate(template);
    setName(template.label);
  };

  const handlePickContact = async () => {
    const picked = await pickPhoneContact();
    if (!picked) return;

    // Check if contact already exists by phone
    const existing = contacts.find((c) => c.phone === picked.phone);
    if (existing) {
      toggleContact(existing.id);
      return;
    }

    // Add to DB, then select
    const newId = addContact({
      phone: picked.phone,
      name: picked.name,
      avatarColor: picked.avatarColor,
    });
    if (newId !== -1) {
      toggleContact(newId);
    }
  };

  const toggleContact = (contactId: number) => {
    const next = new Set(selectedContactIds);
    if (next.has(contactId)) {
      next.delete(contactId);
    } else {
      next.add(contactId);
    }
    setSelectedContactIds(next);
  };

  const handleCreate = () => {
    if (!selectedTemplate || !name.trim()) return;

    const groupId = createGroup({
      name: name.trim(),
      color: selectedTemplate.color,
      icon: selectedTemplate.icon,
      template: selectedTemplate.key,
    });

    if (groupId === -1) return;

    // Add selected contacts as members
    for (const contactId of selectedContactIds) {
      addMember(groupId, contactId);
    }

    // Reset state
    setSelectedTemplate(null);
    setName('');
    setSelectedContactIds(new Set());
    onCreated(groupId);
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setName('');
    setSelectedContactIds(new Set());
    onClose();
  };

  const nonSelfContacts = contacts.filter((c) => !c.isSelf);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>New Group</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Template selection */}
            <Text style={styles.label}>PICK A TEMPLATE</Text>
            <View style={styles.templateGrid}>
              {GROUP_TEMPLATES.map((template) => {
                const Icon = iconMap[template.icon] || Users;
                const isSelected = selectedTemplate?.key === template.key;
                return (
                  <Pressable
                    key={template.key}
                    onPress={() => handleTemplateSelect(template)}
                    style={[
                      styles.templateChip,
                      isSelected && { backgroundColor: template.color, borderColor: Colors.black },
                    ]}>
                    <Icon size={16} color={isSelected ? Colors.black : Colors.white} strokeWidth={2.5} />
                    <Text style={[styles.templateText, isSelected && { color: Colors.black }]}>
                      {template.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Name input */}
            {selectedTemplate && (
              <>
                <Text style={styles.label}>GROUP NAME</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Group name"
                  placeholderTextColor={Colors.textMuted}
                />

                <Text style={styles.label}>ADD MEMBERS</Text>
                <Pressable onPress={handlePickContact} style={styles.importBtn}>
                  <UserPlus size={16} color={Colors.accent} strokeWidth={2.5} />
                  <Text style={styles.importText}>Add from contacts</Text>
                </Pressable>

                {/* Selected members */}
                {nonSelfContacts.length > 0 && (
                  <View style={styles.contactList}>
                    {nonSelfContacts.map((contact) => {
                      const isSelected = selectedContactIds.has(contact.id);
                      return (
                        <Pressable
                          key={contact.id}
                          onPress={() => toggleContact(contact.id)}
                          style={styles.contactRow}>
                          <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
                            <Text style={styles.avatarText}>
                              {contact.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.contactName} numberOfLines={1}>
                            {contact.name}
                          </Text>
                          <View style={[styles.checkbox, isSelected && styles.checkboxActive]} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {selectedContactIds.size > 0 && (
                  <Text style={styles.selectedCount}>
                    {selectedContactIds.size} member{selectedContactIds.size > 1 ? 's' : ''} selected
                  </Text>
                )}
              </>
            )}
          </ScrollView>

          {selectedTemplate && (
            <View style={styles.actions}>
              <NeoButton
                title="Create Group"
                variant="primary"
                size="lg"
                onPress={handleCreate}
                disabled={!name.trim()}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: Borders.thick,
    borderBottomWidth: 0,
    borderColor: Colors.black,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scroll: {
    maxHeight: 400,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  templateChip: {
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
  templateText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  input: {
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: Borders.thin,
    borderColor: Colors.accent,
    borderRadius: Radii.md,
    borderStyle: 'dashed',
  },
  importText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  contactList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.black,
  },
  contactName: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
  },
  checkboxActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.black,
  },
  selectedCount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  actions: {
    marginTop: Spacing.lg,
  },
});
