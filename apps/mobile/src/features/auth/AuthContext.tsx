import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { login, logout, me, signup, type AuthResponse, type UserResponse } from './api';

const KEY = 'lunchpicker-login-token';
type AuthState = { user: UserResponse | null; loading: boolean; signIn: (loginId: string, password: string) => Promise<void>; signUp: (loginId: string, password: string, displayName: string) => Promise<void>; signOut: () => Promise<void>; getToken: () => Promise<string | null> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(KEY).then(async (token) => {
      if (!token) return;
      try { const value = await me(token); if (active) setUser(value); }
      catch { await SecureStore.deleteItemAsync(KEY); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const save = async (response: AuthResponse) => {
    await SecureStore.setItemAsync(KEY, response.token);
    setUser(await me(response.token));
  };
  const signIn = async (loginId: string, password: string) => save(await login(loginId, password));
  const signUp = async (loginId: string, password: string, displayName: string) => save(await signup(loginId, password, displayName));
  const signOut = async () => {
    const token = await SecureStore.getItemAsync(KEY);
    if (token) await logout(token);
    await SecureStore.deleteItemAsync(KEY);
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, getToken: () => SecureStore.getItemAsync(KEY) }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider가 필요합니다.');
  return context;
}
