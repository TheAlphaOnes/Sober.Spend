import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initialize);

  const [fontsLoaded] = useFonts({
    [Fonts.display]: require('../../assets/fonts/JockeyOne-Regular.ttf'),
    [Fonts.accent]: require('../../assets/fonts/SignPainterHouseScript.ttf'),
  });

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="scan"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="decision"
          options={{
            animation: 'slide_from_right',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="history" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="wishlist" />
        <Stack.Screen name="split" />
        <Stack.Screen name="split-detail" />
        <Stack.Screen
          name="auth-callback"
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
