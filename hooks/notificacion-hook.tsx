import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

export function useNotificationObserver() {
  // use any to avoid strict route typing issues when navigating from a hook
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // 1. Escucha cuando llega una notificación y la app está EN PRIMER PLANO
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notificación recibida en foreground:', notification);
    });

    // 2. Escucha cuando EL USUARIO PRESIONA LA NOTIFICACIÓN (Foreground, Background o Cerrada)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any>;
      
      console.log('📲 Notificación presionada. Datos:', data);

      // Validar si el tipo de notificación es un nuevo pedido
      if (data?.type === 'NEW_ORDER' && data?.orderId) {
        // Redirigir a la pantalla de detalles de la orden
        navigation.navigate('OrderDetail', { orderId: data.orderId as string });
      }
    });

    // Limpieza de listeners al desmontar el componente
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
    };
  }, [navigation]);
}