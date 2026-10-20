import React, { useState } from 'react';
import type { User, DriverFoundData } from '../types';
import { acceptTrip, rejectTrip } from '../services/api';
import { 
  Car, 
  MapPin, 
  DollarSign, 
  Clock, 
  Navigation, 
  CheckCircle, 
  XCircle, 
  BellRing, 
  AlertCircle
} from 'lucide-react';

interface DriverTabProps {
  drivers: User[];
  incomingTrip: DriverFoundData | null;
  onClearIncomingTrip: () => void;
  onAcceptSuccess: (data: any) => void;
  onRejectSuccess: (data: any) => void;
}

export const DriverTab: React.FC<DriverTabProps> = ({
  drivers,
  incomingTrip,
  onClearIncomingTrip,
  onAcceptSuccess,
  onRejectSuccess,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'rejected' | 'error';
    message: string;
  } | null>(null);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  const handleAccept = async () => {
    if (!incomingTrip) return;
    setIsProcessing(true);
    setActionStatus(null);

    try {
      const driverId = selectedDriver?.id || incomingTrip.driverId;
      await acceptTrip(incomingTrip.tripId, driverId);

      setActionStatus({
        type: 'success',
        message: 'Bạn đã CHẤP NHẬN chuyến xe thành công! Hệ thống đã phát sự kiện TripAcceptedEvent qua RabbitMQ.',
      });
      onAcceptSuccess({ tripId: incomingTrip.tripId, driverId });
    } catch (err: any) {
      setActionStatus({
        type: 'error',
        message: err.message || 'Lỗi khi chấp nhận chuyến xe.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!incomingTrip) return;
    setIsProcessing(true);
    setActionStatus(null);

    try {
      const driverId = selectedDriver?.id || incomingTrip.driverId;
      await rejectTrip(incomingTrip.tripId, driverId);

      setActionStatus({
        type: 'rejected',
        message: 'Bạn đã TỪ CHỐI chuyến xe. Hệ thống đã phát sự kiện DriverRejectEvent qua RabbitMQ tới hành khách.',
      });
      onRejectSuccess({ tripId: incomingTrip.tripId, driverId });
    } catch (err: any) {
      setActionStatus({
        type: 'error',
        message: err.message || 'Lỗi khi từ chối chuyến xe.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="tab-pane">
      {/* Driver Profile Card */}
      <div className="card glass-panel mb-4">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Car className="icon text-primary" />
            <h2 className="title-md">1. Thông Tin Tài Xế (Driver)</h2>
          </div>
          <span className="badge badge-success">Online & Sẵn Sàng</span>
        </div>

        <div className="rider-selector-grid">
          {drivers.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelectedDriverId(d.id)}
              className={`rider-card ${selectedDriverId === d.id ? 'active' : ''}`}
            >
              <div className="rider-avatar bg-amber-600">
                {d.fullName.charAt(0)}
              </div>
              <div className="rider-info">
                <div className="font-semibold text-white">{d.fullName}</div>
                <div className="text-xs text-muted">{d.email}</div>
                <div className="text-xs text-amber-400 font-mono truncate">ID: {d.id.slice(0, 8)}...</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action feedback */}
      {actionStatus && (
        <div
          className={`banner mb-4 animate-fade-in ${
            actionStatus.type === 'success'
              ? 'banner-success'
              : actionStatus.type === 'rejected'
              ? 'banner-danger'
              : 'banner-warning'
          }`}
        >
          {actionStatus.type === 'success' ? (
            <CheckCircle className="icon-lg text-emerald-400" />
          ) : actionStatus.type === 'rejected' ? (
            <XCircle className="icon-lg text-rose-400" />
          ) : (
            <AlertCircle className="icon-lg text-amber-400" />
          )}
          <div className="banner-content">
            <h3 className="font-bold text-white text-md">
              {actionStatus.type === 'success'
                ? 'Đã chấp nhận chuyến'
                : actionStatus.type === 'rejected'
                ? 'Đã từ chối chuyến'
                : 'Thông báo lỗi'}
            </h3>
            <p className="text-sm">{actionStatus.message}</p>
          </div>
        </div>
      )}

      {/* Incoming Ride Request Card */}
      {incomingTrip ? (
        <div className="card glass-panel incoming-trip-card animate-pulse-glow mb-4">
          <div className="card-header border-b border-glass pb-3">
            <div className="flex items-center gap-2">
              <span className="incoming-pulse" />
              <BellRing className="icon text-amber-400 animate-bounce" />
              <div>
                <h2 className="title-md text-amber-300">🔔 CÓ CHUYẾN ĐI MỚI DÀNH CHO BẠN!</h2>
                <div className="text-xs text-muted font-mono">
                  Mã chuyến: {incomingTrip.tripId} | Nhận lúc: {new Date(incomingTrip.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-warning animate-pulse">Chờ phản hồi</span>
              <button
                onClick={onClearIncomingTrip}
                className="btn-icon text-muted hover:text-white"
                title="Bỏ qua yêu cầu này"
              >
                <XCircle className="icon-xs" />
              </button>
            </div>
          </div>

          {/* Trip Details Grid */}
          <div className="trip-summary-grid mt-4">
            <div className="trip-summary-item">
              <div className="summary-label">
                <MapPin className="icon-xs text-emerald-400" /> Từ (Điểm đón):
              </div>
              <div className="summary-value font-semibold text-white">
                {incomingTrip.pickupAddress}
              </div>
            </div>

            <div className="trip-summary-item">
              <div className="summary-label">
                <Navigation className="icon-xs text-rose-400" /> Tới (Điểm đến):
              </div>
              <div className="summary-value font-semibold text-white">
                {incomingTrip.dropoffAddress}
              </div>
            </div>

            <div className="trip-summary-item">
              <div className="summary-label">
                <Clock className="icon-xs text-primary" /> Ước lượng thời gian & Quãng đường:
              </div>
              <div className="summary-value font-bold text-primary">
                ~ {incomingTrip.estimatedDurationMinutes} phút ({incomingTrip.distanceKm.toFixed(1)} km)
              </div>
            </div>

            <div className="trip-summary-item highlight">
              <div className="summary-label">
                <DollarSign className="icon-xs text-emerald-400" /> Tổng số tiền cước tài xế nhận:
              </div>
              <div className="summary-value text-2xl font-extrabold text-emerald-400">
                {Number(incomingTrip.totalFare).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons-group mt-5 pt-4 border-t border-glass">
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="btn btn-success flex-1"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Đang xử lý...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 text-base font-semibold">
                  <CheckCircle className="icon-sm" /> ✅ Chấp nhận chuyến
                </span>
              )}
            </button>

            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="btn btn-danger flex-1"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Đang xử lý...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 text-base font-semibold">
                  <XCircle className="icon-sm" /> ❌ Từ chối chuyến
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card glass-panel empty-state mb-4">
          <Car className="empty-icon text-muted" />
          <h3 className="text-lg font-semibold text-white mt-2">Đang đợi yêu cầu chuyến đi...</h3>
          <p className="text-sm text-muted max-w-md mx-auto mt-1">
            Khi khách hàng bên tab <strong>Hành Khách (Rider)</strong> tạo chuyến và bấm <strong>Tìm tài xế</strong>, 
            sự kiện <code>DriverFoundEvent</code> sẽ được RabbitMQ chuyển tới Notification Service và hiển thị ngay tại đây qua WebSocket!
          </p>
        </div>
      )}
    </div>
  );
};
