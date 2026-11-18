import { requestJson } from '../../lib/api';

export type AuthResponse = { token: string; expiresAt: string; userId: number; displayName: string };
export type UserResponse = { id: number; displayName: string; loginId: string };

export function signup(loginId: string, password: string, displayName: string) {
  return requestJson<AuthResponse>('/api/v1/auth/signup', { method: 'POST', body: JSON.stringify({ loginId, password, displayName }) });
}
export function login(loginId: string, password: string) {
  return requestJson<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ loginId, password }) });
}
export function me(token: string) {
  return requestJson<UserResponse>('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } });
}
export function logout(token: string) {
  return requestJson<void>('/api/v1/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
}
