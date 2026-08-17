import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Animation, Borders, Colors, Radii, Spacing } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface NeoBackButtonProps extends Omit<PressableProps, 'style'> {
  /** Override the default back navigation */
  onPress?: () => void;
  /** Icon size in pixels */
  size?: number;
  /** Use a filled dark style (for camera overlays) */
  variant?: 'default' | 'overlay';
}

/**
 * Neo-brutalist back button — a compact circular icon button with
 * a thick border and spring press animation.
 *
 * Used across all screens for consistent navigation.
 */
export function NeoBackButton({
  onPress,
  size = 22,
  variant = 'default',
  ...rest
}: NeoBackButtonProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: PressableProps['onPressIn'] = () => {
    scale.value = withSpring(0.9, {
      damping: 30,
      stiffness: 500,
      mass: 0.6,
    });
  };

  const handlePressOut: PressableProps['onPressOut'] = () => {
    scale.value = withSpring(1, Animation.spring);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  const boxSize = size + Spacing.md;

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        {
          width: boxSize,
          height: boxSize,
          borderRadius: boxSize / 2,
          borderWidth: Borders.medium,
          borderColor: variant === 'overlay'
            ? 'rgba(255,255,255,0.3)'
            : Colors.border,
          backgroundColor: variant === 'overlay'
            ? 'rgba(0,0,0,0.6)'
            : Colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
      {...rest}>
      <ArrowLeft size={size} color={Colors.white} strokeWidth={2.5} />
    </AnimatedPressable>
  );
}
