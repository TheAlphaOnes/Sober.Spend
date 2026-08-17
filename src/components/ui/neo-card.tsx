import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Borders, Colors, NeoShadows, Radii, Spacing } from '@/constants/theme';
import { HatchTexture } from './hatch-texture';

export interface NeoCardProps {
  children: ReactNode;
  color?: string;
  borderColor?: string;
  shadowColor?: string;
  offset?: keyof typeof NeoShadows | false;
  /** Show diagonal hatch texture overlay (only on dark surface cards). */
  textured?: boolean;
  style?: ViewStyle;
}

/**
 * Neo-brutalist card with thick border, solid fill, and optional
 * hard offset shadow (the signature neo-brutalist element).
 *
 * The offset shadow is a solid colored block behind the card,
 * not a blurred drop shadow. This creates the raw, physical feel.
 *
 * When `textured` is true, a subtle diagonal hatch pattern is
 * rendered over the card surface for depth.
 */
export function NeoCard({
  children,
  color = Colors.surface,
  borderColor,
  shadowColor,
  offset = false,
  textured = false,
  style,
}: NeoCardProps) {
  const border = borderColor || (color !== Colors.surface ? Colors.black : Colors.border);
  const shadowConfig = offset ? NeoShadows[offset] : null;
  const sColor = shadowColor || shadowConfig?.color || Colors.white;
  const sOffset = shadowConfig?.offset || 0;
  // Only show texture on dark surface cards — colored cards are
  // already visually rich and don't need the overlay.
  const showTexture = textured && color === Colors.surface;

  return (
    <View style={[styles.wrapper, style]}>
      {shadowConfig && (
        <View
          style={[
            styles.solidShadow,
            {
              backgroundColor: sColor,
              borderRadius: style?.borderRadius ?? Radii.md,
              top: sOffset,
              left: sOffset,
              right: -sOffset,
              bottom: -sOffset,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.card,
          {
            backgroundColor: color,
            borderColor: border,
            borderRadius: style?.borderRadius ?? Radii.md,
          },
        ]}>
        {showTexture && <HatchTexture />}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  card: {
    borderWidth: Borders.medium,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  solidShadow: {
    position: 'absolute',
    borderWidth: Borders.medium,
    borderColor: Colors.black,
  },
});
