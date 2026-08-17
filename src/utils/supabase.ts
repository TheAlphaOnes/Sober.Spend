import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL. Add it to .env.local before starting the app.',
  );
}

if (!supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_KEY. Add it to .env.local before starting the app.',
  );
}

/**
 * Shared Supabase client.
 *
 * Session storage is backed by `expo-sqlite/localStorage`, the approach
 * recommended by the current Supabase Expo quickstart for SDK 57. The
 * `react-native-url-polyfill/auto` import patches the global `URL` constructor
 * before the client is created so `supabase-js` URL handling works on native.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
