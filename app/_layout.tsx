// app/_layout.tsx
import { useNotificationObserver } from '@/hooks/notificacion-hook';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';

// Contexto y Servicio de Notificaciones
import { DriverProvider } from '../src/context/driverContext';
import { registerForPushNotificationsAsync } from '../src/services/pushNotificationService';

// 🟢 CRÍTICO: Define cómo debe reaccionar la app si la notificación llega mientras está ABIERTA
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldVibrate: true,
  }),
});

function RootLayoutNav() {
  useEffect(() => {
    const initNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        console.log('Expo Push Token del repartidor:', token);
        // Aquí puedes enviar el token a tu backend si lo necesitas
      }
    };

    initNotifications();
  }, []);

  const colorScheme = useColorScheme();
  
  // Tu hook para escuchar cuando el repartidor toca/abre la notificación
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