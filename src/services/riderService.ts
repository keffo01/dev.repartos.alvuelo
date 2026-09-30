// src/services/riderService.ts
import { registerForPushNotificationsAsync } from './pushNotificationService';

const API_BASE_URL = "https://jfzj8yx48i.execute-api.us-east-2.amazonaws.com/Dev";

export const riderService = {
  // 1. Enviar / Actualizar Expo Push Token en DynamoDB
  async updatePushToken(email: string): Promise<void> {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.warn('⚠️ No se pudo obtener el Expo Push Token.');
        return;
      }

      console.log(`📲 Guardando Expo Push Token para ${email}:`, token);

      const response = await fetch(`${API_BASE_URL}/login/riders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, expoPushToken: token })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      console.log('✅ Push Token actualizado correctamente en DynamoDB');
    } catch (error) {
      console.error('❌ Error al actualizar Push Token:', error);
    }
  },

  // 2. Cambiar estado online/offline
  async updateOnlineStatus(email: string, isOnline: boolean) {
    console.log(`Actualizando estado online para ${email} a ${isOnline}`);
    const response = await fetch(`${API_BASE_URL}/rider/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, isOnline })
    });
    if (!response.ok) throw new Error("Error al actualizar estado en el servidor");
    return await response.json();
  },

  // 3. Cargar métricas actualizadas del Dashboard
  async fetchDashboardData(email: string) {
    const response = await fetch(`${API_BASE_URL}/rider/dashboard?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Error al obtener métricas del dashboard");
    return await response.json();
  },

  // 4. Iniciar la carrera asignada automáticamente
  async startOrder(email: string, orderId: string) {
    const response = await fetch(`${API_BASE_URL}/rider/start-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orderId })
    });

    if (!response.ok) throw new Error("Error al iniciar la orden");
    return await response.json();
  },

  // 5. Actualizar el estado de la orden
  async updateOrderStatus(
    email: string, 
    orderId: string, 
    newStatus: string, 
    orderValue: number = 0, 
    earning: number = 0
  ) {
    const response = await fetch(`${API_BASE_URL}/rider/update-order-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orderId, newStatus, orderValue, earning })
    });

    if (!response.ok) throw new Error("Error al actualizar el estado de la orden");
    return await response.json();
  },

  // 6. Obtener la orden completa desde DynamoDB
  async getOrderDetails(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/rider/order-details?orderId=${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("No se pudo obtener el detalle del pedido");
    return await response.json();
  },

  // 7. Consultar perfil del repartidor
  async getProfile(email: string) {
    const response = await fetch(`${API_BASE_URL}/rider/profile?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Error al consultar el perfil del repartidor');
    }

    return await response.json();
  },

  // 8. Cambiar estado de disponibilidad (DISPONIBLE / FUERA_DE_LINEA)
  async updateRiderStatus(email: string, riderStatus: string) {
    const response = await fetch(`${API_BASE_URL}/rider/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, riderStatus }),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar el estado de disponibilidad');
    }

    return await response.json();
  }
};