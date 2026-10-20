import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_CONFIG } from '../services/api';
import type { DriverFoundData, DriverRejectedData, TripAcceptedData, NotificationLog } from '../types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

interface UseSignalROptions {
  hubUrl?: string;
  roleName: 'Rider' | 'Driver';
  onDriverFound?: (data: DriverFoundData) => void;
  onTripAccepted?: (data: TripAcceptedData) => void;
  onDriverRejected?: (data: DriverRejectedData) => void;
}

export function useSignalR({
  hubUrl,
  roleName,
  onDriverFound,
  onTripAccepted,
  onDriverRejected,
}: UseSignalROptions) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Store latest callbacks in refs to avoid rebuilding the connection on parent re-renders
  const callbacksRef = useRef({ onDriverFound, onTripAccepted, onDriverRejected });
  useEffect(() => {
    callbacksRef.current = { onDriverFound, onTripAccepted, onDriverRejected };
  }, [onDriverFound, onTripAccepted, onDriverRejected]);

  useEffect(() => {
    let isCancelled = false;
    let activeConnection: signalR.HubConnection | null = null;

    // Prefer Gateway URL first, fallback to direct Notification API port 5006
    const candidateUrls = hubUrl
      ? [hubUrl]
      : [
          `${API_CONFIG.GATEWAY_URL}/hubs/notification`,
          'http://localhost:5006/hubs/notification',
        ];

    const tryConnect = async (urlIndex: number) => {
      if (isCancelled) return;
      if (urlIndex >= candidateUrls.length) {
        setStatus('disconnected');
        return;
      }

      const targetUrl = candidateUrls[urlIndex];
      setStatus('connecting');
      console.log(`[SignalR - ${roleName}] Attempting connection to:`, targetUrl);

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(targetUrl, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      activeConnection = connection;
      connectionRef.current = connection;

      // Welcome event from server
      connection.on('Connected', (info: { connectionId: string; message: string }) => {
        if (isCancelled) return;
        console.log(`[SignalR - ${roleName}] Connected with Id:`, info.connectionId);
        setConnectionId(info.connectionId);
        setLogs((prev) => [
          {
            id: Math.random().toString(),
            type: 'System',
            title: `Kết nối thành công (${roleName})`,
            message: `WebSocket Connection ID: ${info.connectionId} qua ${targetUrl}`,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
      });

      // Event: DriverFoundEvent
      connection.on('DriverFound', (data: DriverFoundData) => {
        console.log(`[SignalR - ${roleName}] DriverFound:`, data);
        callbacksRef.current.onDriverFound?.(data);
        setLogs((prev) => [
          {
            id: Math.random().toString(),
            type: 'DriverFound',
            title: 'Sự kiện DriverFoundEvent',
            message: `Chuyến mới: ${data.pickupAddress} -> ${data.dropoffAddress} | Cước: ${Number(data.totalFare).toLocaleString('vi-VN')} đ`,
            timestamp: new Date().toISOString(),
            data,
          },
          ...prev,
        ]);
      });

      // Event: TripAcceptedEvent
      connection.on('TripAccepted', (data: TripAcceptedData) => {
        console.log(`[SignalR - ${roleName}] TripAccepted:`, data);
        callbacksRef.current.onTripAccepted?.(data);
        setLogs((prev) => [
          {
            id: Math.random().toString(),
            type: 'TripAccepted',
            title: 'Sự kiện TripAcceptedEvent',
            message: `Tài xế ${data.driverName || ''} đã nhận chuyến #${data.tripId?.slice(0, 8)}`,
            timestamp: new Date().toISOString(),
            data,
          },
          ...prev,
        ]);
      });

      // Event: DriverRejectEvent
      connection.on('DriverRejected', (data: DriverRejectedData) => {
        console.log(`[SignalR - ${roleName}] DriverRejected:`, data);
        callbacksRef.current.onDriverRejected?.(data);
        setLogs((prev) => [
          {
            id: Math.random().toString(),
            type: 'DriverRejected',
            title: 'Sự kiện DriverRejectEvent',
            message: `Tài xế đã từ chối chuyến #${data.tripId?.slice(0, 8)}: ${data.reason}`,
            timestamp: new Date().toISOString(),
            data,
          },
          ...prev,
        ]);
      });

      // Connection lifecycle events
      connection.onreconnecting(() => {
        if (!isCancelled) setStatus('reconnecting');
      });

      connection.onreconnected((newConnId) => {
        if (!isCancelled) {
          setStatus('connected');
          if (newConnId) setConnectionId(newConnId);
        }
      });

      connection.onclose(() => {
        if (!isCancelled) {
          setStatus('disconnected');
          setConnectionId(null);
        }
      });

      try {
        await connection.start();
        if (!isCancelled) {
          setStatus('connected');
          if (connection.connectionId) setConnectionId(connection.connectionId);
          console.log(`[SignalR - ${roleName}] Connected successfully to:`, targetUrl);
        }
      } catch (err) {
        console.warn(`[SignalR - ${roleName}] Failed connecting to ${targetUrl}, trying next candidate...`, err);
        if (!isCancelled) {
          tryConnect(urlIndex + 1);
        }
      }
    };

    tryConnect(0);

    return () => {
      isCancelled = true;
      if (activeConnection) {
        activeConnection.stop().catch(() => {});
      }
      if (connectionRef.current === activeConnection) {
        connectionRef.current = null;
      }
    };
  }, [hubUrl, roleName]);

  const reconnect = () => {
    if (connectionRef.current) {
      connectionRef.current.start().then(() => setStatus('connected')).catch(console.error);
    }
  };

  const clearLogs = () => setLogs([]);

  return {
    status,
    connectionId,
    logs,
    reconnect,
    clearLogs,
  };
}
