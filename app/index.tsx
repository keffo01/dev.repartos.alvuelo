// app/index.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Importación del hook global (Ajusta la ruta según la carpeta real)
import { useDriver } from '../src/context/driverContext';

import { DashboardScreen } from '../src/screens/dashboardScreen';
import { LoginScreen } from '../src/screens/loginScreen';
import { OrderDetailScreen } from '../src/screens/orderDetailScreen';
import { Order, ScreenName } from '../src/types';

export default function App() {
  // 1. Obtener estado y funciones sincronizadas desde el DriverContext
  const { driver, setDriver, isLoading } = useDriver();

  const [currentScreen, setCurrentScreen] = useState<ScreenName>('DASHBOARD');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderStep, setOrderStep] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  // 2. Transición automática a DASHBOARD en cuanto se detecte sesión activa
  useEffect(() => {
    if (driver && currentScreen === 'LOGIN') {
      setCurrentScreen('DASHBOARD');
    }
  }, [driver, currentScreen]);

  const handleLoginSuccess = (user: any) => {
    setDriver(user);
    setCurrentScreen('DASHBOARD');
  };

  const handleLogout = () => {
    setDriver(null);
    setIsOnline(false);
    setActiveOrder(null);
    setOrderStep(0);
    setCurrentScreen('LOGIN');
  };

  const acceptOrder = (order: Order) => {
    setActiveOrder(order);
    setOrderStep(1);
    setCurrentScreen('ORDER_DETAIL');
  };

  const completeOrder = () => {
    setActiveOrder(null);
    setOrderStep(0);
    setCurrentScreen('DASHBOARD');
  };

  // 3. Pantalla de carga mientras lee la sesión guardada de AsyncStorage
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1E2C' }}>
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  // 4. Si no hay repartidor o la pantalla elegida es LOGIN, renderiza el Login
  if (!driver || currentScreen === 'LOGIN') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Determinar la orden activa a renderizar
  const effectiveOrder =
    activeOrder ||
    (driver?.currentAssignment
      ? ({
          id: driver.currentAssignment.orderId,
          status: driver.currentAssignment.status || 'INICIADO',
        } as any)
      : null);

  // 5. Pantalla de Detalle de la Orden
  if (currentScreen === 'ORDER_DETAIL' && effectiveOrder) {
    return (
      <OrderDetailScreen
        order={effectiveOrder}
        orderStep={orderStep}
        setOrderStep={setOrderStep}
        driver={driver}
        onBack={() => setCurrentScreen('DASHBOARD')}
        onCompleteOrder={completeOrder}
      />
    );
  }

  // 6. Pantalla de Dashboard por defecto cuando está autenticado
  return (
    <DashboardScreen
      driver={driver}
      isOnline={isOnline}
      setIsOnline={setIsOnline}
      activeOrder={activeOrder}
      onLogout={handleLogout}
      onAcceptOrder={acceptOrder}
      onViewActiveOrder={() => {
        if (!activeOrder && driver?.currentAssignment) {
          setActiveOrder({
            id: driver.currentAssignment.orderId,
            status: driver.currentAssignment.status || 'INICIADO',
          } as any);
        }
        setCurrentScreen('ORDER_DETAIL');
      }}
    />
  );
}