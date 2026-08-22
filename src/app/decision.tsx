import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle,
  User,
  UserPlus,
  Users,
  Plus,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Modal,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View, type DimensionValue } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useBudgetStore } from '@/stores/budget-store';
import { useExpenseStore } from '@/stores/expense-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { useSplitStore } from '@/stores/split-store';
import type { CategoryId } from '@/types';
import { currentMonthExpenses } from '@/utils/budget-engine';
import { evaluateTransaction } from '@/utils/decision-engine';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import { getIcon } from '@/utils/icons';
import { buildUPIDeepLink, buildUPIMandateLink, saveVpaCategory } from '@/utils/upi-parser';
import { pickContact } from '@/utils/contacts';

type SplitTarget = 
  | { type: 'none' } 
  | { type: 'contact', name: string, phone: string } 
  | { type: 'group', id: string, name: string };

export default function DecisionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const pendingTransaction = useExpenseStore((s) => s.pendingTransaction);
  const confirmPending = useExpenseStore((s) => s.confirmPendingTransaction);
  const setPending = useExpenseStore((s) => s.setPendingTransaction);
  const expenses = useExpenseStore((s) => s.expenses);
  const addSubscription = useSubscriptionStore((s) => s.addSubscription);
  const { monthlyBudget, monthlySavingsDeposited, categories } = useBudgetStore();

  const user = useAuthStore((s) => s.user);
  const { setDraft, groups, setPendingPerson } = useSplitStore();
  const activeGroups = groups.filter(g => g.isActive && g.kind === 'group');
  const [overrideCategoryName, setOverrideCategoryName] = useState<CategoryId | null>(null);
  const [splitTarget, setSplitTarget] = useState<SplitTarget>({ type: 'none' });
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [qrHadNoAmount] = useState(
    () => !pendingTransaction || !(pendingTransaction.amount > 0),
  );
  const [amountText, setAmountText] = useState(() =>
    pendingTransaction && pendingTransaction.amount > 0 ? String(pendingTransaction.amount) : '',
  );
  const amountValue = parseFloat(amountText) || 0;

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
    categories.find((c) => c.name.toLowerCase() === 'other') ||
    categories[0];

  if (!category) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Add a category in settings before you pay.</Text>
          <NeoButton title="Go Back" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const monthExpenses = currentMonthExpenses(expenses);
  const decision = evaluateTransaction(
    pendingTransaction.merchant,
    amountValue,
    category,
    monthExpenses,
    monthlyBudget,
    monthlySavingsDeposited,
  );

  const handlePay = async () => {
    if (isUnknown || amountValue <= 0) return;

    Haptics.notificationAsync(
      decision.warningLevel === 'exceeded'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success,
    );

    const categoryName = overrideCategoryName || pendingTransaction.category;
    const nextPending = {
      ...pendingTransaction,
      amount: amountValue,
      category: categoryName,
    };
    setPending(nextPending);
    if (overrideCategoryName && pendingTransaction.pa) {
      saveVpaCategory(pendingTransaction.pa, overrideCategoryName);
    }

    if (splitTarget.type !== 'none') {
      setDraft({
        amount: amountValue,
        merchant: pendingTransaction.merchant,
        category: categoryName,
        note: pendingTransaction.note,
        paidAt: new Date().toISOString(),
      });
      setPending(null);
    } else {
      await confirmPending();
    }

    const vpa = pendingTransaction.pa || pendingTransaction.merchant;
    const upiUrl = buildUPIDeepLink(
      vpa,
      pendingTransaction.merchant,
      amountValue,
      pendingTransaction.note || pendingTransaction.merchant,
    );
    Linking.openURL(upiUrl).catch(() => {});

    if (splitTarget.type !== 'none') {
      if (splitTarget.type === 'group') {
        router.replace(`/split/expense?groupId=${splitTarget.id}`);
      } else if (splitTarget.type === 'contact') {
        setPendingPerson({ name: splitTarget.name, phone: splitTarget.phone, userId: '' });
        router.replace(`/split/expense`);
      }
      return;
    }
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
          entering={FadeIn.duration(200)}
          style={styles.amountSection}>
          <Text style={styles.merchant}>{pendingTransaction.merchant}</Text>
          {pendingTransaction.note && (
            <Text style={styles.note}>{pendingTransaction.note}</Text>
          )}

          <View style={[styles.amountBox, { marginTop: Spacing.lg }]}>
            <TextInput
              style={styles.amountInput}
              value={amountText ? `₹${amountText}` : ''}
              onChangeText={(t) => setAmountText(sanitizeNumericInput(t))}
              keyboardType="numeric"
              placeholder="₹0"
              placeholderTextColor={Colors.textMuted}
              autoFocus={qrHadNoAmount}
              accessibilityLabel="Amount"
            />
          </View>
          {qrHadNoAmount ? (
            <Text style={styles.amountHint}>QR had no amount. Type it.</Text>
          ) : null}
        </Animated.View>

        <View style={styles.categorySection}>
          <Text style={styles.categoryLabel}>CATEGORY</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat, index) => {
              const isSelected = effectiveCategoryName === cat.name;
              const LucideIcon = getIcon(cat.icon);
              return (
                <Animated.View
                  key={cat.id}
                  entering={FadeIn.delay(index * 40).duration(180)}>
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
                      size={12}
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

        {!isUnknown && amountValue > 0 && (
          <Animated.View entering={FadeIn.delay(150).duration(220)}>
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
        {user && amountValue > 0 ? (
          <View style={styles.splitSection}>
            <Text style={styles.splitLabel}>SPLIT WITH:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.splitScroll}>
              <Pressable 
                style={[styles.splitCard, splitTarget.type === 'none' && styles.splitCardActive]}
                onPress={() => setSplitTarget({ type: 'none' })}>
                <User size={14} color={splitTarget.type === 'none' ? Colors.bg : Colors.textMuted} strokeWidth={2.5} />
                <Text style={[styles.splitCardText, splitTarget.type === 'none' && styles.splitCardTextActive]}>Just me</Text>
              </Pressable>

              <Pressable 
                style={[styles.splitCard, splitTarget.type === 'contact' && styles.splitCardActive]}
                onPress={async () => {
                  const picked = await pickContact();
                  if (picked) {
                    setSplitTarget({ type: 'contact', name: picked.name, phone: picked.phone || '' });
                  }
                }}>
                <UserPlus size={14} color={splitTarget.type === 'contact' ? Colors.bg : Colors.textMuted} strokeWidth={2.5} />
                <Text style={[styles.splitCardText, splitTarget.type === 'contact' && styles.splitCardTextActive]}>
                  {splitTarget.type === 'contact' ? splitTarget.name.split(' ')[0] : 'Someone'}
                </Text>
              </Pressable>

              <Pressable 
                style={[styles.splitCard, splitTarget.type === 'group' && styles.splitCardActive]}
                onPress={() => setShowGroupModal(true)}>
                <Users size={14} color={splitTarget.type === 'group' ? Colors.bg : Colors.textMuted} strokeWidth={2.5} />
                <Text style={[styles.splitCardText, splitTarget.type === 'group' && styles.splitCardTextActive]}>
                  {splitTarget.type === 'group' ? splitTarget.name : 'Group'}
                </Text>
              </Pressable>

              <Pressable 
                style={styles.splitCard}
                onPress={() => router.push('/split/new')}>
                <Plus size={14} color={Colors.textMuted} strokeWidth={2.5} />
                <Text style={styles.splitCardText}>New Group</Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : null}

      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.md }]}>
                <NeoButton
          title={
            amountValue <= 0
              ? 'Enter an amount'
              : isUnknown
                ? 'Pick a category first'
                : pendingTransaction.isMandate
                  ? 'Setup AutoPay'
                  : decision.warningLevel === 'exceeded'
                    ? 'Send It Anyway'
                    : 'Pay Up'
          }
          variant={
            amountValue <= 0 || isUnknown
              ? 'outline'
              : decision.warningLevel === 'exceeded'
                ? 'danger'
                : 'primary'
          }
          size="lg"
          onPress={handlePay}
          disabled={amountValue <= 0 || isUnknown}
          icon={
            amountValue > 0 && !isUnknown
              ? decision.warningLevel === 'exceeded'
                ? <AlertTriangle size={18} color={Colors.white} strokeWidth={2.5} />
                : <CheckCircle size={18} color={Colors.white} strokeWidth={2.5} />
              : undefined
          }
        />
      </View>

      <Modal visible={showGroupModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowGroupModal(false)}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
            <Text style={styles.modalTitle}>Select a Group</Text>
            {activeGroups.length === 0 ? (
              <Text style={styles.modalEmpty}>No active groups. Create one!</Text>
            ) : (
              activeGroups.map(g => (
                <Pressable 
                  key={g.id} 
                  style={styles.modalRow} 
                  onPress={() => {
                    setSplitTarget({ type: 'group', id: g.id, name: g.name });
                    setShowGroupModal(false);
                  }}>
                  <Users size={18} color={Colors.white} strokeWidth={2} />
                  <Text style={styles.modalRowText}>{g.name}</Text>
                </Pressable>
              ))
            )}
          </View>
        </Pressable>
      </Modal>
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
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingVertical: Spacing.xl,
  },
  amountInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 72,
    color: Colors.white,
    paddingVertical: 0,
    textAlign: 'center',
  },
  amountHint: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    marginTop: Spacing.sm,
  },
  merchant: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
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
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: Borders.thin,
    borderRadius: Radii.pill,
  },
  chipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
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
  splitSection: {
    paddingVertical: Spacing.md,
  },
  splitLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  splitScroll: {
    gap: Spacing.sm,
  },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
  },
  splitCardActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  splitCardText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  splitCardTextActive: {
    color: Colors.bg,
  },
  actions: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  splitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 40,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: Borders.medium,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  boxOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  splitToggleText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    padding: Spacing.xl,
    width: '100%',
    borderTopWidth: Borders.thick,
    borderLeftWidth: Borders.thick,
    borderRightWidth: Borders.thick,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalEmpty: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalRowText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
