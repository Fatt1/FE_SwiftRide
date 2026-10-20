import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Car, 
  UserCheck, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  ChevronRight,
  Receipt,
  Radio,
  ArrowRight
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.35rem 0.85rem', 
            borderRadius: '9999px', 
            backgroundColor: 'var(--primary-subtle)', 
            border: '1px solid var(--primary-border)',
            color: 'var(--primary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1.25rem'
          }}
        >
          <Sparkles size={15} />
          Nền tảng đặt xe công nghệ thế hệ mới
        </div>

        <h1 
          style={{ 
            fontSize: '2.6rem', 
            fontWeight: 800, 
            lineHeight: 1.25, 
            color: 'var(--text-main)', 
            letterSpacing: '-0.03em', 
            marginBottom: '1.25rem' 
          }}
        >
          Đặt xe nhanh chóng, <br />
          <span style={{ color: 'var(--primary)' }}>Minh bạch từng chặng đường</span>
        </h1>

        <p 
          style={{ 
            fontSize: '1.1rem', 
            color: 'var(--text-muted)', 
            lineHeight: 1.6, 
            marginBottom: '2rem' 
          }}
        >
          SwiftRide kết nối hành khách và đối tác tài xế trong tích tắc. 
          Định giá chi tiết minh bạch, ghép nối thông minh và thông báo trực tiếp qua WebSocket theo thời gian thực.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/rider" className="btn btn-primary btn-lg">
            <UserCheck size={18} />
            Đặt xe ngay (Hành khách)
            <ArrowRight size={16} />
          </Link>

          <Link to="/driver" className="btn btn-outline btn-lg">
            <Car size={18} />
            Cổng đối tác Tài xế
          </Link>
        </div>

        {isAuthenticated && user && (
          <div style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600 }}>
            Xin chào <strong>{user.fullName || user.userName}</strong>! Bạn đang đăng nhập với tư cách {user.roles.includes('Driver') ? 'Tài xế' : 'Hành khách'}.
          </div>
        )}
      </div>

      {/* 2 Main Portals Cards */}
      <div className="grid-2" style={{ marginBottom: '4rem' }}>
        {/* Rider Portal Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                backgroundColor: 'var(--primary-subtle)', 
                color: 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <UserCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Dành cho Hành khách (Rider)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Chọn điểm đón và điểm đến, kiểm tra công thức tính giá chi tiết từ máy chủ, 
              tạo chuyến xe và tìm tài xế gần bạn nhất với thông báo nhận cuốc tức thì.
            </p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Xem chi tiết từng thành phần giá (cước km, phụ phí, thuế VAT)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Tùy chọn thời tiết mưa, phí cầu đường, mã giảm giá</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Nhận thông báo khi tài xế chấp nhận hoặc từ chối chuyến đi</span>
              </li>
            </ul>
          </div>

          <Link to="/rider" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
            <span>Vào trang đặt xe Hành khách</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Driver Portal Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                backgroundColor: 'var(--accent-blue-subtle)', 
                color: 'var(--accent-blue)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <Car size={24} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Dành cho Tài xế (Driver Portal)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Chế độ tài xế trực tuyến, kết nối WebSocket để nhận sự kiện chuyến xe mới xung quanh bạn, 
              xem cước phí và dễ dàng thao tác Chấp nhận hoặc Từ chối chuyến.
            </p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Hiển thị đầy đủ danh sách đối tác tài xế để kiểm thử</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Nhận thông báo cuốc mới tức thì qua WebSocket (DriverFound)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Thao tác Chấp nhận / Từ chối đồng bộ với Microservices</span>
              </li>
            </ul>
          </div>

          <Link to="/driver" className="btn btn-secondary" style={{ width: '100%', padding: '0.8rem' }}>
            <span>Vào cổng kiểm thử Tài xế</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Key Feature Pillars */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Công nghệ tiên tiến hỗ trợ chuyến đi của bạn
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Được xây dựng trên nền tảng kiến trúc Microservices hiện đại, tối ưu cho tốc độ và sự tin cậy.
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: '4rem' }}>
        <div className="card">
          <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
            <Receipt size={28} />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Định giá minh bạch 100%
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Không còn nỗi lo chi phí ẩn. Bạn có thể kiểm tra chi tiết cước mở cửa, cước km, thời gian, phụ phí thời tiết mưa hay trạm thu phí được bóc tách rõ ràng.
          </p>
        </div>

        <div className="card">
          <div style={{ color: 'var(--accent-blue)', marginBottom: '1rem' }}>
            <Zap size={28} />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Ghép cuốc thông minh
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Thuật toán định vị geospatial trên MongoDB kết hợp gRPC xác định tài xế khả dụng gần nhất và phát tín hiệu ghép nối trong chưa đầy 1 giây.
          </p>
        </div>

        <div className="card">
          <div style={{ color: 'var(--accent-amber)', marginBottom: '1rem' }}>
            <Radio size={28} />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Thời gian thực qua WebSocket
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Sử dụng SignalR Hub & RabbitMQ EventBus phát sự kiện tức thời giữa Hành khách và Tài xế mà không cần người dùng tải lại trang.
          </p>
        </div>
      </div>
    </div>
  );
};
