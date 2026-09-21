// src/data/mockData.ts
import { Driver, Order } from '../types';

export const MOCK_DRIVERS: Record<string, Driver> = {
  carlos: {
    id: "DRV-001",
    username: "carlos",
    password: "123",
    name: "Carlos Gómez",
    shiftStart: "09:00",
    shiftEnd: "21:00",
    stats: { ordersToday: 5, totalSalesToday: 145.50, totalEarningsToday: 18.00 },
    history: [
      { id: "ORD-991", date: "Hoy, 10:30 AM", client: "Ana M.", totalValue: 35.00, earning: 4.00, status: "Entregado" },
      { id: "ORD-992", date: "Hoy, 11:45 AM", client: "Luis P.", totalValue: 22.00, earning: 3.50, status: "Entregado" },
    ]
  },
  ana: {
    id: "DRV-002",
    username: "ana",
    password: "123",
    name: "Ana Martínez",
    shiftStart: "09:00",
    shiftEnd: "23:00",
    stats: { ordersToday: 3, totalSalesToday: 88.00, totalEarningsToday: 11.50 },
    history: [
      { id: "ORD-881", date: "Hoy, 09:15 AM", client: "Pedro H.", totalValue: 18.00, earning: 3.50, status: "Entregado" },
    ]
  }
};

export const MOCK_ACTIVE_ORDERS: Order[] = [
  {
    id: "ORD-2026-X",
    deliveryAddress: "Av. Las Magnolias #412, Apt 3B",
    deliveryZone: "Zona Metropolitana Norte",
    deliveryFee: 6.50,
    totalOrderValue: 84.00,
    deliveryCoordinates: { latitude: 13.6929, longitude: -89.2182 }, // Coordenadas de entrega del cliente
    establishments: [
      {
        id: "EST-01",
        name: "Pizzería La Nostra",
        distance: "0.8 km",
        items: ["1x Pizza Familiar Pepperoni", "1x Pan con Ajo"],
        coordinates: { latitude: 13.7013, longitude: -89.2244 } // Coordenadas del comercio 1
      },
      {
        id: "EST-02",
        name: "Donut Palace",
        distance: "1.9 km",
        items: ["1x Caja de 6 Donas Variadas"],
        coordinates: { latitude: 13.6985, longitude: -89.2011 } // Coordenadas del comercio 2
      }
    ]
  }
];