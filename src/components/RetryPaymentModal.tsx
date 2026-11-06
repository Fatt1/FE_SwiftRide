import React, { useState } from 'react';
import type { TripItem, Wallet } from '../types';
import { retryPaymentTrip } from '../services/api';
import { 
  X, 
  CreditCard, 
  Wallet as WalletIcon, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface RetryPaymentModalProps {
  trip: TripItem | null;
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenWalletTab?: () => void;
}

export const RetryPaymentModal: React.FC<RetryPaymentModalProps> = ({
  trip,
  wallet,
  isOpen,
  onClose,
  onSuccess,
  onOpenWalletTab,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<number>(0); // 0 = Wallet, 1 = Card
  const [gatewayToken, setGatewayToken] = useState<string>('mock-card-token');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !trip) return null;

  const fare = trip.finalFare || trip.estimatedFare || 0;
  const balance = wallet?.balance ?? 0;
  const isWalletSufficient = balance >= fare;

  const formatVND = (val?: number) => {
    if (val === undefined || val === null) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (paymentMethod === 0 && !isWalletSufficient) {
      setErrorMessage(`Số dư ví SwiftRide không đủ (${formatVND(balance)} < ${formatVND(fare)}). Vui lòng nạp thêm tiền vào ví hoặc chọn thẻ!`);
      return;
    }

    if (paymentMethod === 1 && !gatewayToken.trim()) {
      setErrorMessage('Vui lòng nhập Gateway Token cho thẻ ngân hàng/quốc tế.');
      return;
    }

    setIsSubmitting(true);
    try {
      await retryPaymentTrip(trip, {
        paymentMethod,
        gatewayToken: paymentMethod === 1 ? gatewayToken.trim() : undefined,
      });

      setSuccessMessage('Đã tạo giao dịch thanh toán mới thành công! Trạng thái chuyến đi đang được cập nhật.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Thanh toán lại thất bại. Vui lòng kiểm tra lại số dư hoặc thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        style={{ maxWidth: '480px', borderRadius: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Thanh toán lại chuyến đi
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Chuyến #{trip.id.slice(0, 8)} • Số tiền: <strong>{formatVND(fare)}</strong>
              </span>
            </div>
          </div>

          <button type="button" onClick={onClose} className="modal-close-btn" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Amount Banner */}
            <div 
              style={{ 
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', 
                border: '1.5px solid var(--primary-border)', 
                borderRadius: '12px', 
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                  CẦN THANH TOÁN
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {formatVND(fare)}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Lộ trình: {trip.distanceKm?.toFixed(1) || '~5.0'} km
              </div>
            </div>

            {/* Previous Failure Reason Notice */}
            {(trip.paymentFailureReason || trip.reason) && (
              <div 
                style={{ 
                  padding: '0.65rem 0.85rem', 
                  borderRadius: '8px', 
                  backgroundColor: 'var(--accent-rose-subtle)', 
                  border: '1px solid #fecdd3',
                  color: 'var(--accent-rose)',
                  fontSize: '0.8rem'
                }}
              >
                <strong>Lý do lỗi trước đó:</strong> {trip.paymentFailureReason || trip.reason}
              </div>
            )}

            {/* Choose Payment Method */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Chọn phương thức thanh toán:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Wallet Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod(0)}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: paymentMethod === 0 ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    backgroundColor: paymentMethod === 0 ? 'var(--primary-subtle)' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: paymentMethod === 0 ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.85rem' }}>
                    <WalletIcon size={16} />
                    Ví SwiftRide
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isWalletSufficient ? 'var(--primary)' : 'var(--accent-rose)', fontWeight: 600 }}>
                    Số dư: {formatVND(balance)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isWalletSufficient ? 'Đủ số dư thanh toán' : 'Thiếu tiền ví'}
                  </div>
                </button>

                {/* Card Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod(1)}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: paymentMethod === 1 ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    backgroundColor: paymentMethod === 1 ? 'var(--primary-subtle)' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: paymentMethod === 1 ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.85rem' }}>
                    <CreditCard size={16} />
                    Thẻ Quốc Tế
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Visa / Mastercard
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Cổng Mock Processor
                  </div>
                </button>
              </div>
            </div>

            {/* If wallet is not enough, provide shortcut to top-up */}
            {paymentMethod === 0 && !isWalletSufficient && (
              <div 
                style={{ 
                  backgroundColor: '#fffbeb', 
                  border: '1px solid #fde68a', 
                  borderRadius: '10px', 
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                  Cần nạp thêm tối thiểu <strong>{formatVND(fare - balance)}</strong>.
                </div>
                {onOpenWalletTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWalletTab();
                    }}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', borderColor: '#f59e0b', color: '#b45309' }}
                  >
                    Vào Tab Ví Nạp tiền
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Card Token Input if Card */}
            {paymentMethod === 1 && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Gateway Token thẻ:</label>
                <input
                  type="text"
                  className="form-input"
                  value={gatewayToken}
                  onChange={(e) => setGatewayToken(e.target.value)}
                  placeholder="mock-card-token (hoặc mock-success)"
                />
              </div>
            )}

            {/* Messages */}
            {errorMessage && (
              <div 
                style={{ 
                  padding: '0.65rem 0.85rem', 
                  backgroundColor: 'var(--accent-rose-subtle)', 
                  color: 'var(--accent-rose)', 
                  borderRadius: '8px', 
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div 
                style={{ 
                  padding: '0.65rem 0.85rem', 
                  backgroundColor: 'var(--primary-subtle)', 
                  color: 'var(--primary)', 
                  borderRadius: '8px', 
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          <div className="modal-header" style={{ borderTop: '1px solid var(--border-light)', borderBottom: 'none', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting || (paymentMethod === 0 && !isWalletSufficient)}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Đang xử lý thanh toán...
                </>
              ) : (
                <>
                  <CreditCard size={14} />
                  Xác nhận thanh toán ({formatVND(fare)})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

