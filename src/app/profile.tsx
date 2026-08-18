import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Cloud,
  FolderTree,
  LogOut,
  Mail,
  Settings,
  Shield,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useBudgetStore } from '@/stores/budget-store';
import { useExpenseStore } from '@/stores/expense-store';
import { formatCurrency } from '@/utils/format';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user, signInWithEmail, signUpWithEmail, signOut } = useAuthStore();
  const { monthlyBudget, categories } = useBudgetStore();
  const { expenses } = useExpenseStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    setConfirmSent(false);

    const result = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);

    setLoading(false);

    if (result.error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (isSignUp) {
        setConfirmSent(true);
        setPassword('');
      } else {
        setEmail('');
        setPassword('');
      }
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgPerTransaction = expenses.length > 0 ? Math.round(totalSpent / expenses.length) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <NeoBackButton />
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        {user ? (
          <>
            {/* Profile identity */}
            <Animated.View entering={FadeIn.duration(200)}>
              <NeoCard color={Colors.surface} offset="sm" style={styles.profileCard} textured>
                <View style={styles.profileHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user.email?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
                    <View style={styles.statusRow}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.profileSub}>Signed in</Text>
                    </View>
                  </View>
                </View>
              </NeoCard>
            </Animated.View>

            {/* Stats — compact single-row strip, not a 2x2 grid */}
            <Animated.View entering={FadeIn.delay(80).duration(200)}>
              <NeoCard color={Colors.surface} offset="sm" style={styles.statsCard} textured>
                <View style={styles.statsRow}>
                  <StatItem
                    label="SPENT"
                    value={formatCurrency(totalSpent)}
                    valueColor={totalSpent > monthlyBudget ? Colors.exceeded : Colors.white}
                  />
                  <View style={styles.statDivider} />
                  <StatItem
                    label="AVG"
                    value={formatCurrency(avgPerTransaction)}
                  />
                  <View style={styles.statDivider} />
                  <StatItem
                    label="TXNS"
                    value={expenses.length.toString()}
                  />
                  <View style={styles.statDivider} />
                  <StatItem
                    label="BUDGET"
                    value={formatCurrency(monthlyBudget)}
                  />
                </View>
              </NeoCard>
            </Animated.View>

            {/* All settings in one grouped card */}
            <Animated.View entering={FadeIn.delay(120).duration(200)}>
              <NeoCard color={Colors.surface} offset="sm" style={styles.listCard} textured>
                <Pressable onPress={() => router.push('/settings')} style={styles.listCell}>
                  <View style={[styles.listIcon, { backgroundColor: Colors.accent }]}>
                    <Settings size={18} color={Colors.white} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.listText}>Budget Settings</Text>
                  <ChevronRight size={20} color={Colors.textMuted} strokeWidth={2.5} />
                </Pressable>

                <View style={styles.divider} />

                <Pressable onPress={() => router.push('/categories')} style={styles.listCell}>
                  <View style={[styles.listIcon, { backgroundColor: Colors.orange }]}>
                    <FolderTree size={18} color={Colors.white} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.listText}>Manage Categories</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{categories.length}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textMuted} strokeWidth={2.5} />
                </Pressable>

                <View style={styles.divider} />

                <View style={styles.listCell}>
                  <View style={[styles.listIcon, { backgroundColor: Colors.blue }]}>
                    <Cloud size={18} color={Colors.white} strokeWidth={2.5} />
                  </View>
                  <View style={styles.syncInfo}>
                    <Text style={styles.listText}>Cloud Sync</Text>
                    <Text style={styles.syncDesc}>Local storage active</Text>
                  </View>
                </View>
              </NeoCard>
            </Animated.View>

            {/* Sign out — subtle destructive button */}
            <Animated.View entering={FadeIn.delay(150).duration(220)} style={styles.signOutRow}>
              <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                <LogOut size={16} color={Colors.exceeded} strokeWidth={2.5} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </Animated.View>
          </>
        ) : (
          <>
            {/* Auth form */}
            <Animated.View entering={FadeIn.duration(200)}>
              <NeoCard color={Colors.surface} offset="sm" style={styles.loginCard}>
                <View style={styles.loginHeader}>
                  <View style={styles.loginIcon}>
                    <Shield size={20} color={Colors.white} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.loginTitle}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                </View>
                <Text style={styles.loginDesc}>
                  {isSignUp
                    ? 'Create an account to sync across devices.'
                    : 'Sign in to unlock cloud sync and backup.'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {confirmSent && (
                  <View style={styles.confirmBanner}>
                    <Mail size={16} color={Colors.safe} strokeWidth={2.5} />
                    <Text style={styles.confirmText}>
                      Confirmation email sent to {email.trim()}. Check your inbox and sign in after verifying.
                    </Text>
                  </View>
                )}

                <View style={styles.authBtnRow}>
                  <NeoButton
                    title={loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
                    variant="primary"
                    size="lg"
                    onPress={handleAuth}
                    disabled={loading || !email.trim() || !password.trim()}
                  />
                </View>

                <Pressable
                  style={styles.toggleAuth}
                  onPress={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}>
                  <Text style={styles.toggleText}>
                    {isSignUp
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Sign up"}
                  </Text>
                </Pressable>
              </NeoCard>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(80).duration(200)}>
              <NeoCard color={Colors.surfaceLight} style={styles.localCard}>
                <Text style={styles.localTitle}>Offline Mode Active</Text>
                <Text style={styles.localDesc}>
                  Your expenses and budget are saved on this device. Sign in to sync.
                </Text>
              </NeoCard>
            </Animated.View>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function StatItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? Colors.white }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  // Profile card
  profileCard: {
    marginBottom: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    borderWidth: Borders.medium,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.safe,
  },
  profileEmail: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  profileSub: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.safe,
  },
  // Stats — compact single-row strip
  statsCard: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  statLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  // Unified list card — settings + categories + sync
  listCard: {
    marginBottom: Spacing.sm,
  },
  listCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  listText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  countBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: Borders.thin,
    borderColor: Colors.borderLight,
  },
  countText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  // Sync sub-info
  syncInfo: {
    flex: 1,
  },
  syncDesc: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Sign out — full-width destructive button
  signOutRow: {
    marginTop: Spacing.lg,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  signOutText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.exceeded,
  },
  // Login form
  loginCard: {
    marginBottom: Spacing.md,
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  loginIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    borderWidth: Borders.medium,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  loginDesc: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
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
  errorText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.exceeded,
    marginBottom: Spacing.sm,
  },
  confirmBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(168, 230, 207, 0.1)',
    borderWidth: Borders.thin,
    borderColor: Colors.safe,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  confirmText: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.safe,
    lineHeight: 20,
  },
  authBtnRow: {
    marginTop: Spacing.sm,
  },
  toggleAuth: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  toggleText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  // Offline mode card
  localCard: {
    marginBottom: Spacing.md,
  },
  localTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  localDesc: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
