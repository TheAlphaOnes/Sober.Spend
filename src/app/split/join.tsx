import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { useSplitStore } from '@/stores/split-store';

export default function JoinScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, token } = useLocalSearchParams<{ t?: string; token?: string }>();
  const code = t || token || '';
  const { findGroupByToken, loadSplit } = useSplitStore();
  useFocusEffect(
    useCallback(() => {
      loadSplit();
    }, [loadSplit]),
  );
  const group = code ? findGroupByToken(code) : undefined;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Join</Text>
        <View style={{ width: 38 }} />
      </View>
      <View style={styles.body}>
        {group ? (
          <>
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.meta}>Scan this to join. You’re already on this device.</Text>
            <NeoButton title="Open group" variant="primary" size="lg" onPress={() => router.replace(`/split/${group.id}`)} />
          </>
        ) : (
          <>
            <Text style={styles.name}>That code’s dead. Ask again.</Text>
            <Text style={styles.meta}>If they just made the group on another phone, they can add you by scanning your QR instead.</Text>
            <NeoButton title="Back to split" variant="outline" size="lg" onPress={() => router.replace('/split')} />
          </>
        )}
      </View>
    </View>
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
  body: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.xl },
  name: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.white },
  meta: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.textMuted, lineHeight: 22 },
});
