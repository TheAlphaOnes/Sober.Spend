import { eq } from 'drizzle-orm';
import { create } from 'zustand';

import {
  db,
  wishlistBuckets as bucketsTable,
  wishlistItems as itemsTable,
} from '@/db/schema';
import type { WishlistBucket, WishlistItem, WishlistItemStatus } from '@/types';

/**
 * Wishlist store — manages wishlist buckets and items.
 *
 * Savings integration:
 * - `fundItem` moves money from the user's savings pool into an item's
 *   funded_amount. The savings pool is tracked in budget-store as
 *   `savingsBalance`.
 * - `buyItem` marks an item as bought. If fully funded, it just flips
 *   status. If partially funded, the remaining price is spent directly
 *   (recorded as an expense).
 * - `unfundItem` returns funded money back to the savings pool.
 */

function rowToBucket(row: typeof bucketsTable.$inferSelect): WishlistBucket {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

function rowToItem(row: typeof itemsTable.$inferSelect): WishlistItem {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    fundedAmount: row.funded_amount,
    url: row.url,
    bucketId: row.bucket_id,
    status: row.status as WishlistItemStatus,
    dateCreated: row.date_created,
  };
}

function loadBucketsFromDB(): WishlistBucket[] {
  try {
    const rows = db.select().from(bucketsTable).all();
    return rows.map(rowToBucket);
  } catch (err) {
    console.error('[wishlist-store] loadBuckets failed:', err);
    return [];
  }
}

function loadItemsFromDB(): WishlistItem[] {
  try {
    const rows = db.select().from(itemsTable).all();
    return rows.map(rowToItem);
  } catch (err) {
    console.error('[wishlist-store] loadItems failed:', err);
    return [];
  }
}

interface WishlistState {
  buckets: WishlistBucket[];
  items: WishlistItem[];

  loadWishlist: () => void;
  createBucket: (data: Omit<WishlistBucket, 'id'>) => void;
  deleteBucket: (bucketId: number) => void;

  addItem: (data: {
    name: string;
    price: number;
    url?: string;
    bucketId?: number | null;
  }) => void;
  removeItem: (itemId: number) => void;
  buyItem: (itemId: number) => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  buckets: [],
  items: [],

  loadWishlist: () => {
    set({ buckets: loadBucketsFromDB(), items: loadItemsFromDB() });
  },

  createBucket: (data) => {
    const sortOrder = get().buckets.length;
    try {
      db.insert(bucketsTable)
        .values({
          name: data.name,
          color: data.color,
          icon: data.icon,
          sort_order: data.sortOrder ?? sortOrder,
        })
        .run();
    } catch (err) {
      console.error('[wishlist-store] createBucket failed:', err);
    }
    set({ buckets: loadBucketsFromDB() });
  },

  deleteBucket: (bucketId) => {
    try {
      // Unassign items from this bucket before deleting
      db.update(itemsTable)
        .set({ bucket_id: null })
        .where(eq(itemsTable.bucket_id, bucketId))
        .run();
      db.delete(bucketsTable).where(eq(bucketsTable.id, bucketId)).run();
    } catch (err) {
      console.error('[wishlist-store] deleteBucket failed:', err);
    }
    set({ buckets: loadBucketsFromDB(), items: loadItemsFromDB() });
  },

  addItem: (data) => {
    const date = new Date().toISOString();
    try {
      db.insert(itemsTable)
        .values({
          name: data.name,
          price: data.price,
          funded_amount: 0,
          url: data.url ?? null,
          bucket_id: data.bucketId ?? null,
          status: 'funding',
          date_created: date,
        })
        .run();
    } catch (err) {
      console.error('[wishlist-store] addItem failed:', err);
    }
    set({ items: loadItemsFromDB() });
  },

  removeItem: (itemId) => {
    try {
      db.delete(itemsTable).where(eq(itemsTable.id, itemId)).run();
    } catch (err) {
      console.error('[wishlist-store] removeItem failed:', err);
    }
    set({ items: get().items.filter((i) => i.id !== itemId) });
  },

  buyItem: (itemId) => {
    const item = get().items.find((i) => i.id === itemId);
    if (!item) return;

    // Check if savings cover the full price
    const budgetStoreModule = require('@/stores/budget-store');
    const budgetStore = budgetStoreModule.useBudgetStore.getState();
    const savingsBalance = budgetStore.savingsBalance;
    const canBuyFromSavings = savingsBalance >= item.price;

    try {
      db.update(itemsTable)
        .set({
          status: 'bought',
          // Only set funded_amount to price when actually bought from savings
          funded_amount: canBuyFromSavings ? item.price : 0,
        })
        .where(eq(itemsTable.id, itemId))
        .run();
    } catch (err) {
      console.error('[wishlist-store] buyItem failed:', err);
    }

    if (canBuyFromSavings) {
      // Buy from savings — reduces balance but NOT the monthly deposit counter
      budgetStore.spendFromSavings(item.price);
    } else {
      // Buy direct — record as expense
      const expenseStoreModule = require('@/stores/expense-store');
      expenseStoreModule.useExpenseStore.getState().addExpense({
        amount: item.price,
        category: 'Other',
        merchant: item.name,
        note: 'Wishlist purchase',
      });
    }

    set({ items: loadItemsFromDB() });
  },
}));
