// Tiện ích bản đồ và tính toán tọa độ TP.HCM
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PopularLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: 'landmark' | 'airport' | 'university' | 'mall' | 'station';
}

export const POPULAR_LOCATIONS: PopularLocation[] = [
  {
    name: 'Chợ Bến Thành',
    address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
    lat: 10.7725,
    lng: 106.6980,
    category: 'landmark'
  },
  {
    name: 'Landmark 81',
    address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
    lat: 10.7950,
    lng: 106.7218,
    category: 'landmark'
  },
  {
    name: 'Sân bay Tân Sơn Nhất',
    address: 'Đường Trường Sơn, Phường 2, Tân Bình, TP.HCM',
    lat: 10.8185,
    lng: 106.6588,
    category: 'airport'
  },
  {
    name: 'Tòa nhà Bitexco Financial',
    address: 'Số 2 Hải Triều, Bến Nghé, Quận 1, TP.HCM',
    lat: 10.7716,
    lng: 106.7044,
    category: 'landmark'
  },
  {
    name: 'Đại Học Sài Gòn (SGU)',
    address: '273 An Dương Vương, Phường 3, Quận 5, TP.HCM',
    lat: 10.7599,
    lng: 106.6823,
    category: 'university'
  },
  {
    name: 'Phố đi bộ Nguyễn Huệ',
    address: 'Đường Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM',
    lat: 10.7745,
    lng: 106.7032,
    category: 'landmark'
  },
  {
    name: 'ĐH Bách Khoa TP.HCM (Cơ sở 1)',
    address: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM',
    lat: 10.7723,
    lng: 106.6579,
    category: 'university'
  },
  {
    name: 'Chợ Lớn (Chợ Bình Tây)',
    address: '57A Tháp Mười, Phường 2, Quận 6, TP.HCM',
    lat: 10.7497,
    lng: 106.6514,
    category: 'landmark'
  },
  {
    name: 'Thảo Cầm Viên Sài Gòn',
    address: '2 Nguyễn Bỉnh Khiêm, Bến Nghé, Quận 1, TP.HCM',
    lat: 10.7876,
    lng: 106.7053,
    category: 'landmark'
  },
  {
    name: 'Nhà thờ Đức Bà Sài Gòn',
    address: '01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM',
    lat: 10.7798,
    lng: 106.6990,
    category: 'landmark'
  },
  {
    name: 'ĐH Quốc Gia TP.HCM (Làng Đại Học)',
    address: 'Khu phố 6, Linh Trung, TP. Thủ Đức, TP.HCM',
    lat: 10.8778,
    lng: 106.8016,
    category: 'university'
  },
  {
    name: 'Vinhomes Grand Park',
    address: 'Nguyễn Xiển, Long Thạnh Mỹ, TP. Thủ Đức, TP.HCM',
    lat: 10.8465,
    lng: 106.8378,
    category: 'landmark'
  }
];

// Công thức Haversine tính khoảng cách theo đường chim bay (km)
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính Trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  // Nhân hệ số đường đi đô thị xấp xỉ ~1.25x so với đường thẳng
  return Math.round(d * 1.25 * 10) / 10;
}

// Ước lượng thời gian di chuyển (phút) dựa trên vận tốc trung bình đô thị 25 km/h
export function estimateDurationMinutes(distanceKm: number): number {
  const avgSpeedKmH = 25;
  const minutes = (distanceKm / avgSpeedKmH) * 60;
  return Math.max(5, Math.round(minutes));
}

export interface DrivingRouteResult {
  coordinates: [number, number][]; // Mảng các điểm [lat, lng] cho Leaflet polyline
  distanceKm: number;
  durationMinutes: number;
  isRealRoute: boolean;
}

// Bộ nhớ đệm tạm thời cho route để tối ưu hiệu năng và tránh gọi lặp lại
const routeCache = new Map<string, DrivingRouteResult>();

// Lấy tuyến đường thực tế qua mạng lưới đường bộ OpenStreetMap (OSRM Driving Engine)
export async function fetchDrivingRoute(
  start: Coordinates,
  end: Coordinates
): Promise<DrivingRouteResult> {
  if (!start || !end || (start.lat === end.lat && start.lng === end.lng)) {
    return {
      coordinates: start ? [[start.lat, start.lng]] : [],
      distanceKm: 0,
      durationMinutes: 0,
      isRealRoute: false,
    };
  }

  const cacheKey = `${start.lat.toFixed(4)},${start.lng.toFixed(4)}->${end.lat.toFixed(4)},${end.lng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // OSRM format: lng1,lat1;lng2,lat2
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM trả về mảng [lng, lat], Leaflet cần [lat, lng]
        const latLngs: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(3, Math.round(route.duration / 60));

        const result: DrivingRouteResult = {
          coordinates: latLngs,
          distanceKm,
          durationMinutes,
          isRealRoute: true,
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Lỗi kết nối OSRM, fallback sang đường thẳng:', err);
  }

  // Dự phòng đường thẳng nếu OSRM gián đoạn mạng
  const fallbackDist = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);
  const fallbackDuration = estimateDurationMinutes(fallbackDist);
  const fallbackResult: DrivingRouteResult = {
    coordinates: [
      [start.lat, start.lng],
      [end.lat, end.lng],
    ],
    distanceKm: fallbackDist,
    durationMinutes: fallbackDuration,
    isRealRoute: false,
  };
  return fallbackResult;
}

// Reverse Geocoding lấy tên địa chỉ từ tọa độ
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // 1. Kiểm tra xem có trùng hoặc rất gần địa danh nổi tiếng không (< 300m)
  for (const loc of POPULAR_LOCATIONS) {
    const dist = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (dist < 0.3) {
      return loc.address;
    }
  }

  // 2. Thử truy vấn OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'vi, en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Rút gọn địa chỉ cho gọn gàng dễ đọc
        const parts = data.display_name.split(', ');
        if (parts.length > 4) {
          return parts.slice(0, 4).join(', ');
        }
        return data.display_name;
      }
    }
  } catch {
    // Ignore network error or timeout
  }

  // 3. Fallback về tọa độ
  return `Vị trí (${lat.toFixed(4)}, ${lng.toFixed(4)}) - TP.HCM`;
}
