import type { 
  TripCreatedResponse, 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  AuthUser,
  DriverLocation,
  MatchSession,
  TripItem,
  DropOffPayload,
  Wallet,
  LedgerEntry
} from '../types';

export const API_CONFIG = {
  // All requests route through YARP API Gateway
  GATEWAY_URL: 'http://localhost:5000',
  NOTIFICATION_URL: 'http://localhost:5000',
  TRIP_URL: 'http://localhost:5000',
  MATCHING_URL: 'http://localhost:5000',
  IDENTITY_URL: 'http://localhost:5000',
};

const TOKEN_KEY = 'swiftride_token';
const USER_KEY = 'swiftride_user';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): AuthUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Helper to inject Bearer token automatically
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
  });
}

// Auth API Calls
export async function loginApi(credentials: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_CONFIG.IDENTITY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    let errorDetail = 'Đăng nhập không thành công';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.title || errJson.message || errorDetail;
    } catch {
      const text = await res.text();
      if (text) errorDetail = text;
    }
    throw new Error(errorDetail);
  }

  const data: AuthResponse = await res.json();
  if (data.accessToken) {
    setAuthToken(data.accessToken);
    setStoredUser({
      id: data.userId,
      userName: data.userName,
      email: data.email,
      fullName: data.fullName || data.userName,
      roles: data.roles || ['Rider'],
    });
  }
  return data;
}

export async function registerApi(data: RegisterRequest): Promise<any> {
  const res = await fetch(`${API_CONFIG.IDENTITY_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorDetail = 'Đăng ký không thành công';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.title || errJson.message || errorDetail;
    } catch {
      const text = await res.text();
      if (text) errorDetail = text;
    }
    throw new Error(errorDetail);
  }

  return await res.json();
}

// Fallback seed riders if Identity Service has no response
export const DEFAULT_RIDERS: User[] = [
  {
    id: 'c0a80123-4567-89ab-cdef-0123456789ab',
    userName: 'rider01',
    fullName: 'Nguyễn Văn An (Rider 1)',
    email: 'rider01@swiftride.com',
    role: 'Rider',
  },
  {
    id: 'c0a80123-4567-89ab-cdef-0123456789cd',
    userName: 'rider02',
    fullName: 'Lê Thị Bình (Rider 2)',
    email: 'rider02@swiftride.com',
    role: 'Rider',
  },
  {
    id: 'c0a80123-4567-89ab-cdef-0123456789ef',
    userName: 'rider03',
    fullName: 'Trần Minh Cường (Rider 3)',
    email: 'rider03@swiftride.com',
    role: 'Rider',
  },
];

// Fallback seed drivers
export const DEFAULT_DRIVERS: User[] = [
  {
    id: 'b2f9e955-8890-4169-b641-04b490695bb8',
    userName: 'driver_giaphuc',
    fullName: 'Đỗ Gia Phúc (Tài xế Công nghệ)',
    email: 'giaphuc.do@swiftride.com',
    role: 'Driver',
  },
  {
    id: '46fe866d-75ea-4cb9-9b5c-d9a4bb0a7c65',
    userName: 'driver_vanhung',
    fullName: 'Nguyễn Văn Hùng (Tài xế)',
    email: 'vanhung.nguyen@swiftride.com',
    role: 'Driver',
  },
  {
    id: '9d66494a-3e61-429e-aaaf-31d46a04ef59',
    userName: 'driver_thanhhai',
    fullName: 'Trần Thanh Hải (Tài xế)',
    email: 'thanhhai.tran@swiftride.com',
    role: 'Driver',
  },
  {
    id: '33f50b18-f7f1-4ffe-8808-dda07c21d0a9',
    userName: 'driver_manhcuong',
    fullName: 'Lê Mạnh Cường (Tài xế)',
    email: 'manhcuong.le@swiftride.com',
    role: 'Driver',
  },
];

export async function fetchRiders(): Promise<User[]> {
  try {
    const res = await authFetch(`${API_CONFIG.IDENTITY_URL}/api/v1/auth/riders`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Cannot fetch riders from Identity.API, using fallback seeds', err);
  }
  return DEFAULT_RIDERS;
}

export async function fetchDrivers(): Promise<User[]> {
  try {
    const res = await authFetch(`${API_CONFIG.IDENTITY_URL}/api/v1/auth/drivers`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Cannot fetch drivers from Identity.API, using fallback seeds', err);
  }
  return DEFAULT_DRIVERS;
}

export interface CreateTripRequest {
  riderId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  hasToll: boolean;
  promoCode?: string;
  isRaining: boolean;
}

export async function createTrip(payload: CreateTripRequest): Promise<TripCreatedResponse> {
  const res = await authFetch(`${API_CONFIG.TRIP_URL}/api/v1/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Tạo chuyến thất bại (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export interface MatchDriverRequest {
  tripId: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  riderId?: string;
}

export async function matchDriver(payload: MatchDriverRequest): Promise<any> {
  const res = await authFetch(`${API_CONFIG.MATCHING_URL}/api/v1/matching/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Tìm tài xế thất bại (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export async function acceptTrip(tripId: string, driverId: string): Promise<any> {
  const res = await authFetch(`${API_CONFIG.TRIP_URL}/api/v1/trips/${tripId}/driver-accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ driverId }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Nhận chuyến thất bại (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export async function rejectTrip(tripId: string, driverId: string): Promise<any> {
  const res = await authFetch(`${API_CONFIG.TRIP_URL}/api/v1/trips/${tripId}/driver-reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ driverId }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Từ chối chuyến thất bại (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export async function sendTestNotification(type: string): Promise<any> {
  const res = await fetch(`${API_CONFIG.NOTIFICATION_URL}/api/v1/notifications/test?type=${type}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Bắn test notification thất bại (${res.status})`);
  }
  return await res.json();
}

// 1. Lấy danh sách vị trí tất cả tài xế từ Matching Service
export async function fetchDriverLocations(): Promise<DriverLocation[]> {
  const res = await authFetch(`${API_CONFIG.MATCHING_URL}/api/v1/matching/drivers/locations`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lấy danh sách vị trí tài xế thất bại (${res.status}): ${errorText}`);
  }
  return await res.json();
}

// 2. Lấy danh sách tất cả các phiên matching từ Matching Service
export async function fetchMatchSessions(): Promise<MatchSession[]> {
  const res = await authFetch(`${API_CONFIG.MATCHING_URL}/api/v1/matching/matchings`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lấy danh sách matching thất bại (${res.status}): ${errorText}`);
  }
  return await res.json();
}

// 3. Lấy danh sách các chuyến đi từ Trip Service
export async function fetchAllTrips(params?: { driverId?: string; riderId?: string; status?: string }): Promise<TripItem[]> {
  const query = new URLSearchParams();
  if (params?.driverId) query.append('driverId', params.driverId);
  if (params?.riderId) query.append('riderId', params.riderId);
  if (params?.status) query.append('status', params.status);

  const qs = query.toString();
  const url = `${API_CONFIG.TRIP_URL}/api/v1/trips${qs ? `?${qs}` : ''}`;

  const res = await authFetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lấy danh sách chuyến đi thất bại (${res.status}): ${errorText}`);
  }
  return await res.json();
}

// 4. Tài xế bấm đón khách (Pickup)
export async function pickupTrip(tripId: string): Promise<any> {
  const res = await authFetch(`${API_CONFIG.TRIP_URL}/api/v1/trips/${tripId}/pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    let errorDetail = `Đón khách thất bại (${res.status})`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.title || errorDetail;
    } catch {
      const text = await res.text();
      if (text) errorDetail = text;
    }
    throw new Error(errorDetail);
  }
  return await res.json();
}

// 5. Tài xế trả khách (Dropoff) và kích hoạt thanh toán
export async function dropoffTrip(tripId: string, payload: DropOffPayload): Promise<any> {
  const res = await authFetch(`${API_CONFIG.TRIP_URL}/api/v1/trips/${tripId}/dropoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let errorDetail = `Trả khách thất bại (${res.status})`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.title || errorDetail;
    } catch {
      const text = await res.text();
      if (text) errorDetail = text;
    }
    throw new Error(errorDetail);
  }
  return await res.json();
}

// 6. Lấy thông tin ví của người dùng theo UserId
export async function fetchUserWallet(userId: string): Promise<Wallet> {
  const res = await authFetch(`${API_CONFIG.GATEWAY_URL}/api/v1/payments/wallets/user/${userId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lấy thông tin ví thất bại (${res.status}): ${errorText}`);
  }
  return await res.json();
}

// 7. Lấy lịch sử biến động sổ cái (Ledger) của người dùng
export async function fetchWalletLedger(userId: string): Promise<LedgerEntry[]> {
  const res = await authFetch(`${API_CONFIG.GATEWAY_URL}/api/v1/payments/wallets/user/${userId}/ledger`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lấy lịch sử sổ cái thất bại (${res.status}): ${errorText}`);
  }
  return await res.json();
}

// 8. Nạp tiền vào ví người dùng (Top-Up)
export async function topUpWallet(userId: string, amount: number): Promise<Wallet> {
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

  const res = await authFetch(`${API_CONFIG.GATEWAY_URL}/api/v1/payments/wallets/${userId}/top-up`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      idempotencyKey,
      amount,
    }),
  });

  if (!res.ok) {
    let errorDetail = `Nạp tiền thất bại (${res.status})`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.title || errorDetail;
    } catch {
      const text = await res.text();
      if (text) errorDetail = text;
    }
    throw new Error(errorDetail);
  }

  return await res.json();
}



