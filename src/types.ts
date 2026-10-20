export interface User {
  id: string;
  userName: string;
  fullName: string;
  email: string;
  role: 'Rider' | 'Driver';
  createdAt?: string;
}

export interface AuthUser {
  id: string;
  userName: string;
  email: string;
  fullName?: string;
  roles: string[];
}

export interface LoginRequest {
  userNameOrEmail: string;
  password?: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password?: string;
  fullName: string;
  role: 'Rider' | 'Driver';
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  userName: string;
  email: string;
  fullName?: string;
  roles: string[];
}

export interface AppliedSurge {
  type?: string;
  name?: string;
  multiplier?: number;
}

export interface PricingBreakdown {
  distanceFare: number;
  timeFare: number;
  taxRate: number;
  baseFare: number;
  retentionFactor: number;
  fareAfterSurge: number;
  fareAfterDiscount: number;
  tollFee: number;
  discountAmount: number;
  taxAmount: number;
  finalTotal: number;
  distanceKm: number;
  estimatedMinutes: number;
  appliedSurges?: AppliedSurge[];
}

export interface TripCreatedResponse {
  tripId: string;
  riderId: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distanceKm: number;
  createdAt: string;
  pricing?: PricingBreakdown;
}

export interface DriverFoundData {
  tripId: string;
  driverId: string;
  driverName: string;
  riderId?: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalFare: number;
  estimatedDurationMinutes: number;
  distanceKm: number;
  timestamp: string;
}

export interface TripAcceptedData {
  tripId: string;
  driverId: string;
  driverName?: string;
  riderId?: string;
  status: string;
  timestamp: string;
}

export interface DriverRejectedData {
  tripId: string;
  driverId: string;
  riderId?: string;
  reason: string;
  status: string;
  timestamp: string;
}

export interface NotificationLog {
  id: string;
  type: 'DriverFound' | 'TripAccepted' | 'DriverRejected' | 'System';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface DriverLocation {
  id: string;
  driverId: string;
  fullName: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  updatedAt: string;
}

export interface MatchSession {
  id: string;
  tripId: string;
  pickupLat: number;
  pickupLng: number;
  distanceKm: number;
  estimatedMinutes: number;
  pricingBreakdown?: PricingBreakdown;
  matchedDriverId?: string;
  driverAttempts?: { driverId: string; attemptedAt: string }[];
  status: string;
  createdAt: string;
  lastModifiedAt: string;
}

export interface TripItem {
  id: string;
  riderId: string;
  driverId?: string;
  status: 'Requested' | 'DriverAccepted' | 'PickedUp' | 'DroppedOff' | 'Completed' | 'Cancelled' | string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedFare?: number;
  finalFare?: number;
  distanceKm?: number;
  createdAt: string;
}

export interface DropOffPayload {
  paymentMethod: number; // 0: Wallet, 1: Card
  gatewayToken?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
}

export interface LedgerEntry {
  id: string;
  paymentId?: string;
  walletId?: string;
  paymentMethod: string | number;
  entryType: 'Debit' | 'Credit' | string;
  amount: number;
  description?: string;
  createdAt: string;
}


