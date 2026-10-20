import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../hooks/useSignalR';
import { PriceBreakdownModal } from '../components/PriceBreakdownModal';
import { WalletSection } from '../components/WalletSection';
import { 
  createTrip, 
  matchDriver, 
  fetchUserWallet,
  fetchWalletLedger,
  type CreateTripRequest 
} from '../services/api';
import type { 
  TripCreatedResponse, 
  TripAcceptedData, 
  DriverRejectedData,
  Wallet,
  LedgerEntry
} from '../types';
import { 
  Navigation, 
  MapPin, 
  CloudRain, 
  ShieldAlert, 
  Car, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Receipt, 
  RefreshCw,
  ExternalLink,
  Tag,
  Wallet as WalletIcon,
  CreditCard
} from 'lucide-react';


const PRESET_ROUTES = [
  {
    name: 'Chợ Bến Thành ➔ Landmark 81',
    pickup: 'Chợ Bến Thành, Quận 1, TP.HCM',
    dropoff: 'Landmark 81, Bình Thạnh, TP.HCM',
    pickupLat: 10.7725,
    pickupLng: 106.6980,
    dropoffLat: 10.7950,
    dropoffLng: 106.7218,
  },
  {
    name: 'Sân bay Tân Sơn Nhất ➔ Bitexco Tower',
    pickup: 'Sân bay Tân Sơn Nhất, Tân Bình',
    dropoff: 'Tòa nhà Bitexco, Quận 1',
    pickupLat: 10.8185,
    pickupLng: 106.6588,
    dropoffLat: 10.7716,
    dropoffLng: 106.7044,
  },
  {
    name: 'Đại Học Sài Gòn (SGU) ➔ Phố đi bộ Nguyễn Huệ',
    pickup: '273 An Dương Vương, Phường 3, Quận 5',
    dropoff: 'Phố đi bộ Nguyễn Huệ, Quận 1',
    pickupLat: 10.7599,
    pickupLng: 106.6823,
    dropoffLat: 10.7745,
    dropoffLng: 106.7032,
  },
];

export const RiderPage: React.FC = () => {
  const { user, isAuthenticated, openLoginModal } = useAuth();

  // Active rider info (uses logged-in user or fallback guest)
  const currentRiderId = user?.id || 'c0a80123-4567-89ab-cdef-0123456789ab';
  const currentRiderName = user?.fullName || user?.userName || 'Nguyễn Văn An (Khách hàng)';
  const currentRiderEmail = user?.email || 'rider@swiftride.com';

  // Trip and matching state
  const [currentTrip, setCurrentTrip] = useState<TripCreatedResponse | null>(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [acceptedData, setAcceptedData] = useState<TripAcceptedData | null>(null);
  const [rejectedData, setRejectedData] = useState<DriverRejectedData | null>(null);

  // Form states
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [pickupAddress, setPickupAddress] = useState<string>(PRESET_ROUTES[0].pickup);
  const [dropoffAddress, setDropoffAddress] = useState<string>(PRESET_ROUTES[0].dropoff);
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
        })
      ]);

      if (walletData) setWallet(walletData);
      if (ledgerData) setLedgerEntries(ledgerData);
    } finally {
      setIsLoadingWallet(false);
      setIsLoadingLedger(false);
    }
  }, [currentRiderId]);

  useEffect(() => {
    loadWalletAndLedger();
  }, [loadWalletAndLedger]);


  // Real-time WebSocket connection (without raw logs)
  const { status } = useSignalR({
    roleName: 'Rider',
    onTripAccepted: (data) => {
      console.log('[RiderPage] Received TripAccepted:', data);
      setAcceptedData(data);
      setRejectedData(null);
      setIsMatching(false);
      setMatchSuccessMessage(null);
    },
    onDriverRejected: (data) => {
      console.log('[RiderPage] Received DriverRejected:', data);
      setRejectedData(data);
      setAcceptedData(null);
      setIsMatching(false);
      setMatchSuccessMessage(null);
    },
  });

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setPickupAddress(PRESET_ROUTES[index].pickup);
    setDropoffAddress(PRESET_ROUTES[index].dropoff);
  };

  const handleCreateTrip = async () => {
    setErrorMessage(null);
    setMatchSuccessMessage(null);
    setAcceptedData(null);
    setRejectedData(null);
    setIsCreatingTrip(true);

    try {
      const preset = PRESET_ROUTES[selectedPresetIndex];
      const payload: CreateTripRequest = {
        riderId: currentRiderId,
        pickupAddress,
        dropoffAddress,
        pickupLat: preset.pickupLat,
        pickupLng: preset.pickupLng,
        dropoffLat: preset.dropoffLat,
        dropoffLng: preset.dropoffLng,
        hasToll,
        isRaining,
        promoCode: promoCode.trim() || undefined,
      };

      const res = await createTrip(payload);
      setCurrentTrip(res);
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

      setMatchSuccessMessage(`Đã phát tín hiệu tìm tài xế! Hệ thống đã ghép nối với tài xế ${res.fullName || ''}. Đang chờ phản hồi...`);
    } catch (err: any) {
      setIsMatching(false);
      setErrorMessage(err.message || 'Không thể tìm tài xế lúc này.');
    }
  };

  const formatVND = (val?: number) => {
    if (!val) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3.5rem' }}>
      {/* Top Banner & Quick Portal Switcher */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '1rem',
          marginBottom: '1.75rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Đặt Chuyến Đi
            </h1>
            <span className={`badge ${status === 'connected' ? 'badge-success' : 'badge-warning'}`}>
              <Radio size={12} className={status === 'connected' ? 'pulse-animation' : ''} />
              {status === 'connected' ? 'Trực tuyến' : 'Đang kết nối'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Cổng hành khách SwiftRide • Tạo chuyến xe và cập nhật hành trình thời gian thực
          </p>
        </div>

        <Link 
          to="/driver" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{ fontSize: '0.85rem' }}
        >
          <Car size={16} />
          Mở Cổng Tài xế (Driver Portal) ở Tab mới
          <ExternalLink size={14} />
        </Link>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        {/* Left Column: Rider Profile & Booking Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Rider Profile Card - Only displays this current rider */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div 
                  style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '12px', 
                    backgroundColor: 'var(--primary-subtle)', 
                    color: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem'
                  }}
                >
                  {currentRiderName[0]}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {currentRiderName}
                    </h3>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                      Rider
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {currentRiderEmail} • ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{currentRiderId.slice(0, 8)}...</code>
                  </div>
                </div>
              </div>

              {!isAuthenticated && (
                <button 
                  onClick={openLoginModal} 
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  Đăng nhập tài khoản khác
                </button>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Navigation size={18} className="text-emerald-600" />
              Lựa chọn hành trình di chuyển
            </h3>

            {/* Quick Route Presets */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Chọn nhanh lộ trình mẫu phổ biến:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {PRESET_ROUTES.map((route, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: selectedPresetIndex === idx ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                      backgroundColor: selectedPresetIndex === idx ? 'var(--primary-subtle)' : '#ffffff',
                      color: selectedPresetIndex === idx ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: selectedPresetIndex === idx ? 700 : 500,
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {route.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Pickup & Dropoff Inputs */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} className="text-emerald-600" />
                Điểm đón (Pickup):
              </label>
              <input
                type="text"
                className="form-input"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Nhập địa chỉ đón..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} className="text-rose-500" />
                Điểm đến (Dropoff):
              </label>
              <input
                type="text"
                className="form-input"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder="Nhập địa chỉ đến..."
              />
            </div>

            {/* Weather, Toll & Promo Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={isRaining}
                  onChange={(e) => setIsRaining(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CloudRain size={16} className="text-blue-500" />
                  Trời mưa (Surge x1.2)
                </span>
              </label>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={hasToll}
                  onChange={(e) => setHasToll(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldAlert size={16} className="text-amber-500" />
                  Có trạm thu phí (+15k)
                </span>
              </label>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Tag size={14} className="text-emerald-600" />
                Mã giảm giá (ví dụ: GIAM20):
              </label>
              <input
                type="text"
                className="form-input"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Nhập mã voucher nếu có..."
              />
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <WalletIcon size={14} className="text-emerald-600" />
                Phương thức thanh toán chuyến đi:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Wallet')}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '10px',
                    border: paymentMethod === 'Wallet' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    backgroundColor: paymentMethod === 'Wallet' ? 'var(--primary-subtle)' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.2rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: paymentMethod === 'Wallet' ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.85rem' }}>
                    <WalletIcon size={15} />
                    Ví SwiftRide
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Số dư: <strong style={{ color: paymentMethod === 'Wallet' ? 'var(--primary)' : 'var(--text-main)' }}>{formatVND(wallet?.balance)}</strong>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '10px',
                    border: paymentMethod === 'Card' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    backgroundColor: paymentMethod === 'Card' ? 'var(--primary-subtle)' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.2rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: paymentMethod === 'Card' ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.85rem' }}>
                    <CreditCard size={15} />
                    Thẻ quốc tế
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Visa / Mastercard
                  </div>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div 
                style={{ 
                  backgroundColor: 'var(--accent-rose-subtle)', 
                  color: 'var(--accent-rose)', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '10px', 
                  marginBottom: '1rem',
                  fontSize: '0.85rem'
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleCreateTrip}
              disabled={isCreatingTrip}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              {isCreatingTrip ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Đang tính giá & tạo chuyến...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Bắt đầu tạo chuyến đi
                </>
              )}
            </button>
          </div>

          {/* Wallet Section (Hiển thị số tiền ví, ledger và cho phép nạp tiền khi thanh toán bằng ví) */}
          {paymentMethod === 'Wallet' && (
            <WalletSection
              userId={currentRiderId}
              wallet={wallet}
              ledgerEntries={ledgerEntries}
              isLoadingWallet={isLoadingWallet}
              isLoadingLedger={isLoadingLedger}
              estimatedFare={currentTrip?.pricing?.finalTotal || currentTrip?.estimatedFare}
              onRefresh={loadWalletAndLedger}
              onWalletUpdated={(updated) => setWallet(updated)}
            />
          )}

          {paymentMethod === 'Card' && (
            <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <CreditCard size={20} className="text-blue-600" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Thanh toán qua Thẻ Quốc Tế
                </h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Cổng thanh toán tự động khấu trừ qua tài khoản ngân hàng hoặc thẻ tín dụng khi tài xế hoàn tất chuyến đi (Drop-off).
              </p>
            </div>
          )}
        </div>


        {/* Right Column: Trip Info, Price Breakdown & Real-time Matching State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {currentTrip ? (
            <div className="card" style={{ border: '1.5px solid var(--primary-border)' }}>
              {/* Trip Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>MÃ CHUYẾN XE</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    #{currentTrip.tripId.slice(0, 8)}
                  </div>
                </div>

                {rejectedData ? (
                  <span className="badge badge-danger">
                    Tài xế đã từ chối
                  </span>
                ) : acceptedData ? (
                  <span className="badge badge-success">
                    Tài xế đã nhận cuốc
                  </span>
                ) : (
                  <span className="badge badge-info">
                    {isMatching ? 'Đang tìm tài xế...' : currentTrip.status || 'Chờ tìm tài xế'}
                  </span>
                )}
              </div>

              {/* Route Display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm đón:</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{currentTrip.pickupAddress}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--accent-rose)', marginTop: '4px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm đến:</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{currentTrip.dropoffAddress}</span>
                  </div>
                </div>
              </div>

              {/* Trip Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Khoảng cách</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{currentTrip.distanceKm ? `${currentTrip.distanceKm.toFixed(1)} km` : '~5.0 km'}</span>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Thời gian ước tính</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {currentTrip.pricing?.estimatedMinutes ? `~${currentTrip.pricing.estimatedMinutes} phút` : '~15 phút'}
                  </span>
                </div>
              </div>

              {/* Price Section with "Xem chi tiết giá" button as requested */}
              <div 
                style={{ 
                  backgroundColor: 'var(--primary-subtle)', 
                  border: '1px solid var(--primary-border)', 
                  borderRadius: '12px', 
                  padding: '1rem', 
                  marginBottom: '1.25rem' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      TỔNG TIỀN CƯỚC DỰ KIẾN
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formatVND(currentTrip.pricing?.finalTotal || currentTrip.estimatedFare)}
                    </div>
                  </div>

                  {/* The requested "Xem chi tiết" button */}
                  <button
                    type="button"
                    onClick={() => setIsPriceModalOpen(true)}
                    className="btn btn-outline"
                    style={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: 'var(--primary-border)', 
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.8rem'
                    }}
                  >
                    <Receipt size={15} />
                    Xem chi tiết giá
                  </button>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Đã bao gồm thuế VAT và phụ phí tính toán trực tiếp từ Backend Pricing Engine.
                </div>

                {paymentMethod === 'Wallet' ? (
                  <div 
                    style={{ 
                      marginTop: '0.75rem', 
                      paddingTop: '0.65rem', 
                      borderTop: '1px dashed var(--primary-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.785rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <WalletIcon size={14} className="text-emerald-600" />
                      Ví SwiftRide (Số dư: <strong>{formatVND(wallet?.balance)}</strong>)
                    </span>
                    {(wallet?.balance ?? 0) >= (currentTrip.pricing?.finalTotal || currentTrip.estimatedFare || 0) ? (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        Đủ số dư
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                        Cần nạp thêm
                      </span>
                    )}
                  </div>
                ) : (
                  <div 
                    style={{ 
                      marginTop: '0.75rem', 
                      paddingTop: '0.65rem', 
                      borderTop: '1px dashed var(--primary-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.785rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CreditCard size={14} className="text-blue-600" />
                      Phương thức: Thẻ quốc tế
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                      Thanh toán khi tới nơi
                    </span>
                  </div>
                )}
              </div>

              {/* Action: Match Driver Button */}
              {!acceptedData && (
                <button
                  type="button"
                  onClick={handleMatchDriver}
                  disabled={isMatching}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                >
                  {isMatching ? (
                    <>
                      <Search size={16} className="animate-spin" />
                      Đang tìm kiếm tài xế gần bạn nhất...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      {rejectedData ? 'Tìm tài xế khác ngay' : 'Tìm tài xế ngay'}
                    </>
                  )}
                </button>
              )}

              {matchSuccessMessage && !acceptedData && !rejectedData && (
                <div 
                  style={{ 
                    marginTop: '1rem', 
                    padding: '0.85rem', 
                    backgroundColor: 'var(--primary-subtle)', 
                    border: '1px solid var(--primary-border)',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Search size={16} className="pulse-animation" />
                  <span>{matchSuccessMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="card" 
              style={{ 
                textAlign: 'center', 
                padding: '3.5rem 1.5rem',
                border: '1.5px dashed var(--border-light)',
                backgroundColor: '#ffffff'
              }}
            >
              <div 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '16px', 
                  backgroundColor: 'var(--bg-subtle)', 
                  color: 'var(--text-dim)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}
              >
                <Car size={28} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Chưa có chuyến đi nào được tạo
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '320px', margin: '0 auto' }}>
                Vui lòng chọn lộ trình ở cột bên trái và bấm <strong>"Bắt đầu tạo chuyến đi"</strong> để xem bảng giá và tìm tài xế.
              </p>
            </div>
          )}

          {/* Real-time State: Driver Accepted Event Card */}
          {acceptedData && (
            <div 
              className="card" 
              style={{ 
                border: '2px solid var(--primary)', 
                backgroundColor: 'var(--primary-subtle)',
                animation: 'slideUp 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div 
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--primary)', 
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Tài xế đã nhận chuyến xe của bạn!
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Sự kiện xác nhận qua WebSocket • Chuyến #{acceptedData.tripId.slice(0, 8)}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid var(--primary-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tài xế đón bạn</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      {acceptedData.driverName || 'Tài xế công nghệ'}
                    </strong>
                  </div>
                  <span className="badge badge-success">
                    Đang di chuyển đến điểm đón
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Real-time State: Driver Rejected Event Card */}
          {rejectedData && (
            <div 
              className="card" 
              style={{ 
                border: '2px solid var(--accent-rose)', 
                backgroundColor: 'var(--accent-rose-subtle)',
                animation: 'slideUp 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div 
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--accent-rose)', 
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                    Tài xế đã từ chối nhận cuốc
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Lý do: {rejectedData.reason || 'Tài xế đang bận việc đột xuất'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMatchDriver}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                <Search size={16} />
                Tìm tài xế khác ngay
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Breakdown Modal */}
      <PriceBreakdownModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        pricing={currentTrip?.pricing}
        estimatedFare={currentTrip?.estimatedFare}
        distanceKm={currentTrip?.distanceKm}
      />
    </div>
  );
};
