import {
  Book,
  Briefcase,
  Car,
  CircleEllipsis,
  Coffee,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  Heart,
  Home,
  Music,
  Pill,
  Plane,
  ShoppingBag,
  Smartphone,
  Utensils,
  Zap,
} from 'lucide-react-native';

/**
 * Map of category icon name strings (as stored in the DB) to their
 * Lucide React Native components.
 *
 * This is the single source of truth — import `getIcon` instead of
 * defining a local Record in each screen or component.
 *
 * When adding a new icon to `CATEGORY_ICONS` in `constants/categories.ts`,
 * add the corresponding entry here too.
 */
const ICON_MAP: Record<string, typeof Utensils> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  film: Film,
  zap: Zap,
  'circle-ellipsis': CircleEllipsis,
  coffee: Coffee,
  plane: Plane,
  gift: Gift,
  heart: Heart,
  dumbbell: Dumbbell,
  book: Book,
  music: Music,
  smartphone: Smartphone,
  home: Home,
  briefcase: Briefcase,
  pill: Pill,
  fuel: Fuel,
};

/**
 * Resolve a category icon name to its Lucide component.
 * Falls back to `CircleEllipsis` for any unknown or missing name.
 *
 * @example
 * const Icon = getIcon(category.icon);
 * return <Icon size={18} color={Colors.black} strokeWidth={2.5} />;
 */
export function getIcon(name: string): typeof Utensils {
  return ICON_MAP[name] ?? CircleEllipsis;
}
