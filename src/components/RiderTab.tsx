import React, { useState } from 'react';
import type { User, TripCreatedResponse, TripAcceptedData, DriverRejectedData } from '../types';
import { createTrip, matchDriver } from '../services/api';
import type { CreateTripRequest } from '../services/api';
import { 
  MapPin, 
  Navigation, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Car, 
  UserCheck, 
  Sparkles,
  CloudRain,
  ShieldAlert
} from 'lucide-react';

interface RiderTabProps {
  riders: User[];
  currentTrip: TripCreatedResponse | null;
  setCurrentTrip: (trip: TripCreatedResponse | null) => void;
  acceptedData: TripAcceptedData | null;
  rejectedData: DriverRejectedData | null;
  onClearTrip: () => void;
}

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

export const RiderTab: React.FC<RiderTabProps> = ({
  riders,
  currentTrip,
  setCurrentTrip,
  acceptedData,
  rejectedData,
  onClearTrip,
}) => {
  const [selectedRiderId, setSelectedRiderId] = useState<string>(riders[0]?.id || '');
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

  const selectedRider = riders.find((r) => r.id === selectedRiderId) || riders[0];

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setPickupAddress(PRESET_ROUTES[index].pickup);
    setDropoffAddress(PRESET_ROUTES[index].dropoff);
  };

  const handleCreateTrip = async () => {
    setErrorMessage(null);
    setMatchSuccessMessage(null);
    setIsCreatingTrip(true);

    try {
      const preset = PRESET_ROUTES[selectedPresetIndex];
      const payload: CreateTripRequest = {
        riderId: selectedRider?.id || 'c0a80123-4567-89ab-cdef-0123456789ab',
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

  const handleFindDriver = async () => {
    if (!currentTrip) return;
    setErrorMessage(null);
    setMatchSuccessMessage(null);
    setIsMatching(true);

    try {
      const res = await matchDriver({
        tripId: currentTrip.tripId,
        pickupAddress: currentTrip.pickupAddress,
        dropoffAddress: currentTrip.dropoffAddress,
        riderId: currentTrip.riderId,
      });

      setMatchSuccessMessage(
        `Đã tìm thấy tài xế ${res.fullName || ''}! Hệ thống đã phát sự kiện DriverFoundEvent tới RabbitMQ.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tìm tài xế');
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="tab-pane">
      {/* Rider Profile Card */}
      <div className="card glass-panel mb-4">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <UserCheck className="icon text-primary" />
            <h2 className="title-md">1. Chọn Hành Khách (Rider)</h2>
          </div>
          <span className="badge badge-info">Rider Tab</span>
        </div>

        <div className="rider-selector-grid">
          {riders.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedRiderId(r.id)}
              className={`rider-card ${selectedRiderId === r.id ? 'active' : ''}`}
            >
              <div className="rider-avatar">
                {r.fullName.charAt(0)}
              </div>
              <div className="rider-info">
                <div className="font-semibold text-white">{r.fullName}</div>
                <div className="text-xs text-muted">{r.email}</div>
                <div className="text-xs text-primary font-mono truncate" title={r.id}>ID: {r.id.slice(0, 8)}...</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Notification Banner for Rider */}
      {acceptedData && (
        <div className="banner banner-success mb-4 animate-fade-in">
          <CheckCircle2 className="icon-lg text-emerald-400" />
          <div className="banner-content">
            <h3 className="font-bold text-emerald-300 text-lg">🎉 Tài xế đã CHẤP NHẬN chuyến xe!</h3>
            <p className="text-sm text-emerald-100">
              Tài xế <strong className="underline">{acceptedData.driverName || 'Đối tác SwiftRide'}</strong> (ID: {acceptedData.driverId.slice(0, 8)}...) 
              đã chấp nhận chuyến đi <strong>#{acceptedData.tripId.slice(0, 8)}</strong> và đang di chuyển tới điểm đón!
            </p>
            <div className="text-xs text-emerald-300 mt-1">
              Nhận qua WebSocket (TripAcceptedEvent): {new Date(acceptedData.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {rejectedData && (
        <div className="banner banner-danger mb-4 animate-fade-in">
          <XCircle className="icon-lg text-rose-400" />
          <div className="banner-content">
            <h3 className="font-bold text-rose-300 text-lg">⚠️ Tài xế đã TỪ CHỐI chuyến xe!</h3>
            <p className="text-sm text-rose-100">
              Chuyến đi <strong>#{rejectedData.tripId.slice(0, 8)}</strong>: {rejectedData.reason}
            </p>
            <div className="text-xs text-rose-300 mt-1">
              Nhận qua WebSocket (DriverRejectEvent): {new Date(rejectedData.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Booking Form Card */}
      <div className="card glass-panel mb-4">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Navigation className="icon text-primary" />
            <h2 className="title-md">2. Đặt Chuyến Đi Mới</h2>
          </div>
          <div className="text-xs text-muted">API: POST /api/v1/trips</div>
        </div>

        {/* Preset Route Selectors */}
        <div className="presets-wrapper mb-3">
          <label className="label-sm">Chọn lộ trình mẫu nhanh:</label>
          <div className="preset-buttons">
            {PRESET_ROUTES.map((route, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(idx)}
                className={`btn-preset ${selectedPresetIndex === idx ? 'btn-preset-active' : ''}`}
              >
                {route.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="form-grid mb-4">
          <div className="input-group">
            <label className="label">
              <MapPin className="icon-xs text-emerald-400" /> Điểm đón (Pickup):
            </label>
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="input-field"
              placeholder="Nhập địa chỉ đón..."
            />
          </div>

          <div className="input-group">
            <label className="label">
              <MapPin className="icon-xs text-rose-400" /> Điểm đến (Dropoff):
            </label>
            <input
              type="text"
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              className="input-field"
              placeholder="Nhập địa chỉ đến..."
            />
          </div>
        </div>

        {/* Options: Rain, Toll, Promo */}
        <div className="options-grid mb-4">
          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={isRaining}
              onChange={(e) => setIsRaining(e.target.checked)}
            />
            <CloudRain className="icon-sm text-cyan-400" />
            <span>Thời tiết mưa (Tăng hệ số Surge)</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={hasToll}
              onChange={(e) => setHasToll(e.target.checked)}
            />
            <ShieldAlert className="icon-sm text-amber-400" />
            <span>Có trạm thu phí (Phụ phí cầu đường)</span>
          </label>

          <div className="promo-input-wrapper">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Mã giảm giá (ví dụ: GIAM20)"
              className="input-field"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-3">
          <button
            onClick={handleCreateTrip}
            disabled={isCreatingTrip}
            className="btn btn-primary flex-1"
          >
            {isCreatingTrip ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" /> Đang tính giá & tạo chuyến...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Car className="icon-sm" /> 🚀 Bắt đầu tạo chuyến
              </span>
            )}
          </button>

          {currentTrip && (
            <button
              onClick={onClearTrip}
              className="btn btn-secondary"
              title="Xóa chuyến hiện tại để tạo mới"
            >
              Làm mới
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="alert alert-danger mt-3">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Trip Information Card */}
      {currentTrip && (
        <div className="card glass-panel trip-detail-card animate-fade-in">
          <div className="card-header border-b border-glass pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="icon text-amber-400" />
                <h3 className="title-md text-white">3. Thông Tin Chuyến Đi Đã Tạo</h3>
              </div>
              <div className="text-xs text-muted font-mono mt-1">Mã chuyến: {currentTrip.tripId}</div>
            </div>
            <div className="status-badge-wrapper">
              <span className={`badge ${
                acceptedData 
                  ? 'badge-success' 
                  : rejectedData 
                    ? 'badge-danger' 
                    : 'badge-warning'
              }`}>
                {acceptedData 
                  ? 'DriverAccepted' 
                  : rejectedData 
                    ? 'DriverRejected' 
                    : currentTrip.status}
              </span>
            </div>
          </div>

          <div className="trip-summary-grid mt-4">
            <div className="trip-summary-item">
              <div className="summary-label">
                <MapPin className="icon-xs text-emerald-400" /> Từ (Pickup):
              </div>
              <div className="summary-value font-medium">{currentTrip.pickupAddress}</div>
            </div>

            <div className="trip-summary-item">
              <div className="summary-label">
                <MapPin className="icon-xs text-rose-400" /> Đến (Dropoff):
              </div>
              <div className="summary-value font-medium">{currentTrip.dropoffAddress}</div>
            </div>

            <div className="trip-summary-item">
              <div className="summary-label">
                <Clock className="icon-xs text-primary" /> Khoảng cách / Thời gian:
              </div>
              <div className="summary-value font-semibold text-primary">
                {currentTrip.distanceKm.toFixed(1)} km ~ {currentTrip.pricing?.estimatedMinutes || 15} phút
              </div>
            </div>

            <div className="trip-summary-item highlight">
              <div className="summary-label">
                <DollarSign className="icon-xs text-emerald-400" /> Tổng tiền ước tính:
              </div>
              <div className="summary-value text-xl font-bold text-emerald-400">
                {Number(currentTrip.estimatedFare).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          {/* Pricing breakdown breakdown */}
          {currentTrip.pricing && (
            <div className="pricing-details mt-4 p-3 rounded-lg bg-surface-dark border border-glass">
              <div className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">
                Chi tiết tính cước từ Matching & Pricing Service:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>Cước gốc: <span className="text-white">{currentTrip.pricing.baseFare.toLocaleString('vi-VN')} đ</span></div>
                <div>Cước cự ly: <span className="text-white">{currentTrip.pricing.distanceFare.toLocaleString('vi-VN')} đ</span></div>
                <div>Phí cầu đường: <span className="text-white">{currentTrip.pricing.tollFee.toLocaleString('vi-VN')} đ</span></div>
                <div>VAT (8%): <span className="text-white">{currentTrip.pricing.taxAmount.toLocaleString('vi-VN')} đ</span></div>
              </div>
            </div>
          )}

          {/* Match Driver Action */}
          <div className="mt-4 pt-3 border-t border-glass flex items-center justify-between">
            <div className="text-xs text-muted">
              Matching Service sẽ tìm tài xế gần nhất & bắn <code>DriverFoundEvent</code> qua RabbitMQ.
            </div>
            <button
              onClick={handleFindDriver}
              disabled={isMatching || !!acceptedData}
              className="btn btn-accent"
            >
              {isMatching ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" /> Đang tìm tài xế gần nhất...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="icon-xs" /> 🔍 Tìm tài xế (Find Driver)
                </span>
              )}
            </button>
          </div>

          {matchSuccessMessage && (
            <div className="alert alert-success mt-3 animate-fade-in">
              {matchSuccessMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
