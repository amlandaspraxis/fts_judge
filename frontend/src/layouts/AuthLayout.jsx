import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="evt" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <img
          src="/main_logo.png"
          alt="Freshmen Talent Search 2026"
          style={{ height: 75, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
        />
      </div>
      <Outlet />
    </div>
  );
}
