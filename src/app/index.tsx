import { BudgetSummary } from '@/components/dashboard/budget-summary';
import { CategoryCard } from '@/components/dashboard/category-card';
import { RiskBanner, type RiskLevel } from '@/components/dashboard/risk-banner';
import { TransactionItem } from '@/components/dashboard/transaction-item';
import { NeoCard } from '@/components/ui/neo-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useBudgetStore } from '@/stores/budget-store';
import { useExpenseStore } from '@/stores/expense-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { currentMonthExpenses, spentByCategory, totalSpent } from '@/utils/budget-engine';
import { formatCurrency } from '@/utils/format';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { ChevronRight, ScanLine, Settings, Sparkles, User, Wallet } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { expenses, loadExpenses } = useExpenseStore();
  const { monthlyBudget, monthlySavingsTarget, savingsBalance, monthlySavingsDeposited, categories, loadSettings, rolloverIfNeeded } =
    useBudgetStore();
  const { items: wishlistItems, loadWishlist } = useWishlistStore();

  const monthExpenses = useMemo(
    () => currentMonthExpenses(expenses),
    [expenses],
  );
  const total = totalSpent(monthExpenses);
  // Budget used = expenses + savings deposits this month
  const totalUsed = total + monthlySavingsDeposited;
  const byCat = spentByCategory(monthExpenses);
  // Sort by date descending (newest first) for the recent section
  const recent = [...monthExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // Risk banner logic — funny, reactive, visual
  const riskProps = useMemo(() => {
    if (totalUsed === 0) return null;

    const totalPct = (totalUsed / monthlyBudget) * 100;

    if (totalPct >= 100) {
      return {
        riskLevel: 'BROKE' as RiskLevel,
        message: 'You hit zero. Iconic. But like, in a bad way.',
      };
    }
    if (totalPct >= 90) {
      return {
        riskLevel: 'DANGER' as RiskLevel,
        message: "Bro you're basically running on fumes. One more swipe and it's over.",
      };
    }

    let maxName = '';
    let maxPct = 0;
    for (const [name, val] of Object.entries(byCat)) {
      const cat = categories.find((c) => c.name === name);
      if (cat && cat.budgetLimit > 0) {
        const pct = (val / cat.budgetLimit) * 100;
        if (pct > maxPct) { maxName = name; maxPct = pct; }
      }
    }
    const maxCat = categories.find((c) => c.name === maxName);

    if (!maxCat || maxPct < 20) {
      return {
        riskLevel: 'CHILL' as RiskLevel,
        message: "You're actually being responsible? Who even are you right now.",
      };
    }

    if (maxPct >= 100) {
      return {
        riskLevel: 'WASTED' as RiskLevel,
        message: `Yeah you absolutely cooked your ${maxCat.name} budget. RIP.`,
        highlightedWord: maxCat.name,
      };
    }
    if (maxPct >= 80) {
      return {
        riskLevel: 'WARNING' as RiskLevel,
        message: `Bro ${maxCat.name} is eating you alive. Maybe slow down? Just a thought.`,
        highlightedWord: maxCat.name,
      };
    }
    if (maxPct >= 50) {
      return {
        riskLevel: 'SUS' as RiskLevel,
        message: `Halfway through ${maxCat.name} already? It's literally the 17th.`,
        highlightedWord: maxCat.name,
      };
    }

    return {
      riskLevel: 'SAFE' as RiskLevel,
      message: `Okay ${maxCat.name} spending is giving responsible adult. We love to see it.`,
      highlightedWord: maxCat.name,
    };
  }, [byCat, totalUsed, categories, monthlyBudget]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      rolloverIfNeeded();
      loadSettings();
      loadExpenses();
      loadWishlist();
    }, [rolloverIfNeeded, loadSettings, loadExpenses, loadWishlist]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Sober.Spend</Text>
            <Text style={styles.headerSub}>Spend Like Sober</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/profile')}
              style={styles.iconBtn}>
              <User size={20} color={Colors.white} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              style={styles.iconBtn}>
              <Settings size={20} color={Colors.white} strokeWidth={2.5} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Budget Summary — hero card */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)}>
          <BudgetSummary totalSpent={totalUsed} monthlyBudget={monthlyBudget} />
        </Animated.View>

        {/* Risk Banner — second hero card */}
        {riskProps && (
          <Animated.View entering={FadeInDown.delay(120).duration(350)}>
            <RiskBanner
              riskLevel={riskProps.riskLevel}
              message={riskProps.message}
              highlightedWord={riskProps.highlightedWord}
            />
          </Animated.View>
        )}

        {/* Savings & Wishlist entry card */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <Pressable onPress={() => router.push('/wishlist')}>
            <NeoCard color={Colors.surface} offset="sm" style={styles.savingsCard} textured>
              <View style={styles.savingsCardHeader}>
                <View style={styles.savingsCardLeft}>
                  <View style={styles.savingsCardIconRow}>
                    <Wallet size={16} color={Colors.accent} strokeWidth={2.5} />
                    <Text style={styles.savingsCardLabel}>SAVINGS</Text>
                  </View>
                  <Text style={styles.savingsCardAmount}>
                    {formatCurrency(savingsBalance)}
                  </Text>
                  {monthlySavingsTarget > 0 ? (
                    <>
                      <View style={styles.savingsCardBar}>
                        <ProgressBar
                          percent={Math.min(100, Math.round((monthlySavingsDeposited / monthlySavingsTarget) * 100))}
                          height={6}
                          color={Colors.accent}
                          backgroundColor={Colors.bg}
                          showBorder={false}
                        />
                      </View>
                      <Text style={styles.savingsCardTarget}>
                        of {formatCurrency(monthlySavingsTarget)} target
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.savingsCardHint}>
                      Set a target in settings
                    </Text>
                  )}
                </View>
                <View style={styles.savingsCardRight}>
                  {wishlistItems.filter((i) => i.status !== 'bought').length > 0 && (
                    <View style={styles.wishlistBadge}>
                      <Sparkles size={12} color={Colors.black} strokeWidth={2.5} />
                      <Text style={styles.wishlistBadgeText}>
                        {wishlistItems.filter((i) => i.status !== 'bought').length}
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.5} />
                </View>
              </View>
            </NeoCard>
          </Pressable>
        </Animated.View>

        {/* Category Cards */}
        <Text style={styles.sectionTitle}>Budgets</Text>
        <View style={styles.categoryList}>
          {categories.map((cat, index) => (
            <Animated.View
              key={cat.id}
              entering={FadeInDown.delay(200 + index * 45).duration(300)}>
              <CategoryCard category={cat} spent={byCat[cat.name] || 0} />
            </Animated.View>
          ))}
          {categories.length === 0 && (
            <Text style={styles.emptyText}>No categories yet. Go make some in settings, it's free.</Text>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <Pressable onPress={() => router.push('/history')}>
            <Text style={styles.seeAllText}>See All</Text>
          </Pressable>
        </View>
        <View style={styles.transactionList}>
          {recent.map((expense, index) => {
            const cat = categories.find((c) => c.name === expense.category);
            return (
              <Animated.View
                key={expense.id}
                entering={FadeInDown.delay(300 + index * 40).duration(250)}>
                <TransactionItem expense={expense} category={cat} />
              </Animated.View>
            );
          })}
          {recent.length === 0 && (
            <Text style={styles.emptyText}>No transactions yet. Go scan something, be brave.</Text>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB — compact, not chunky */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + Spacing.lg }]}
        onPress={() => router.push('/scan')}>
        <ScanLine size={24} color={Colors.black} strokeWidth={3} />
      </Pressable>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
  },
  headerSub: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  categoryList: {
    gap: Spacing.md,
  },
  transactionList: {
    gap: 0,
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
  // Savings card on dashboard
  savingsCard: {
    marginTop: Spacing.md,
  },
  savingsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsCardLeft: {
    flex: 1,
  },
  savingsCardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  savingsCardLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  savingsCardAmount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
  },
  savingsCardBar: {
    marginTop: Spacing.sm,
    width: '80%',
  },
  savingsCardTarget: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  savingsCardHint: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  savingsCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wishlistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  wishlistBadgeText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
});
