import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/utils/supabase';
import { fullSync } from '@/utils/sync';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    extras?: { name?: string; phone?: string },
  ) => Promise<{ error: string | null }>;
  updateProfile: (name: string, phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

/**
 * Ensure a profile row exists for the current user in the `profiles` table.
 * The SQL trigger `on_auth_user_created` handles this automatically on signup,
 * but we call this as a safety net in case the trigger hasn't run yet.
 */
async function ensureProfile(
  userId: string,
  email: string,
  extras?: { name?: string; phone?: string },
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('display_name, phone')
      .eq('id', userId)
      .maybeSingle();
    const displayName =
      extras?.name?.trim() || existing?.display_name || email.split('@')[0] || 'You';
    const phone = extras?.phone || existing?.phone || null;
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: displayName, phone }, { onConflict: 'id' });
    if (error) {
      await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' });
    }
    try {
      const { useSplitStore } = require('@/stores/split-store') as typeof import('@/stores/split-store');
      useSplitStore.getState().setMe(displayName, phone || '');
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.error('[auth] ensureProfile failed:', err);
  }
}

async function pullProfile(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, phone')
      .eq('id', userId)
      .maybeSingle();
    if (!data) return;
    const { useSplitStore } = require('@/stores/split-store') as typeof import('@/stores/split-store');
    useSplitStore.getState().setMe(data.display_name || 'You', data.phone || '');
  } catch (err) {
    console.error('[auth] pullProfile failed:', err);
  }
}

/**
 * Kick off a best-effort background sync.
 * Errors are logged but never thrown — sync is opportunistic.
 */
async function triggerSync(): Promise<void> {
  try {
    await fullSync();
  } catch (err) {
    console.error('[auth] sync failed:', err);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    set({ isLoading: true });

    const { data: { session } } = await supabase.auth.getSession();

    let activeUser = session?.user ?? null;

    if (session) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        await supabase.auth.signOut();
        activeUser = null;
      } else {
        activeUser = user;
        await ensureProfile(user.id, user.email ?? '');
        await pullProfile(user.id);
        triggerSync();
      }
    }

    set({
      session,
      user: activeUser,
      isInitialized: true,
      isLoading: false,
    });

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });

      if (newSession?.user) {
        await ensureProfile(newSession.user.id, newSession.user.email ?? '');
        await pullProfile(newSession.user.id);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          triggerSync();
        }
      }
    });
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureProfile(user.id, user.email ?? '');
        await pullProfile(user.id);
        triggerSync();
      }
    }
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password, extras) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: extras?.name?.trim() || undefined,
          phone: extras?.phone || undefined,
        },
      },
    });
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureProfile(user.id, user.email ?? '', extras);
      }
    }
    return { error: error?.message ?? null };
  },

  updateProfile: async (name, phone) => {
    const user = get().user;
    if (!user) return { error: 'Sign in first.' };
    const displayName = name.trim() || user.email?.split('@')[0] || 'You';
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, display_name: displayName, phone: phone.trim() || null },
        { onConflict: 'id' },
      );
    if (error) {
      const retry = await supabase
        .from('profiles')
        .upsert({ id: user.id, display_name: displayName }, { onConflict: 'id' });
      if (retry.error) return { error: retry.error.message };
    }
    try {
      const { useSplitStore } = require('@/stores/split-store') as typeof import('@/stores/split-store');
      useSplitStore.getState().setMe(displayName, phone);
    } catch {
      /* ignore */
    }
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
