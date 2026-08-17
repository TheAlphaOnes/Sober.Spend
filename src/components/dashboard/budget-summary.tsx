import { NeoCard } from '@/components/ui/neo-card';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface BudgetSummaryProps {
  totalSpent: number;
  monthlyBudget: number;
}

/**
 * Budget summary card — the hero card at the top of the dashboard.
 *
 * Overspent state: the bar overflows past the container edge (broken,
 * spilling red), the percentage tilts slightly like it's falling off,
 * and the card border turns red. No shaking — just looks busted.
 */
export function BudgetSummary({ totalSpent, monthlyBudget }: BudgetSummaryProps) {
  const remaining = monthlyBudget - totalSpent;
  const isOver = remaining < 0;
  const isAtLimit = !isOver && remaining === 0;
  const rawPercent = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0;
  const barPercent = Math.min(rawPercent, 100);
  const isFull = barPercent >= 100;

  const statusColor =
    isOver ? Colors.exceeded
    : rawPercent >= 100 ? Colors.nearLimit
    : rawPercent >= 80 ? Colors.nearLimit
    : rawPercent >= 50 ? Colors.orange
    : Colors.safe;

  // Slight tilt on the percentage when overspent — looks like it's
  // falling off the card. Static, not moving.
  const tilt = useSharedValue(0);
  React.useEffect(() => {
    if (isOver) {
      tilt.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(3, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      tilt.value = 0;
    }
  }, [isOver]);

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.value}deg` }],
  }));

  return (
    <NeoCard style={styles.cardWrapper} color={Colors.surface} offset="sm" textured>
      <View style={styles.contentPad}>
        <View style={styles.topRow}>
          <Text style={styles.label}>CURRENT STATUS</Text>
          <Text style={[styles.label, isOver && { color: Colors.exceeded }]}>
            {isOver ? 'BUSTED' : isAtLimit ? 'THAT IT' : 'LEFT'}
          </Text>
        </View>

        <View style={styles.middleRow}>
          <Animated.View style={tiltStyle}>
            <Text style={[styles.percentText, { color: statusColor }]}>
              {rawPercent}%
            </Text>
            <Text style={[styles.spentText, { color: statusColor }]}>SPENT</Text>
          </Animated.View>
          <Text style={[styles.remainingAmount, isOver && { color: Colors.exceeded }]}>
            {isOver ? '-' : ''}{formatCurrency(Math.abs(remaining))}
          </Text>
        </View>

        {/* Bar container — when overspent, overflow is visible so the
            red fill spills past the right edge like it's bursting out. */}
        <View style={styles.barContainer}>
          <View
            style={[
              styles.barBg,
              isOver && { borderColor: Colors.exceeded },
            ]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${barPercent}%`,
                  backgroundColor: statusColor,
                  borderRightWidth: isFull ? 0 : Borders.thick,
                },
              ]}
            />
            {/* Overflow spill — a jagged red block that sticks out past
                the bar's right edge when overspent. */}
            {isOver && (
              <View style={styles.overflowSpill} pointerEvents="none">
                <View style={styles.spillBlock} />
                <View style={styles.spillDrip} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.zeroText}>{formatCurrency(0)}</Text>
          <Text style={[styles.budgetText, { color: statusColor }]}>
            {formatCurrency(monthlyBudget)} BUDGET
          </Text>
        </View>
      </View>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
  },
  contentPad: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  percentText: {
    fontFamily: Fonts.display,
    fontSize: 76,
    lineHeight: 76,
    marginLeft: -2,
  },
  spentText: {
    fontFamily: Fonts.display,
    fontSize: 54,
    lineHeight: 54,
    marginTop: -16,
  },
  remainingAmount: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.white,
    marginTop: 4,
  },
  barContainer: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    // Allow overflow when overspent so the spill is visible
    overflow: 'visible',
  },
  barBg: {
    height: 44,
    backgroundColor: '#333333',
    borderRadius: Radii.pill,
    borderWidth: Borders.thick,
    borderColor: Colors.black,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFill: {
    height: '100%',
    borderRightWidth: Borders.thick,
    borderColor: Colors.black,
  },
  // Overflow spill — red block + drip that appears past the bar's
  // right edge when overspent, like the bar is bursting open.
  overflowSpill: {
    position: 'absolute',
    right: -8,
    top: -4,
    bottom: -4,
    width: 12,
    zIndex: 5,
  },
  spillBlock: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: '100%',
    backgroundColor: Colors.exceeded,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    // Jagged left edge via skew to look torn
    transform: [{ skewY: '-3deg' }],
  },
  spillDrip: {
    position: 'absolute',
    top: '60%',
    right: -2,
    width: 6,
    height: 14,
    backgroundColor: Colors.exceeded,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    opacity: 0.6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  zeroText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  budgetText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    textTransform: 'uppercase',
  },
});
