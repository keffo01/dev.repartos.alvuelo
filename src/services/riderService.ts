// src/services/riderService.ts
const API_BASE_URL = "https://jfzj8yx48i.execute-api.us-east-2.amazonaws.com/Dev";

export const riderService = {
  // 1. Cambiar estado online/offline
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

  // 2. Cargar métricas actualizadas del Dashboard
  async fetchDashboardData(email: string) {
    const response = await fetch(`${API_BASE_URL}/rider/dashboard?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Error al obtener métricas del dashboard");
    return await response.json();
  },

  // Iniciar la carrera asignada automáticamente por el backend
  async startOrder(email: string, orderId: string) {
    const response = await fetch(`${API_BASE_URL}/rider/start-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orderId })
    });

    if (!response.ok) throw new Error("Error al iniciar la orden");
    return await response.json();
  },

  //actulizar el estado de la orden
  // Agregar a src/services/riderService.ts
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
// Obtener la orden completa desde DynamoDB
  async getOrderDetails(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/rider/order-details?orderId=${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("No se pudo obtener el detalle del pedido");
    return await response.json();
  }
};