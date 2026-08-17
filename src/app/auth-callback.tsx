import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Auth callback route — catches the deep link from Supabase's email
 * confirmation redirect.
 *
 * When email confirmation is enabled in Supabase, the confirmation email
 * contains a link that opens the app via `soberspend://auth-callback`.
 * Supabase exchanges the token in the URL for a session, and the
 * onAuthStateChange listener in auth-store picks it up. We just need
 * to wait for the session to appear, then redirect to the profile.
 */
export default function AuthCallbackScreen() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      // Session resolved (or not) — either way, go to profile.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/profile');
      }
    }
  }, [isLoading, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
