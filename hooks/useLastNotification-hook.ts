import { useNavigation, type NavigationProp } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

export default function AppNavigator() {
  const navigation = useNavigation<NavigationProp<any>>();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastResponse &&
      lastResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastResponse.notification.request.content.data;

      if (data?.type === 'NEW_ORDER' && data?.orderId) {
        navigation.navigate('OrderDetail', {
          orderId: String(data.orderId),
        });
      }
    }
  }, [lastResponse, navigation]);

  return (
    // Tu Stack / Drawer / Tabs de navegación aquí
    null
  );
}