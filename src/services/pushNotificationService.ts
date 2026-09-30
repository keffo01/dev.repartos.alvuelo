// src/services/pushNotifications.ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Configuración de comportamiento cuando la notificación llega con la App abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldVibrate: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra el canal de Android, pide permisos y obtiene el Expo Push Token.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Las notificaciones push requieren un dispositivo físico.');
    return null;
  }

  // 2. Configurar el Canal de Notificaciones de Alta Prioridad en Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders-channel-v2', {
      name: 'Alertas de Pedidos Alvuelo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      sound: 'notification_sound', // Se busca en res/raw/notification_sound.mp3
      enableVibrate: true,
      showBadge: true,
    });
  }

  // 3. Gestionar Permisos del sistema
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permiso denegado para notificaciones push');
    return null;
  }

  // 4. Obtener Expo Push Token
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return pushTokenData.data;
  } catch (error) {
    console.error('Error al obtener Expo Push Token:', error);
    return null;
  }
}

// Alias para mantener compatibilidad si ya importas getExpoPushToken en alguna otra pantalla
export const getExpoPushToken = registerForPushNotificationsAsync;