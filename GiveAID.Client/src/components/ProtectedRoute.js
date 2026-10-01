import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ─────────────────────────────────────────────────
 * ProtectedRoute
 *   props:
 *     - children  (required) : the protected element
 *     - roles     (optional) : ['Admin']; if omitted
 *                              only requires authentication.
 *
 *   Behavior:
 *     - while auth is still loading → render null (let AuthContext
 *       finish before deciding).
 *     - no token → redirect to /login, remember original location
 *                  so we can send them back after login.
 *     - token but wrong role → redirect to /dashboard (a regular
 *                  user's home) with no `from` saved.
 * ───────────────────────────────────────────────── */

function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  /* Wait until AuthContext has finished its mount-time check. */
  if (loading) {
    return null;
  }

  /* Defense in depth: check localStorage directly so we don't bounce back
   * to /login if React state hasn't propagated yet (e.g. immediately after
   * a fresh login, before AuthContext.login's setUser has committed). */
  // isAuthenticated is now a boolean (was a function in some prior versions).
  // Coerce defensively in case a build still has the function shape.
  let authed = typeof isAuthenticated === 'function' ? !!isAuthenticated() : !!isAuthenticated;
  if (!authed) {
    try {
      const hasToken = !!localStorage.getItem('giveaid_token');
      if (hasToken) authed = true;
    } catch {
      /* localStorage unavailable (private mode) — fall through. */
    }
  }

  /* 1. Not signed in → /login (preserve attempted URL). */
  if (!authed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  /* 2. Role guard: only if `roles` was provided. */
  if (roles && roles.length > 0) {
    const userRole = user?.role;
    const allowed = roles.includes(userRole);
    if (!allowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  /* 3. Authenticated (and authorised) → render. */
  return children;
}

export default ProtectedRoute;
