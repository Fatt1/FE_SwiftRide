import React from 'react';
import { X, Receipt, CloudRain, Tag, CheckCircle2, Info, Compass, Clock, ShieldAlert } from 'lucide-react';
import type { PricingBreakdown } from '../types';

interface PriceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricing?: PricingBreakdown | null;
  estimatedFare?: number;
  distanceKm?: number;
}

export const PriceBreakdownModal: React.FC<PriceBreakdownModalProps> = ({
  isOpen,
  onClose,
  pricing,
  estimatedFare = 0,
  distanceKm = 0,
}) => {
  if (!isOpen) return null;

  const formatVND = (val?: number) => {
    if (val === undefined || val === null) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const distFare = pricing?.distanceFare ?? 0;
  const timeFare = pricing?.timeFare ?? 0;
  const baseFare = pricing?.baseFare ?? (distFare + timeFare);
  const surgeMultiplier = pricing?.appliedSurges && pricing.appliedSurges.length > 0 
    ? pricing.appliedSurges[0].multiplier || 1.2 
    : 1.0;
  const tollFee = pricing?.tollFee ?? 0;
  const discountAmount = pricing?.discountAmount ?? 0;
  const retentionFactor = pricing?.retentionFactor ?? (discountAmount > 0 ? 0.8 : 1.0);
  const taxRate = pricing?.taxRate ?? 0.1;
  const taxAmount = pricing?.taxAmount ?? 0;
  const finalTotal = pricing?.finalTotal ?? estimatedFare;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        style={{ maxWidth: '620px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Receipt className="text-emerald-600" size={22} />
            <span>Chi tiết & Công thức tính giá cước</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* Formula Display Banner */}
          <div 
            style={{ 
              backgroundColor: '#f8fafc', 
              border: '1.5px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '1rem', 
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Công thức định giá chuẩn xác
            </span>
            <div 
              style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '1.15rem', 
                fontWeight: 800, 
                color: 'var(--text-main)', 
                margin: '0.4rem 0',
                padding: '0.4rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1'
              }}
            >
              p = ((c<sub>d</sub> · d + c<sub>t</sub> · t) · s + c<sub>m</sub>) · η · (1 + T)
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              Trong đó <strong>Base Fare = (c<sub>d</sub> · d + c<sub>t</sub> · t)</strong> là cước cơ bản (tiền quãng đường + tiền thời gian).
            </p>
          </div>

          {/* Final Price Card */}
          <div 
            style={{ 
              backgroundColor: 'var(--primary-subtle)', 
              border: '1px solid var(--primary-border)', 
              borderRadius: '12px', 
              padding: '1rem', 
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                Tổng cước phí thanh toán (p)
              </span>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatVND(finalTotal)}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-success">
                <CheckCircle2 size={12} />
                Tính tự động
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {distanceKm ? `${distanceKm.toFixed(1)} km` : ''} 
                {pricing?.estimatedMinutes ? ` • ~${pricing.estimatedMinutes} phút` : ''}
              </div>
            </div>
          </div>

          {/* Step 1: Base Fare = cd * d + ct * t */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                1. Cước cơ bản (Base Fare = c<sub>d</sub> · d + c<sub>t</sub> · t)
              </h4>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                {formatVND(baseFare)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', backgroundColor: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <Compass size={14} />
                  Tiền quãng đường (c<sub>d</sub> · d) — {pricing?.distanceKm || distanceKm} km:
                </span>
                <span style={{ fontWeight: 600 }}>{formatVND(distFare)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <Clock size={14} />
                  Tiền thời gian (c<sub>t</sub> · t) — {pricing?.estimatedMinutes || 15} phút:
                </span>
                <span style={{ fontWeight: 600 }}>{formatVND(timeFare)}</span>
              </div>

              <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  = Base Fare (Cước quãng đường + Thời gian):
                </span>
                <strong style={{ color: 'var(--primary)' }}>{formatVND(baseFare)}</strong>
              </div>
            </div>
          </div>

          {/* Step 2: Surge factor (s) and Toll fee (cm) */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
              2. Hệ số giá động (s) & Phí phụ cầu đường (c<sub>m</sub>)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', backgroundColor: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <CloudRain size={14} className={surgeMultiplier > 1 ? 'text-amber-500' : ''} />
                  Hệ số giá động thời tiết/nhu cầu (s):
                </span>
                <span style={{ fontWeight: 700, color: surgeMultiplier > 1 ? 'var(--accent-amber)' : 'var(--text-main)' }}>
                  {surgeMultiplier > 1 ? `x${surgeMultiplier} (Thời tiết xấu / Nhu cầu cao)` : 'x1.0 (Tiêu chuẩn)'}
                </span>
              </div>

              {surgeMultiplier > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent-amber)' }}>
                  <span>Cước sau nhân hệ số Surge ((c<sub>d</sub>·d + c<sub>t</sub>·t) · s):</span>
                  <span style={{ fontWeight: 700 }}>{formatVND(pricing?.fareAfterSurge || (baseFare * surgeMultiplier))}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={14} className={tollFee > 0 ? 'text-amber-500' : ''} />
                  Phí phụ cầu đường / trạm thu phí (c<sub>m</sub>):
                </span>
                <span style={{ fontWeight: 600 }}>{tollFee > 0 ? `+ ${formatVND(tollFee)}` : '0 ₫'}</span>
              </div>
            </div>
          </div>

          {/* Step 3: Promotion factor (η) and Tax (T) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
              3. Hệ số khuyến mãi (η) & Thuế VAT (T)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', backgroundColor: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <Tag size={14} className={discountAmount > 0 ? 'text-emerald-600' : ''} />
                  Hệ số khuyến mãi voucher (η):
                </span>
                <span style={{ fontWeight: 700, color: discountAmount > 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                  {discountAmount > 0 ? `x${retentionFactor} (Giảm ${formatVND(discountAmount)})` : 'x1.0 (Không áp dụng)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Thuế VAT (T = {(taxRate * 100).toFixed(0)}%):
                </span>
                <span style={{ fontWeight: 600 }}>+ {formatVND(taxAmount)}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  = Tổng tiền thanh toán (p):
                </span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                  {formatVND(finalTotal)}
                </strong>
              </div>
            </div>
          </div>

          {/* Explanation note */}
          <div 
            style={{ 
              fontSize: '0.785rem', 
              color: 'var(--text-muted)', 
              backgroundColor: '#ffffff', 
              border: '1px dashed var(--border-subtle)', 
              padding: '0.75rem', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}
          >
            <Info size={16} className="text-emerald-600" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Lưu ý:</strong> Cước cơ bản (Base Fare) được tính trực tiếp từ tổng tiền cước quãng đường (c<sub>d</sub> · d) và tiền cước thời gian (c<sub>t</sub> · t), hoàn toàn không có phí mở cửa hay tiền bước lên xe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
