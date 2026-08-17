import type { Category } from '@/types';

import { Colors } from './theme';

/**
 * Default categories seeded into the local DB on first run.
 * Users can add, edit, or delete categories — these are just the
 * starting set. The `id` field uses negative numbers to distinguish
 * seeds from DB rows before insertion.
 */
export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  {
    name: 'Food',
    budgetLimit: 0,
    color: Colors.mint,
    icon: 'utensils',
    keywords: [
      'zomato', 'swiggy', 'restaurant', 'cafe', 'food', 'pizza', 'burger',
      'dominos', 'mcdonalds', 'kfc', 'starbucks', 'chai', 'biryani',
      'grocery', 'bakery',
    ],
    sortOrder: 0,
  },
  {
    name: 'Travel',
    budgetLimit: 0,
    color: Colors.yellow,
    icon: 'car',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'irctc',
      'petrol', 'fuel', 'parking', 'taxi',
    ],
    sortOrder: 1,
  },
  {
    name: 'Shopping',
    budgetLimit: 0,
    color: Colors.purple,
    icon: 'shopping-bag',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'mall',
      'store', 'shop', 'market',
    ],
    sortOrder: 2,
  },
  {
    name: 'Entertainment',
    budgetLimit: 0,
    color: Colors.orange,
    icon: 'film',
    keywords: [
      'netflix', 'spotify', 'movie', 'cinema', 'pvr', 'inox',
      'game', 'gaming', 'youtube',
    ],
    sortOrder: 3,
  },
  {
    name: 'Bills',
    budgetLimit: 0,
    color: Colors.blue,
    icon: 'zap',
    keywords: [
      'electricity', 'water', 'internet', 'wifi', 'jio', 'airtel',
      'vi', 'recharge', 'rent', 'emi',
    ],
    sortOrder: 4,
  },
  {
    name: 'Other',
    budgetLimit: 0,
    color: Colors.pink,
    icon: 'circle-ellipsis',
    keywords: [],
    sortOrder: 5,
  },
];

export const DEFAULT_MONTHLY_BUDGET = 30000;

/**
 * Available icon names for category picker.
 * Maps to lucide-react-native icon names.
 */
export const CATEGORY_ICONS = [
  'utensils', 'car', 'shopping-bag', 'film', 'zap', 'circle-ellipsis',
  'coffee', 'plane', 'gift', 'heart', 'dumbbell', 'book',
  'music', 'smartphone', 'home', 'briefcase', 'pill', 'fuel',
] as const;

/**
 * Available colors for category picker.
 */
export const CATEGORY_COLORS = [
  Colors.mint, Colors.yellow, Colors.purple, Colors.orange,
  Colors.pink, Colors.blue, Colors.accent, Colors.accentLight,
] as const;
