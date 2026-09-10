import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

/**
 * SECURITY ARCHITECTURE NOTE (VULN-13 / Token Storage Defense-in-Depth):
 * Currently, JWT tokens are stored in browser localStorage ('fts_auth_token') to support
 * multi-device concurrent operations and client-side REST calls.
 * 
 * Trade-off Analysis:
 * - LocalStorage is susceptible to token extraction in the event of an arbitrary XSS vulnerability.
 * - To minimize this risk, strong Content-Security-Policy (CSP) headers, input sanitization,
 *   and strict CORS origin validation are enforced on the backend.
 * - Future enhancement for high-assurance deployments: Migrate authentication tokens to
 *   HttpOnly, SameSite=Strict, Secure cookies with dedicated CSRF protections.
 * - This implementation ensures thorough cache invalidation upon logout and prevents any
 *   token leakage into client logs or error responses.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('fts_auth_token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => {
          if (res.success && res.data?.user) {
            setUser(res.data.user);
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data?.token) {
      try {
        localStorage.setItem('fts_auth_token', res.data.token);
      } catch {}
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const loginWithSession = (sessionToken, sessionUser) => {
    if (sessionToken) {
      try {
        localStorage.setItem('fts_auth_token', sessionToken);
      } catch {}
      setToken(sessionToken);
    }
    if (sessionUser) {
      setUser(sessionUser);
    }
    return sessionUser;
  };

  const loginJudgeWithCode = async (code) => {
    const res = await api.post('/auth/judge-code-login', { code });
    if (res.success && res.data?.token) {
      try {
        localStorage.setItem('fts_auth_token', res.data.token);
      } catch {}
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Judge access code verification failed');
  };

  const logout = async () => {
    try {
      // Notify backend of session logout
      await api.post('/auth/logout').catch(() => {});
    } catch {}

    try {
      // Purge all stored credentials and session data
      localStorage.removeItem('fts_auth_token');
      sessionStorage.removeItem('fts_judge_session');
      sessionStorage.removeItem('fts_audience_session');
      sessionStorage.removeItem('fts_user_session');
    } catch {}

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithSession, loginJudgeWithCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
