import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../hooks/useSignalR';
import { PriceBreakdownModal } from '../components/PriceBreakdownModal';
import { TripDetailModal } from '../components/TripDetailModal';
import { RetryPaymentModal } from '../components/RetryPaymentModal';
import { WalletSection } from '../components/WalletSection';
import { LeafletMap } from '../components/LeafletMap';
import { 
  createTrip, 
  matchDriver, 
  fetchUserWallet, 
  fetchWalletLedger, 
  fetchDriverLocations,
  fetchAllTrips,
  cancelTrip,
  DEFAULT_DRIVER_LOCATIONS,
  type CreateTripRequest 
} from '../services/api';
import type { 
  TripCreatedResponse, 
  TripAcceptedData, 
  DriverRejectedData,
  Wallet,
  LedgerEntry,
  DriverLocation,
  TripItem
} from '../types';
import { 
  POPULAR_LOCATIONS, 
  calculateDistanceKm, 
  estimateDurationMinutes, 
  reverseGeocode,
  type Coordinates,
  type PopularLocation
} from '../utils/mapUtils';
import { 
  Navigation, 
  MapPin, 
  CloudRain, 
  ShieldAlert, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Receipt, 
  RefreshCw, 
  Tag, 
  Wallet as WalletIcon, 
  CreditCard,
  Crosshair,
  Check,
  History,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';

const PRESET_ROUTES = [
  {
    name: 'Chợ Bến Thành ➔ Landmark 81',
    pickup: 'Chợ Bến Thành, Đường Lê Lợi, Phường Bến Thành, Quận 1',
    dropoff: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh',
    pickupLat: 10.7725,
    pickupLng: 106.6980,
    dropoffLat: 10.7950,
    dropoffLng: 106.7218,
  },
  {
    name: 'Sân bay Tân Sơn Nhất ➔ Bitexco Tower',
    pickup: 'Sân bay Tân Sơn Nhất, Đường Trường Sơn, Tân Bình',
    dropoff: 'Tòa nhà Bitexco, Số 2 Hải Triều, Quận 1',
    pickupLat: 10.8185,
    pickupLng: 106.6588,
    dropoffLat: 10.7716,
    dropoffLng: 106.7044,
  },
  {
    name: 'Đại Học Sài Gòn (SGU) ➔ Phố đi bộ Nguyễn Huệ',
    pickup: 'Đại Học Sài Gòn, 273 An Dương Vương, Quận 5',
    dropoff: 'Phố đi bộ Nguyễn Huệ, Quận 1',
    pickupLat: 10.7599,
    pickupLng: 106.6823,
    dropoffLat: 10.7745,
    dropoffLng: 106.7032,
  },
];

type ClientTab = 'booking' | 'history' | 'wallet';

export const RiderPage: React.FC = () => {
  const { user, isAuthenticated, openLoginModal } = useAuth();

  // Active rider info (uses logged-in user or fallback seed)
  const currentRiderId = user?.id || 'c0a80123-4567-89ab-cdef-0123456789ab';
  const currentRiderName = user?.fullName || user?.userName || 'Nguyễn Văn An (Khách hàng)';

  // Client Navigation Tabs
  const [activeTab, setActiveTab] = useState<ClientTab>('booking');
  const [isPanelMinimized, setIsPanelMinimized] = useState<boolean>(false);

  // Trip and matching state
  const [currentTrip, setCurrentTrip] = useState<TripCreatedResponse | null>(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [acceptedData, setAcceptedData] = useState<TripAcceptedData | null>(null);
  const [rejectedData, setRejectedData] = useState<DriverRejectedData | null>(null);

  // History & Detail modals
  const [riderTrips, setRiderTrips] = useState<TripItem[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState<boolean>(false);
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<TripItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [tripToRetryPayment, setTripToRetryPayment] = useState<TripItem | null>(null);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState<boolean>(false);

  // Form states - Dynamic Coordinates & Address
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(0);
  const [pickupCoords, setPickupCoords] = useState<Coordinates>({
    lat: PRESET_ROUTES[0].pickupLat,
    lng: PRESET_ROUTES[0].pickupLng,
  });
  const [dropoffCoords, setDropoffCoords] = useState<Coordinates>({
    lat: PRESET_ROUTES[0].dropoffLat,
    lng: PRESET_ROUTES[0].dropoffLng,
  });
  const [pickupAddress, setPickupAddress] = useState<string>(PRESET_ROUTES[0].pickup);
  const [dropoffAddress, setDropoffAddress] = useState<string>(PRESET_ROUTES[0].dropoff);

  // Map selecting mode ('pickup' | 'dropoff' | null)
  const [selectingMode, setSelectingMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Extra options
  const [isRaining, setIsRaining] = useState<boolean>(false);
  const [hasToll, setHasToll] = useState<boolean>(false);
  const [promoCode, setPromoCode] = useState<string>('');

  const [isCreatingTrip, setIsCreatingTrip] = useState<boolean>(false);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matchSuccessMessage, setMatchSuccessMessage] = useState<string | null>(null);

  // Payment Method & Wallet State
  const [paymentMethod, setPaymentMethod] = useState<'Wallet' | 'Card'>('Wallet');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);

  // Driver locations for live map display
  const [availableDrivers, setAvailableDrivers] = useState<DriverLocation[]>(DEFAULT_DRIVER_LOCATIONS);

  // Fetch Wallet and Ledger data
  const loadWalletAndLedger = useCallback(async () => {
    if (!currentRiderId) return;
    setIsLoadingWallet(true);
    setIsLoadingLedger(true);

    try {
      const [walletData, ledgerData] = await Promise.all([
        fetchUserWallet(currentRiderId).catch((e) => {
          console.warn('Cannot fetch wallet:', e);
          return null;
        }),
        fetchWalletLedger(currentRiderId).catch((e) => {
          console.warn('Cannot fetch ledger:', e);
          return [];
        }),
      ]);

      if (walletData) setWallet(walletData);
      if (ledgerData) setLedgerEntries(ledgerData);
    } finally {
      setIsLoadingWallet(false);
      setIsLoadingLedger(false);
    }
  }, [currentRiderId]);

  // Fetch Trips for the logged-in Rider
  const loadRiderTrips = useCallback(async () => {
    if (!currentRiderId) return;
    setIsLoadingTrips(true);
    try {
      const data = await fetchAllTrips({ riderId: currentRiderId });
      if (Array.isArray(data)) {
        setRiderTrips(data);
      }
    } catch (err) {
      console.warn('Lỗi khi tải lịch sử chuyến đi của rider:', err);
    } finally {
      setIsLoadingTrips(false);
    }
  }, [currentRiderId]);

  useEffect(() => {
    loadWalletAndLedger();
    loadRiderTrips();
    fetchDriverLocations().then((locs) => {
      if (locs && locs.length > 0) setAvailableDrivers(locs);
    });
  }, [loadWalletAndLedger, loadRiderTrips]);

  // Real-time WebSocket connection
  const { status } = useSignalR({
    roleName: 'Rider',
    onTripAccepted: (data) => {
      console.log('[RiderPage] Received TripAccepted:', data);
      setAcceptedData(data);
      setRejectedData(null);
      setIsMatching(false);
      setMatchSuccessMessage(null);
      loadRiderTrips();
    },
    onDriverRejected: (data) => {
      console.log('[RiderPage] Received DriverRejected:', data);
      setRejectedData(data);
      setAcceptedData(null);
      setIsMatching(false);
      setMatchSuccessMessage(null);
      loadRiderTrips();
    },
  });

  // Calculate distance & duration
  const calculatedDistance = useMemo(() => {
    return calculateDistanceKm(
      pickupCoords.lat,
      pickupCoords.lng,
      dropoffCoords.lat,
      dropoffCoords.lng
    );
  }, [pickupCoords, dropoffCoords]);

  const estimatedMinutes = useMemo(() => {
    return estimateDurationMinutes(calculatedDistance);
  }, [calculatedDistance]);

  const [roadMetrics, setRoadMetrics] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
  const displayDistance = roadMetrics?.distanceKm ?? calculatedDistance;
  const displayDuration = roadMetrics?.durationMinutes ?? estimatedMinutes;

  const handleRouteCalculated = useCallback((distanceKm: number, durationMinutes: number) => {
    setRoadMetrics((prev) => {
      if (prev && prev.distanceKm === distanceKm && prev.durationMinutes === durationMinutes) {
        return prev;
      }
      return { distanceKm, durationMinutes };
    });
  }, []);

  const pickupProp = useMemo(() => ({
    lat: pickupCoords.lat,
    lng: pickupCoords.lng,
    address: pickupAddress,
  }), [pickupCoords.lat, pickupCoords.lng, pickupAddress]);

  const dropoffProp = useMemo(() => ({
    lat: dropoffCoords.lat,
    lng: dropoffCoords.lng,
    address: dropoffAddress,
  }), [dropoffCoords.lat, dropoffCoords.lng, dropoffAddress]);

  // Presets
  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const route = PRESET_ROUTES[index];
    setPickupAddress(route.pickup);
    setDropoffAddress(route.dropoff);
    setPickupCoords({ lat: route.pickupLat, lng: route.pickupLng });
    setDropoffCoords({ lat: route.dropoffLat, lng: route.dropoffLng });
    setSelectingMode(null);
  };

  // Popular landmarks
  const handleSelectPopularLocation = (loc: PopularLocation, target: 'pickup' | 'dropoff') => {
    setSelectedPresetIndex(null);
    if (target === 'pickup') {
      setPickupCoords({ lat: loc.lat, lng: loc.lng });
      setPickupAddress(loc.address);
    } else {
      setDropoffCoords({ lat: loc.lat, lng: loc.lng });
      setDropoffAddress(loc.address);
    }
    setSelectingMode(null);
  };

  // Map click or drag
  const handleSelectCoordinatesFromMap = async (coords: Coordinates, mode: 'pickup' | 'dropoff') => {
    setSelectedPresetIndex(null);
    setIsGeocoding(true);

    if (mode === 'pickup') {
      setPickupCoords(coords);
      const addr = await reverseGeocode(coords.lat, coords.lng);
      setPickupAddress(addr);
    } else {
      setDropoffCoords(coords);
      const addr = await reverseGeocode(coords.lat, coords.lng);
      setDropoffAddress(addr);
    }

    setIsGeocoding(false);
  };

  const handleApplySelection = () => {
    setSelectingMode(null);
  };

  // Create Trip
  const handleCreateTrip = async () => {
    setErrorMessage(null);
    setMatchSuccessMessage(null);
    setAcceptedData(null);
    setRejectedData(null);
    setIsCreatingTrip(true);

    try {
      const payload: CreateTripRequest = {
        riderId: currentRiderId,
        pickupAddress,
        dropoffAddress,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
        hasToll,
        isRaining,
        promoCode: promoCode.trim() || undefined,
        distanceKm: Number(displayDistance.toFixed(1)),
        estimatedMinutes: Math.max(1, Math.round(displayDuration)),
      };

      const res = await createTrip(payload);
      setCurrentTrip(res);
      setSelectingMode(null);
      loadRiderTrips();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo chuyến đi');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleMatchDriver = async () => {
    if (!currentTrip) return;
    setErrorMessage(null);
    setMatchSuccessMessage(null);
    setRejectedData(null);
    setIsMatching(true);

    try {
      const res = await matchDriver({
        tripId: currentTrip.tripId,
        pickupAddress: currentTrip.pickupAddress,
        dropoffAddress: currentTrip.dropoffAddress,
        riderId: currentRiderId,
      });

      setMatchSuccessMessage(
        `Đã phát tín hiệu tìm tài xế! Hệ thống đã ghép nối với tài xế ${res.fullName || ''}. Đang chờ phản hồi qua WebSocket...`
      );
      loadRiderTrips();
    } catch (err: any) {
      setIsMatching(false);
      setErrorMessage(err.message || 'Không thể tìm tài xế lúc này.');
    }
  };

  const handleCancelTrip = async () => {
    if (!currentTrip) return;
    try {
      await cancelTrip(currentTrip.tripId);
    } catch (e) {
      console.warn('Cancel trip error:', e);
    }
    setCurrentTrip(null);
    setAcceptedData(null);
    setRejectedData(null);
    setMatchSuccessMessage(null);
    loadRiderTrips();
  };

  const formatVND = (val?: number) => {
    if (val === undefined || val === null) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '--:--';
    const date = new Date(iso);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Assigned driver location
  const acceptedDriverLocation = useMemo(() => {
    if (!acceptedData?.driverId) return null;
    const match = availableDrivers.find((d) => d.driverId === acceptedData.driverId);
    if (match) {
      return {
        lat: match.latitude,
        lng: match.longitude,
        name: acceptedData.driverName || match.fullName,
      };
    }
    return {
      lat: pickupCoords.lat + 0.004,
      lng: pickupCoords.lng - 0.003,
      name: acceptedData.driverName || 'Tài xế đã nhận',
    };
  }, [acceptedData, availableDrivers, pickupCoords]);

  // Open detail modal
  const handleOpenDetail = (trip: TripItem) => {
    setSelectedTripForDetail(trip);
    setIsDetailModalOpen(true);
  };

  // Open retry payment modal
  const handleOpenRetryPayment = (trip: TripItem) => {
    setTripToRetryPayment(trip);
    setIsRetryModalOpen(true);
  };

  // Preview trip on map from history
  const handlePreviewTripOnMap = (trip: TripItem) => {
    setPickupCoords({ lat: trip.pickupLat, lng: trip.pickupLng });
    setDropoffCoords({ lat: trip.dropoffLat, lng: trip.dropoffLng });
    setPickupAddress(trip.pickupAddress);
    setDropoffAddress(trip.dropoffAddress);
    setActiveTab('booking');
  };

  // Render Status Badge for Trip in History
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Requested':
        return <span className="badge badge-info">Đang tìm tài xế</span>;
      case 'DriverAccepted':
        return <span className="badge badge-warning">Tài xế đang đến</span>;
      case 'PickedUp':
        return <span className="badge badge-primary" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>Đang chở khách</span>;
      case 'DroppedOff':
        return <span className="badge badge-warning">Đã đến nơi • Chờ TT</span>;
      case 'Completed':
        return <span className="badge badge-success">Hoàn thành</span>;
      case 'PaymentFailed':
        return (
          <span className="badge badge-danger" style={{ fontWeight: 700 }}>
            <AlertCircle size={12} />
            Thanh toán thất bại
          </span>
        );
      case 'Cancelled':
        return <span className="badge badge-neutral">Đã hủy</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="rider-app-wrapper">
      {/* 1. FULL-SCREEN BACKGROUND LEAFLET MAP */}
      <div className="rider-map-canvas">
        <LeafletMap
          pickup={pickupProp}
          dropoff={dropoffProp}
          driver={acceptedDriverLocation}
          selectingMode={selectingMode}
          onSelectCoordinates={handleSelectCoordinatesFromMap}
          onRouteCalculated={handleRouteCalculated}
          height="100%"
          style={{ height: '100%', width: '100%', borderRadius: 0, border: 'none' }}
          interactive={!currentTrip}
        />
      </div>

      {/* 2. FLOATING OVERLAY PANEL (BỐ TRÍ ĐÈ TRÊN BẢN ĐỒ) */}
      <div className={`rider-overlay-panel ${isPanelMinimized ? 'minimized' : ''}`}>
        {/* Panel Top Bar with Client Tabs */}
        <div className="rider-panel-topbar">
          <div className="rider-panel-nav">
            <button
              type="button"
              onClick={() => {
                setActiveTab('booking');
                setIsPanelMinimized(false);
              }}
              className={`rider-nav-btn ${activeTab === 'booking' ? 'active' : ''}`}
            >
              <Navigation size={15} />
              Đặt xe
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                setIsPanelMinimized(false);
                loadRiderTrips();
              }}
              className={`rider-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <History size={15} />
              Lịch sử
              {riderTrips.length > 0 && (
                <span 
                  style={{ 
                    fontSize: '0.65rem', 
                    padding: '0.1rem 0.35rem', 
                    borderRadius: '9999px', 
                    backgroundColor: activeTab === 'history' ? 'var(--primary-subtle)' : '#f1f5f9',
                    color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                >
                  {riderTrips.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('wallet');
                setIsPanelMinimized(false);
                loadWalletAndLedger();
              }}
              className={`rider-nav-btn ${activeTab === 'wallet' ? 'active' : ''}`}
            >
              <WalletIcon size={15} />
              Ví tiền
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Status indicator */}
            <span className={`badge ${status === 'connected' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
              <Radio size={10} className={status === 'connected' ? 'pulse-animation' : ''} />
              {status === 'connected' ? 'Online' : 'Kết nối'}
            </span>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsPanelMinimized(!isPanelMinimized)}
              title={isPanelMinimized ? 'Mở rộng bảng' : 'Thu gọn xem toàn màn hình'}
              className="btn btn-outline"
              style={{ padding: '0.3rem', borderRadius: '8px' }}
            >
              {isPanelMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>

        {/* Panel Scrollable Body */}
        {!isPanelMinimized && (
          <div className="rider-panel-content">
            {/* ======================================================== */}
            {/* TAB 1: BOOKING & JOURNEY FORM (ĐẶT XE)                  */}
            {/* ======================================================== */}
            {activeTab === 'booking' && (
              <>
                {/* Rider mini identity */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '10px', 
                        backgroundColor: 'var(--primary-subtle)', 
                        color: 'var(--primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem'
                      }}
                    >
                      {currentRiderName[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {currentRiderName}
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          Khách hàng
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Ví khả dụng: <strong style={{ color: 'var(--primary)' }}>{formatVND(wallet?.balance)}</strong>
                      </div>
                    </div>
                  </div>

                  {!isAuthenticated && (
                    <button 
                      onClick={openLoginModal} 
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    >
                      Đăng nhập
                    </button>
                  )}
                </div>

                {/* Real-time Driver Accepted Banner */}
                {acceptedData && (
                  <div 
                    style={{ 
                      padding: '0.85rem 1rem', 
                      borderRadius: '12px', 
                      border: '1.5px solid var(--primary)', 
                      backgroundColor: 'var(--primary-subtle)',
                      animation: 'slideUp 0.3s ease-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                        TÀI XẾ ĐÃ NHẬN CHUYẾN!
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Tài xế <strong>{acceptedData.driverName || 'Đối tác SwiftRide'}</strong> đang di chuyển đến điểm đón của bạn.
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Cập nhật qua WebSocket: {new Date(acceptedData.timestamp).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                )}

                {/* Real-time Driver Rejected Banner */}
                {rejectedData && (
                  <div 
                    style={{ 
                      padding: '0.85rem 1rem', 
                      borderRadius: '12px', 
                      border: '1.5px solid var(--accent-rose)', 
                      backgroundColor: 'var(--accent-rose-subtle)',
                      animation: 'slideUp 0.3s ease-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <XCircle size={18} className="text-rose-600" />
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-rose)' }}>
                        Tài xế đã từ chối nhận cuốc
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                      Lý do: {rejectedData.reason || 'Tài xế đang bận việc đột xuất'}
                    </div>
                    <button
                      type="button"
                      onClick={handleMatchDriver}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '0.6rem', fontSize: '0.825rem', padding: '0.45rem' }}
                    >
                      <Search size={14} />
                      Tìm tài xế khác ngay
                    </button>
                  </div>
                )}

                {/* Quick Presets */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.785rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      LỘ TRÌNH GỢI Ý NHANH:
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {PRESET_ROUTES.map((route, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(idx)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: selectedPresetIndex === idx ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                          backgroundColor: selectedPresetIndex === idx ? 'var(--primary-subtle)' : '#ffffff',
                          color: selectedPresetIndex === idx ? 'var(--primary)' : 'var(--text-main)',
                          fontWeight: selectedPresetIndex === idx ? 700 : 500,
                          textAlign: 'left',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {route.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Map Picking Toolbar */}
                <div 
                  style={{ 
                    backgroundColor: 'var(--bg-subtle)', 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border-light)' 
                  }}
                >
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    📍 CHỌN TỌA ĐỘ TRỰC TIẾP TRÊN BẢN ĐỒ:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectingMode(selectingMode === 'pickup' ? null : 'pickup')}
                      className={`btn ${selectingMode === 'pickup' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      <MapPin size={13} className={selectingMode === 'pickup' ? '' : 'text-emerald-600'} />
                      {selectingMode === 'pickup' ? 'Đang chọn ĐÓN...' : 'Ghim Điểm Đón'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectingMode(selectingMode === 'dropoff' ? null : 'dropoff')}
                      className={`btn ${selectingMode === 'dropoff' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.35rem 0.65rem',
                        backgroundColor: selectingMode === 'dropoff' ? '#e11d48' : undefined,
                        borderColor: selectingMode === 'dropoff' ? '#e11d48' : undefined
                      }}
                    >
                      <Crosshair size={13} className={selectingMode === 'dropoff' ? '' : 'text-rose-500'} />
                      {selectingMode === 'dropoff' ? 'Đang chọn ĐẾN...' : 'Ghim Điểm Đến'}
                    </button>

                    {selectingMode && (
                      <button
                        type="button"
                        onClick={handleApplySelection}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: 'var(--primary)' }}
                      >
                        <Check size={13} />
                        Xong
                      </button>
                    )}
                  </div>
                </div>

                {/* Pickup & Dropoff Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.8rem' }}>
                        <MapPin size={13} className="text-emerald-600" />
                        Điểm đón (Pickup):
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isGeocoding && (
                          <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            <RefreshCw size={9} className="pulse-animation" />
                            Đang lấy địa chỉ...
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          [{pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}]
                        </span>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Nhập địa chỉ đón..."
                      style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.8rem' }}>
                        <MapPin size={13} className="text-rose-500" />
                        Điểm đến (Dropoff):
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        [{dropoffCoords.lat.toFixed(4)}, {dropoffCoords.lng.toFixed(4)}]
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      placeholder="Nhập địa chỉ đến..."
                      style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Popular Landmarks Chips */}
                <div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Địa danh phổ biến:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {POPULAR_LOCATIONS.slice(0, 5).map((loc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPopularLocation(loc, selectingMode === 'dropoff' ? 'dropoff' : 'pickup')}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.725rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-light)',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        + {loc.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Route Metrics Preview */}
                <div 
                  style={{ 
                    padding: '0.65rem 0.85rem', 
                    backgroundColor: 'var(--primary-subtle)', 
                    borderRadius: '10px', 
                    border: '1px solid var(--primary-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Khoảng cách</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                      ~{displayDistance.toFixed(1)} km
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Thời gian dự kiến</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      ~{displayDuration} phút
                    </strong>
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {roadMetrics ? '🛣️ Dẫn đường thực tế' : 'GPS'}
                  </span>
                </div>

                {/* Options: Rain, Toll & Promo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label className="form-checkbox" style={{ padding: '0.45rem 0.6rem', fontSize: '0.785rem' }}>
                    <input
                      type="checkbox"
                      checked={isRaining}
                      onChange={(e) => setIsRaining(e.target.checked)}
                    />
                    <CloudRain size={14} className="text-blue-500" />
                    <span>Trời mưa (Surge)</span>
                  </label>

                  <label className="form-checkbox" style={{ padding: '0.45rem 0.6rem', fontSize: '0.785rem' }}>
                    <input
                      type="checkbox"
                      checked={hasToll}
                      onChange={(e) => setHasToll(e.target.checked)}
                    />
                    <ShieldAlert size={14} className="text-amber-500" />
                    <span>Trạm thu phí (+10k)</span>
                  </label>
                </div>

                {/* Promo Code Input */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <Tag size={14} className="text-emerald-600" />
                  <input
                    type="text"
                    className="form-input"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Mã giảm giá (ví dụ: GIAM20)..."
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                  />
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.785rem', marginBottom: '0.35rem' }}>
                    Phương thức thanh toán:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Wallet')}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        border: paymentMethod === 'Wallet' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        backgroundColor: paymentMethod === 'Wallet' ? 'var(--primary-subtle)' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700, color: paymentMethod === 'Wallet' ? 'var(--primary)' : 'var(--text-main)' }}>
                        <WalletIcon size={14} />
                        Ví SwiftRide
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Số dư: {formatVND(wallet?.balance)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Card')}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        border: paymentMethod === 'Card' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        backgroundColor: paymentMethod === 'Card' ? 'var(--primary-subtle)' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700, color: paymentMethod === 'Card' ? 'var(--primary)' : 'var(--text-main)' }}>
                        <CreditCard size={14} />
                        Thẻ quốc tế
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Visa / Mastercard
                      </div>
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div style={{ backgroundColor: 'var(--accent-rose-subtle)', color: 'var(--accent-rose)', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                    {errorMessage}
                  </div>
                )}

                {/* Create Trip Button */}
                <button
                  type="button"
                  onClick={handleCreateTrip}
                  disabled={isCreatingTrip}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                >
                  {isCreatingTrip ? (
                    <>
                      <RefreshCw size={15} className="pulse-animation" />
                      Đang tính giá & tạo chuyến...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Bắt đầu đặt chuyến xe
                    </>
                  )}
                </button>

                {/* Created Trip Card */}
                {currentTrip && (
                  <div 
                    style={{ 
                      padding: '1rem', 
                      borderRadius: '12px', 
                      backgroundColor: '#ffffff', 
                      border: '1.5px solid var(--primary-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MÃ CHUYẾN XE</span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
                          #{currentTrip.tripId.slice(0, 8)}
                        </div>
                      </div>

                      <span className="badge badge-info">
                        {isMatching ? 'Đang tìm tài xế...' : currentTrip.status || 'Chờ tìm tài xế'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem', backgroundColor: 'var(--primary-subtle)', borderRadius: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CƯỚC DỰ KIẾN</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                          {formatVND(currentTrip.pricing?.finalTotal || currentTrip.estimatedFare)}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsPriceModalOpen(true)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: 'var(--primary)' }}
                      >
                        <Receipt size={13} />
                        Chi tiết giá
                      </button>
                    </div>

                    {!acceptedData && (
                      <button
                        type="button"
                        onClick={handleMatchDriver}
                        disabled={isMatching}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.7rem', fontSize: '0.875rem' }}
                      >
                        {isMatching ? (
                          <>
                            <RefreshCw size={15} className="pulse-animation" />
                            Đang tìm tài xế gần nhất...
                          </>
                        ) : (
                          <>
                            <Search size={15} />
                            Tìm tài xế ngay
                          </>
                        )}
                      </button>
                    )}

                    {/* Nút hủy cuốc xe */}
                    <button
                      type="button"
                      onClick={handleCancelTrip}
                      className="btn btn-outline"
                      style={{ 
                        width: '100%', 
                        padding: '0.55rem', 
                        fontSize: '0.8rem', 
                        color: 'var(--accent-rose)', 
                        borderColor: '#fca5a5' 
                      }}
                    >
                      <XCircle size={14} />
                      Hủy cuốc xe này
                    </button>

                    {matchSuccessMessage && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={15} />
                        {matchSuccessMessage}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 2: TRIP HISTORY OF USER (LỊCH SỬ CHUYẾN ĐI)           */}
            {/* ======================================================== */}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      Lịch sử chuyến đi
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Tất cả chuyến xe của bạn trên SwiftRide
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={loadRiderTrips}
                    disabled={isLoadingTrips}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    title="Tải lại danh sách chuyến đi"
                  >
                    <RefreshCw size={12} className={isLoadingTrips ? 'animate-spin' : ''} />
                    Làm mới
                  </button>
                </div>

                {isLoadingTrips ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                    Đang tải lịch sử chuyến đi...
                  </div>
                ) : riderTrips.length === 0 ? (
                  <div 
                    style={{ 
                      textAlign: 'center', 
                      padding: '2.5rem 1rem', 
                      backgroundColor: 'var(--bg-subtle)', 
                      borderRadius: '14px',
                      color: 'var(--text-muted)' 
                    }}
                  >
                    <Navigation size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                      Chưa có chuyến đi nào
                    </p>
                    <span style={{ fontSize: '0.785rem' }}>
                      Hãy chuyển sang tab <strong>Đặt xe</strong> để trải nghiệm chuyến đi đầu tiên!
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {riderTrips.map((trip) => {
                      const isFailed = trip.status === 'PaymentFailed';
                      const fare = trip.finalFare || trip.estimatedFare;
                      const failureReason = trip.paymentFailureReason || trip.reason;

                      return (
                        <div
                          key={trip.id}
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '14px',
                            backgroundColor: '#ffffff',
                            border: isFailed ? '1.5px solid #fecdd3' : '1px solid var(--border-light)',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem'
                          }}
                        >
                          {/* Trip item header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                              {formatDateTime(trip.createdAt)}
                            </span>
                            {renderStatusBadge(trip.status)}
                          </div>

                          {/* Addresses */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                              <MapPin size={13} className="text-emerald-600" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {trip.pickupAddress}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                              <MapPin size={13} className="text-rose-500" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {trip.dropoffAddress}
                              </span>
                            </div>
                          </div>

                          {/* Fare & Distance */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px dashed var(--border-light)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {trip.distanceKm ? `~${trip.distanceKm.toFixed(1)} km` : ''}
                            </div>
                            <strong style={{ fontSize: '1rem', color: isFailed ? 'var(--accent-rose)' : 'var(--primary)' }}>
                              {formatVND(fare)}
                            </strong>
                          </div>

                          {/* Payment Failure Reason Banner if failed */}
                          {isFailed && (
                            <div 
                              style={{ 
                                padding: '0.5rem 0.75rem', 
                                backgroundColor: 'var(--accent-rose-subtle)', 
                                border: '1px solid #fecdd3', 
                                borderRadius: '8px', 
                                color: 'var(--accent-rose)', 
                                fontSize: '0.75rem',
                                lineHeight: 1.4
                              }}
                            >
                              <strong>Lý do thất bại:</strong> {failureReason || 'Lỗi khi xử lý số dư hoặc cổng thanh toán'}
                            </div>
                          )}

                          {/* Action Buttons: Retry Payment & View Details */}
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                            {isFailed && (
                              <button
                                type="button"
                                onClick={() => handleOpenRetryPayment(trip)}
                                className="btn btn-primary"
                                style={{ 
                                  flex: 1, 
                                  fontSize: '0.785rem', 
                                  padding: '0.45rem',
                                  backgroundColor: 'var(--accent-rose)',
                                  borderColor: 'var(--accent-rose)'
                                }}
                              >
                                <CreditCard size={13} />
                                Thanh toán lại
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(trip)}
                              className="btn btn-outline"
                              style={{ flex: 1, fontSize: '0.785rem', padding: '0.45rem' }}
                            >
                              <Eye size={13} />
                              Xem chi tiết
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePreviewTripOnMap(trip)}
                              title="Hiện lộ trình lên Map"
                              className="btn btn-outline"
                              style={{ padding: '0.45rem', fontSize: '0.785rem' }}
                            >
                              <Layers size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: WALLET & TRANSACTION LEDGER (VÍ TIỀN & NẠP TIỀN) */}
            {/* ======================================================== */}
            {activeTab === 'wallet' && (
              <WalletSection
                userId={currentRiderId}
                wallet={wallet}
                ledgerEntries={ledgerEntries}
                isLoadingWallet={isLoadingWallet}
                isLoadingLedger={isLoadingLedger}
                onRefresh={loadWalletAndLedger}
                onWalletUpdated={(updated) => setWallet(updated)}
              />
            )}
          </div>
        )}
      </div>

      {/* Pricing Breakdown Modal */}
      <PriceBreakdownModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        pricing={currentTrip?.pricing}
        estimatedFare={currentTrip?.estimatedFare}
        distanceKm={currentTrip?.distanceKm || displayDistance}
      />

      {/* Trip Detail Modal */}
      <TripDetailModal
        isOpen={isDetailModalOpen}
        trip={selectedTripForDetail}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTripForDetail(null);
        }}
        onRetryPayment={(trip) => {
          setIsDetailModalOpen(false);
          handleOpenRetryPayment(trip);
        }}
      />

      {/* Retry Payment Modal */}
      <RetryPaymentModal
        isOpen={isRetryModalOpen}
        trip={tripToRetryPayment}
        wallet={wallet}
        onClose={() => {
          setIsRetryModalOpen(false);
          setTripToRetryPayment(null);
        }}
        onSuccess={() => {
          loadRiderTrips();
          loadWalletAndLedger();
        }}
        onOpenWalletTab={() => {
          setActiveTab('wallet');
        }}
      />
    </div>
  );
};
