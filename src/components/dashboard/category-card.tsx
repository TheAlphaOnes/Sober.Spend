import { NeoCard } from '@/components/ui/neo-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import type { Category } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';
import { Car, Circle, CircleEllipsis, Film, ShoppingBag, Utensils, Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CategoryCardProps {
  category: Category;
  spent: number;
}

const iconMap: Record<string, typeof Utensils> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  film: Film,
  zap: Zap,
  'circle-ellipsis': CircleEllipsis,
};

/**
 * Category card — colored fill with black text.
 *
 * Visual communication: the card background IS the category color.
 * Progress bar shows usage at a glance. "OVER LIMIT" badge appears
 * when exceeded. No text explanation needed — the color and bar say it.
 */
export function CategoryCard({ category, spent }: CategoryCardProps) {
  const percent = category.budgetLimit > 0 ? Math.round((spent / category.budgetLimit) * 100) : 0;
  const LucideIcon = iconMap[category.icon] || Circle;

  return (
    <NeoCard color={category.color}>
      <View style={styles.header}>
        <View style={styles.iconRow}>
          <LucideIcon size={20} color={Colors.black} strokeWidth={2.5} />
          <Text style={styles.name}>{category.name}</Text>
          {percent > 100 && (
            <View style={styles.overBadge}>
              <Text style={styles.overText}>OVER LIMIT</Text>
            </View>
          )}
        </View>
        <Text style={[styles.percent, percent > 100 && { color: Colors.exceeded }]}>
          {formatPercent(percent)}
        </Text>
      </View>
      <ProgressBar
        percent={percent}
        height={10}
        backgroundColor="rgba(0,0,0,0.15)"
        color={percent >= 90 ? Colors.exceeded : percent >= 70 ? Colors.nearLimit : Colors.black}
        showBorder={false}
      />
      <View style={styles.footer}>
        <Text style={styles.spent}>{formatCurrency(spent)}</Text>
        <Text style={styles.limit}>/ {formatCurrency(category.budgetLimit)}</Text>
      </View>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.black,
  },
  overBadge: {
    backgroundColor: Colors.exceeded,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: Colors.black,
    marginLeft: Spacing.sm,
  },
  overText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.black,
    letterSpacing: 1,
  },
  percent: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.black,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.sm,
    gap: 4,
  },
  spent: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.black,
  },
  limit: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: 'rgba(0,0,0,0.5)',
  },
});
