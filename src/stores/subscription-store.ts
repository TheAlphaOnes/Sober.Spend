import { eq } from 'drizzle-orm';
import { create } from 'zustand';

import { db, subscriptions } from '@/db/schema';
import { schedulePush } from '@/utils/sync';

export interface Subscription {
  id: number;
  amount: number;
  amount_rule: string;
  merchant: string;
  category: string;
  frequency: string;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
}

interface SubscriptionState {
  subscriptions: Subscription[];
  loadSubscriptions: () => void;
  addSubscription: (sub: Omit<typeof subscriptions.$inferInsert, 'id' | 'created_at' | 'is_active'>) => void;
  toggleSubscription: (id: number, active: boolean) => void;
  removeSubscription: (id: number) => void;
  mergeRemoteSubscriptions: (remote: Subscription[]) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],

  loadSubscriptions: () => {
    const rows = db.select().from(subscriptions).all();
    set({ subscriptions: rows as Subscription[] });
  },

  addSubscription: (sub) => {
    db.insert(subscriptions)
      .values({
        ...sub,
        is_active: 1,
        created_at: new Date().toISOString(),
      })
      .run();
    get().loadSubscriptions();
    schedulePush();
  },

  toggleSubscription: (id, active) => {
    db.update(subscriptions)
      .set({ is_active: active ? 1 : 0 })
      .where(eq(subscriptions.id, id))
      .run();
    get().loadSubscriptions();
    schedulePush();
  },

  removeSubscription: (id) => {
    db.delete(subscriptions).where(eq(subscriptions.id, id)).run();
    get().loadSubscriptions();
    schedulePush();
  },

  mergeRemoteSubscriptions: (remote) => {
    // Basic merge: replace all local data. In a real app you'd do proper sync logic.
    db.delete(subscriptions).run();
    for (const sub of remote) {
      db.insert(subscriptions)
        .values({
          amount: sub.amount,
          amount_rule: sub.amount_rule,
          merchant: sub.merchant,
          category: sub.category,
          frequency: sub.frequency,
          start_date: sub.start_date,
          end_date: sub.end_date,
          is_active: sub.is_active,
          created_at: sub.created_at,
        })
        .run();
    }
    get().loadSubscriptions();
  },
}));

