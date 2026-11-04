# Skylife 360 — Frontend Authentication & Google OAuth Integration Guide

This guide provides the complete context, API contracts, security mechanics, and ready-to-use frontend code examples for integrating **Google OAuth 2.0 Single Sign-On (SSO)**, **email/password authentication**, **session cookies**, and **Role-Based Access Control (RBAC)** into your web client application.

---

## 1. System & Architecture Overview

- **Backend URL**: `http://127.0.0.1:8000` (FastAPI)
- **Session Transport**: Cryptographic server-side session stored in a secure `HttpOnly` cookie named `sc_session`.
  - **No JWT storage in `localStorage`**: Protects against Cross-Site Scripting (XSS) token theft.
  - **CORS Credentials**: Every request from the frontend to the backend MUST include credentials (`credentials: "include"` in `fetch` or `withCredentials: true` in `axios`).
- **CSRF Token Protection**:
  - All state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require an `X-CSRF-Token` header matching the active session.
  - The `csrf_token` string is returned upon login and via `GET /api/v1/auth/me`. Store it in frontend memory/state.
- **Multi-Tenancy**: All users and data are partitioned by `tenant_id` (e.g., `HOSP-001`).
- **Google OAuth Client ID**: `180312721968-8t1dnmn3snoffsrvkf672aagqurqb4d5.apps.googleusercontent.com`
- **GCP Redirect URI**: `http://127.0.0.1:8000/api/v1/auth/oauth/google/callback`

---

## 2. API Endpoints Reference

### 2.1 Google OAuth Endpoints

#### 1. Initiate Google Login (Redirect Flow)
* **Endpoint**: `GET /api/v1/auth/oauth/google/login?tenant_id={tenant_id}`
* **Usage**:
  - **Direct Browser Navigation**: Redirects `302 Found` straight to Google's consent screen.
  - **JSON Mode**: If requested with `Accept: application/json`, returns `{"auth_url": "https://accounts.google.com/..."}`.

#### 2. Google OAuth Callback (Handled by Backend)
* **Endpoint**: `GET /api/v1/auth/oauth/google/callback?code=...&state=...`
* **Behavior**: Registered in Google Cloud Console. Google returns here. The backend exchanges the code, creates the session, sets the `sc_session` cookie, and redirects the browser to `/api/v1/auth/me` (or your configured dashboard).

#### 3. Google SPA Token Exchange (Popup / One-Tap Flow)
* **Endpoint**: `POST /api/v1/auth/oauth/google/verify`
* **Usage**: Use when implementing Google Sign-In via Google Identity Services (GIS) / `@react-oauth/google` popup.
* **Request Body**:
  ```json
  {
    "id_token": "eyJhbGciOiJSUzI1NiIs...",
    "tenant_id": "HOSP-001"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "mfa_required": false,
    "user": {
      "id": "d0382584-d1b4-42ac-92a3-1ea4de3b2f68",
      "email": "doctor@hospital.org",
      "name": "Yaswanth Babu",
      "role": "ADMIN",
      "tenant_id": "HOSP-001"
    },
    "role": "ADMIN",
    "permissions": [
      "files:upload", "docs:read", "rag:ask", "claims:intake",
      "gaps:run", "packets:build", "integrity:view", "integrity:clear",
      "claims:approve", "claims:submit", "tasks:resolve", "rules:manage", "users:manage"
    ],
    "csrf_token": "7773ce05776a6d6ec85bf90730234c98d8a7040bbbdcb8698b9a10eb2bbbe6e7"
  }
  ```
  *(Header: `Set-Cookie: sc_session=<token>; HttpOnly; SameSite=Lax; Path=/`)*

---

### 2.2 Standard Authentication & Session Endpoints

#### 1. Email/Password Sign-In
* **Endpoint**: `POST /api/v1/auth/login`
* **Request Body**:
  ```json
  {
    "email": "doctor@hospital.org",
    "password": "CorrectHorseBatteryStaple123!"
  }
  ```
* **Response**: Returns `LoginResponse` (same JSON structure as above) and sets the `sc_session` cookie.
  * If `mfa_required: true`, the frontend prompts for a 6-digit TOTP code and calls `POST /api/v1/auth/mfa/verify`.

#### 2. Get Current Authenticated Profile (`/me`)
* **Endpoint**: `GET /api/v1/auth/me`
* **Headers**: `credentials: "include"`
* **Response `200 OK`**: Returns current `{ user, role, permissions, csrf_token }`. Call this on application boot to restore logged-in state.
* **Response `401 Unauthorized`**: No active session $\rightarrow$ redirect user to `/login`.

#### 3. Sign Out
* **Endpoint**: `POST /api/v1/auth/logout`
* **Headers**:
  - `X-CSRF-Token: <csrf_token>`
  - `credentials: "include"`
* **Response `200 OK`**: `{ "status": "logged_out" }`. Invalidation happens server-side and cookie is deleted.

---

## 3. Frontend Implementation Reference (React / TypeScript Example)

### 3.1 HTTP Client Setup with Axios & CSRF Handling

```typescript
// src/api/client.ts
import axios from 'axios';

export const API_BASE = 'http://127.0.0.1:8000';

let inMemoryCsrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  inMemoryCsrfToken = token;
};

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Crucial: sends & receives the HttpOnly sc_session cookie
});

// Automatically inject X-CSRF-Token on state-mutating methods
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && inMemoryCsrfToken) {
    config.headers['X-CSRF-Token'] = inMemoryCsrfToken;
  }
  return config;
});

// Global interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      setCsrfToken(null);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

### 3.2 Authentication Context (`AuthContext.tsx`)

```tsx
// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setCsrfToken } from '../api/client';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  tenant_id: string;
}

interface AuthContextType {
  user: UserSummary | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogleRedirect: (tenantId: string) => void;
  loginWithGoogleToken: (idToken: string, tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on page refresh via /me
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/api/v1/auth/me');
        setUser(res.data.user);
        setRole(res.data.role);
        setPermissions(res.data.permissions || []);
        setCsrfToken(res.data.csrf_token);
      } catch (err) {
        setUser(null);
        setRole(null);
        setPermissions([]);
        setCsrfToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, []);

  // Option A: Full page redirect to Google
  const loginWithGoogleRedirect = (tenantId: string) => {
    window.location.href = `http://127.0.0.1:8000/api/v1/auth/oauth/google/login?tenant_id=${encodeURIComponent(tenantId)}`;
  };

  // Option B: SPA Google popup/token exchange
  const loginWithGoogleToken = async (idToken: string, tenantId: string) => {
    const res = await api.post('/api/v1/auth/oauth/google/verify', {
      id_token: idToken,
      tenant_id: tenantId,
    });
    setUser(res.data.user);
    setRole(res.data.role);
    setPermissions(res.data.permissions || []);
    setCsrfToken(res.data.csrf_token);
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      setUser(null);
      setRole(null);
      setPermissions([]);
      setCsrfToken(null);
      window.location.href = '/login';
    }
  };

  const hasPermission = (permission: string) => permissions.includes(permission);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogleRedirect,
        loginWithGoogleToken,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

---

### 3.3 Google Sign-In Button Component

#### Option A: Direct Redirect Button (No npm libraries needed)
```tsx
// src/components/GoogleSignInButton.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

export const GoogleSignInButton: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { loginWithGoogleRedirect } = useAuth();

  return (
    <button
      onClick={() => loginWithGoogleRedirect(tenantId)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        color: '#3c4043',
        border: '1px solid #dadce0',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
      </svg>
      Sign in with Google
    </button>
  );
};
```

---

#### Option B: React Popup with `@react-oauth/google`
```bash
npm install @react-oauth/google
```

```tsx
// src/components/GoogleOneTapLogin.tsx
import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = '180312721968-8t1dnmn3snoffsrvkf672aagqurqb4d5.apps.googleusercontent.com';

export const GoogleOneTapLogin: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { loginWithGoogleToken } = useAuth();

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          if (credentialResponse.credential) {
            await loginWithGoogleToken(credentialResponse.credential, tenantId);
            window.location.href = '/dashboard';
          }
        }}
        onError={() => {
          console.error('Google Sign-in Failed');
        }}
        useOneTap
      />
    </GoogleOAuthProvider>
  );
};
```

---

### 3.4 Protected Route & Permission Gate

```tsx
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredPermission?: string;
}> = ({ children, requiredPermission }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <div>Access Denied: Missing {requiredPermission} permission.</div>;
  }

  return <>{children}</>;
};
```

---

## 4. Role-Based Access Control (RBAC) Quick Reference

| Role | Default Permissions | Description |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | All permissions + `users:manage` | Cross-tenant administrative platform controller |
| **`ADMIN`** | All tenant permissions + `users:manage` | Tenant organization administrator |
| **`MEMBER`** | `files:upload`, `docs:read`, `rag:ask`, `claims:intake`, `gaps:run`, `packets:build`, `integrity:view`, `integrity:clear`, `claims:approve`, `tasks:resolve` | Core operational hospital staff & claims adjudicators |
| **`VIEWER`** | `docs:read`, `rag:ask`, `tasks:resolve` | Read-only scoped user |

---

## 5. Summary Checklist for Frontend Developers

1. Ensure Axios or Fetch has `withCredentials: true` / `credentials: "include"`.
2. Intercept mutating requests (`POST`, `PUT`, `DELETE`) to inject the `X-CSRF-Token` header.
3. Call `GET /api/v1/auth/me` on application boot to check if an active session exists.
4. If building a multi-tenant dropdown or input, pass the selected `tenant_id` (default `HOSP-001`) into the login endpoint.
