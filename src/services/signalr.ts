import * as signalR from '@microsoft/signalr';
import { API_CONFIG } from './api';
import type { DriverFoundData, DriverRejectedData, TripAcceptedData } from '../types';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: {
    onDriverFound?: (data: DriverFoundData) => void;
    onTripAccepted?: (data: TripAcceptedData) => void;
    onDriverRejected?: (data: DriverRejectedData) => void;
    onNotification?: (notification: any) => void;
    onStateChange?: (state: ConnectionState) => void;
  } = {};

  public getState(): ConnectionState {
    if (!this.connection) return 'disconnected';
    switch (this.connection.state) {
      case signalR.HubConnectionState.Connected:
        return 'connected';
      case signalR.HubConnectionState.Connecting:
        return 'connecting';
      case signalR.HubConnectionState.Reconnecting:
        return 'reconnecting';
      default:
        return 'disconnected';
    }
  }

  public registerListeners(callbacks: {
    onDriverFound?: (data: DriverFoundData) => void;
    onTripAccepted?: (data: TripAcceptedData) => void;
    onDriverRejected?: (data: DriverRejectedData) => void;
    onNotification?: (notification: any) => void;
    onStateChange?: (state: ConnectionState) => void;
  }) {
    this.listeners = { ...this.listeners, ...callbacks };
  }

  public async startConnection(hubUrl?: string): Promise<boolean> {
    const url = hubUrl || `${API_CONFIG.NOTIFICATION_URL}/hubs/notification`;

    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return true;
    }

    try {
      this.listeners.onStateChange?.('connecting');

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(url, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup Event Handlers
      this.connection.on('DriverFound', (data: DriverFoundData) => {
        console.log('[SignalR] DriverFound event received:', data);
        this.listeners.onDriverFound?.(data);
      });

      this.connection.on('TripAccepted', (data: TripAcceptedData) => {
        console.log('[SignalR] TripAccepted event received:', data);
        this.listeners.onTripAccepted?.(data);
      });

      this.connection.on('DriverRejected', (data: DriverRejectedData) => {
        console.log('[SignalR] DriverRejected event received:', data);
        this.listeners.onDriverRejected?.(data);
      });

      this.connection.on('ReceiveNotification', (notification: any) => {
        console.log('[SignalR] ReceiveNotification:', notification);
        this.listeners.onNotification?.(notification);
      });

      this.connection.onreconnecting(() => {
        console.warn('[SignalR] Reconnecting...');
        this.listeners.onStateChange?.('reconnecting');
      });

      this.connection.onreconnected(() => {
        console.log('[SignalR] Reconnected successfully.');
        this.listeners.onStateChange?.('connected');
      });

      this.connection.onclose(() => {
        console.warn('[SignalR] Connection closed.');
        this.listeners.onStateChange?.('disconnected');
      });

      await this.connection.start();
      console.log('[SignalR] Connected successfully to:', url);
      this.listeners.onStateChange?.('connected');
      return true;
    } catch (err) {
      console.error('[SignalR] Connection error:', err);
      this.listeners.onStateChange?.('disconnected');
      return false;
    }
  }

  public async stopConnection() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.listeners.onStateChange?.('disconnected');
    }
  }
}

export const signalRService = new SignalRService();
