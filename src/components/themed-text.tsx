import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, FontSizes } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code';
  color?: keyof typeof Colors;
};

export function ThemedText({
  style,
  type = 'default',
  color = 'text',
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      style={[
        { color: Colors[color], fontFamily: Fonts.body },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: FontSizes.sm,
  },
  smallBold: {
    fontSize: FontSizes.sm,
  },
  default: {
    fontSize: FontSizes.md,
  },
  title: {
    fontSize: FontSizes.xxl,
  },
  subtitle: {
    fontSize: FontSizes.xl,
  },
  link: {
    fontSize: FontSizes.sm,
  },
  linkPrimary: {
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  code: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
  },
});
