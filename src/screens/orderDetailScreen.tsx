// src/screens/OrderDetailScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDriver } from '../context/driverContext';
import { riderService } from '../services/riderService';

interface OrderDetailScreenProps {
  order?: any;
  driver?: any;
  onBack: () => void;
  onCompleteOrder: () => void;
}

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  order: initialOrder,
  driver,
  onBack,
  onCompleteOrder,
}) => {
  const { setDriver } = useDriver();

  const driverEmail = driver?.email || driver?.id;
  const orderId = initialOrder?.id || initialOrder?.orderId || driver?.currentAssignment?.orderId;

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string>('INICIADO');

  // Normalizar el estado 'asignada' a 'INICIADO'
  const normalizeStatus = (rawStatus: string) => {
    if (!rawStatus || rawStatus.toLowerCase() === 'asignada') return 'INICIADO';
    return rawStatus.toUpperCase();
  };

  useEffect(() => {
    const fetchFullOrder = async () => {
      if (!orderId) {
        setLoadingOrder(false);
        return;
      }
      try {
        setLoadingOrder(true);
        const data = await riderService.getOrderDetails(orderId);
        console.log("🚀 OrderDetails cargados:", data);
        setOrderDetails(data);
        const statusToEval = data?.status || data?.orderStatus;
        if (statusToEval) {
          setCurrentStatus(normalizeStatus(statusToEval));
        }
      } catch (error) {
        console.error("Error al obtener la orden:", error);
        Alert.alert("Error", "No se pudieron obtener los detalles del pedido.");
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchFullOrder();
  }, [orderId]);

  // Apertura de Google Maps con Coordenadas Lat/Lng o Dirección
  const handleOpenMaps = (lat?: number | null, lng?: number | null, address?: string) => {
    let url = '';

    if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "No se pudo abrir la aplicación de mapas.");
      });
    } else {
      Alert.alert("Aviso", "No hay ubicación ni dirección registrada para esta orden.");
    }
  };

  // Realizar llamada al cliente
  const handleCallCustomer = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  // Flujo secuencial de estados del repartidor
  const getNextStateInfo = () => {
    const normStatus = normalizeStatus(currentStatus);
    switch (normStatus) {
      case 'INICIADO':
        return { nextStatus: 'EN_RESTAURANTE', label: 'Llegué al Comercio', color: '#E67E22', icon: 'storefront-outline' };
      case 'EN_RESTAURANTE':
        return { nextStatus: 'PEDIDO_RECOGIDO', label: 'Confirmar Pedido Recogido', color: '#2980B9', icon: 'bag-check-outline' };
      case 'PEDIDO_RECOGIDO':
        return { nextStatus: 'ENTREGADO', label: 'Finalizar y Marcar Entregado', color: '#27AE60', icon: 'checkmark-circle-outline' };
      default:
        return { nextStatus: 'ENTREGADO', label: 'Finalizar Entrega', color: '#27AE60', icon: 'checkmark-circle-outline' };
    }
  };

  const handleAdvanceStatus = async () => {
    const { nextStatus } = getNextStateInfo();
    setUpdatingStatus(true);

    const orderValue = Number(orderDetails?.totalAmount || 0);
    const earning = Number(orderDetails?.deliveryFee || 0);

    try {
      const res = await riderService.updateOrderStatus(
        driverEmail,
        orderId,
        nextStatus,
        orderValue,
        earning
      );

      if (res.isFinished) {
        const todayStr = new Date().toISOString().split('T')[0];

        if (setDriver) {
          setDriver((prevDriver: any) => ({
            ...prevDriver,
            currentAssignment: null,
            riderStatus: 'DISPONIBLE',
            isOnline: true,
            stats: {
              ...(prevDriver?.stats || {}),
              [todayStr]: res.stats || {
                date: todayStr,
                ordersToday: (prevDriver?.stats?.[todayStr]?.ordersToday || 0) + 1,
                totalSalesToday: (prevDriver?.stats?.[todayStr]?.totalSalesToday || 0) + orderValue,
                totalEarningsToday: (prevDriver?.stats?.[todayStr]?.totalEarningsToday || 0) + earning,
              },
            },
            history: res.history || prevDriver?.history || [],
          }));
        }

        Alert.alert("¡Entrega Exitosa!", "El pedido fue finalizado y tus estadísticas fueron actualizadas.", [
          {
            text: "Aceptar",
            onPress: () => {
              onCompleteOrder();
            },
          },
        ]);
      } else {
        setCurrentStatus(nextStatus);

        if (setDriver) {
          setDriver((prevDriver: any) => ({
            ...prevDriver,
            currentAssignment: prevDriver?.currentAssignment
              ? { ...prevDriver.currentAssignment, status: nextStatus }
              : null,
          }));
        }
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el estado de la orden.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const { label, color, icon } = getNextStateInfo();
  const normStatus = normalizeStatus(currentStatus);

  if (loadingOrder) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text style={styles.loadingText}>Cargando pedido #{orderId}...</Text>
      </SafeAreaView>
    );
  }

  // Extracción de datos
  const customerName = orderDetails?.customerName || 'Cliente';
  const customerPhone = orderDetails?.customerPhone;
  const deliveryAddress = orderDetails?.deliveryAddress || 'Sin dirección especificada';
  const deliveryFee = Number(orderDetails?.deliveryFee || 0);
  const subtotal = Number(orderDetails?.subtotal || 0);
  const grandTotal = Number(orderDetails?.totalAmount || 0);
  const paymentMethod = orderDetails?.paymentMethod || 'cash';
  const restaurantName = orderDetails?.restaurantName || 'Comercio Alvuelo';
  const itemsList = Array.isArray(orderDetails?.items) ? orderDetails.items : [];
  
  const isCustomFavor = orderDetails?.restaurantId === 'servicio_personalizado' || restaurantName.toLowerCase().includes('mandadito');

  // Recolectar e inspeccionar imágenes S3
  const rawImages = [
    ...(Array.isArray(orderDetails?.images) ? orderDetails.images : []),
    ...(Array.isArray(orderDetails?.orderData?.images) ? orderDetails.orderData.images : []),
  ];
  itemsList.forEach((item: any) => {
    if (Array.isArray(item.images)) rawImages.push(...item.images);
    if (item.details?.images && Array.isArray(item.details.images)) rawImages.push(...item.details.images);
  });

  const s3Images = rawImages.map((img: any) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (img.publicUrl) return img.publicUrl;
    if (img.uri && img.uri.startsWith('http')) return img.uri;
    if (img.fileName && orderId) {
      const lastDot = img.fileName.lastIndexOf('.');
      const nameWithoutExt = lastDot !== -1 ? img.fileName.substring(0, lastDot) : img.fileName;
      return `https://alvuelo-bucket.s3.us-east-2.amazonaws.com/mandaditos/${nameWithoutExt}_${orderId}.jpg`;
    }
    return null;
  }).filter(Boolean);

  const uniqueImages = Array.from(new Set(s3Images));

  // Formateador de etiquetas legibles para los detalles
  const formatDetailLabel = (key: string) => {
    switch (key) {
      case 'pickupLocation':
        return 'Lugar de recolección';
      case 'fullDescription':
        return 'Descripción';
      case 'referencePrice':
        return 'Precio estimado';
      case 'mapsUrl':
        return 'Enlace de mapa';
      case 'Complemento1':
        return 'Complemento 1';
      case 'Complemento2':
        return 'Complemento 2';
      default:
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{orderId}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progreso de la entrega */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progreso de Entrega</Text>
          <View style={styles.stepperContainer}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, ['EN_RESTAURANTE', 'PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
            <View style={[styles.stepDot, ['EN_RESTAURANTE', 'PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
            <View style={[styles.stepLine, ['PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
            <View style={[styles.stepDot, ['PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
          </View>
          <Text style={styles.statusLabel}>
            Fase Actual: <Text style={styles.statusBold}>{normStatus}</Text>
          </Text>
        </View>

        {/* Tipo de Servicio / Comercio */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FDF2E9' }]}>
              <Ionicons name={isCustomFavor ? "cube-outline" : "storefront-outline"} size={22} color="#E67E22" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{isCustomFavor ? 'TIPO DE SERVICIO' : 'COMERCIO / RESTAURANTE'}</Text>
              <Text style={styles.infoTitle}>{isCustomFavor ? 'Mandaditos / Favor Personalizado' : restaurantName}</Text>
            </View>
          </View>
        </View>

        {/* Cliente y Dirección */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FDEDEC' }]}>
              <Ionicons name="person-outline" size={22} color="#E74C3C" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>CLIENTE</Text>
              <Text style={styles.infoTitle}>{customerName}</Text>
            </View>
            {customerPhone ? (
              <TouchableOpacity
                style={styles.phoneBtn}
                onPress={() => handleCallCustomer(customerPhone)}
              >
                <Ionicons name="call-outline" size={16} color="#27AE60" />
                <Text style={styles.phoneBtnText}>Llamar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#EAF2F8' }]}>
              <Ionicons name="location-outline" size={22} color="#2980B9" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>DIRECCIÓN DE ENTREGA</Text>
              <Text style={styles.infoTitle}>{deliveryAddress}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => handleOpenMaps(orderDetails?.latitude, orderDetails?.longitude, deliveryAddress)}
            >
              <Ionicons name="navigate-outline" size={16} color="#2980B9" />
              <Text style={styles.mapBtnText}>Navegar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🟢 DETALLE DEL PEDIDO (Ocultando únicamente isCustomFavor y mostrando etiquetas legibles) */}
        {Array.isArray(itemsList) && itemsList.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalle del Pedido ({itemsList.length})</Text>
            
            {!isCustomFavor && restaurantName ? (
              <Text style={styles.restaurantHeaderTitle}>🏪 {restaurantName}</Text>
            ) : null}

            {itemsList.map((item: any, idx: number) => {
              const itemName = item.name || 'Producto';
              const itemQty = Number(item.quantity || 1);
              const itemPrice = Number(item.price || 0);

              const details = item.details || {};
              // Solo ocultamos isCustomFavor, los demás detalles se muestran con etiquetas formateadas
              const hiddenKeys = ['isCustomFavor'];
              
              const detailEntries = typeof details === 'object' && details !== null 
                ? Object.entries(details).filter(([key]) => !hiddenKeys.includes(key)) 
                : [];

              return (
                <View key={idx} style={styles.itemContainer}>
                  <View style={styles.itemHeaderRow}>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyText}>{itemQty}x</Text>
                    </View>
                    <Text style={styles.itemNameText}>{itemName}</Text>
                    <Text style={styles.itemPriceText}>${(itemPrice * itemQty).toFixed(2)}</Text>
                  </View>

                  {detailEntries.length > 0 && (
                    <View style={styles.detailsBox}>
                      {detailEntries.map(([key, value], dIdx) => (
                        <Text key={dIdx} style={styles.detailItemText}>
                          • <Text style={{ color: '#7F8C8D' }}>{formatDetailLabel(key)}:</Text> <Text style={{ fontWeight: '700', color: '#2C3E50' }}>{String(value)}</Text>
                        </Text>
                      ))}
                    </View>
                  )}

                  {idx < itemsList.length - 1 && <View style={styles.itemInnerDivider} />}
                </View>
              );
            })}
          </View>
        )}

        {/* 🟢 IMÁGENES ADJUNTAS DESDE S3 */}
        {Array.isArray(uniqueImages) && uniqueImages.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Imágenes Adjuntas ({uniqueImages.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {uniqueImages.map((imgUri: string, imgIdx: number) => (
                <Image
                  key={imgIdx}
                  source={{ uri: imgUri }}
                  style={styles.itemImageThumbnail}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Resumen Financiero */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen de Pago</Text>
          
          <View style={styles.paymentMethodBox}>
            <Ionicons name="cash-outline" size={20} color="#27AE60" />
            <Text style={styles.paymentMethodText}>
              Método de pago: <Text style={{ fontWeight: 'bold' }}>
                {paymentMethod === 'cash' ? 'Efectivo (Cobrar al entregar)' : 'Tarjeta / Pagado'}
              </Text>
            </Text>
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Subtotal productos:</Text>
            <Text style={styles.financeValue}>${subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Envío / Ganancia flete:</Text>
            <Text style={styles.earningValue}>+${deliveryFee.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.financeRow}>
            <Text style={styles.totalLabel}>TOTAL A COBRAR:</Text>
            <Text style={styles.totalValue}>${grandTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Botón Inferior de Estado */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: color }]}
          onPress={handleAdvanceStatus}
          disabled={updatingStatus}
        >
          {updatingStatus ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.btnContent}>
              <Ionicons name={icon as any} size={22} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>{label}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#7F8C8D', fontWeight: '500' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50' },
  content: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#BDC3C7' },
  stepLine: { flex: 1, height: 3, backgroundColor: '#BDC3C7' },
  stepDone: { backgroundColor: '#27AE60' },
  statusLabel: { fontSize: 13, color: '#7F8C8D', textAlign: 'center', marginTop: 10 },
  statusBold: { fontWeight: 'bold', color: '#2C3E50' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoTextContainer: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: '#95A5A6', letterSpacing: 0.5 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50', marginTop: 2 },
  phoneBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F8F5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  phoneBtnText: { fontSize: 12, fontWeight: 'bold', color: '#27AE60', marginLeft: 4 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBF5FB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  mapBtnText: { fontSize: 12, fontWeight: 'bold', color: '#2980B9', marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  restaurantHeaderTitle: { fontSize: 13, fontWeight: 'bold', color: '#E67E22', marginBottom: 10 },
  itemContainer: { marginVertical: 4 },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBadge: { backgroundColor: '#E8F8F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  qtyText: { fontSize: 12, fontWeight: 'bold', color: '#27AE60' },
  itemNameText: { fontSize: 14, fontWeight: '600', color: '#2C3E50', flex: 1 },
  itemPriceText: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50' },
  detailsBox: { backgroundColor: '#F8F9FA', padding: 8, borderRadius: 8, marginTop: 6, marginLeft: 28 },
  detailItemText: { fontSize: 12, color: '#34495E', marginVertical: 2 },
  imagesScroll: { flexDirection: 'row', marginVertical: 4 },
  itemImageThumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: '#F2F4F4' },
  itemInnerDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  paymentMethodBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginBottom: 12 },
  paymentMethodText: { fontSize: 13, color: '#34495E', marginLeft: 8 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  financeLabel: { fontSize: 13, color: '#7F8C8D' },
  financeValue: { fontSize: 13, fontWeight: '600', color: '#2C3E50' },
  earningValue: { fontSize: 13, fontWeight: 'bold', color: '#27AE60' },
  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#27AE60' },
  footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default OrderDetailScreen;