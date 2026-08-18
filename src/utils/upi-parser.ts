import type { UPIData, PendingTransaction } from '@/types';
import type { Category } from '@/types';

import { categorize, categorizeMCC } from './categorize';
import { db, vpaCategoryMap } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Look up a previously saved category for this VPA.
 * Returns null if no mapping exists.
 */
function lookupVpaCategory(vpa: string): string | null {
  try {
    const row = db.select().from(vpaCategoryMap).where(eq(vpaCategoryMap.vpa, vpa)).get();
    return row?.category ?? null;
  } catch {
    return null;
  }
}

/**
 * Save a VPA → category mapping so the next scan auto-categorizes.
 */
export function saveVpaCategory(vpa: string, category: string): void {
  try {
    db.insert(vpaCategoryMap)
      .values({ vpa, category, updated_at: new Date().toISOString() })
      .onConflictDoUpdate({
        target: vpaCategoryMap.vpa,
        set: { category, updated_at: new Date().toISOString() },
      })
      .run();
  } catch (err) {
    console.error('[vpa-map] Failed to save VPA category:', err);
  }
}

/**
 * Parse a UPI deep link string into structured data.
 * Expected format: upi://pay?pa=merchant@bank&pn=MerchantName&am=100.00&mc=5411&...
 */
export function parseUPIString(raw: string): UPIData | null {
  const trimmed = raw.trim();

  if (!trimmed.toLowerCase().startsWith('upi://pay')) {
    return null;
  }

  const queryStart = trimmed.indexOf('?');
  if (queryStart === -1) return null;

  const queryString = trimmed.slice(queryStart + 1);
  const params: Record<string, string> = {};

  for (const pair of queryString.split('&')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = decodeURIComponent(pair.slice(0, eqIndex)).toLowerCase();
    const value = decodeURIComponent(pair.slice(eqIndex + 1));
    params[key] = value;
  }

  if (!params.pa) return null;

  return {
    pa: params.pa,
    pn: params.pn,
    am: params.am,
    cu: params.cu || 'INR',
    mc: params.mc,
    tr: params.tr,
    tn: params.tn,
    mam: params.mam,
    tid: params.tid,
    url: params.url,
  };
}

/**
 * Convert parsed UPI data into a PendingTransaction for our app.
 * Requires the category list to match against.
 */
export function upiToPendingTransaction(
  upi: UPIData,
  categories: Category[],
): PendingTransaction {
  let category: string | null = null;

  // 1. Check saved VPA → category mapping first (user's past choice)
  if (upi.pa) {
    category = lookupVpaCategory(upi.pa);
  }

  // 2. Fall back to MCC code
  if (!category && upi.mc) {
    category = categorizeMCC(upi.mc, categories);
  }

  // 3. Fall back to merchant name keyword matching
  if (!category) {
    const merchant = upi.pn || upi.pa?.split('@')[0] || 'Unknown';
    category = categorize(merchant, categories);
  }

  const merchant = upi.pn || upi.pa?.split('@')[0] || 'Unknown';
  const amount = upi.am ? parseFloat(upi.am) : 0;

  return {
    merchant,
    amount,
    category: category ?? 'Other',
    note: upi.tn,
    pa: upi.pa,
  };
}

/**
 * Build a UPI deep link for the payment app.
 */
export function buildUPIDeepLink(
  vpa: string,
  name: string,
  amount: number,
  note?: string,
): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: amount.toFixed(2),
  });
  if (note) {
    params.set('tn', note);
  }
  return `upi://pay?${params.toString()}`;
}

/**
 * MCC code ranges to human-readable descriptions
 */
export const MCC_DESCRIPTIONS: Record<string, string> = {
  '5411': 'Grocery Store',
  '5412': 'Convenience Store',
  '5441': 'Candy & Confectionery',
  '5451': 'Dairy Store',
  '5462': 'Bakery',
  '5499': 'Misc Food Store',
  '5812': 'Restaurant',
  '5813': 'Bar / Drinking Place',
  '5814': 'Fast Food',
  '4121': 'Taxi / Ride Share',
  '4131': 'Bus Lines',
  '4111': 'Rail / Metro',
  '4511': 'Airlines',
  '4784': 'Tolls',
  '5311': 'Department Store',
  '5541': 'Fuel / Petrol',
  '5691': 'Clothing Store',
  '5732': 'Electronics Store',
  '5912': 'Pharmacy',
  '5942': 'Bookstore',
  '7832': 'Movie Theater',
  '7841': 'Video Rental',
  '7911': 'Entertainment',
  '7922': 'Ticketing',
  '4900': 'Utilities',
  '6300': 'Insurance',
};
