import React from 'react';
import type { NotificationLog } from '../types';
import { sendTestNotification } from '../services/api';
import { Activity, Radio, Trash2, Send, CheckCircle2, XCircle, Bell } from 'lucide-react';

interface WebSocketLogsProps {
  logs: NotificationLog[];
  onClearLogs: () => void;
  connectionState: string;
}

export const WebSocketLogs: React.FC<WebSocketLogsProps> = ({
  logs,
  onClearLogs,
  connectionState,
}) => {
  const handleTriggerTest = async (type: string) => {
    try {
      await sendTestNotification(type);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi test notification');
    }
  };

  return (
    <div className="card glass-panel h-full flex flex-col">
      <div className="card-header border-b border-glass pb-3">
        <div className="flex items-center gap-2">
          <Activity className="icon text-primary" />
          <h3 className="title-sm">Nhật Ký Sự Kiện WebSocket</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${connectionState === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="text-xs text-muted capitalize">{connectionState}</span>
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="btn-icon"
              title="Xóa nhật ký"
            >
              <Trash2 className="icon-xs text-muted hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Test Buttons */}
      <div className="p-3 bg-surface-dark border-b border-glass">
        <div className="text-xs text-muted mb-2 font-medium">Bắn sự kiện Test trực tiếp qua WebSocket:</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTriggerTest('driverfound')}
            className="btn-badge btn-badge-primary"
            title="Bắn DriverFoundEvent"
          >
            <Send className="icon-xxs" /> Test DriverFound
          </button>
          <button
            onClick={() => handleTriggerTest('tripaccepted')}
            className="btn-badge btn-badge-success"
            title="Bắn TripAcceptedEvent"
          >
            <CheckCircle2 className="icon-xxs" /> Test TripAccepted
          </button>
          <button
            onClick={() => handleTriggerTest('driverrejected')}
            className="btn-badge btn-badge-danger"
            title="Bắn DriverRejectEvent"
          >
            <XCircle className="icon-xxs" /> Test DriverReject
          </button>
        </div>
      </div>

      {/* Log items container */}
      <div className="logs-container flex-1 overflow-y-auto p-3 space-y-2 max-h-96">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted text-xs">
            <Radio className="icon-sm mx-auto mb-2 opacity-40 animate-pulse" />
            Chưa có sự kiện nào. Hãy tạo chuyến hoặc dùng nút Test bên trên.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`log-item p-2.5 rounded-lg border text-xs animate-fade-in ${
                log.type === 'DriverFound'
                  ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                  : log.type === 'TripAccepted'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : log.type === 'DriverRejected'
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Bell className="icon-xxs" />
                  {log.title}
                </span>
                <span className="text-[10px] opacity-75 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-[11px] opacity-90 leading-relaxed">
                {log.message}
              </div>
              {log.data && (
                <div className="mt-1 pt-1 border-t border-white/10 text-[10px] font-mono opacity-70 truncate">
                  TripId: {log.data.tripId?.slice(0, 8)}... | Fare: {log.data.totalFare ? `${Number(log.data.totalFare).toLocaleString('vi-VN')} đ` : '-'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
