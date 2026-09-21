// src/screens/DashboardScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { riderService } from '../services/riderService';

interface Assignment {
  orderId: string;
  status: string;
  assignedAt?: string;
  startedAt?: string;
}

interface Stats {
  ordersToday: number;
  totalSalesToday: number;
  totalEarningsToday: number;
}

interface Driver {
  id: string;
  email?: string;
  name?: string;
  isOnline?: boolean;
  stats?: Stats;
  history?: any[];
  currentAssignment?: Assignment | null;
}

interface DashboardScreenProps {
  driver: Driver;
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
  onLogout: () => void;
  onViewActiveOrder: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  driver,
  isOnline,
  setIsOnline,
  onLogout,
  onViewActiveOrder,
}) => {
  const driverEmail = driver.email || driver.id;

  // Estados locales de la vista
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [startingOrder, setStartingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<Stats>({
    ordersToday: Number(driver?.stats?.ordersToday ?? 0),
    totalSalesToday: Number(driver?.stats?.totalSalesToday ?? 0),
    totalEarningsToday: Number(driver?.stats?.totalEarningsToday ?? 0),
  });

  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(
    driver?.currentAssignment || null
  );

  const [history, setHistory] = useState<any[]>(
    Array.isArray(driver?.history) ? driver.history : []
  );

  // 1. Sincronización completa con DynamoDB
  const loadDashboardData = async () => {
    if (!driverEmail) return;
    try {
      const data = await riderService.fetchDashboardData(driverEmail);
      
      setIsOnline(Boolean(data.isOnline));
      if (data.stats) {
        setStats({
          ordersToday: Number(data.stats.ordersToday ?? 0),
          totalSalesToday: Number(data.stats.totalSalesToday ?? 0),
          totalEarningsToday: Number(data.stats.totalEarningsToday ?? 0),
        });
      }
      setCurrentAssignment(driver.currentAssignment || null);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (error: any) {
      console.error("Error al sincronizar dashboard:", error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [driverEmail]);

  // Recarga al deslizar hacia abajo (Pull-to-Refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [driverEmail]);

  // 2. Conectar / Desconectar Repartidor
  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setLoadingStatus(true);

    try {
      await riderService.updateOnlineStatus(driverEmail, nextStatus);
      setIsOnline(nextStatus);
    } catch (error: any) {
      Alert.alert("Error", "No se pudo actualizar tu estado de conexión.");
    } finally {
      setLoadingStatus(false);
    }
  };

  // 3. Iniciar la Orden Asignada automáticamente por DynamoDB Stream
  const handleStartOrder = async () => {
    if (!currentAssignment?.orderId) return;

    // Si la orden ya fue iniciada previamente, navegamos directamente a la ruta
    if (currentAssignment.status === 'INICIADO') {
      onViewActiveOrder();
      return;
    }

    setStartingOrder(true);
    try {
      const response = await riderService.startOrder(driverEmail, currentAssignment.orderId);
      
      if (response.currentAssignment) {
        setCurrentAssignment(response.currentAssignment);
      } else {
        setCurrentAssignment((prev) => prev ? { ...prev, status: 'INICIADO' } : null);
      }

      // Redirigir a la pantalla del Mapa / Navegación
      onViewActiveOrder();
    } catch (error: any) {
      Alert.alert("Error", "No se pudo iniciar la orden. Intenta de nuevo.");
    } finally {
      setStartingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Encabezado Principal */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hola, {driver?.name || 'Repartidor'}</Text>
          <Text style={styles.driverId}>{driverEmail}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      {/* Barra de Estado (isOnline) */}
      <View style={[styles.statusBanner, isOnline ? styles.bannerOnline : styles.bannerOffline]}>
        <View style={styles.statusInfoRow}>
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.statusText}>
            {isOnline ? "DISPONIBLE PARA PEDIDOS" : "DESCONECTADO"}
          </Text>
        </View>

        <TouchableOpacity
          disabled={loadingStatus}
          style={[styles.statusToggle, isOnline ? styles.toggleOn : styles.toggleOff]}
          onPress={handleToggleOnline}
        >
          {loadingStatus ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.toggleText}>{isOnline ? "Apagar" : "Conectar"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Módulo de Orden Asignada Automáticamente */}
        {currentAssignment?.orderId ? (
          <View style={styles.assignedCard}>
            <View style={styles.assignedCardHeader}>
              <Ionicons name="notifications" size={22} color="#D35400" />
              <Text style={styles.assignedTitle}>¡Pedido Asignado!</Text>
            </View>

            <Text style={styles.orderIdText}>Orden #{currentAssignment.orderId}</Text>
            
            <View style={styles.badgeRow}>
              <Text style={styles.badgeLabel}>Estado:</Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {currentAssignment.status || 'EN_CAMINO'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStartOrder}
              disabled={startingOrder}
            >
              {startingOrder ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.startBtnText}>
                  {currentAssignment.status === 'INICIADO' ? "Ver Ruta y Mapa" : "Iniciar Orden"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="compass-outline" size={32} color="#BDC3C7" />
            <Text style={styles.emptyText}>
              {isOnline
                ? "Esperando la asignación de un nuevo pedido..."
                : "Conéctate para empezar a recibir pedidos automatizados."}
            </Text>
          </View>
        )}

        {/* Resumen Métricas del Día */}
        <Text style={styles.sectionTitle}>Resumen de Hoy</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="cube-outline" size={22} color="#3498DB" />
            <Text style={styles.metricVal}>{stats.ordersToday}</Text>
            <Text style={styles.metricLabel}>Órdenes</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="cash-outline" size={22} color="#E67E22" />
            <Text style={styles.metricVal}>${stats.totalSalesToday.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Venta Total</Text>
          </View>

          <View style={styles.metricCardFeatured}>
            <Ionicons name="wallet-outline" size={22} color="#27AE60" />
            <Text style={styles.metricValFeatured}>
              ${stats.totalEarningsToday.toFixed(2)}
            </Text>
            <Text style={styles.metricLabelFeatured}>Tu Ganancia</Text>
          </View>
        </View>

        {/* Historial Reciente */}
        <Text style={styles.sectionTitle}>Entregas Recientes</Text>
        {history.length > 0 ? (
          history.slice(0, 5).map((item, index) => (
            <View key={item.id || index} style={styles.historyCard}>
              <View>
                <Text style={styles.historyId}>Orden #{item.orderId || item.id}</Text>
                <Text style={styles.historyDate}>{item.date || 'Hoy'}</Text>
              </View>
              <Text style={styles.historyEarning}>
                +${Number(item.earning || 0).toFixed(2)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noHistoryText}>No hay entregas registradas el día de hoy.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  driverId: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
  logoutBtn: { padding: 8 },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bannerOnline: { backgroundColor: '#E8F8F5' },
  bannerOffline: { backgroundColor: '#FADBD8' },
  statusInfoRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotOnline: { backgroundColor: '#2ECC71' },
  dotOffline: { backgroundColor: '#E74C3C' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#2C3E50' },
  statusToggle: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 85,
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: '#27AE60' },
  toggleOff: { backgroundColor: '#C0392B' },
  toggleText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  scrollBody: { flex: 1, paddingHorizontal: 20 },
  assignedCard: {
    backgroundColor: '#FEF9E7',
    padding: 16,
    borderRadius: 14,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#F1C40F',
  },
  assignedCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  assignedTitle: { fontSize: 16, fontWeight: 'bold', color: '#D35400', marginLeft: 6 },
  orderIdText: { fontSize: 15, fontWeight: '600', color: '#2C3E50', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  badgeLabel: { fontSize: 13, color: '#7F8C8D', marginRight: 6 },
  badgeContainer: { backgroundColor: '#E67E22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  startBtn: { backgroundColor: '#27AE60', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  startBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  emptyCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  emptyText: { color: '#7F8C8D', fontSize: 13, textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50', marginTop: 22, marginBottom: 12 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricCard: {
    backgroundColor: '#FFF',
    width: '30%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  metricCardFeatured: {
    backgroundColor: '#E8F8F5',
    width: '36%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  metricVal: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginTop: 4 },
  metricValFeatured: { fontSize: 18, fontWeight: 'bold', color: '#27AE60', marginTop: 4 },
  metricLabel: { fontSize: 11, color: '#7F8C8D', marginTop: 2 },
  metricLabelFeatured: { fontSize: 11, color: '#27AE60', fontWeight: 'bold', marginTop: 2 },
  historyCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  historyId: { fontSize: 14, fontWeight: '600', color: '#2C3E50' },
  historyDate: { fontSize: 11, color: '#95A5A6', marginTop: 2 },
  historyEarning: { fontSize: 15, fontWeight: 'bold', color: '#27AE60' },
  noHistoryText: { fontSize: 13, color: '#95A5A6', fontStyle: 'italic', marginBottom: 20 },
});