import React from 'react';
import type { TripItem } from '../types';
import { 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  CreditCard,
  Navigation
} from 'lucide-react';

interface TripDetailModalProps {
  trip: TripItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRetryPayment?: (trip: TripItem) => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  isOpen,
  onClose,
  onRetryPayment,
}) => {
  if (!isOpen || !trip) return null;

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
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isFailed = trip.status === 'PaymentFailed';
  const isCompleted = trip.status === 'Completed';

  const failureReason = trip.paymentFailureReason || trip.reason;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        style={{ maxWidth: '580px', borderRadius: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div 
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '10px', 
                backgroundColor: isFailed ? 'var(--accent-rose-subtle)' : 'var(--primary-subtle)', 
                color: isFailed ? 'var(--accent-rose)' : 'var(--primary)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Navigation size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Chi tiết chuyến đi
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Mã cuốc: #{trip.id}
              </span>
            </div>
          </div>

          <button type="button" onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status Banner */}
          <div 
            style={{ 
              padding: '0.85rem 1rem', 
              borderRadius: '12px',
              backgroundColor: isFailed 
                ? 'var(--accent-rose-subtle)' 
                : isCompleted 
                ? 'var(--primary-subtle)' 
                : 'var(--accent-blue-subtle)',
              border: `1px solid ${
                isFailed 
                  ? '#fecdd3' 
                  : isCompleted 
                  ? 'var(--primary-border)' 
                  : '#bfdbfe'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isFailed ? (
                <AlertCircle size={20} className="text-rose-500" />
              ) : isCompleted ? (
                <CheckCircle2 size={20} className="text-emerald-600" />
              ) : (
                <Clock size={20} className="text-blue-600" />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isFailed ? 'var(--accent-rose)' : isCompleted ? 'var(--primary)' : 'var(--accent-blue)' }}>
                  Trạng thái: {trip.status}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDateTime(trip.createdAt)}
                </div>
              </div>
            </div>

            {isFailed && onRetryPayment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetryPayment(trip);
                }}
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
              >
                <CreditCard size={14} />
                Thanh toán lại
              </button>
            )}
          </div>

          {/* Payment Failure Reason if any */}
          {failureReason && (
            <div 
              style={{ 
                padding: '0.85rem 1rem', 
                borderRadius: '10px', 
                backgroundColor: '#fff1f2', 
                border: '1.5px dashed #fda4af',
                color: '#9f1239',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertCircle size={15} />
                Lý do thất bại khi thanh toán:
              </div>
              <div style={{ lineHeight: 1.5 }}>
                {failureReason}
              </div>
            </div>
          )}

          {/* Route Section */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
              Lộ trình di chuyển
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block' }}>Điểm đón (Pickup):</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{trip.pickupAddress}</span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    Tọa độ: [{trip.pickupLat.toFixed(4)}, {trip.pickupLng.toFixed(4)}]
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--accent-rose)', marginTop: '4px', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block' }}>Điểm đến (Dropoff):</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{trip.dropoffAddress}</span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    Tọa độ: [{trip.dropoffLat.toFixed(4)}, {trip.dropoffLng.toFixed(4)}]
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Khoảng cách lộ trình</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {trip.distanceKm ? `${trip.distanceKm.toFixed(1)} km` : 'Chưa xác định'}
              </span>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Giá tiền chuyến đi</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatVND(trip.finalFare || trip.estimatedFare)}
              </span>
            </div>
          </div>

          {/* Additional details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div>
              <strong>Tài xế thực hiện:</strong> {trip.driverId ? <code style={{ fontFamily: 'var(--font-mono)' }}>{trip.driverId}</code> : 'Chưa gán tài xế'}
            </div>
            <div>
              <strong>Hành khách (Rider ID):</strong> <code style={{ fontFamily: 'var(--font-mono)' }}>{trip.riderId}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {isFailed && onRetryPayment && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetryPayment(trip);
              }}
              className="btn btn-primary"
            >
              <CreditCard size={15} />
              Thanh toán lại chuyến này
            </button>
          )}

          <button type="button" onClick={onClose} className="btn btn-outline">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
