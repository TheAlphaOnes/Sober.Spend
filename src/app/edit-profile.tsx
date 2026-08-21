import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useSplitStore } from '@/stores/split-store';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const { meName, mePhone } = useSplitStore();
  const [name, setName] = useState(meName === 'You' ? '' : meName);
  const [phone, setPhone] = useState(mePhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateProfile(name, phone);
    setSaving(false);
    if (result.error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.wrap, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Edit profile</Text>
        <View style={{ width: 38 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.label}>PHONE</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit number"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <NeoButton
          title={saving ? 'Saving…' : 'Save'}
          variant="primary"
          size="lg"
          disabled={saving}
          onPress={save}
        />
      </View>
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
  body: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  meta: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.textMuted },
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
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  err: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.exceeded },
});
