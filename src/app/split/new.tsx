import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserPlus, User } from 'lucide-react-native';

import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useSplitStore } from '@/stores/split-store';
import { pickContact } from '@/utils/contacts';

export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createGroup = useSplitStore((s) => s.createGroup);
  const addMember = useSplitStore((s) => s.addMember);
  
  const [name, setName] = useState('');
  const [members, setMembers] = useState<{ id: number; name: string; phone?: string }[]>([]);
  const [nextId, setNextId] = useState(1);

  const handleAddPerson = async () => {
    const c = await pickContact();
    if (c) {
      const isDuplicate = members.some(
        (m) => (c.phone && m.phone === c.phone) || (!c.phone && m.name === c.name)
      );
      if (isDuplicate) {
        Alert.alert('Already added', `${c.name} is already in the group.`);
        return;
      }
      setMembers((prev) => [...prev, { id: nextId, name: c.name, phone: c.phone }]);
      setNextId((id) => id + 1);
    }
  };

  const handleRemovePerson = (idToRemove: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== idToRemove));
  };

  return (
    <KeyboardAvoidingView
      style={[styles.wrap, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>New group</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Goa Trip, Flat 4B…"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.label, { marginTop: Spacing.md }]}>MEMBERS (CAN'T CHANGE LATER)</Text>
        
        <View style={styles.membersList}>
          <View style={styles.memberRow}>
            <User size={16} color={Colors.white} strokeWidth={2.5} />
            <Text style={styles.memberName}>You</Text>
          </View>
          
          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <User size={16} color={Colors.white} strokeWidth={2.5} />
              <Text style={styles.memberName}>{m.name}</Text>
              <Pressable onPress={() => handleRemovePerson(m.id)} style={styles.removeBtn}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}

          <Pressable onPress={handleAddPerson} style={styles.addPeople}>
            <UserPlus size={18} color={Colors.accent} strokeWidth={2.5} />
            <Text style={styles.addPeopleText}>Add person</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: Spacing.xl }}>
          <NeoButton
            title="Make the group"
            variant="primary"
            size="lg"
            disabled={!name.trim()}
            onPress={() => {
              const groupId = createGroup(name.trim());
              for (const m of members) {
                addMember(groupId, m.name, m.phone);
              }
              router.replace(`/split/${groupId}`);
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.white },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  input: {
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  membersList: {
    gap: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  memberName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    flex: 1,
  },
  removeBtn: {
    padding: Spacing.xs,
  },
  removeText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.exceeded,
  },
  addPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 40,
  },
  addPeopleText: { 
    fontFamily: Fonts.display, 
    fontSize: FontSizes.md, 
    color: Colors.accent 
  },
});
