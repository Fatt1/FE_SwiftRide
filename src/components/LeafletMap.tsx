import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Crosshair, Navigation, Clock } from 'lucide-react';
import { fetchDrivingRoute, type Coordinates, type DrivingRouteResult } from '../utils/mapUtils';

export interface LeafletMapProps {
  pickup?: (Coordinates & { address?: string }) | null;
  dropoff?: (Coordinates & { address?: string }) | null;
  driver?: (Coordinates & { name?: string }) | null;
  selectingMode?: 'pickup' | 'dropoff' | null;
  onSelectCoordinates?: (coords: Coordinates, mode: 'pickup' | 'dropoff') => void;
  onRouteCalculated?: (distanceKm: number, durationMinutes: number) => void;
  height?: string;
  zoom?: number;
  center?: [number, number];
  interactive?: boolean;
}

// Custom SVG Icons cho Leaflet divIcon với tọa độ anchor chuẩn xác 100%
const createPickupIcon = () =>
  L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        width: 84px;
        height: 60px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        cursor: pointer;
        user-select: none;
      ">
        <div style="
          background: #059669;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 4px;
          line-height: 1.2;
          border: 1.5px solid #ffffff;
        ">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#a7f3d0;"></span>
          Điểm đón
        </div>
        <svg width="26" height="34" viewBox="0 0 26 34" style="margin-top: 2px; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21c0-7.18-5.82-13-13-13z" fill="#059669" stroke="#ffffff" stroke-width="2" />
          <circle cx="13" cy="13" r="5" fill="#ffffff" />
        </svg>
      </div>
    `,
    iconSize: [84, 60],
    iconAnchor: [42, 60], // Đặt mũi nhọn dưới cùng của ghim chính xác 100% tại tọa độ GPS
    popupAnchor: [0, -60],
  });

const createDropoffIcon = () =>
  L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        width: 84px;
        height: 60px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        cursor: pointer;
        user-select: none;
      ">
        <div style="
          background: #e11d48;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 4px;
          line-height: 1.2;
          border: 1.5px solid #ffffff;
        ">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#fecdd3;"></span>
          Điểm đến
        </div>
        <svg width="26" height="34" viewBox="0 0 26 34" style="margin-top: 2px; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21c0-7.18-5.82-13-13-13z" fill="#e11d48" stroke="#ffffff" stroke-width="2" />
          <circle cx="13" cy="13" r="5" fill="#ffffff" />
        </svg>
      </div>
    `,
    iconSize: [84, 60],
    iconAnchor: [42, 60], // Đặt mũi nhọn dưới cùng của ghim chính xác 100% tại tọa độ GPS
    popupAnchor: [0, -60],
  });

const createDriverIcon = (name?: string, isAssigned = false) =>
  L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        width: 90px;
        height: 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        cursor: pointer;
        user-select: none;
      ">
        ${
          name
            ? `
          <div style="
            background: ${isAssigned ? '#2563eb' : '#0f172a'};
            color: white;
            padding: 2px 7px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            margin-bottom: 2px;
            border: 1px solid rgba(255,255,255,0.8);
          ">
            🚗 ${name}
          </div>
        `
            : ''
        }
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${isAssigned ? '#2563eb' : '#3b82f6'};
          border: 2.5px solid #ffffff;
          box-shadow: 0 3px 8px rgba(37,99,235,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">
          🚗
        </div>
      </div>
    `,
    iconSize: [90, 56],
    iconAnchor: [45, 39], // Tâm của vòng tròn xe
    popupAnchor: [0, -39],
  });

export const LeafletMap: React.FC<LeafletMapProps> = ({
  pickup,
  dropoff,
  driver,
  selectingMode = null,
  onSelectCoordinates,
  onRouteCalculated,
  height = '420px',
  zoom = 13,
  center = [10.7769, 106.7009], // Trung tâm Quận 1, TP.HCM
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesGroupRef = useRef<L.LayerGroup | null>(null);
  const [routeInfo, setRouteInfo] = useState<DrivingRouteResult | null>(null);

  // Lưu trữ callback trong ref để tránh re-render loop
  const onRouteCalculatedRef = useRef(onRouteCalculated);
  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  });

  const onSelectCoordinatesRef = useRef(onSelectCoordinates);
  useEffect(() => {
    onSelectCoordinatesRef.current = onSelectCoordinates;
  });

  // Ghi nhớ key của lộ trình đã fitBounds để không gọi lại fitBounds khi người dùng đang zoom
  const lastFittedKeyRef = useRef<string>('');

  // Khởi tạo bản đồ
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Đã khởi tạo

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false, // Dùng custom position hoặc add control ở góc phải
      scrollWheelZoom: true, // Cho phép cuộn chuột phóng to thu nhỏ
      doubleClickZoom: true, // Cho phép nhấp đúp để phóng to
      touchZoom: true, // Hỗ trợ cảm ứng pinch-to-zoom
      dragging: true, // Cho phép kéo di chuyển bản đồ
    });

    // Thêm zoom control ở góc trên bên phải
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Sử dụng OpenStreetMap chuẩn (100% miễn phí, không bao giờ yêu cầu API Key)
    const baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    });

    // Tự động dự phòng sang Esri World Street Map nếu có tile bị gián đoạn mạng
    baseLayer.on('tileerror', (error) => {
      const img = (error as any).tile as HTMLImageElement;
      const coords = (error as any).coords;
      if (img && coords && !img.dataset.retried) {
        img.dataset.retried = 'true';
        img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${coords.z}/${coords.y}/${coords.x}`;
      }
    });

    baseLayer.addTo(map);

    // Layer chứa các tuyến đường điều hướng thực tế
    const routesLayer = L.layerGroup().addTo(map);
    routesGroupRef.current = routesLayer;

    // Layer chứa các Marker (Đón, Đến, Tài xế)
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    // Fix lỗi bản đồ bị xám do container chưa tính toán xong kích thước
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Xử lý sự kiện click vào bản đồ để chọn tọa độ
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (selectingMode && onSelectCoordinates) {
        onSelectCoordinates(
          { lat: e.latlng.lat, lng: e.latlng.lng },
          selectingMode
        );
      }
    };

    map.on('click', handleMapClick);

    // Đổi con trỏ chuột sang crosshair khi đang trong chế độ chọn điểm
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = selectingMode ? 'crosshair' : 'grab';
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [selectingMode, onSelectCoordinates]);

  // Cập nhật Markers và Tuyến đường dẫn đường thực tế
  const pickupKey = pickup && pickup.lat && pickup.lng ? `${pickup.lat.toFixed(5)},${pickup.lng.toFixed(5)}` : '';
  const dropoffKey = dropoff && dropoff.lat && dropoff.lng ? `${dropoff.lat.toFixed(5)},${dropoff.lng.toFixed(5)}` : '';
  const driverKey = driver && driver.lat && driver.lng ? `${driver.lat.toFixed(5)},${driver.lng.toFixed(5)}` : '';
  const currentRouteKey = `${pickupKey}->${dropoffKey}+${driverKey}`;

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routesGroup = routesGroupRef.current;
    if (!map || !markersLayer || !routesGroup) return;

    let isCancelled = false;
    markersLayer.clearLayers();
    routesGroup.clearLayers();

    const boundsLatLngs: L.LatLngExpression[] = [];

    // 1. Thêm Pickup Marker
    if (pickup && pickup.lat && pickup.lng) {
      const latlng: L.LatLngExpression = [pickup.lat, pickup.lng];
      boundsLatLngs.push(latlng);

      const pickupMarker = L.marker(latlng, {
        icon: createPickupIcon(),
        draggable: interactive,
      }).addTo(markersLayer);

      pickupMarker.bindPopup(`
        <div style="font-family: system-ui; padding: 2px;">
          <b style="color: #059669;">🟢 Điểm đón khách</b><br />
          <span style="font-size: 12px; color: #334155;">${pickup.address || 'Đã chọn trên bản đồ'}</span><br />
          <span style="font-size: 11px; color: #64748b;">(${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)})</span>
          ${interactive ? '<br/><i style="font-size: 10px; color: #94a3b8;">Có thể kéo marker để chỉnh vị trí</i>' : ''}
        </div>
      `);

      if (interactive) {
        pickupMarker.on('dragend', (e) => {
          const newPos = (e.target as L.Marker).getLatLng();
          onSelectCoordinatesRef.current?.({ lat: newPos.lat, lng: newPos.lng }, 'pickup');
        });
      }
    }

    // 2. Thêm Dropoff Marker
    if (dropoff && dropoff.lat && dropoff.lng) {
      const latlng: L.LatLngExpression = [dropoff.lat, dropoff.lng];
      boundsLatLngs.push(latlng);

      const dropoffMarker = L.marker(latlng, {
        icon: createDropoffIcon(),
        draggable: interactive,
      }).addTo(markersLayer);

      dropoffMarker.bindPopup(`
        <div style="font-family: system-ui; padding: 2px;">
          <b style="color: #e11d48;">🎯 Điểm đến (Trả khách)</b><br />
          <span style="font-size: 12px; color: #334155;">${dropoff.address || 'Đã chọn trên bản đồ'}</span><br />
          <span style="font-size: 11px; color: #64748b;">(${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)})</span>
          ${interactive ? '<br/><i style="font-size: 10px; color: #94a3b8;">Có thể kéo marker để chỉnh vị trí</i>' : ''}
        </div>
      `);

      if (interactive) {
        dropoffMarker.on('dragend', (e) => {
          const newPos = (e.target as L.Marker).getLatLng();
          onSelectCoordinatesRef.current?.({ lat: newPos.lat, lng: newPos.lng }, 'dropoff');
        });
      }
    }

    // 3. Thêm Driver Marker nhận cuốc (nếu có)
    if (driver && driver.lat && driver.lng) {
      const latlng: L.LatLngExpression = [driver.lat, driver.lng];
      boundsLatLngs.push(latlng);

      const driverMarker = L.marker(latlng, {
        icon: createDriverIcon(driver.name || 'Tài xế của bạn', true),
      }).addTo(markersLayer);

      driverMarker.bindPopup(`
        <div style="font-family: system-ui; padding: 2px;">
          <b style="color: #2563eb;">🚗 ${driver.name || 'Tài xế nhận chuyến'}</b><br />
          <span style="font-size: 11px; color: #64748b;">(${driver.lat.toFixed(4)}, ${driver.lng.toFixed(4)})</span>
        </div>
      `);
    }

    // 4. Vẽ tuyến đường dẫn đường thực tế (OSRM Turn-by-turn Driving Route)
    if (pickup && dropoff && pickup.lat && dropoff.lat) {
      fetchDrivingRoute(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: dropoff.lat, lng: dropoff.lng }
      ).then((routeRes) => {
        if (isCancelled || !routesGroupRef.current || !mapInstanceRef.current) return;

        routesGroupRef.current.clearLayers();
        setRouteInfo(routeRes);

        onRouteCalculatedRef.current?.(routeRes.distanceKm, routeRes.durationMinutes);

        // Lớp viền shadow / halo tạo độ nổi 3D cho đường đi
        L.polyline(routeRes.coordinates, {
          color: '#064e3b',
          weight: 8,
          opacity: 0.25,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routesGroupRef.current);

        // Lớp nét chính màu xanh lá theo chuẩn dẫn đường thực tế
        const mainLine = L.polyline(routeRes.coordinates, {
          color: '#059669',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routesGroupRef.current);

        mainLine.bindPopup(`
          <div style="font-family: system-ui; padding: 3px;">
            <b style="color: #059669;">🛣️ Tuyến đường dẫn đường thực tế</b><br />
            <span>Khoảng cách: <strong>${routeRes.distanceKm} km</strong></span><br />
            <span>Thời gian di chuyển ước tính: <strong>~${routeRes.durationMinutes} phút</strong></span>
          </div>
        `);

        // CHỈ tự động căn chỉnh zoom 1 lần khi tọa độ lộ trình thay đổi thực sự
        // Không override mức zoom người dùng đang phóng to / thu nhỏ
        if (lastFittedKeyRef.current !== currentRouteKey) {
          lastFittedKeyRef.current = currentRouteKey;
          const routeBounds = L.latLngBounds(routeRes.coordinates);
          if (driver && driver.lat && driver.lng) {
            routeBounds.extend([driver.lat, driver.lng]);
          }
          map.fitBounds(routeBounds, {
            padding: [50, 50],
            maxZoom: 16,
            animate: true,
          });
        }

        // 5. Nếu có tài xế nhận cuốc, vẽ thêm đường dẫn từ vị trí tài xế đến điểm đón khách
        if (driver && driver.lat && driver.lng) {
          fetchDrivingRoute(
            { lat: driver.lat, lng: driver.lng },
            { lat: pickup.lat, lng: pickup.lng }
          ).then((driverRoute) => {
            if (isCancelled || !routesGroupRef.current) return;

            L.polyline(driverRoute.coordinates, {
              color: '#1d4ed8',
              weight: 7,
              opacity: 0.2,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(routesGroupRef.current);

            L.polyline(driverRoute.coordinates, {
              color: '#2563eb',
              weight: 4,
              opacity: 0.9,
              dashArray: '6, 8',
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(routesGroupRef.current);
          });
        }
      });
    } else {
      setRouteInfo(null);
      if (lastFittedKeyRef.current !== currentRouteKey) {
        lastFittedKeyRef.current = currentRouteKey;
        if (boundsLatLngs.length >= 2) {
          const bounds = L.latLngBounds(boundsLatLngs);
          map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 15,
            animate: true,
          });
        } else if (boundsLatLngs.length === 1) {
          map.setView(boundsLatLngs[0], 14, { animate: true });
        }
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [pickupKey, dropoffKey, driverKey, pickup?.address, dropoff?.address, interactive, currentRouteKey]);

  // Nút căn giữa lại TP.HCM
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Driving Route Metrics Overlay */}
      {routeInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(6px)',
            borderRadius: '10px',
            padding: '6px 12px',
            border: '1px solid var(--border-light)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#1e293b',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669' }}>
            <Navigation size={14} />
            <span>{routeInfo.distanceKm} km</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2563eb' }}>
            <Clock size={14} />
            <span>~{routeInfo.durationMinutes} phút</span>
          </div>
          <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
            Theo đường thực tế
          </span>
        </div>
      )}

      {/* Floating Mode Indicator & Help Tip */}
      {selectingMode && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: selectingMode === 'pickup' ? '#059669' : '#e11d48',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            animation: 'slideDown 0.2s ease-out',
            pointerEvents: 'none',
          }}
        >
          <Crosshair size={16} />
          {selectingMode === 'pickup'
            ? 'Đang chọn Điểm đón: Nhấp vào bản đồ để ghim điểm 🟢'
            : 'Đang chọn Điểm đến: Nhấp vào bản đồ để ghim điểm 🎯'}
        </div>
      )}

      {/* Reset Center / Fit Control button */}
      <button
        type="button"
        onClick={handleResetView}
        title="Toàn cảnh trung tâm TP.HCM"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 1000,
          backgroundColor: '#ffffff',
          color: '#334155',
          border: '1px solid var(--border-light)',
          borderRadius: '10px',
          padding: '8px 12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        <Maximize2 size={13} />
        Về trung tâm TP.HCM
      </button>
    </div>
  );
};
