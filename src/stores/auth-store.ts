import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/utils/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

/**
 * Ensure a profile row exists for the current user in the `profiles` table.
 * The SQL trigger `on_auth_user_created` handles this automatically on signup,
 * but we call this as a safety net in case the trigger hasn't run yet.
 */
async function ensureProfile(userId: string, email: string): Promise<void> {
  try {
    const displayName = email.split('@')[0];
    await supabase
      .from('profiles')
      .upsert(
        { id: userId, display_name: displayName },
        { onConflict: 'id' },
      );
  } catch (err) {
    // Non-fatal — the trigger should have already created the profile
    console.error('[auth] ensureProfile failed:', err);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
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
      }
    }

    set({
      session,
      user: activeUser,
      isInitialized: true,
      isLoading: false,
    });

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });

      if (newSession?.user) {
        await ensureProfile(newSession.user.id, newSession.user.email ?? '');
      }
    });
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureProfile(user.id, user.email ?? '');
      }
    }
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureProfile(user.id, user.email ?? '');
      }
    }
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
