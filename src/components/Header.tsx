import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Car, 
  UserCheck, 
  LogIn, 
  UserPlus, 
  LogOut 
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout, openLoginModal, openRegisterModal } = useAuth();
  const location = useLocation();

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand Logo */}
        <Link to="/" className="brand-link">
          <div className="brand-icon">
            <Car size={22} strokeWidth={2.4} />
          </div>
          <div>
            <span className="brand-name">
              Swift<span>Ride</span>
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link 
            to="/" 
            className={`nav-item ${isCurrent('/') ? 'active' : ''}`}
          >
            Trang chủ
          </Link>
          <Link 
            to="/rider" 
            className={`nav-item ${isCurrent('/rider') ? 'active' : ''}`}
          >
            <UserCheck size={16} />
            Đặt xe (Rider)
          </Link>
          <Link 
            to="/driver" 
            className={`nav-item ${isCurrent('/driver') ? 'active' : ''}`}
          >
            <Car size={16} />
            Cổng Tài xế (Driver)
          </Link>
        </nav>

        {/* Authentication Controls */}
        <div className="header-actions">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="user-pill">
                <div className="user-avatar-sm">
                  {user.fullName ? user.fullName[0].toUpperCase() : user.userName[0].toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {user.fullName || user.userName}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {user.roles.includes('Driver') ? 'Tài xế' : 'Hành khách'}
                  </span>
                </div>
              </div>
              <button 
                onClick={logout} 
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                title="Đăng xuất"
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={openLoginModal} 
                className="btn btn-outline"
              >
                <LogIn size={15} />
                Đăng nhập
              </button>
              <button 
                onClick={openRegisterModal} 
                className="btn btn-primary"
              >
                <UserPlus size={15} />
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
