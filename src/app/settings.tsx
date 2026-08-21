import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useBudgetStore } from '@/stores/budget-store';
import { useExpenseStore } from '@/stores/expense-store';
import type { Category } from '@/types';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import { getIcon } from '@/utils/icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  FolderTree,
  Info,
  PiggyBank,
  RotateCcw,
  Save,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    monthlyBudget,
    monthlySavingsTarget,
    savingsBalance,
    monthlySavingsDeposited,
    categories,
    loadSettings,
    setMonthlyBudget,
    setMonthlySavingsTarget,
    setCategoryLimit,
    addToSavings,
    deductFromSavings,
    resetMonth,
  } = useBudgetStore();

  const { resetCurrentMonth } = useExpenseStore();

  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [savingsTargetInput, setSavingsTargetInput] = useState(monthlySavingsTarget.toString());
  const [categoryInputs, setCategoryInputs] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Savings deposit/withdraw modal
  const [savingsModalVisible, setSavingsModalVisible] = useState(false);
  const [savingsModalMode, setSavingsModalMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [savingsAmountInput, setSavingsAmountInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  // Sync local inputs when store values change (after loadSettings completes)
  useEffect(() => {
    setBudgetInput(monthlyBudget.toString());
    setSavingsTargetInput(monthlySavingsTarget.toString());
    const inputs: Record<number, string> = {};
    for (const cat of categories) {
      inputs[cat.id] = cat.budgetLimit.toString();
    }
    setCategoryInputs(inputs);
  }, [monthlyBudget, monthlySavingsTarget, categories]);

  const totalCategoryAllocated = Object.values(categoryInputs).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0,
  );
  const savingsTargetNum = parseFloat(savingsTargetInput) || 0;
  const totalAllocated = totalCategoryAllocated + savingsTargetNum;
  const budgetNum = parseFloat(budgetInput) || monthlyBudget;
  const remainingToAllocate = budgetNum - totalAllocated;

  const handleSave = () => {
    const newBudget = parseFloat(budgetInput) || monthlyBudget;
    const newSavingsTarget = parseFloat(savingsTargetInput) || 0;

    setMonthlyBudget(newBudget);
    setMonthlySavingsTarget(newSavingsTarget);

    for (const cat of categories) {
      const val = parseFloat(categoryInputs[cat.id] || '0');
      if (!isNaN(val)) {
        setCategoryLimit(cat.id, val);
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openSavingsModal = (mode: 'deposit' | 'withdraw') => {
    setSavingsModalMode(mode);
    setSavingsAmountInput('');
    setSavingsModalVisible(true);
  };

  const handleSavingsSubmit = () => {
    const amount = parseFloat(savingsAmountInput);
    if (isNaN(amount) || amount <= 0) return;

    if (savingsModalMode === 'deposit') {
      addToSavings(amount);
    } else {
      // Prevent withdrawing more than available
      if (amount > savingsBalance) return;
      deductFromSavings(amount);
    }
    setSavingsModalVisible(false);
    setSavingsAmountInput('');
  };

  const savingsAmountNum = parseFloat(savingsAmountInput) || 0;
  const savingsSubmitDisabled =
    savingsModalMode === 'withdraw' && savingsAmountNum > savingsBalance;

  const handleResetMonth = () => {
    Alert.alert(
      'Reset This Month?',
      'Clears this month\u2019s expenses and savings progress. Your savings pool, budget, categories, and wishlist stay untouched. This can\u2019t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetCurrentMonth();
            resetMonth();
            setConfirmingReset(true);
            setTimeout(() => setConfirmingReset(false), 2000);
          },
        },
      ],
    );
  };

  const handleDevNuke = () => {
    Alert.alert(
      'NUKE EVERYTHING?',
      'This wipes ALL local data — expenses, splits, groups, contacts, settlements, savings, wishlist, settings. Fresh state, no restart needed. Dev-only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Nuke It',
          style: 'destructive',
          onPress: async () => {
            try {
              const { sqlite } = await import('@/db/schema');
              // Wipe every table, then re-seed the self-contact.
              // No file deletion, no app reload — just clear data + refresh stores.
              const tables = [
                'expenses', 'settings', 'categories',
                'wishlist_buckets', 'wishlist_items',
                'vpa_category_map',
                'split_groups', 'split_members', 'split_expenses',
                'split_shares', 'split_payments',
              ];
              for (const t of tables) {
                sqlite.execSync(`DELETE FROM ${t}`);
              }
              // Refresh all stores so the UI reflects the empty state.
              loadSettings();
              useExpenseStore.getState().loadExpenses();
              const { useWishlistStore } = await import('@/stores/wishlist-store');
              useWishlistStore.getState().loadWishlist();
              const { useSplitStore } = await import('@/stores/split-store');
              useSplitStore.getState().loadSplit();
              Alert.alert('Nuked', 'All local data wiped. App is fresh.');
            } catch (err) {
              console.error('[dev-nuke] failed:', err);
              Alert.alert('Nuke Failed', String(err));
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* How it works — info card */}
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Info size={16} color={Colors.accent} strokeWidth={2.5} />
              <Text style={styles.infoTitle}>HOW IT WORKS</Text>
            </View>
            <Text style={styles.infoText}>
              Set a monthly budget. Money you move to savings counts as spent. Leftover budget at month-end auto-flows into savings. Use savings to buy wishlist stuff, or buy direct.
            </Text>
          </View>
        </Animated.View>

        {/* Monthly Budget */}
        <Animated.View entering={FadeIn.delay(80).duration(200)}>
          <Text style={styles.sectionLabel}>MONTHLY BUDGET</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={budgetInput}
              onChangeText={(t) => setBudgetInput(sanitizeNumericInput(t))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </Animated.View>

        {/* Allocation tracker — visual */}
        <Animated.View entering={FadeIn.delay(120).duration(200)}>
          <View style={styles.allocationRow}>
            <Text style={styles.allocationLabel}>ALLOCATED</Text>
            <Text
              style={[
                styles.allocationValue,
                { color: remainingToAllocate < 0 ? Colors.exceeded : Colors.safe },
              ]}>
              {formatCurrency(totalAllocated)} / {formatCurrency(budgetNum)}
            </Text>
          </View>
          <View style={styles.allocationBar}>
            <View
              style={[
                styles.allocationFill,
                {
                  width: `${Math.min((totalAllocated / budgetNum) * 100, 100)}%`,
                  backgroundColor:
                    remainingToAllocate < 0 ? Colors.exceeded : Colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.allocationRemaining}>
            {remainingToAllocate >= 0
              ? `${formatCurrency(remainingToAllocate)} unallocated`
              : `${formatCurrency(Math.abs(remainingToAllocate))} over budget`}
          </Text>
        </Animated.View>

        {/* Savings — target + deposit/withdraw */}
        <Animated.View entering={FadeIn.delay(120).duration(200)}>
          <Text style={styles.sectionLabel}>SAVINGS</Text>
          <NeoCard color={Colors.surface} style={styles.savingsCard}>
            {/* Target input */}
            <View style={styles.savingsTargetRow}>
              <View style={styles.savingsTargetLeft}>
                <PiggyBank size={18} color={Colors.accent} strokeWidth={2.5} />
                <Text style={styles.savingsTargetLabel}>MONTHLY TARGET</Text>
              </View>
              <View style={styles.savingsTargetInput}>
                <Text style={styles.savingsCurrency}>₹</Text>
                <TextInput
                  style={styles.savingsTargetField}
                  value={savingsTargetInput}
                  onChangeText={(t) => setSavingsTargetInput(sanitizeNumericInput(t))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            {/* Balance + progress */}
            <View style={styles.savingsBalanceRow}>
              <View>
                <Text style={styles.savingsBalanceLabel}>SAVINGS POOL</Text>
                <Text style={styles.savingsBalanceAmount}>
                  {formatCurrency(savingsBalance)}
                </Text>
              </View>
              {monthlySavingsTarget > 0 && (
                <Text style={styles.savingsProgressText}>
                  {Math.min(100, Math.round((monthlySavingsDeposited / monthlySavingsTarget) * 100))}%
                </Text>
              )}
            </View>
            {monthlySavingsTarget > 0 && (
              <View style={styles.savingsBarWrap}>
                <ProgressBar
                  percent={Math.min(100, Math.round((monthlySavingsDeposited / monthlySavingsTarget) * 100))}
                  height={8}
                  color={Colors.accent}
                  backgroundColor={Colors.bg}
                  showBorder={false}
                />
              </View>
            )}

            {/* Deposit / Withdraw buttons */}
            <View style={styles.savingsActions}>
              <NeoButton
                title="Add"
                variant="primary"
                size="sm"
                onPress={() => openSavingsModal('deposit')}
                icon={<ArrowDownLeft size={14} color={Colors.white} strokeWidth={2.5} />}
              />
              <NeoButton
                title="Withdraw"
                variant="outline"
                size="sm"
                onPress={() => openSavingsModal('withdraw')}
                icon={<ArrowUpRight size={14} color={Colors.white} strokeWidth={2.5} />}
              />
            </View>
          </NeoCard>
        </Animated.View>

        {/* Category Limits */}
        <Animated.View entering={FadeIn.delay(150).duration(220)}>
          <View style={styles.categoryHeader}>
            <Text style={styles.sectionLabel}>CATEGORY LIMITS</Text>
            <Pressable
              onPress={() => router.push('/categories')}
              style={styles.manageBtn}>
              <FolderTree size={14} color={Colors.accent} strokeWidth={2.5} />
              <Text style={styles.manageBtnText}>Manage</Text>
            </Pressable>
          </View>
        </Animated.View>

        {categories.map((cat, index) => (
          <Animated.View
            key={cat.id}
            entering={FadeIn.delay(180 + index * 40).duration(180)}>
            <CategoryLimitRow
              category={cat}
              value={categoryInputs[cat.id] ?? ''}
              onChangeText={(text) =>
                setCategoryInputs((prev) => ({ ...prev, [cat.id]: sanitizeNumericInput(text) }))
              }
            />
          </Animated.View>
        ))}

        {/* Save button */}
        <Animated.View entering={FadeIn.delay(180).duration(180)}>
          <View style={styles.saveRow}>
            <NeoButton
              title={saved ? 'Saved!' : 'Save Settings'}
              variant="primary"
              size="lg"
              onPress={handleSave}
              icon={<Save size={18} color={Colors.white} strokeWidth={2.5} />}
            />
          </View>
        </Animated.View>

        {/* Danger Zone — Reset Month */}
        <Animated.View entering={FadeIn.delay(200).duration(180)}>
          <Pressable
            style={styles.dangerRow}
            onPress={handleResetMonth}>
            <View style={styles.dangerLeft}>
              <View style={styles.dangerIcon}>
                {confirmingReset ? (
                  <RotateCcw size={16} color={Colors.safe} strokeWidth={2.5} />
                ) : (
                  <Trash2 size={16} color={Colors.exceeded} strokeWidth={2.5} />
                )}
              </View>
              <View>
                <Text style={styles.dangerTitle}>
                  {confirmingReset ? 'Month Reset' : 'Reset This Month'}
                </Text>
                <Text style={styles.dangerDesc}>
                  Clears {new Date().toLocaleString('default', { month: 'long' })} expenses only
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* Dev Zone — Nuke Everything */}
        <Animated.View entering={FadeIn.delay(240).duration(180)}>
          <Pressable
            style={styles.devRow}
            onPress={handleDevNuke}>
            <View style={styles.dangerLeft}>
              <View style={styles.devIcon}>
                <Trash2 size={16} color={Colors.exceeded} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.dangerTitle}>Nuke Everything (Dev)</Text>
                <Text style={styles.dangerDesc}>
                  Wipes all data + DB. App restarts fresh.
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Savings deposit/withdraw modal */}
      <Modal
        visible={savingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSavingsModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSavingsModalVisible(false)}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Wallet size={20} color={Colors.accent} strokeWidth={2.5} />
              <Text style={styles.modalTitle}>
                {savingsModalMode === 'deposit' ? 'ADD TO SAVINGS' : 'WITHDRAW SAVINGS'}
              </Text>
            </View>
            <Text style={styles.modalBalance}>
              Current: {formatCurrency(savingsBalance)}
            </Text>
            <View style={styles.modalInputBox}>
              <Text style={styles.modalCurrency}>₹</Text>
              <TextInput
                style={styles.modalInput}
                value={savingsAmountInput}
                onChangeText={(t) => setSavingsAmountInput(sanitizeNumericInput(t))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <NeoButton
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setSavingsModalVisible(false)}
              />
              <NeoButton
                title={savingsModalMode === 'deposit' ? 'Add' : 'Withdraw'}
                variant="primary"
                size="md"
                onPress={handleSavingsSubmit}
                disabled={savingsSubmitDisabled}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function CategoryLimitRow({
  category,
  value,
  onChangeText,
}: {
  category: Category;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const LucideIcon = getIcon(category.icon);

  return (
    <NeoCard color={category.color} style={styles.catCard}>
      <View style={styles.catRow}>
        <View style={styles.catIconRow}>
          <LucideIcon size={18} color={Colors.black} strokeWidth={2.5} />
          <Text style={styles.catName}>{category.name}</Text>
        </View>
        <View style={styles.catInputBox}>
          <Text style={styles.catCurrency}>₹</Text>
          <TextInput
            style={styles.catInput}
            value={value}
            onChangeText={onChangeText}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="rgba(0,0,0,0.3)"
          />
        </View>
      </View>
    </NeoCard>
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
  backBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
    marginTop: Spacing.lg,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thick,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  currencySymbol: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
    marginRight: Spacing.sm,
  },
  amountInput: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    borderWidth: 0,
    backgroundColor: 'transparent',
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  // Allocation tracker
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  allocationLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  allocationValue: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
  },
  allocationBar: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    borderWidth: Borders.thin,
    borderColor: Colors.border,
  },
  allocationFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  allocationRemaining: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  // Category section
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
  },
  manageBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.accent,
  },
  catCard: {
    marginBottom: Spacing.sm,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  catName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.black,
  },
  catInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.medium,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: Spacing.sm,
    minWidth: 100,
  },
  catCurrency: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: 'rgba(0,0,0,0.5)',
  },
  catInput: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.black,
    borderWidth: 0,
    backgroundColor: 'transparent',
    flex: 1,
    paddingVertical: Spacing.xs,
    textAlign: 'right',
  },
  saveRow: {
    marginTop: Spacing.xxl,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: Borders.thin,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  dangerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  dangerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: Borders.thin,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  dangerDesc: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Dev nuke button
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: Borders.thin,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderStyle: 'dashed',
  },
  devIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: Borders.thin,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Savings section
  savingsCard: {
    gap: Spacing.sm,
  },
  savingsTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsTargetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  savingsTargetLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  savingsTargetInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.sm,
    minWidth: 120,
  },
  savingsCurrency: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  savingsTargetField: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    borderWidth: 0,
    backgroundColor: 'transparent',
    flex: 1,
    paddingVertical: Spacing.xs,
    textAlign: 'right',
  },
  savingsBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  savingsBalanceLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  savingsBalanceAmount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    marginTop: 2,
  },
  savingsProgressText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  savingsBarWrap: {
    marginTop: Spacing.xs,
  },
  savingsActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  // Savings modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: Borders.thick,
    borderColor: Colors.black,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
    letterSpacing: 1,
  },
  modalBalance: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  modalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  modalCurrency: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
    marginRight: Spacing.sm,
  },
  modalInput: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    borderWidth: 0,
    backgroundColor: 'transparent',
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  // Info card
  infoCard: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  infoTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    letterSpacing: 2,
  },
  infoText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
