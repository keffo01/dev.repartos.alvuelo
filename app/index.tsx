// app/index.tsx
import React, { useState } from 'react';
import { DashboardScreen } from '../src/screens/dashboardScreen';
import { LoginScreen } from '../src/screens/loginScreen';
import { OrderDetailScreen } from '../src/screens/orderDetailScreen';
import { Driver, Order, ScreenName } from '../src/types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('LOGIN');
  const [driver, setDriver] = useState<Driver | null>(null);
  
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderStep, setOrderStep] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const handleLoginSuccess = (user: Driver) => {
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

  // 1. Pantalla de Autenticación
  if (currentScreen === 'LOGIN' || !driver) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Pantalla de Dashboard
  if (currentScreen === 'DASHBOARD' && driver) {
    return (
      <DashboardScreen 
        driver={driver}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        activeOrder={activeOrder}
        onLogout={handleLogout}
        onAcceptOrder={acceptOrder}
        onViewActiveOrder={() => {
          // Si no hay activeOrder definido pero el repartidor tiene un asignamiento en DynamoDB
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

  // Determinar la orden efectiva a renderizar
  const effectiveOrder = activeOrder || (driver?.currentAssignment ? ({
    id: driver.currentAssignment.orderId,
    status: driver.currentAssignment.status || 'INICIADO',
  } as any) : null);

  // 3. Pantalla de Detalle de la Orden
  if (currentScreen === 'ORDER_DETAIL' && driver && effectiveOrder) {
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

  // Resguardo para evitar renderizado nulo/pantalla blanca
  return (
    <DashboardScreen 
      driver={driver}
      isOnline={isOnline}
      setIsOnline={setIsOnline}
      activeOrder={activeOrder}
      onLogout={handleLogout}
      onAcceptOrder={acceptOrder}
      onViewActiveOrder={() => setCurrentScreen('ORDER_DETAIL')}
    />
  );
}