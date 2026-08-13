import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  id: string;
  sub: string;   // email
  role: string;
  exp: number;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Retrieves the JWT token from cookies (or fallback to localStorage).
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * Retrieves the logged-in User object from cookies (or fallback to localStorage).
 */
export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const rawCookie = Cookies.get(USER_KEY);
  if (rawCookie) {
    try {
      return JSON.parse(rawCookie);
    } catch {
      // Fallback
    }
  }
  const rawLocal = localStorage.getItem(USER_KEY);
  return rawLocal ? JSON.parse(rawLocal) : null;
}

/**
 * Saves auth token & user data securely into Cookies and localStorage.
 */
export function saveAuth(token: string, user: object) {
  if (typeof window === 'undefined') return;

  const cookieOptions: Cookies.CookieAttributes = {
    expires: 1, // 1 day
    path: '/',
    sameSite: 'lax',
    secure: window.location.protocol === 'https:',
  };

  // Set Cookies
  Cookies.set(TOKEN_KEY, token, cookieOptions);
  Cookies.set(USER_KEY, JSON.stringify(user), cookieOptions);

  // Sync to localStorage
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clears auth token and user cookies / localStorage upon logout.
 */
export function clearAuth() {
  if (typeof window === 'undefined') return;

  Cookies.remove(TOKEN_KEY, { path: '/' });
  Cookies.remove(USER_KEY, { path: '/' });

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Verifies if the JWT token is expired.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Returns true if user has a valid, unexpired token cookie.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  return !!token && !isTokenExpired(token);
}

/**
 * Returns true if current user has ADMIN role.
 */
export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === 'ADMIN';
}
