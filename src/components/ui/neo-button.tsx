import type { ReactNode } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Animation, Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';

type NeoButtonVariant = 'primary' | 'outline' | 'danger';
type NeoButtonSize = 'sm' | 'md' | 'lg';

export interface NeoButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: NeoButtonVariant;
  size?: NeoButtonSize;
  icon?: ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Neo-brutalist button — compact, not chunky.
 *
 * Design: tight padding, medium border, solid background.
 * Press animation: translate down 2px (simulating physical press
 * into the surface), scale 0.97. Two-phase spring for tactile feel.
 */
export function NeoButton({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: NeoButtonProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const bg =
    variant === 'primary'
      ? Colors.accent
      : variant === 'danger'
        ? Colors.exceeded
        : Colors.surface;

  const textColor = Colors.white;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    // Phase 1: quick scale down + translate (the "press" feel)
    scale.value = withSpring(0.97, {
      damping: 30,
      stiffness: 500,
      mass: 0.6,
    });
    translateY.value = withSpring(2, {
      damping: 30,
      stiffness: 500,
      mass: 0.6,
    });
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    // Phase 2: spring back (the "release" feel) — slightly slower for bounce
    scale.value = withSpring(1, Animation.spring);
    translateY.value = withSpring(0, Animation.spring);
    onPressOut?.(e);
  };

  const sizeStyles = {
    sm: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md },
    md: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg },
    lg: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.sm,
          ...sizeStyles[size],
          borderRadius: Radii.md,
          borderWidth: variant === 'outline' ? Borders.thin : Borders.medium,
          borderColor: variant === 'outline' ? Colors.borderStrong : 'rgba(0, 0, 0, 0.5)',
          backgroundColor: bg,
          borderCurve: 'continuous',
          opacity: disabled ? 0.4 : 1,
        },
        animatedStyle,
      ]}
      {...rest}>
      {icon}
      <Text
        style={{
          fontFamily: Fonts.display,
          fontSize: size === 'sm' ? FontSizes.sm : FontSizes.md,
          letterSpacing: 0.5,
          color: textColor,
        }}>
        {title}
      </Text>
    </AnimatedPressable>
  );
}
