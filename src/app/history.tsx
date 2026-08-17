import { NeoBackButton } from '@/components/ui/neo-back-button';
import {
  Borders,
  Colors,
  Fonts,
  FontSizes,
  Radii,
  Spacing,
} from '@/constants/theme';
import { useBudgetStore } from '@/stores/budget-store';
import { useExpenseStore } from '@/stores/expense-store';
import { formatCurrency, formatDate } from '@/utils/format';
import { useFocusEffect } from 'expo-router';
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Car,
  Circle,
  CircleEllipsis,
  Film,
  LayoutGrid,
  ShoppingBag,
  Utensils,
  Zap,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterKey = 'all' | string;
type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest';

const SORT_OPTIONS: { mode: SortMode; label: string; icon: typeof ArrowDownNarrowWide }[] = [
  { mode: 'newest', label: 'Newest', icon: ArrowDownNarrowWide },
  { mode: 'oldest', label: 'Oldest', icon: ArrowUpNarrowWide },
  { mode: 'highest', label: 'High', icon: ArrowDownNarrowWide },
  { mode: 'lowest', label: 'Low', icon: ArrowUpNarrowWide },
];

const iconMap: Record<string, typeof Utensils> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  film: Film,
  zap: Zap,
  'circle-ellipsis': CircleEllipsis,
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, loadExpenses } = useExpenseStore();
  const { categories, loadSettings } = useBudgetStore();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadExpenses();
    }, [loadSettings, loadExpenses]),
  );

  const sorted = useMemo(() => {
    const list = [...expenses];
    switch (sortMode) {
      case 'newest':
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'highest':
        list.sort((a, b) => b.amount - a.amount);
        break;
      case 'lowest':
        list.sort((a, b) => a.amount - b.amount);
        break;
    }
    return list;
  }, [expenses, sortMode]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    return sorted.filter((e) => e.category === filter);
  }, [sorted, filter]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered],
  );

  const grouped = useMemo(() => {
    if (sortMode === 'highest' || sortMode === 'lowest') {
      return [{ label: '', items: filtered }];
    }
    const groups: { label: string; items: typeof expenses }[] = [];
    for (const expense of filtered) {
      const date = new Date(expense.date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      let label: string;
      if (diffDays === 0) label = 'Today';
      else if (diffDays === 1) label = 'Yesterday';
      else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        label = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
      }
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, items: [] };
        groups.push(group);
      }
      group.items.push(expense);
    }
    return groups;
  }, [filtered, sortMode, expenses]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header — fixed */}
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>History</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Summary — compact inline */}
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>
            {filter === 'all' ? 'TOTAL' : filter.toUpperCase()}
          </Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
        <Text style={styles.summaryCount}>{filtered.length} txns</Text>
      </View>

      {/* Sort buttons */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = sortMode === option.mode;
          return (
            <Pressable
              key={option.mode}
              onPress={() => setSortMode(option.mode)}
              style={[styles.sortBtn, isActive && styles.sortBtnActive]}>
              <Icon
                size={13}
                color={isActive ? Colors.black : Colors.textMuted}
                strokeWidth={2.5}
              />
              <Text style={[styles.sortBtnText, { color: isActive ? Colors.black : Colors.textMuted }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Filter chips — horizontal scroll */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}>
          <FilterChip
            label="All"
            icon={LayoutGrid}
            isSelected={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || Circle;
            return (
              <FilterChip
                key={cat.id}
                label={cat.name}
                icon={Icon}
                color={cat.color}
                isSelected={filter === cat.name}
                onPress={() => setFilter(cat.name)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Transaction list — flat, no cards */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {grouped.map((group) => (
          <View key={group.label || 'all'} style={styles.group}>
            {group.label !== '' && <Text style={styles.groupLabel}>{group.label}</Text>}
            {group.items.map((expense) => {
              const cat = categories.find((c) => c.name === expense.category);
              const LucideIcon = cat ? (iconMap[cat.icon] || Circle) : Circle;
              return (
                <View key={expense.id} style={styles.txnRow}>
                  <View style={[styles.txnIcon, { backgroundColor: cat?.color || Colors.surfaceLight }]}>
                    <LucideIcon size={16} color={Colors.black} strokeWidth={2.5} />
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnMerchant} numberOfLines={1}>{expense.merchant}</Text>
                    <Text style={styles.txnDate}>{formatDate(expense.date)}</Text>
                  </View>
                  <Text style={styles.txnAmount}>-{formatCurrency(expense.amount)}</Text>
                </View>
              );
            })}
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  icon: Icon,
  color,
  isSelected,
  onPress,
}: {
  label: string;
  icon: typeof Circle;
  color?: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: isSelected ? color || Colors.accent : Colors.border,
          backgroundColor: isSelected ? color || Colors.accent : 'transparent',
        },
      ]}>
      <Icon size={13} color={isSelected ? Colors.black : Colors.textSecondary} strokeWidth={2.5} />
      <Text style={[styles.chipText, { color: isSelected ? Colors.black : Colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  summaryLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    marginTop: 2,
  },
  summaryCount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sortBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
  },
  sortBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  sortBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
  },
  filterContainer: {
    marginBottom: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: Borders.medium,
    borderRadius: Radii.pill,
  },
  chipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  group: {
    marginBottom: Spacing.lg,
  },
  groupLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  txnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  txnInfo: {
    flex: 1,
  },
  txnMerchant: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  txnDate: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  txnAmount: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.exceeded,
  },
  emptyState: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
