import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSignalR } from '../hooks/useSignalR';
import { 
  fetchDrivers, 
  fetchDriverLocations,
  fetchAllTrips,
  acceptTrip, 
  rejectTrip, 
  pickupTrip,
  dropoffTrip,
  DEFAULT_DRIVERS 
} from '../services/api';
import type { 
  User, 
  DriverFoundData,
  DriverLocation,
  TripItem
} from '../types';
import { 
  Car, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  AlertCircle,
  ExternalLink,
  BellRing,
  Navigation,
  CreditCard,
  Wallet,
  RefreshCw,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';

export const DriverPage: React.FC = () => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'drivers' | 'trips'>('drivers');

  // Drivers State
  const [drivers, setDrivers] = useState<User[]>(DEFAULT_DRIVERS);
  const [driverLocations, setDriverLocations] = useState<Record<string, DriverLocation>>({});
  const [selectedDriverId, setSelectedDriverId] = useState<string>(DEFAULT_DRIVERS[0]?.id || '');
  const [incomingTrip, setIncomingTrip] = useState<DriverFoundData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'rejected' | 'error';
    message: string;
  } | null>(null);

  // Trips Tab State
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterByDriver, setFilterByDriver] = useState<boolean>(false);
  const [pickupProcessingId, setPickupProcessingId] = useState<string | null>(null);

  // Dropoff Modal State
  const [dropoffModalTrip, setDropoffModalTrip] = useState<TripItem | null>(null);
  const [dropoffPaymentMethod, setDropoffPaymentMethod] = useState<number>(0); // 0 = Wallet, 1 = Card
  const [dropoffGatewayToken, setDropoffGatewayToken] = useState<string>('');
  const [isSubmittingDropoff, setIsSubmittingDropoff] = useState<boolean>(false);
  const [dropoffError, setDropoffError] = useState<string | null>(null);

  // Independent WebSocket connection for Driver Portal
  const { status } = useSignalR({
    roleName: 'Driver',
    onDriverFound: (data) => {
      console.log('Driver Page received DriverFound event via WebSocket:', data);
      setIncomingTrip(data);
      setActionStatus(null);
    },
  });

  // Load Drivers and their live locations
  const loadDriversData = async () => {
    try {
      const [userList, locations] = await Promise.all([
        fetchDrivers(),
        fetchDriverLocations().catch(() => [])
      ]);

      if (userList && userList.length > 0) {
        setDrivers(userList);
        if (!selectedDriverId) {
          setSelectedDriverId(userList[0].id);
        }
      }

      if (locations && locations.length > 0) {
        const locMap: Record<string, DriverLocation> = {};
        locations.forEach((loc) => {
          locMap[loc.driverId] = loc;
        });
        setDriverLocations(locMap);
      }
    } catch (err) {
      console.warn('Error loading driver data:', err);
    }
  };

  // Load Trips from Trip.API
  const loadTrips = async () => {
    setIsLoadingTrips(true);
    try {
      const data = await fetchAllTrips();
      if (Array.isArray(data)) {
        setTrips(data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách chuyến đi:', err);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  useEffect(() => {
    loadDriversData();
    loadTrips();
  }, []);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  // Handle Accept Trip
  const handleAccept = async () => {
    if (!incomingTrip) return;
    setIsProcessing(true);
    setActionStatus(null);

    try {
      const driverId = selectedDriver?.id || incomingTrip.driverId;
      await acceptTrip(incomingTrip.tripId, driverId);

      setActionStatus({
        type: 'success',
        message: 'Bạn đã CHẤP NHẬN chuyến xe thành công! Chuyến đi đã được đưa vào Tab "Chuyến đi (Trips)".',
      });
      setIncomingTrip(null);
      // Reload trips to show updated status
      loadTrips();
    } catch (err: any) {
      setActionStatus({
        type: 'error',
        message: err.message || 'Lỗi khi chấp nhận chuyến xe.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Reject Trip
  const handleReject = async () => {
    if (!incomingTrip) return;
    setIsProcessing(true);
    setActionStatus(null);

    try {
      const driverId = selectedDriver?.id || incomingTrip.driverId;
      await rejectTrip(incomingTrip.tripId, driverId);

      setActionStatus({
        type: 'rejected',
        message: 'Bạn đã TỪ CHỐI chuyến xe. Hệ thống đã chuyển yêu cầu tìm tài xế khác.',
      });
      setIncomingTrip(null);
      loadTrips();
    } catch (err: any) {
      setActionStatus({
        type: 'error',
        message: err.message || 'Lỗi khi từ chối chuyến xe.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Pickup Action
  const handlePickup = async (tripId: string) => {
    setPickupProcessingId(tripId);
    setActionStatus(null);
    try {
      await pickupTrip(tripId);
      setActionStatus({
        type: 'success',
        message: `Đã cập nhật trạng thái: Tài xế ĐÃ ĐÓN KHÁCH (Mã #${tripId.slice(0, 8)})!`,
      });
      // Optimistic update
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status: 'PickedUp' } : t))
      );
      loadTrips();
    } catch (err: any) {
      setActionStatus({
        type: 'error',
        message: err.message || 'Lỗi khi thực hiện đón khách.',
      });
    } finally {
      setPickupProcessingId(null);
    }
  };

  // Open Dropoff Modal
  const openDropoffModal = (trip: TripItem) => {
    setDropoffModalTrip(trip);
    setDropoffPaymentMethod(0); // Default Wallet
    setDropoffGatewayToken('');
    setDropoffError(null);
  };

  // Close Dropoff Modal
  const closeDropoffModal = () => {
    if (isSubmittingDropoff) return;
    setDropoffModalTrip(null);
    setDropoffError(null);
  };

  // Handle Dropoff Submit
  const handleConfirmDropoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropoffModalTrip) return;

    if (dropoffPaymentMethod === 1 && !dropoffGatewayToken.trim()) {
      setDropoffError('Vui lòng nhập Gateway Token cho thanh toán qua Thẻ (tối đa 128 ký tự).');
      return;
    }

    setIsSubmittingDropoff(true);
    setDropoffError(null);

    try {
      await dropoffTrip(dropoffModalTrip.id, {
        paymentMethod: dropoffPaymentMethod,
        gatewayToken: dropoffGatewayToken.trim() || undefined,
      });

      setActionStatus({
        type: 'success',
        message: `Đã TRẢ KHÁCH thành công (Mã #${dropoffModalTrip.id.slice(0, 8)})! Yêu cầu thanh toán đã được gửi tới hệ thống.`,
      });

      // Update state locally
      setTrips((prev) =>
        prev.map((t) => (t.id === dropoffModalTrip.id ? { ...t, status: 'DroppedOff' } : t))
      );

      setDropoffModalTrip(null);
      loadTrips();
    } catch (err: any) {
      setDropoffError(err.message || 'Lỗi khi thực hiện trả khách.');
    } finally {
      setIsSubmittingDropoff(false);
    }
  };

  const formatVND = (val?: number) => {
    if (!val) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Requested':
        return <span className="badge badge-warning">Đang tìm tài xế</span>;
      case 'DriverAccepted':
        return <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Tài xế đã nhận</span>;
      case 'PickedUp':
        return <span className="badge" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>Đang chở khách</span>;
      case 'DroppedOff':
        return <span className="badge" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>Đã trả khách</span>;
      case 'Completed':
        return <span className="badge badge-success">Hoàn thành</span>;
      case 'DriverRejected':
        return <span className="badge" style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>Tài xế từ chối</span>;
      case 'PaymentFailed':
        return <span className="badge" style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>Lỗi thanh toán</span>;
      case 'Cancelled':
        return <span className="badge badge-neutral">Đã hủy</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  // Filtered trips list
  const filteredTrips = trips.filter((t) => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterByDriver && t.driverId !== selectedDriverId) return false;
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3.5rem' }}>
      {/* Top Header */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Cổng Tài Xế (Driver Portal)
            </h1>
            <span className={`badge ${status === 'connected' ? 'badge-success' : 'badge-warning'}`}>
              <Radio size={12} className={status === 'connected' ? 'pulse-animation' : ''} />
              {status === 'connected' ? 'WebSocket Sẵn sàng' : 'Đang kết nối'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Kênh tiếp nhận và quản lý các cuốc xe theo thời gian thực • Kết nối trực tiếp SignalR
          </p>
        </div>

        <Link 
          to="/rider" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{ fontSize: '0.85rem' }}
        >
          <UserCheck size={16} />
          Mở Trang Khách (Rider) Tab Mới
          <ExternalLink size={14} />
        </Link>
      </div>

      {/* Tab Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="tab-group">
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            <Car size={16} />
            Danh sách Tài xế (Drivers)
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
              {drivers.length}
            </span>
          </button>

          <button 
            type="button"
            className={`tab-btn ${activeTab === 'trips' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('trips');
              loadTrips();
            }}
          >
            <Navigation size={16} />
            Quản lý Chuyến đi (Trips)
            <span 
              className="badge" 
              style={{ 
                fontSize: '0.7rem', 
                padding: '0.1rem 0.4rem', 
                backgroundColor: activeTab === 'trips' ? 'var(--primary-subtle)' : 'var(--bg-hover)',
                color: activeTab === 'trips' ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              {trips.length}
            </span>
          </button>
        </div>

        {activeTab === 'trips' && (
          <button 
            type="button" 
            onClick={loadTrips}
            disabled={isLoadingTrips}
            className="btn btn-outline" 
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={14} className={isLoadingTrips ? 'pulse-animation' : ''} />
            Làm mới danh sách
          </button>
        )}
      </div>

      {/* Global Action Notifications Banner */}
      {actionStatus && (
        <div 
          style={{ 
            padding: '0.9rem 1.15rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem',
            border: actionStatus.type === 'success' 
              ? '1px solid var(--primary-border)' 
              : actionStatus.type === 'rejected' 
              ? '1px solid #fde68a' 
              : '1px solid #fecdd3',
            backgroundColor: actionStatus.type === 'success' 
              ? 'var(--primary-subtle)' 
              : actionStatus.type === 'rejected' 
              ? 'var(--accent-amber-subtle)' 
              : 'var(--accent-rose-subtle)',
            color: actionStatus.type === 'success' 
              ? 'var(--primary)' 
              : actionStatus.type === 'rejected' 
              ? 'var(--accent-amber)' 
              : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'slideUp 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {actionStatus.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : actionStatus.type === 'rejected' ? (
              <AlertCircle size={18} />
            ) : (
              <XCircle size={18} />
            )}
            <span>{actionStatus.message}</span>
          </div>

          <button 
            type="button"
            onClick={() => setActionStatus(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: DRIVERS LIST & LIVE RIDE INCOMING RECEIVER        */}
      {/* ======================================================== */}
      {activeTab === 'drivers' && (
        <div className="grid-2" style={{ alignItems: 'flex-start' }}>
          {/* Left Column: Driver Selection List */}
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Car size={18} className="text-emerald-600" />
                  Danh sách đối tác tài xế
                </h3>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  {drivers.length} tài xế
                </span>
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Chọn tài xế đang trực ca để kiểm thử nhận cuốc và xử lý chuyến đi:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {drivers.map((driver) => {
                  const isSelected = driver.id === selectedDriverId;
                  const loc = driverLocations[driver.id];
                  const isAvail = loc ? loc.isAvailable : true;

                  return (
                    <div
                      key={driver.id}
                      onClick={() => setSelectedDriverId(driver.id)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        backgroundColor: isSelected ? 'var(--primary-subtle)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div 
                          style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '10px', 
                            backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-subtle)', 
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                          }}
                        >
                          {driver.fullName ? driver.fullName[0] : driver.userName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                            {driver.fullName || driver.userName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {driver.email}
                          </div>
                          {loc && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={10} />
                              {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${isSelected ? 'badge-success' : isAvail ? 'badge-neutral' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {isSelected ? 'Đang chọn' : isAvail ? 'Trực tuyến' : 'Bận'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Real-time Incoming Ride Proposal & Action Handlers */}
          <div>
            {incomingTrip ? (
              <div 
                className="card" 
                style={{ 
                  border: '2px solid var(--primary)', 
                  boxShadow: 'var(--shadow-lg)',
                  animation: 'slideUp 0.3s ease-out'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div 
                      style={{ 
                        width: '34px', 
                        height: '34px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--primary-subtle)', 
                        color: 'var(--primary)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center'
                      }}
                    >
                      <BellRing size={18} className="pulse-animation" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                        CÓ CHUYẾN XE MỚI CẦN ĐÓN!
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Mã chuyến #{incomingTrip.tripId.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-warning">
                    Đang chờ phản hồi
                  </span>
                </div>

                {/* Route */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm đón khách:</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{incomingTrip.pickupAddress}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--accent-rose)', marginTop: '4px', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm trả khách:</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{incomingTrip.dropoffAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Earnings & Distance */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--primary-subtle)', borderRadius: '10px', border: '1px solid var(--primary-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CƯỚC THU NHẬP</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formatVND(incomingTrip.totalFare)}
                    </span>
                  </div>

                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Lộ trình dự kiến</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                      {incomingTrip.distanceKm ? `${incomingTrip.distanceKm.toFixed(1)} km` : '~5.0 km'} • ~{incomingTrip.estimatedDurationMinutes || 15} phút
                    </span>
                  </div>
                </div>

                {/* Accept & Reject Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="btn btn-primary"
                    style={{ padding: '0.85rem', fontSize: '0.95rem' }}
                  >
                    <CheckCircle2 size={18} />
                    Chấp nhận chuyến
                  </button>

                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="btn btn-outline"
                    style={{ padding: '0.85rem', fontSize: '0.95rem', color: 'var(--accent-rose)', borderColor: 'var(--border-light)' }}
                  >
                    <XCircle size={18} />
                    Từ chối
                  </button>
                </div>
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
                    backgroundColor: 'var(--primary-subtle)', 
                    color: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto'
                  }}
                >
                  <Radio size={28} className={status === 'connected' ? 'pulse-animation' : ''} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Đang trực tuyến chờ chuyến xe mới
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '340px', margin: '0 auto 1.5rem auto' }}>
                  Khi hành khách ở trang <strong>Rider</strong> bấm <em>"Tìm tài xế"</em>, tín hiệu sẽ tự động phát qua RabbitMQ và hiển thị tại đây!
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveTab('trips')}
                  style={{ fontSize: '0.85rem' }}
                >
                  <Navigation size={14} />
                  Xem các chuyến đi hiện có trong Tab Trips
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TRIPS MANAGEMENT (PICKUP, DROPOFF & PAYMENT)       */}
      {/* ======================================================== */}
      {activeTab === 'trips' && (
        <div>
          {/* Filters Bar */}
          <div 
            className="card" 
            style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem 1.25rem',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '1rem' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Lọc trạng thái:</span>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'DriverAccepted', label: 'Đã nhận (Cần đón)' },
                { key: 'PickedUp', label: 'Đang chở (Cần trả)' },
                { key: 'DroppedOff', label: 'Đã trả khách' },
                { key: 'Completed', label: 'Hoàn thành' },
                { key: 'Requested', label: 'Chờ tài xế' }
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterStatus(f.key)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    borderColor: filterStatus === f.key ? 'var(--primary)' : 'var(--border-light)',
                    backgroundColor: filterStatus === f.key ? 'var(--primary-subtle)' : '#ffffff',
                    color: filterStatus === f.key ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={filterByDriver} 
                  onChange={(e) => setFilterByDriver(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Chỉ hiện cuốc của tài xế đang chọn ({selectedDriver?.fullName?.split(' ')[0] || 'Tài xế'})
              </label>
            </div>
          </div>

          {/* Trips Cards Grid */}
          {filteredTrips.length === 0 ? (
            <div 
              className="card" 
              style={{ 
                textAlign: 'center', 
                padding: '3.5rem 1.5rem',
                border: '1px dashed var(--border-light)'
              }}
            >
              <Navigation size={36} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Không tìm thấy chuyến đi nào
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {filterStatus !== 'ALL' || filterByDriver ? 'Thử xóa bộ lọc để xem toàn bộ danh sách.' : 'Chưa có dữ liệu chuyến đi trong hệ thống.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTrips.map((trip) => {
                const isCurrentDriver = trip.driverId === selectedDriverId;
                const isAccepted = trip.status === 'DriverAccepted';
                const isPickedUp = trip.status === 'PickedUp';
                const isCompleted = trip.status === 'Completed' || trip.status === 'DroppedOff';

                return (
                  <div 
                    key={trip.id} 
                    className="card" 
                    style={{ 
                      padding: '1.25rem 1.5rem',
                      border: isAccepted ? '1.5px solid #93c5fd' : isPickedUp ? '1.5px solid #c4b5fd' : '1px solid var(--border-light)',
                      boxShadow: isAccepted || isPickedUp ? 'var(--shadow-md)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                          #{trip.id.slice(0, 8)}
                        </span>
                        {renderStatusBadge(trip.status)}
                        {isCurrentDriver && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                            Cuốc của bạn
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Clock size={13} />
                        <span>{formatDateTime(trip.createdAt)}</span>
                      </div>
                    </div>

                    {/* Content Row: Route + Pricing */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '5px', flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm đón khách:</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{trip.pickupAddress}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--accent-rose)', marginTop: '5px', flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm trả khách:</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{trip.dropoffAddress}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>Khoảng cách:</span>
                          <strong style={{ color: 'var(--text-main)' }}>{trip.distanceKm ? `${trip.distanceKm.toFixed(1)} km` : '~5.0 km'}</strong>
                        </div>

                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>Giá cước:</span>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>
                            {formatVND(trip.finalFare || trip.estimatedFare)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* State Transitions / Action Buttons Area */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        flexWrap: 'wrap', 
                        gap: '0.75rem', 
                        paddingTop: '0.75rem', 
                        borderTop: '1px solid var(--border-light)' 
                      }}
                    >
                      {/* Left: State explanation */}
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isAccepted && (
                          <>
                            <ArrowRight size={14} className="text-blue-600" />
                            <span>Bước tiếp theo: <strong>Đón khách (Pickup)</strong></span>
                          </>
                        )}
                        {isPickedUp && (
                          <>
                            <ArrowRight size={14} className="text-purple-600" />
                            <span>Khách đang trên xe: <strong>Trả khách (Dropoff)</strong> khi đến nơi</span>
                          </>
                        )}
                        {isCompleted && (
                          <>
                            <ShieldCheck size={14} className="text-emerald-600" />
                            <span>Chuyến đi đã hoàn tất trả khách và kích hoạt thanh toán.</span>
                          </>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {/* 1. If DriverAccepted -> Show Pickup Button */}
                        {isAccepted && (
                          <button
                            type="button"
                            onClick={() => handlePickup(trip.id)}
                            disabled={pickupProcessingId === trip.id}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.55rem 1.15rem', 
                              fontSize: '0.875rem',
                              backgroundColor: '#2563eb',
                              borderColor: '#2563eb'
                            }}
                          >
                            <Car size={16} />
                            {pickupProcessingId === trip.id ? 'Đang cập nhật...' : 'Đón khách (Pickup)'}
                          </button>
                        )}

                        {/* 2. If PickedUp -> Show Dropoff Button */}
                        {isPickedUp && (
                          <button
                            type="button"
                            onClick={() => openDropoffModal(trip)}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.55rem 1.15rem', 
                              fontSize: '0.875rem',
                              backgroundColor: '#059669',
                              borderColor: '#059669'
                            }}
                          >
                            <CheckCircle2 size={16} />
                            Trả khách (Dropoff) & Thanh toán
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* DROPOFF MODAL (PAYMENT METHOD & GATEWAY TOKEN INPUT)      */}
      {/* ======================================================== */}
      {dropoffModalTrip && (
        <div className="modal-overlay" onClick={closeDropoffModal}>
          <div 
            className="modal-dialog" 
            style={{ 
              maxWidth: '520px', 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="modal-header" 
              style={{ 
                padding: '1.15rem 1.4rem', 
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff'
              }}
            >
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
                    justifyContent: 'center' 
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Xác nhận Trả khách & Thanh toán
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Mã chuyến: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{dropoffModalTrip.id.slice(0, 8)}</code>
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={closeDropoffModal}
                disabled={isSubmittingDropoff}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmDropoff}>
              <div className="modal-body" style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* Trip Summary Card */}
                <div 
                  style={{ 
                    padding: '0.9rem 1.1rem', 
                    borderRadius: '12px', 
                    backgroundColor: 'var(--bg-subtle)', 
                    border: '1px solid var(--border-light)' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Điểm trả khách:</span>
                    <strong style={{ maxWidth: '280px', textAlign: 'right', color: 'var(--text-main)' }}>
                      {dropoffModalTrip.dropoffAddress}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.55rem', borderTop: '1px dashed var(--border-light)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cước phí thanh toán:</span>
                    <strong style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formatVND(dropoffModalTrip.estimatedFare)}
                    </strong>
                  </div>
                </div>

                {/* Error Banner if any */}
                {dropoffError && (
                  <div 
                    style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: '8px', 
                      backgroundColor: 'var(--accent-rose-subtle)', 
                      border: '1px solid var(--accent-rose-border, #fecdd3)',
                      color: 'var(--accent-rose)', 
                      fontSize: '0.85rem',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem' 
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{dropoffError}</span>
                  </div>
                )}

                {/* Field 1: Phương thức thanh toán (Payment Method) */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.45rem' }}>
                    Phương thức thanh toán <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {/* Wallet Option */}
                    <div 
                      onClick={() => setDropoffPaymentMethod(0)}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: dropoffPaymentMethod === 0 ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        backgroundColor: dropoffPaymentMethod === 0 ? 'var(--primary-subtle)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wallet size={18} color={dropoffPaymentMethod === 0 ? 'var(--primary)' : 'var(--text-muted)'} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dropoffPaymentMethod === 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                          Ví SwiftRide
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Trừ tiền trực tiếp số dư ví
                      </span>
                    </div>

                    {/* Card Option */}
                    <div 
                      onClick={() => {
                        setDropoffPaymentMethod(1);
                        if (!dropoffGatewayToken) setDropoffGatewayToken('mock-success');
                      }}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: dropoffPaymentMethod === 1 ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        backgroundColor: dropoffPaymentMethod === 1 ? 'var(--primary-subtle)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={18} color={dropoffPaymentMethod === 1 ? 'var(--primary)' : 'var(--text-muted)'} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dropoffPaymentMethod === 1 ? 'var(--primary)' : 'var(--text-main)' }}>
                          Thẻ Quốc Tế
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Visa / Mastercard / JCB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Field 2: Gateway Token Input */}
                {dropoffPaymentMethod === 1 ? (
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span>Mã Token Thẻ / Cổng Thanh Toán <span style={{ color: 'var(--accent-rose)' }}>*</span></span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>Tối đa 128 ký tự</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={dropoffGatewayToken}
                      onChange={(e) => setDropoffGatewayToken(e.target.value)}
                      placeholder="Nhập mã token thẻ (vd: mock-success, mock-fail, mock-decline)"
                      maxLength={128}
                      required
                      style={{ width: '100%' }}
                    />

                    {/* Sample token quick chips according to MockCardPaymentProcessor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mẫu token hỗ trợ bởi Backend:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {[
                          { token: 'mock-success', desc: 'Thành công', color: '#059669', bg: '#ecfdf5' },
                          { token: 'mock-fail', desc: 'Test Retry', color: '#d97706', bg: '#fffbeb' },
                          { token: 'mock-decline', desc: 'Từ chối thẻ', color: '#e11d48', bg: '#fff1f2' },
                        ].map((item) => {
                          const isCurrent = dropoffGatewayToken === item.token;
                          return (
                            <button
                              key={item.token}
                              type="button"
                              onClick={() => setDropoffGatewayToken(item.token)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '7px',
                                border: isCurrent ? `1.5px solid ${item.color}` : '1px solid var(--border-light)',
                                backgroundColor: isCurrent ? item.bg : 'var(--bg-subtle)',
                                color: isCurrent ? item.color : 'var(--text-main)',
                                cursor: 'pointer',
                                fontWeight: isCurrent ? 700 : 500,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{item.token}</code>
                              <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>({item.desc})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    style={{ 
                      padding: '0.75rem 0.9rem', 
                      borderRadius: '8px', 
                      backgroundColor: 'var(--bg-subtle)', 
                      border: '1px solid var(--border-light)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <ShieldCheck size={16} className="text-emerald-600" style={{ flexShrink: 0 }} />
                    <span>Hệ thống sẽ tự động trừ số dư ví của hành khách và chuyển doanh thu vào ví tài xế.</span>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div 
                style={{ 
                  padding: '0.9rem 1.4rem', 
                  backgroundColor: 'var(--bg-subtle)', 
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end', 
                  gap: '0.75rem' 
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeDropoffModal}
                  disabled={isSubmittingDropoff}
                  style={{ fontSize: '0.85rem' }}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingDropoff}
                  style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <CheckCircle2 size={16} />
                  {isSubmittingDropoff ? 'Đang xử lý...' : 'Xác nhận Trả khách & Thanh toán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
