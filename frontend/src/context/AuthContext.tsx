import React, { createContext, useEffect, useState, ReactNode } from 'react';
import API_BASE_URL from '../apicallconfig';

interface User {
  id?: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role_permissions?: Record<string, { view: boolean; edit: boolean }>;
  role?: {
    id?: number;
    name?: string | null;
    display_name?: string | null;
    description?: string | null;
    permissions?: Record<string, { view: boolean; edit: boolean }>;
  } | null;
  username: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const TOKEN_KEY = 'oms_auth_token';
  const USER_KEY = 'oms_auth_user';
  const storage = sessionStorage;

  const mapApiUser = (apiUser: any): User => ({
    id: apiUser.id,
    name: apiUser.name ?? null,
    email: apiUser.email ?? null,
    phone: apiUser.phone ?? null,
    role: apiUser.role
      ? {
          id: apiUser.role.id,
          name: apiUser.role.name ?? null,
          display_name: apiUser.role.display_name ?? null,
          description: apiUser.role.description ?? null,
          permissions: apiUser.role.permissions ?? undefined,
        }
      : null,
    role_permissions: apiUser.role_permissions ?? apiUser.role?.permissions ?? undefined,
    username: apiUser.username ?? apiUser.name ?? apiUser.email ?? null,
  });

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore auth session from saved token and validate with /auth/me.
  useEffect(() => {
    const token = storage.getItem(TOKEN_KEY);
    if (!token) {
      storage.removeItem(USER_KEY);
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        const apiUser = data?.data;
        if (apiUser) {
          const nextUser = mapApiUser(apiUser);
          setUser(nextUser);
          storage.setItem(USER_KEY, JSON.stringify(nextUser));
        } else {
          storage.removeItem(TOKEN_KEY);
          storage.removeItem(USER_KEY);
          setUser(null);
        }
      })
      .catch(() => {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      const token = data?.data?.token;
      const apiUser = data?.data?.user;

      if (res.ok && token && apiUser) {
        const nextUser = mapApiUser(apiUser);

        storage.setItem(TOKEN_KEY, token);
        storage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        return true;
      }

      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
      setUser(null);
      return false;
    } catch (error) {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
      setUser(null);
      return false;
    }
  };

  const logout = async () => {
    const token = storage.getItem(TOKEN_KEY);

    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
    setUser(null);

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // Local session is already cleared; network failures should not block logout.
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};