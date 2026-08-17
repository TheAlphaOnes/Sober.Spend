import { GroupCard } from '@/components/split/group-card';
import { GroupSetupSheet } from '@/components/split/group-setup-sheet';
import { SplitBalanceCard } from '@/components/split/split-balance-card';
import { SplitModeToggle } from '@/components/split/split-mode-toggle';
import { SplitSetupSheet } from '@/components/split/split-setup-sheet';
import { ContactRow } from '@/components/split/contact-row';
import { GroupTemplateChips } from '@/components/split/group-template-chips';
import { NeoBackButton } from '@/components/ui/neo-back-button';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { useSplitStore } from '@/stores/split-store';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SplitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    contacts,
    groups,
    preferredMode,
    loadAll,
    setPreferredMode,
    getTotalOwed,
    getGroupBalance,
    getContactBalance,
    getGroupMembers,
  } = useSplitStore();

  const [showSetup, setShowSetup] = useState(false);
  const [showGroupSetup, setShowGroupSetup] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const totals = getTotalOwed();
  const nonSelfContacts = contacts.filter((c) => !c.isSelf);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Split</Text>
        <Pressable onPress={() => setShowSetup(true)} style={styles.addBtn}>
          <Plus size={20} color={Colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Balance summary */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <SplitBalanceCard owedToMe={totals.owedToMe} iOwe={totals.iOwe} />
        </Animated.View>

        {/* Mode toggle */}
        <View style={styles.toggleWrap}>
          <SplitModeToggle activeMode={preferredMode} onModeChange={setPreferredMode} />
        </View>

        {preferredMode === 'groups' ? (
          <>
            {/* Template chips */}
            <View style={styles.templatesWrap}>
              <GroupTemplateChips onSelect={() => setShowGroupSetup(true)} />
            </View>

            {/* Group cards */}
            <View style={styles.listSection}>
              {groups.map((group, index) => {
                const balance = getGroupBalance(group.id);
                const netBalance = balance.owedToMe - balance.iOwe;
                const memberCount = getGroupMembers(group.id).length;
                return (
                  <Animated.View
                    key={group.id}
                    entering={FadeInDown.delay(index * 45).duration(300)}>
                    <GroupCard
                      group={group}
                      memberCount={memberCount}
                      balance={netBalance}
                      onPress={() =>
                        router.push(`/split-detail?type=group&id=${group.id}`)
                      }
                    />
                  </Animated.View>
                );
              })}
              {groups.length === 0 && (
                <Text style={styles.emptyText}>
                  No groups yet. Tap a template above to make one in 2 seconds.
                </Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* People list */}
            <View style={styles.listSection}>
              {nonSelfContacts
                .map((c) => ({ contact: c, balance: getContactBalance(c.id) }))
                .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
                .map(({ contact, balance }, index) => (
                  <Animated.View
                    key={contact.id}
                    entering={FadeInDown.delay(index * 35).duration(250)}>
                    <ContactRow
                      contact={contact}
                      balance={balance}
                      onPress={() =>
                        router.push(`/split-detail?type=contact&id=${contact.id}`)
                      }
                    />
                  </Animated.View>
                ))}
              {nonSelfContacts.length === 0 && (
                <Text style={styles.emptyText}>
                  No contacts yet. Split something with someone first.
                </Text>
              )}
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + Spacing.lg }]}
        onPress={() => setShowSetup(true)}>
        <Plus size={24} color={Colors.black} strokeWidth={3} />
      </Pressable>

      {/* Sheets */}
      <SplitSetupSheet visible={showSetup} onClose={() => setShowSetup(false)} />
      <GroupSetupSheet
        visible={showGroupSetup}
        onClose={() => setShowGroupSetup(false)}
        onCreated={() => setShowGroupSetup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  toggleWrap: {
    marginTop: Spacing.md,
  },
  templatesWrap: {
    marginTop: Spacing.lg,
  },
  listSection: {
    marginTop: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
