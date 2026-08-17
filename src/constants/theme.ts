/**
 * Sober.Spend — Neo-Brutalist Design System
 *
 * Core principles:
 * - Thick solid borders (black on light, white on dark)
 * - Hard offset shadows (solid, not blurred — the signature neo-brutalist element)
 * - Bold, oversized typography for numbers and labels
 * - Category-colored cards with black text on color fills
 * - High contrast, raw, honest materials
 * - Clean and minimal — neo-brutalism without clutter
 */

export const Colors = {
  bg: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',

  text: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#666666',

  accent: '#C54770',
  accentLight: '#D65A83',

  // Category colors — vibrant, neo-brutalist palette
  mint: '#A8E6CF',
  yellow: '#FFD93D',
  purple: '#C3AED6',
  orange: '#FFB347',
  pink: '#FFB3BA',
  blue: '#87CEEB',

  // Status colors
  safe: '#A8E6CF',
  nearLimit: '#FFD93D',
  exceeded: '#FF6B6B',

  // Neo-brutalist borders — solid, opaque
  border: '#333333',
  borderLight: '#444444',
  borderStrong: '#FFFFFF',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Neo-brutalist borders — thick, solid, confident.
 */
export const Borders = {
  thin: 1.5,
  medium: 2,
  thick: 3,
} as const;

/**
 * Neo-brutalist shadows — solid offset, not blurred.
 * Uses the accent color for the offset block, creating a cohesive
 * branded shadow rather than a harsh white block on dark bg.
 */
export const NeoShadows = {
  sm: { offset: 6, color: Colors.accent },
  md: { offset: 8, color: Colors.accent },
  lg: { offset: 10, color: Colors.accent },
  accent: { offset: 6, color: Colors.accent },
} as const;

/**
 * Animation timing constants.
 * Break animations into small segments that complete at different rates
 * so the app feels alive and rich, not monotonous.
 *
 * - Press/hover: 100-150ms (snappy, tactile)
 * - State changes: 200-280ms (deliberate, visible)
 * - Entrance: 300-450ms (staggered, layered)
 * - Stagger per item: 35-60ms (cascading reveal)
 */
export const Animation = {
  duration: {
    press: 120,
    stateChange: 220,
    entrance: 350,
    exit: 250,
  },
  // Balanced spring — snappy with minimal oscillation
  spring: {
    damping: 24,
    stiffness: 380,
    mass: 0.8,
  },
  // Stagger per item — cascading entrance
  stagger: 45,
  // Sub-stagger for multi-element reveals within a card
  subStagger: 60,
} as const;

/**
 * Typography
 *
 * JockeyOne-Regular is a single-weight condensed display font.
 * Do NOT set fontWeight on Text components using this font —
 * iOS will synthesize a fake bold that looks stretched and wrong.
 * The font is already visually heavy; fontWeight is redundant.
 *
 * SignPainterHouseScript is a decorative script font used sparingly.
 */
export const Fonts = {
  display: 'JockeyOne-Regular',
  body: 'JockeyOne-Regular',
  accent: 'SignPainterHouseScript',
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 48,
} as const;

// Backwards-compatible exports
export const ThemeColor = Colors;
export type ThemeColor = typeof Colors;
