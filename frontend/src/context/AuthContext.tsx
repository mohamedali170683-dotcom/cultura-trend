import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, getToken, removeToken, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const token = getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user } = await authApi.getMe();
        setUser(user);
      } catch (error) {
        // Token invalid, remove it
        removeToken();
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { user } = await authApi.signup(email, password, name);
      setUser(user);
      setIsDemo(false);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await authApi.login(email, password);
      setUser(user);
      setIsDemo(false);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors, just clear local state
    } finally {
      setUser(null);
      setIsDemo(false);
    }
  };

  // Function to enter demo mode
  const enterDemoMode = () => {
    setIsDemo(true);
    setUser({ id: 'demo', email: 'demo@example.com', name: 'Demo User' });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to enter demo mode
export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(false);

  const enterDemo = () => {
    setIsDemo(true);
  };

  return { isDemo, enterDemo };
}
