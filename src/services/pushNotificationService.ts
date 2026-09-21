// src/services/pushNotifications.ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export async function getExpoPushToken() {
  if (!Device.isDevice) {
    console.warn('Las notificaciones push requieren un dispositivo físico.');
    return null;
  }

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

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return pushTokenData.data;
  } catch (error) {
    console.error('Error al obtener Expo Push Token:', error);
    return null;
  }
}