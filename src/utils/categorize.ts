import type { Category } from '@/types';

/**
 * Match a merchant name to a category using keyword-based rules.
 * Returns the category name if matched, null otherwise.
 */
export function categorize(merchant: string, categories: Category[]): string | null {
  const lower = merchant.toLowerCase().trim();

  for (const cat of categories) {
    for (const keyword of cat.keywords) {
      if (lower.includes(keyword)) {
        return cat.name;
      }
    }
  }

  return null;
}

/**
 * MCC Code ranges → category name mapping.
 * Returns the category name if matched, null otherwise.
 */
export function categorizeMCC(mcc: string, categories: Category[]): string | null {
  const code = parseInt(mcc, 10);
  if (isNaN(code)) return null;

  // Find which category matches by trying keyword-based MCC ranges
  // Food — grocery stores & food shops
  if ((code >= 5411 && code <= 5499) || (code >= 5812 && code <= 5814)) {
    return findCategoryByName(categories, 'Food');
  }

  // Travel — transportation + fuel
  if ((code >= 4000 && code <= 4799) || code === 5541 || code === 5542) {
    return findCategoryByName(categories, 'Travel');
  }

  // Entertainment — cinemas, theaters, services
  if (code >= 7300 && code <= 7999) {
    return findCategoryByName(categories, 'Entertainment');
  }

  // Bills — utilities + pharmacy + insurance
  if ((code >= 4800 && code <= 4999) || code === 5912 || (code >= 6300 && code <= 6399)) {
    return findCategoryByName(categories, 'Bills');
  }

  // Shopping — general retail
  if (code >= 5000 && code <= 5799) {
    return findCategoryByName(categories, 'Shopping');
  }

  return null;
}

function findCategoryByName(categories: Category[], name: string): string | null {
  const cat = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return cat?.name ?? null;
}
