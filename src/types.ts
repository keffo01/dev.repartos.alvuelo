// src/types.ts

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Establishment {
  id: string;
  name: string;
  distance: string;
  items: string[];
  coordinates: Coordinates; // <-- Nueva propiedad
}

export interface Order {
  id: string;
  deliveryAddress: string;
  deliveryZone: string;
  deliveryFee: number;
  totalOrderValue: number;
  establishments: Establishment[];
  deliveryCoordinates: Coordinates; // <-- Nueva propiedad
}

export interface DriverHistory {
  id: string;
  date: string;
  client: string;
  totalValue: number;
  earning: number;
  status: string;
}

export interface DriverStats {
  ordersToday: number;
  totalSalesToday: number;
  totalEarningsToday: number;
}

export interface Driver {
  id: string;
  email: string;
  username: string;
  password?: string;
  name: string;
  shiftStart: string;
  shiftEnd: string;
  stats: DriverStats;
  history: DriverHistory[];
  currentAssignment?: {
    orderId: string;
    status: string;
  };
}

export type ScreenName = 'LOGIN' | 'DASHBOARD' | 'ORDER_DETAIL';