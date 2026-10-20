import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, LogIn, ArrowRight } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  portalName: 'Rider' | 'Driver';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, portalName }) => {
  const { isAuthenticated, openLoginModal, setRedirectAfterLogin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setRedirectAfterLogin(location.pathname);
      openLoginModal();
    }
  }, [isAuthenticated, location.pathname, openLoginModal, setRedirectAfterLogin]);

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ paddingTop: '5rem', paddingBottom: '6rem', maxWidth: '520px' }}>
        <div 
          className="card" 
          style={{ 
            padding: '2.75rem 2rem', 
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}
        >
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '20px', 
              backgroundColor: 'var(--primary-subtle)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}
          >
            <Lock size={30} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
            Yêu cầu Đăng nhập
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Bạn cần đăng nhập tài khoản để truy cập vào <strong>{portalName === 'Rider' ? 'Cổng Hành khách (Rider)' : 'Cổng Tài xế (Driver)'}</strong>.
          </p>

          <button
            type="button"
            onClick={openLoginModal}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginBottom: '0.75rem' }}
          >
            <LogIn size={18} />
            Đăng nhập ngay
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
