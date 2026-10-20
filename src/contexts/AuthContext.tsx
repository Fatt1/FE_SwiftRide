import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthUser, LoginRequest, RegisterRequest } from '../types';
import { 
  getStoredUser, 
  getAuthToken, 
  loginApi, 
  registerApi, 
  removeAuth 
} from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  redirectAfterLogin: string;
  setRedirectAfterLogin: (path: string) => void;
  openLoginModal: () => void;
  openRegisterModal: () => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string>('/rider');
  const navigate = useNavigate();

  useEffect(() => {
    // Keep state synced with localStorage
    const storedUser = getStoredUser();
    const storedToken = getAuthToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    const res = await loginApi(credentials);
    const loggedUser: AuthUser = {
      id: res.userId,
      userName: res.userName,
      email: res.email,
      fullName: res.fullName || res.userName,
      roles: res.roles || ['Rider'],
    };
    setUser(loggedUser);
    setToken(res.accessToken);
    setIsAuthModalOpen(false);
    
    // Redirect to the intended page or default to /rider
    navigate(redirectAfterLogin || '/rider');
  };

  const register = async (data: RegisterRequest) => {
    await registerApi(data);
    // Automatically log in with credentials
    if (data.password) {
      await login({
        userNameOrEmail: data.userName,
        password: data.password,
      });
    } else {
      setAuthModalMode('login');
    }
  };

  const logout = () => {
    removeAuth();
    setUser(null);
    setToken(null);
    navigate('/');
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        isAuthModalOpen,
        authModalMode,
        redirectAfterLogin,
        setRedirectAfterLogin,
        openLoginModal,
        openRegisterModal,
        closeAuthModal,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
