import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Returns the active color palette.
 * Sober.Spend is dark-only (neo-brutalist), so we always return Colors.
 */
export function useTheme() {
  return Colors;
}
