import { View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  type?: keyof typeof Colors;
};

export function ThemedView({
  style,
  type = 'bg',
  ...otherProps
}: ThemedViewProps) {
  return (
    <View
      style={[{ backgroundColor: Colors[type] }, style]}
      {...otherProps}
    />
  );
}
