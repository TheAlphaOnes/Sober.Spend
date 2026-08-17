import { Borders, Colors, Radii } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';

interface ProgressBarProps {
  percent: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  showBorder?: boolean;
}

/**
 * Neo-brutalist progress bar — thick border, solid fill.
 * Color shifts based on usage level when no explicit color is given.
 */
export function ProgressBar({
  percent,
  height = 14,
  color,
  backgroundColor,
  showBorder = true,
}: ProgressBarProps) {
  const clampedPercent = Math.min(Math.max(percent, 0), 100);

  const barColor =
    color || (clampedPercent >= 90 ? Colors.exceeded : clampedPercent >= 70 ? Colors.nearLimit : Colors.safe);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: backgroundColor || Colors.surfaceLight,
          borderWidth: showBorder ? Borders.thin : 0,
          borderColor: Colors.border,
        },
      ]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedPercent}%`,
            backgroundColor: barColor,
            height: '100%',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: Radii.sm,
  },
});
