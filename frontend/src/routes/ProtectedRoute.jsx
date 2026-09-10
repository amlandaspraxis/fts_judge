import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="evt" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="evt-card" style={{ padding: 24, textAlign: 'center' }}>
          <div className="evt-h2" style={{ margin: 0 }}>Loading System…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/login/admin" state={{ from: location }} replace />;
    }
    if (location.pathname.startsWith('/judge')) {
      return <Navigate to="/login/judges" state={{ from: location }} replace />;
    }
    if (location.pathname.startsWith('/helpdesk') || location.pathname.startsWith('/regdesk')) {
      return <Navigate to="/login/regdesk" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to the user's primary portal if trying to access unauthorized route
    const roleRoutes = {
      ADMIN: '/admin/dashboard',
      JUDGE: '/judge/dashboard',
      AUDIENCE: '/audience/dashboard',
      HELP_DESK: '/helpdesk/dashboard'
    };
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
  }

  return <Outlet />;
}
