import React, { createContext, useContext, useState, useCallback } from 'react';
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
  // A sessão está no storage do navegador: dá para ler já no estado inicial
  const [user, setUser] = useState<User | null>(() => getUserData());
  const isLoading = false;

  const login = useCallback(async (email: string, password: string, remember: boolean = false) => {
    const res = await authApi.login(email, password);
    setUserData(res.usuario, res.token, remember);
    setUser(res.usuario);
  }, []);

  const register = useCallback(async (nome: string, email: string, password: string) => {
    await authApi.register({ nome, email, senha: password });
    // Após registrar, faz login automaticamente
    const res = await authApi.login(email, password);
    setUserData(res.usuario, res.token);
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

// O hook mora junto do provider de propósito (mesmo contexto)
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
