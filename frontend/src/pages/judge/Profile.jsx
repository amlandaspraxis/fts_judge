import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Mail, User } from 'lucide-react';

export default function JudgeProfile() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Judge Credential Profile</div>
        <h1 className="evt-h1" style={{ fontSize: 30 }}>{user?.name}</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
          <div style={{ background: '#F7F9FD', padding: 14, borderRadius: 10, border: '1.5px solid #C7CEDE' }}>
            <div className="evt-eyebrow">Registered Email</div>
            <div style={{ fontWeight: 700, color: '#16274D', fontSize: 16 }}>{user?.email}</div>
          </div>

          <div style={{ background: '#F7F9FD', padding: 14, borderRadius: 10, border: '1.5px solid #C7CEDE' }}>
            <div className="evt-eyebrow">Authorized Role</div>
            <div style={{ fontWeight: 700, color: '#29ABE2', fontSize: 16 }}>OFFICIAL JUDGE</div>
          </div>

          <div style={{ background: '#F7F9FD', padding: 14, borderRadius: 10, border: '1.5px solid #C7CEDE' }}>
            <div className="evt-eyebrow">Security Status</div>
            <div style={{ fontWeight: 700, color: '#1C8A4C', fontSize: 14 }}>Authenticated via Secure JWT Session</div>
          </div>
        </div>
      </div>
    </div>
  );
}
