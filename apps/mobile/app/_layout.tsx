import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { AreaProvider } from '../src/features/restaurants/AreaContext';
import { RouletteProvider } from '../src/features/roulette/RouletteContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AreaProvider>
        <RouletteProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="search" />
            <Stack.Screen name="restaurants/[id]" />
            <Stack.Screen name="roulette" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="community/new" />
            <Stack.Screen name="community/[id]" />
            <Stack.Screen name="meetups/index" />
            <Stack.Screen name="meetups/new" />
            <Stack.Screen name="meetups/[id]/index" />
            <Stack.Screen name="meetups/[id]/chat" />
          </Stack>
        </RouletteProvider>
      </AreaProvider>
    </AuthProvider>
  );
}
