import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, 
  LogIn, 
  UserPlus, 
  User, 
  Lock, 
  Mail, 
  Car, 
  UserCheck, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    authModalMode, 
    closeAuthModal, 
    setAuthModalMode, 
    login, 
    register 
  } = useAuth();

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('phat3022');
  const [loginPassword, setLoginPassword] = useState('Password@123');

  // Register form state
  const [regUserName, setRegUserName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('Password@123');
  const [regRole, setRegRole] = useState<'Rider' | 'Driver'>('Rider');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login({
        userNameOrEmail: loginIdentifier.trim(),
        password: loginPassword,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await register({
        userName: regUserName.trim(),
        email: regEmail.trim(),
        fullName: regFullName.trim(),
        password: regPassword,
        role: regRole,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng ký không thành công. Tên đăng nhập hoặc email có thể đã tồn tại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (username: string) => {
    setLoginIdentifier(username);
    setLoginPassword('Password@123');
  };

  return (
    <div className="modal-overlay" onClick={closeAuthModal}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            {authModalMode === 'login' ? (
              <>
                <LogIn size={20} className="text-emerald-600" />
                <span>Đăng nhập vào SwiftRide</span>
              </>
            ) : (
              <>
                <UserPlus size={20} className="text-emerald-600" />
                <span>Đăng ký tài khoản mới</span>
              </>
            )}
          </div>
          <button className="modal-close-btn" onClick={closeAuthModal}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setAuthModalMode('login');
            }}
            style={{
              flex: 1,
              padding: '0.85rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              background: authModalMode === 'login' ? '#ffffff' : 'var(--bg-subtle)',
              color: authModalMode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: authModalMode === 'login' ? '2px solid var(--primary)' : 'none',
              cursor: 'pointer',
            }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setAuthModalMode('register');
            }}
            style={{
              flex: 1,
              padding: '0.85rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              background: authModalMode === 'register' ? '#ffffff' : 'var(--bg-subtle)',
              color: authModalMode === 'register' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: authModalMode === 'register' ? '2px solid var(--primary)' : 'none',
              cursor: 'pointer',
            }}
          >
            Đăng ký
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {errorMessage && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                backgroundColor: 'var(--accent-rose-subtle)', 
                color: 'var(--accent-rose)', 
                padding: '0.75rem 1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                fontSize: '0.85rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {authModalMode === 'login' ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập hoặc Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="ví dụ: phat3022 hoặc rider_ngothu"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                  <User size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="Nhập mật khẩu..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                </div>
              </div>

              {/* Demo Quick Accounts */}
              <div style={{ marginTop: '0.75rem', marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={12} className="text-amber-500" />
                  Chọn tài khoản mẫu đăng nhập nhanh:
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('phat3022')}
                    className="btn btn-outline"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    HTP (Rider)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('rider_ngothu')}
                    className="btn btn-outline"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    Ngô Thanh Thu (Rider)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('testrider1')}
                    className="btn btn-outline"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    Test Rider
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {isLoading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập (Username)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="ví dụ: nguyenvana"
                  value={regUserName}
                  onChange={(e) => setRegUserName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="ví dụ: Nguyễn Văn An"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="nguyenvana@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu (tối thiểu 6 ký tự)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="Nhập mật khẩu..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bạn muốn đăng ký làm:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setRegRole('Rider')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: regRole === 'Rider' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      backgroundColor: regRole === 'Rider' ? 'var(--primary-subtle)' : '#ffffff',
                      color: regRole === 'Rider' ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <UserCheck size={16} />
                    Hành khách (Rider)
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('Driver')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: regRole === 'Driver' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      backgroundColor: regRole === 'Driver' ? 'var(--primary-subtle)' : '#ffffff',
                      color: regRole === 'Driver' ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Car size={16} />
                    Tài xế (Driver)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
              >
                {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản & Đăng nhập'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
