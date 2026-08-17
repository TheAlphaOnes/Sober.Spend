import { NeoCard } from '@/components/ui/neo-card';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { Coffee, Eye, ShieldAlert, ShieldCheck, Siren, Skull, TriangleAlert } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type RiskLevel = 'BROKE' | 'DANGER' | 'WASTED' | 'WARNING' | 'SUS' | 'SAFE' | 'CHILL';

interface RiskBannerProps {
  riskLevel: RiskLevel;
  message: string;
  highlightedWord?: string;
}

const riskConfig: Record<RiskLevel, { icon: typeof Skull; color: string }> = {
  BROKE: { icon: Skull, color: Colors.accent },
  DANGER: { icon: Siren, color: Colors.accent },
  WASTED: { icon: ShieldAlert, color: Colors.pink },
  WARNING: { icon: TriangleAlert, color: Colors.orange },
  SUS: { icon: Eye, color: Colors.yellow },
  SAFE: { icon: ShieldCheck, color: Colors.safe },
  CHILL: { icon: Coffee, color: Colors.mint },
};

/**
 * Risk banner — the second hero card.
 *
 * Visual communication: the entire card is colored by risk level,
 * the risk level text is oversized (72px), and the icon is prominent.
 * The message uses black text on the colored background — high contrast,
 * neo-brutalist style.
 */
export function RiskBanner({ riskLevel, message, highlightedWord }: RiskBannerProps) {
  const parts = highlightedWord ? message.split(highlightedWord) : [message];
  const { icon: Icon, color } = riskConfig[riskLevel] || riskConfig.SAFE;

  // Scale font size down for longer risk level names so they always
  // fit on a single line within the card width.
  const len = riskLevel.length;
  const levelFontSize = len <= 4 ? 72 : len === 5 ? 60 : len === 6 ? 52 : 44;
  const levelLineHeight = levelFontSize;

  return (
    <NeoCard style={styles.cardWrapper} color={color} offset="sm">
      <View style={styles.contentPad}>
        <Icon size={48} color={Colors.black} strokeWidth={3} style={styles.icon} />

        <Text style={styles.riskLabel}>RISK LEVEL</Text>
        <Text
          style={[
            styles.riskLevelText,
            { fontSize: levelFontSize, lineHeight: levelLineHeight },
          ]}>
          {riskLevel}
        </Text>

        <Text style={styles.message}>
          {highlightedWord && parts.length === 2 ? (
            <>
              {parts[0]}
              <Text style={styles.highlight}>{highlightedWord}</Text>
              {parts[1]}
            </>
          ) : (
            message
          )}
        </Text>
      </View>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginTop: Spacing.md,
  },
  contentPad: {
    padding: Spacing.md,
  },
  icon: {
    marginBottom: Spacing.md,
  },
  riskLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.black,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  riskLevelText: {
    fontFamily: Fonts.display,
    color: Colors.black,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  message: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.black,
    lineHeight: 24,
  },
  highlight: {
    textDecorationLine: 'underline',
  },
});
