import React, { useState } from 'react';
import type { Wallet, LedgerEntry } from '../types';
import { topUpWallet } from '../services/api';
import { 
  Wallet as WalletIcon, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  PlusCircle, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface WalletSectionProps {
  userId: string;
  wallet: Wallet | null;
  ledgerEntries: LedgerEntry[];
  isLoadingWallet: boolean;
  isLoadingLedger: boolean;
  estimatedFare?: number;
  onRefresh: () => void;
  onWalletUpdated: (wallet: Wallet) => void;
}

export const WalletSection: React.FC<WalletSectionProps> = ({
  userId,
  wallet,
  ledgerEntries,
  isLoadingWallet,
  isLoadingLedger,
  estimatedFare,
  onRefresh,
  onWalletUpdated,
}) => {
  const [topUpAmount, setTopUpAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('100000');
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState<boolean>(false);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [isLedgerExpanded, setIsLedgerExpanded] = useState<boolean>(true);

  const formatVND = (val?: number) => {
    if (val === undefined || val === null) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSelectPreset = (amount: number) => {
    setTopUpAmount(amount);
    setCustomAmount(amount.toString());
  };

  const handleTopUp = async () => {
    const amount = Number(customAmount) || topUpAmount;
    if (!amount || amount <= 0) {
      setTopUpError('Vui lòng nhập số tiền nạp hợp lệ (> 0 ₫)');
      return;
    }

    setIsSubmittingTopUp(true);
    setTopUpError(null);
    setTopUpSuccess(null);

    try {
      const updated = await topUpWallet(userId, amount);
      onWalletUpdated(updated);
      setTopUpSuccess(`Đã nạp thành công +${formatVND(amount)} vào ví SwiftRide!`);
      onRefresh();
      setTimeout(() => {
        setTopUpSuccess(null);
      }, 5000);
    } catch (err: any) {
      setTopUpError(err.message || 'Nạp tiền vào ví thất bại.');
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  const balance = wallet?.balance ?? 0;
  const isFareCovered = estimatedFare ? balance >= estimatedFare : true;

  return (
    <div className="card" style={{ border: '1.5px solid var(--primary-border)', backgroundColor: '#ffffff' }}>
      {/* Wallet Header */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div 
            style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              backgroundColor: 'var(--primary-subtle)', 
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <WalletIcon size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Ví Điện Tử SwiftRide
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Mã ví: <code style={{ fontFamily: 'var(--font-mono)' }}>{wallet?.id ? wallet.id.slice(0, 8) + '...' : 'Đang tải'}</code>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
            <ShieldCheck size={12} />
            Đã kích hoạt
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingWallet || isLoadingLedger}
            title="Làm mới số dư và sổ cái"
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} className={isLoadingWallet || isLoadingLedger ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Balance Display & Sufficiency Check */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', 
          border: '1.5px solid var(--primary-border)', 
          borderRadius: '12px', 
          padding: '1.25rem', 
          marginBottom: '1.25rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Số Dư Khả Dụng
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {isLoadingWallet ? 'Đang tải...' : formatVND(balance)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Đơn vị tiền tệ: <strong>{wallet?.currency || 'VND'}</strong> • Thanh toán tự động khi kết thúc chuyến đi
            </div>
          </div>

          {estimatedFare && estimatedFare > 0 && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Cước chuyến đi này:</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {formatVND(estimatedFare)}
              </span>
            </div>
          )}
        </div>

        {/* Live Trip Balance Check */}
        {estimatedFare && estimatedFare > 0 && (
          <div 
            style={{ 
              marginTop: '0.85rem', 
              paddingTop: '0.75rem', 
              borderTop: '1px solid rgba(5, 150, 105, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.825rem'
            }}
          >
            {isFareCovered ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Số dư ví đủ để thanh toán chuyến đi! (Dư dự kiến sau chuyến: ~{formatVND(balance - estimatedFare)})
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-rose-500" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                  Số dư ví không đủ! Cần nạp thêm tối thiểu {formatVND(estimatedFare - balance)} để hoàn tất thanh toán.
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Top-Up Section (Cho phép nạp tiền qua ví đó) */}
      <div 
        style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid var(--border-light)', 
          borderRadius: '12px', 
          padding: '1rem 1.25rem', 
          marginBottom: '1.25rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <PlusCircle size={16} className="text-emerald-600" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Nạp tiền vào ví SwiftRide
          </h4>
        </div>

        {/* Preset Amount Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {[50000, 100000, 200000, 500000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => handleSelectPreset(amount)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: (Number(customAmount) === amount) ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                backgroundColor: (Number(customAmount) === amount) ? 'var(--primary-subtle)' : '#ffffff',
                color: (Number(customAmount) === amount) ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              +{formatVND(amount)}
            </button>
          ))}
        </div>

        {/* Custom Input & Top-up Button */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="number"
              min="10000"
              step="10000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Nhập số tiền nạp..."
              className="form-input"
              style={{ paddingRight: '2.5rem' }}
            />
            <span 
              style={{ 
                position: 'absolute', 
                right: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                fontSize: '0.8rem', 
                color: 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              VND
            </span>
          </div>

          <button
            type="button"
            onClick={handleTopUp}
            disabled={isSubmittingTopUp || !Number(customAmount)}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.15rem', whiteSpace: 'nowrap' }}
          >
            {isSubmittingTopUp ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Đang nạp...
              </>
            ) : (
              <>
                <PlusCircle size={15} />
                Nạp tiền ngay
              </>
            )}
          </button>
        </div>

        {/* Feedback messages */}
        {topUpSuccess && (
          <div 
            style={{ 
              marginTop: '0.65rem', 
              padding: '0.5rem 0.75rem', 
              backgroundColor: 'var(--primary-subtle)', 
              color: 'var(--primary)', 
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <CheckCircle2 size={15} />
            {topUpSuccess}
          </div>
        )}

        {topUpError && (
          <div 
            style={{ 
              marginTop: '0.65rem', 
              padding: '0.5rem 0.75rem', 
              backgroundColor: 'var(--accent-rose-subtle)', 
              color: 'var(--accent-rose)', 
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <AlertCircle size={15} />
            {topUpError}
          </div>
        )}
      </div>

      {/* Ledger Section (Sổ cái của ví đó) */}
      <div>
        <div 
          onClick={() => setIsLedgerExpanded(!isLedgerExpanded)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            cursor: 'pointer',
            userSelect: 'none',
            padding: '0.5rem 0',
            borderTop: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <History size={16} className="text-emerald-600" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Sổ cái giao dịch ví (Ledger)
            </h4>
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
              {ledgerEntries.length} bút toán
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>{isLedgerExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
            {isLedgerExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {isLedgerExpanded && (
          <div style={{ marginTop: '0.75rem' }}>
            {isLoadingLedger ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                Đang tải lịch sử sổ cái...
              </div>
            ) : ledgerEntries.length === 0 ? (
              <div 
                style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '10px', 
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}
              >
                Chưa có giao dịch biến động nào trong sổ cái ví.
              </div>
            ) : (
              <div 
                style={{ 
                  maxHeight: '280px', 
                  overflowY: 'auto', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-light)' 
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Thời gian</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Loại bút toán</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Số tiền</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Diễn giải</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry, index) => {
                      const isCredit = 
                        entry.entryType === 'Credit' || 
                        entry.entryType === 'credit' || 
                        String(entry.entryType) === '1';

                      return (
                        <tr 
                          key={entry.id || index}
                          style={{ 
                            borderBottom: '1px solid var(--border-light)',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fcfcfd'
                          }}
                        >
                          <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                            {formatDate(entry.createdAt)}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            {isCredit ? (
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem', 
                                  color: 'var(--primary)', 
                                  fontWeight: 700,
                                  backgroundColor: 'var(--primary-subtle)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '6px'
                                }}
                              >
                                <ArrowDownLeft size={13} />
                                Credit (Nạp/Hoàn)
                              </span>
                            ) : (
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem', 
                                  color: 'var(--accent-rose)', 
                                  fontWeight: 700,
                                  backgroundColor: 'var(--accent-rose-subtle)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '6px'
                                }}
                              >
                                <ArrowUpRight size={13} />
                                Debit (Thanh toán)
                              </span>
                            )}
                          </td>
                          <td 
                            style={{ 
                              padding: '0.6rem 0.75rem', 
                              fontWeight: 700, 
                              color: isCredit ? 'var(--primary)' : 'var(--accent-rose)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isCredit ? `+${formatVND(entry.amount)}` : `-${formatVND(entry.amount)}`}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-main)' }}>
                            <div>{entry.description || (isCredit ? 'Nạp tiền vào ví' : 'Thanh toán chuyến đi')}</div>
                            {entry.paymentId && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                PayRef: #{entry.paymentId.slice(0, 8)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
