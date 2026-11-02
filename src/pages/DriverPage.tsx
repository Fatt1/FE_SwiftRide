import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSignalR } from '../hooks/useSignalR';
import { LeafletMap } from '../components/LeafletMap';
import { 
  fetchDrivers, 
  fetchDriverLocations,
  fetchAllTrips,
  fetchTripById,
  acceptTrip, 
  rejectTrip, 
  pickupTrip,
  dropoffTrip,
  DEFAULT_DRIVERS,
  DEFAULT_DRIVER_LOCATIONS
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
  X,
  Compass,
  Map as MapIcon
} from 'lucide-react';

export const DriverPage: React.FC = () => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'drivers' | 'trips'>('drivers');

  // Drivers State
  const [drivers, setDrivers] = useState<User[]>(DEFAULT_DRIVERS);
  const [driverLocations, setDriverLocations] = useState<Record<string, DriverLocation>>({});
  const [selectedDriverId, setSelectedDriverId] = useState<string>(DEFAULT_DRIVERS[0]?.id || '');
  const [incomingTrip, setIncomingTrip] = useState<DriverFoundData | null>(null);
  const [incomingTripDetails, setIncomingTripDetails] = useState<TripItem | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'rejected' | 'error';
    message: string;
  } | null>(null);

  // Selected trip to preview on map in Tab 2
  const [selectedTripPreview, setSelectedTripPreview] = useState<TripItem | null>(null);

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

  // When incoming trip arrives, fetch full trip coordinates
  useEffect(() => {
    if (incomingTrip?.tripId) {
      fetchTripById(incomingTrip.tripId)
        .then((detail) => {
          setIncomingTripDetails(detail);
        })
        .catch((err) => {
          console.warn('Cannot fetch incoming trip details:', err);
          setIncomingTripDetails(null);
        });
    } else {
      setIncomingTripDetails(null);
    }
  }, [incomingTrip]);

  // Load Drivers and their live locations
  const loadDriversData = async () => {
    try {
      const [userList, locations] = await Promise.all([
        fetchDrivers(),
        fetchDriverLocations().catch(() => DEFAULT_DRIVER_LOCATIONS),
      ]);

      if (userList && userList.length > 0) {
        setDrivers(userList);
        if (!selectedDriverId) {
          setSelectedDriverId(userList[0].id);
        }
      }

      const locMap: Record<string, DriverLocation> = {};
      const locList = locations && locations.length > 0 ? locations : DEFAULT_DRIVER_LOCATIONS;
      locList.forEach((loc) => {
        locMap[loc.driverId] = loc;
      });
      setDriverLocations(locMap);
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
        if (!selectedTripPreview && data.length > 0) {
          setSelectedTripPreview(data[0]);
        }
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
  const selectedDriverLoc = driverLocations[selectedDriverId] || DEFAULT_DRIVER_LOCATIONS[0];

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
      setIncomingTripDetails(null);
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
      setIncomingTripDetails(null);
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

  // Khi tài xế ấn Xác nhận Trả khách & Thanh toán
  const handleInitiateDropoff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropoffModalTrip) return;

    if (dropoffPaymentMethod === 1 && !dropoffGatewayToken.trim()) {
      setDropoffError('Vui lòng nhập Gateway Token cho thanh toán qua Thẻ (tối đa 128 ký tự).');
      return;
    }

    setDropoffError(null);
    executeActualPayment();
  };

  const executeActualPayment = async () => {
    if (!dropoffModalTrip) return;

    setIsSubmittingDropoff(true);
    setDropoffError(null);

    try {
      await dropoffTrip(dropoffModalTrip.id, {
        paymentMethod: dropoffPaymentMethod,
        gatewayToken: dropoffGatewayToken.trim() || undefined,
      });

      setActionStatus({
        type: 'success',
        message: `Đã hoàn thành chuyến đi #${dropoffModalTrip.id.slice(0, 8)} và thực hiện quyết toán tiền cước!`,
      });

      setDropoffModalTrip(null);
      loadTrips();
    } catch (err: any) {
      setDropoffError(err.message || 'Lỗi khi quyết toán chuyến đi.');
    } finally {
      setIsSubmittingDropoff(false);
    }
  };

  const formatVND = (val?: number) => {
    if (!val) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '--:--';
    const date = new Date(iso);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString('vi-VN');
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Requested':
        return <span className="badge badge-info">Đang chờ tài xế</span>;
      case 'DriverAccepted':
        return <span className="badge badge-warning">Đã nhận - Cần đón</span>;
      case 'PickedUp':
        return <span className="badge badge-primary">Đang chở khách</span>;
      case 'DroppedOff':
      case 'Completed':
        return <span className="badge badge-success">Hoàn thành</span>;
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
            Kênh tiếp nhận cuốc xe, quan sát bản đồ thời gian thực Leaflet & quản lý hành trình
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
            Danh sách & Bản đồ Tài xế
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
            Quản lý Chuyến đi & Bản đồ lộ trình
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

          {/* Right Column: Leaflet Map & Incoming Trip Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* LEAFLET MAP ON DRIVER PORTAL */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                  <Compass size={17} className="text-emerald-600" />
                  Bản đồ vị trí xe & điều phối cuốc
                </h3>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  Đang chọn: {selectedDriver?.fullName?.split(' ')[0] || 'Tài xế'}
                </span>
              </div>

              <LeafletMap
                pickup={
                  incomingTripDetails
                    ? {
                        lat: incomingTripDetails.pickupLat,
                        lng: incomingTripDetails.pickupLng,
                        address: incomingTrip?.pickupAddress || incomingTripDetails.pickupAddress,
                      }
                    : null
                }
                dropoff={
                  incomingTripDetails
                    ? {
                        lat: incomingTripDetails.dropoffLat,
                        lng: incomingTripDetails.dropoffLng,
                        address: incomingTrip?.dropoffAddress || incomingTripDetails.dropoffAddress,
                      }
                    : null
                }
                driver={
                  selectedDriverLoc
                    ? {
                        lat: selectedDriverLoc.latitude,
                        lng: selectedDriverLoc.longitude,
                        name: selectedDriver?.fullName || 'Xe của bạn',
                      }
                    : null
                }
                height="360px"
                interactive={false}
              />

              <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                  🚗 <strong>Xe màu xanh đậm</strong> là xe của tài xế đang trực ca.
                </span>
                {incomingTrip && (
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    ● Đang hiển thị lộ trình đón khách!
                  </span>
                )}
              </div>
            </div>

            {/* Real-time Incoming Ride Proposal & Action Handlers */}
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

                {/* Route Details */}
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
                  padding: '2.5rem 1.5rem',
                  border: '1.5px dashed var(--border-light)',
                  backgroundColor: '#ffffff'
                }}
              >
                <div 
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    borderRadius: '16px', 
                    backgroundColor: 'var(--primary-subtle)', 
                    color: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem auto'
                  }}
                >
                  <Radio size={26} className={status === 'connected' ? 'pulse-animation' : ''} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Đang trực tuyến chờ chuyến xe mới
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', maxWidth: '340px', margin: '0 auto 1.25rem auto' }}>
                  Khi khách hàng ở trang <strong>Rider</strong> tạo cuốc và tìm tài xế, tín hiệu sẽ tự động đẩy qua WebSocket và hiển thị lộ trình trên bản đồ tại đây!
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveTab('trips')}
                  style={{ fontSize: '0.825rem' }}
                >
                  <Navigation size={14} />
                  Xem các chuyến đi hiện có trong Tab Quản lý Chuyến đi
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Map Preview for Selected Trip in Tab 2 */}
          {selectedTripPreview && (
            <div className="card" style={{ padding: '1rem', border: '1.5px solid var(--primary-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapIcon size={18} className="text-emerald-600" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Bản đồ lộ trình chuyến đi #{selectedTripPreview.id.slice(0, 8)}
                  </h4>
                  {renderStatusBadge(selectedTripPreview.status)}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {selectedTripPreview.distanceKm ? `Lộ trình ~${selectedTripPreview.distanceKm.toFixed(1)} km` : ''} • Giá cước: <strong>{formatVND(selectedTripPreview.finalFare || selectedTripPreview.estimatedFare)}</strong>
                </div>
              </div>

              <LeafletMap
                pickup={{
                  lat: selectedTripPreview.pickupLat || 10.7725,
                  lng: selectedTripPreview.pickupLng || 106.6980,
                  address: selectedTripPreview.pickupAddress,
                }}
                dropoff={{
                  lat: selectedTripPreview.dropoffLat || 10.7950,
                  lng: selectedTripPreview.dropoffLng || 106.7218,
                  address: selectedTripPreview.dropoffAddress,
                }}
                driver={
                  selectedDriverLoc
                    ? {
                        lat: selectedDriverLoc.latitude,
                        lng: selectedDriverLoc.longitude,
                        name: selectedDriver?.fullName,
                      }
                    : null
                }
                height="320px"
                interactive={false}
              />
            </div>
          )}

          {/* Filters Bar */}
          <div 
            className="card" 
            style={{ 
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
                const isSelectedForMap = selectedTripPreview?.id === trip.id;

                return (
                  <div 
                    key={trip.id} 
                    className="card" 
                    onClick={() => setSelectedTripPreview(trip)}
                    style={{ 
                      padding: '1.25rem 1.5rem',
                      border: isSelectedForMap 
                        ? '2px solid var(--primary)' 
                        : isAccepted 
                        ? '1.5px solid #93c5fd' 
                        : isPickedUp 
                        ? '1.5px solid #c4b5fd' 
                        : '1px solid var(--border-light)',
                      boxShadow: isSelectedForMap ? 'var(--shadow-md)' : 'none',
                      cursor: 'pointer',
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
                        {isSelectedForMap && (
                          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                            Đang xem bản đồ
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

                    {/* Actions Area */}
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {isAccepted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePickup(trip.id);
                            }}
                            disabled={pickupProcessingId === trip.id}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.55rem 1.15rem', 
                              fontSize: '0.875rem',
                              backgroundColor: '#2563eb',
                              borderColor: '#2563eb'
                            }}
                          >
                            {pickupProcessingId === trip.id ? (
                              <>
                                <RefreshCw size={14} className="pulse-animation" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <Car size={15} />
                                Đã đón khách (Pickup)
                              </>
                            )}
                          </button>
                        )}

                        {isPickedUp && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDropoffModal(trip);
                            }}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.55rem 1.15rem', 
                              fontSize: '0.875rem',
                              backgroundColor: '#9333ea',
                              borderColor: '#9333ea'
                            }}
                          >
                            <CreditCard size={15} />
                            Trả khách & Quyết toán (Drop-off)
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

      {/* Dropoff & Payment Modal */}
      {dropoffModalTrip && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Xác nhận Trả khách & Quyết toán
                </h3>
              </div>

              <button 
                type="button" 
                onClick={closeDropoffModal}
                disabled={isSubmittingDropoff}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInitiateDropoff}>
              <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mã chuyến đi:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>#{dropoffModalTrip.id.slice(0, 8)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số tiền quyết toán:</span>
                  <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                    {formatVND(dropoffModalTrip.finalFare || dropoffModalTrip.estimatedFare)}
                  </strong>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Chọn phương thức thanh toán của khách:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setDropoffPaymentMethod(0)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: dropoffPaymentMethod === 0 ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      backgroundColor: dropoffPaymentMethod === 0 ? 'var(--primary-subtle)' : '#ffffff',
                      color: dropoffPaymentMethod === 0 ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: dropoffPaymentMethod === 0 ? 700 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Wallet size={16} />
                    Ví điện tử
                  </button>

                  <button
                    type="button"
                    onClick={() => setDropoffPaymentMethod(1)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: dropoffPaymentMethod === 1 ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      backgroundColor: dropoffPaymentMethod === 1 ? 'var(--primary-subtle)' : '#ffffff',
                      color: dropoffPaymentMethod === 1 ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: dropoffPaymentMethod === 1 ? 700 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <CreditCard size={16} />
                    Thẻ ngân hàng
                  </button>
                </div>
              </div>

              {dropoffPaymentMethod === 1 && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Gateway Token (Mô phỏng Stripe/VNPay token):</label>
                  <input
                    type="text"
                    className="form-input"
                    value={dropoffGatewayToken}
                    onChange={(e) => setDropoffGatewayToken(e.target.value)}
                    placeholder="Nhập chuỗi token (ví dụ: tok_visa_4242)..."
                    maxLength={128}
                    required
                  />
                </div>
              )}

              {dropoffError && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--accent-rose-subtle)', color: 'var(--accent-rose)', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  {dropoffError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeDropoffModal}
                  disabled={isSubmittingDropoff}
                  className="btn btn-outline"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingDropoff}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#9333ea', borderColor: '#9333ea' }}
                >
                  {isSubmittingDropoff ? (
                    <>
                      <RefreshCw size={14} className="pulse-animation" />
                      Đang xử lý thanh toán...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Xác nhận trả khách & Quyết toán
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
