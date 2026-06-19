import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setUserData, removeUserData, getUserData, type User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (nome: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = getUserData();
    if (data) {
      setUser(data);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean = false) => {
    const res = await authApi.login(email, password);
    setUserData(res.usuario, remember);
    setUser(res.usuario);
  }, []);

  const register = useCallback(async (nome: string, email: string, password: string) => {
    await authApi.register({ nome, email, senha: password });
    // Após registrar, faz login automaticamente
    const res = await authApi.login(email, password);
    setUserData(res.usuario);
    setUser(res.usuario);
  }, []);

  const logout = useCallback(() => {
    removeUserData();
    setUser(null);
    window.location.href = '/auth';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
