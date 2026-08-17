import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Car,
  CheckCircle,
  CircleEllipsis,
  Film,
  ShoppingBag,
  Utensils,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import { Animation, Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useBudgetStore } from '@/stores/budget-store';
import { useExpenseStore } from '@/stores/expense-store';
import type { CategoryId } from '@/types';
import { currentMonthExpenses } from '@/utils/budget-engine';
import { evaluateTransaction } from '@/utils/decision-engine';
import { formatCurrency } from '@/utils/format';

const iconMap: Record<string, typeof Utensils> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  film: Film,
  zap: Zap,
  'circle-ellipsis': CircleEllipsis,
};

export default function DecisionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const pendingTransaction = useExpenseStore((s) => s.pendingTransaction);
  const confirmPending = useExpenseStore((s) => s.confirmPendingTransaction);
  const setPending = useExpenseStore((s) => s.setPendingTransaction);
  const expenses = useExpenseStore((s) => s.expenses);
  const { monthlyBudget, monthlySavingsDeposited, categories } = useBudgetStore();

  const [overrideCategoryName, setOverrideCategoryName] = useState<CategoryId | null>(null);

  if (!pendingTransaction) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nothing to review. Go scan something first.</Text>
          <NeoButton title="Go Back" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const effectiveCategoryName = overrideCategoryName || pendingTransaction.category;
  const isUnknown = effectiveCategoryName.toLowerCase() === 'other' && !overrideCategoryName;
  const category =
    categories.find((c) => c.name === effectiveCategoryName) ||
    categories.find((c) => c.name.toLowerCase() === 'other')!;

  const monthExpenses = currentMonthExpenses(expenses);
  const decision = evaluateTransaction(
    pendingTransaction.merchant,
    pendingTransaction.amount,
    category,
    monthExpenses,
    monthlyBudget,
    monthlySavingsDeposited,
  );

  const handlePay = async () => {
    if (isUnknown) return;

    Haptics.notificationAsync(
      decision.warningLevel === 'exceeded'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success,
    );

    if (overrideCategoryName) {
      setPending({ ...pendingTransaction, category: overrideCategoryName });
    }

    await confirmPending();

    // Use the merchant VPA from the scanned QR code if available.
    // Fall back to a generic pay link if no VPA was parsed.
    const vpa = pendingTransaction.pa || pendingTransaction.merchant;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(pendingTransaction.merchant)}&am=${pendingTransaction.amount}&tn=${encodeURIComponent(pendingTransaction.note || pendingTransaction.merchant)}`;
    Linking.openURL(upiUrl).catch(() => {});

    router.dismissAll();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPending(null);
    router.dismissAll();
  };

  const warningColor =
    decision.warningLevel === 'exceeded'
      ? Colors.exceeded
      : decision.warningLevel === 'near_limit'
        ? Colors.nearLimit
        : Colors.safe;

  const warningIcon =
    decision.warningLevel === 'exceeded'
      ? <AlertTriangle size={20} color={Colors.exceeded} strokeWidth={2.5} />
      : decision.warningLevel === 'near_limit'
        ? <AlertTriangle size={20} color={Colors.nearLimit} strokeWidth={2.5} />
        : <CheckCircle size={20} color={Colors.safe} strokeWidth={2.5} />;

  // Threshold marker position (80% = near-limit threshold)
  const thresholdLeft = `${Math.min((80 / 100) * 100, 100)}%` as DimensionValue;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton onPress={handleCancel} />
        <Text style={styles.headerTitle}>Think Before You Pay</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Animated.View
          entering={FadeInUp.duration(Animation.duration.entrance)}
          style={styles.amountSection}>
          <Text style={styles.amount}>{formatCurrency(pendingTransaction.amount)}</Text>
          <Text style={styles.merchant}>{pendingTransaction.merchant}</Text>
          {pendingTransaction.note && (
            <Text style={styles.note}>{pendingTransaction.note}</Text>
          )}
        </Animated.View>

        <View style={styles.categorySection}>
          <Text style={styles.categoryLabel}>CATEGORY</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat, index) => {
              const isSelected = effectiveCategoryName === cat.name;
              const LucideIcon = iconMap[cat.icon] || CircleEllipsis;
              return (
                <Animated.View
                  key={cat.id}
                  entering={FadeInDown.delay(index * Animation.stagger).duration(Animation.duration.entrance)}>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setOverrideCategoryName(cat.name);
                    }}
                    style={[
                      styles.chip,
                      { borderColor: isSelected ? cat.color : Colors.border },
                      isSelected && { backgroundColor: cat.color },
                    ]}>
                    <LucideIcon
                      size={14}
                      color={isSelected ? Colors.black : Colors.textSecondary}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? Colors.black : Colors.textSecondary },
                      ]}>
                      {cat.name}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {!isUnknown && (
          <Animated.View entering={FadeInDown.delay(200).duration(Animation.duration.entrance)}>
            <NeoCard color={Colors.surface} offset="sm" style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text style={styles.impactTitle}>{category.name}</Text>
                <View style={styles.statusBadge}>
                  {warningIcon}
                </View>
              </View>

              {/* Visual budget meter — dual segment */}
              <View style={styles.meterContainer}>
                <View style={styles.meterTrack}>
                  {/* Current fill */}
                  <View
                    style={[
                      styles.meterCurrent,
                      {
                        width: `${Math.min(decision.currentPercent, 100)}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                  {/* Projected fill (the delta this transaction adds) */}
                  <View
                    style={[
                      styles.meterProjected,
                      {
                        left: `${Math.min(decision.currentPercent, 100)}%`,
                        width: `${Math.min(decision.projectedPercent - decision.currentPercent, 100 - decision.currentPercent)}%`,
                        backgroundColor: warningColor,
                      },
                    ]}
                  />
                  {/* 80% threshold marker */}
                  <View style={[styles.meterThreshold, { left: thresholdLeft }]} />
                </View>

                {/* Scale labels */}
                <View style={styles.meterScale}>
                  <Text style={styles.meterScaleText}>₹0</Text>
                  <Text style={styles.meterScaleText}>{formatCurrency(category.budgetLimit)}</Text>
                </View>
              </View>

              {/* Before / After visual */}
              <View style={styles.beforeAfterRow}>
                <View style={styles.beforeAfterItem}>
                  <Text style={styles.beforeAfterLabel}>NOW</Text>
                  <Text style={styles.beforeAfterValue}>{formatCurrency(decision.currentSpent)}</Text>
                  <View style={styles.beforeAfterBar}>
                    <View
                      style={[
                        styles.beforeAfterFill,
                        {
                          width: `${Math.min(decision.currentPercent, 100)}%`,
                          backgroundColor: category.color,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.beforeAfterArrow}>
                  <Text style={styles.beforeAfterArrowText}>→</Text>
                </View>
                <View style={styles.beforeAfterItem}>
                  <Text style={styles.beforeAfterLabel}>AFTER</Text>
                  <Text style={[styles.beforeAfterValue, { color: warningColor }]}>
                    {formatCurrency(decision.projectedSpent)}
                  </Text>
                  <View style={styles.beforeAfterBar}>
                    <View
                      style={[
                        styles.beforeAfterFill,
                        {
                          width: `${Math.min(decision.projectedPercent, 100)}%`,
                          backgroundColor: warningColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </NeoCard>

            {/* Total monthly budget — visual bar */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Monthly Budget</Text>
              <View style={styles.totalBar}>
                <View
                  style={[
                    styles.totalFillCurrent,
                    {
                      width: `${Math.min(decision.totalCurrentPercent, 100)}%`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.totalFillProjected,
                    {
                      left: `${Math.min(decision.totalCurrentPercent, 100)}%`,
                      width: `${Math.min(decision.totalProjectedPercent - decision.totalCurrentPercent, 100 - decision.totalCurrentPercent)}%`,
                      backgroundColor: warningColor,
                    },
                  ]}
                />
              </View>
              <View style={styles.totalScale}>
                <Text style={styles.totalScaleText}>
                  {decision.totalCurrentPercent}%
                </Text>
                <Text style={[styles.totalScaleText, { color: warningColor }]}>
                  {decision.totalProjectedPercent}%
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.md }]}>
        <NeoButton
          title={
            isUnknown
              ? 'Pick a category first'
              : decision.warningLevel === 'exceeded'
                ? 'Send It Anyway'
                : 'Pay Up'
          }
          variant={
            isUnknown
              ? 'outline'
              : decision.warningLevel === 'exceeded'
                ? 'danger'
                : 'primary'
          }
          size="lg"
          onPress={handlePay}
          disabled={isUnknown}
          icon={
            !isUnknown
              ? decision.warningLevel === 'exceeded'
                ? <AlertTriangle size={18} color={Colors.white} strokeWidth={2.5} />
                : <CheckCircle size={18} color={Colors.white} strokeWidth={2.5} />
              : undefined
          }
        />
      </View>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.hero,
    color: Colors.white,
  },
  merchant: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  note: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: Borders.thin,
    borderRadius: Radii.pill,
  },
  chipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
  },
  impactCard: {
    marginBottom: Spacing.lg,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  impactTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
    flex: 1,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterContainer: {
    marginBottom: Spacing.lg,
  },
  meterTrack: {
    height: 12,
    backgroundColor: Colors.bg,
    borderRadius: Radii.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  meterCurrent: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: Radii.sm,
    opacity: 0.5,
  },
  meterProjected: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: Radii.sm,
  },
  meterThreshold: {
    position: 'absolute',
    top: -2,
    height: '120%',
    width: 2,
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  meterScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  meterScaleText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  beforeAfterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  beforeAfterItem: {
    flex: 1,
  },
  beforeAfterLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  beforeAfterValue: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  beforeAfterBar: {
    height: 4,
    backgroundColor: Colors.bg,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  beforeAfterFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  beforeAfterArrow: {
    marginTop: Spacing.xl,
  },
  beforeAfterArrowText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.textMuted,
  },
  totalSection: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  totalBar: {
    height: 6,
    backgroundColor: Colors.bg,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  totalFillCurrent: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: Colors.textSecondary,
    borderRadius: Radii.pill,
    opacity: 0.5,
  },
  totalFillProjected: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: Radii.pill,
  },
  totalScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  totalScaleText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
  },
});
