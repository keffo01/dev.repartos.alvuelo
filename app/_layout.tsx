// app/_layout.tsx
import { useNotificationObserver } from '@/hooks/notificacion-hook';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

// Importación del DriverProvider (Ajusta la ruta si se ubica en src/context/driverContext)
import { DriverProvider } from '../src/context/driverContext';

// Manejador global de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  useNotificationObserver();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Ruta principal (Dashboard) */}
        <Stack.Screen name="index" />
        {/* Ruta de Inicio de Sesión */}
        <Stack.Screen name="login" />
        {/* Ventana modal */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <DriverProvider>
      <RootLayoutNav />
    </DriverProvider>
  );
}