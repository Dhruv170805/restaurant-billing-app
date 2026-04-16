import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  tenant: any | null;
  login: (token: string, tenant: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await SecureStore.getItemAsync('access_token');
      const storedTenant = await SecureStore.getItemAsync('tenant_data');

      if (storedToken && storedTenant) {
        setToken(storedToken);
        setTenant(JSON.parse(storedTenant));
        // Configure global axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (e) {
      console.error('Failed to load auth state', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(newToken: string, newTenant: any) {
    await SecureStore.setItemAsync('access_token', newToken);
    await SecureStore.setItemAsync('tenant_data', JSON.stringify(newTenant));
    setToken(newToken);
    setTenant(newTenant);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }

  async function logout() {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('tenant_data');
    setToken(null);
    setTenant(null);
    delete axios.defaults.headers.common['Authorization'];
  }

  return (
    <AuthContext.Provider value={{ token, tenant, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
