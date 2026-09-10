import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Phone, Search, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpDeskParticipants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    api.get('/participants')
      .then(res => setParticipants(res.data.participants || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = participants.filter(p => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.participantCode?.toLowerCase().includes(q) ||
      p.registrationNumber?.toLowerCase().includes(q) ||
      p.phoneNumber?.includes(q) ||
      p.routineTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="evt-eyebrow">Desk Registry</div>
            <h1 className="evt-h1" style={{ fontSize: 32 }}>Checked-In Performers ({participants.length})</h1>
            <p className="evt-sub">
              Directory of all registered contestants with chest numbers and registration details.
            </p>
          </div>
          <Link to="/helpdesk/register" className="evt-btn evt-btn-amber" style={{ textDecoration: 'none' }}>
            <UserPlus size={15} /> Enroll New Performer
          </Link>
        </div>

        <div style={{ marginTop: 16 }}>
          <input
            className="evt-input"
            style={{ maxWidth: 380 }}
            placeholder="Search by name, chest number, reg #, or phone…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {loading && <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>Loading performers…</div>}
          {!loading && filtered.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>No performers found matching search criteria.</div>
          )}
          {filtered.map(p => (
            <div key={p.id} className="evt-pending-row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span className="evt-mono evt-badge" style={{ background: '#FFD400', color: '#16274D', border: '1.5px solid #16274D', padding: '6px 12px', fontSize: 14 }}>
                  {p.participantCode}
                </span>
                <span className="evt-sub" style={{ fontSize: 10, fontWeight: 700 }}>CHEST NO</span>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{p.name}</div>
                <div className="evt-sub" style={{ fontSize: 12.5 }}>
                  Routine: <strong>{p.routineTitle || p.act}</strong>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#5B6890', flexWrap: 'wrap' }}>
                  <span>Category: <strong style={{ color: '#16274D' }}>{p.categoryName}</strong></span>
                  {p.registrationNumber && (
                    <span>Reg #: <strong className="evt-mono" style={{ color: '#16274D' }}>{p.registrationNumber}</strong></span>
                  )}
                  {p.phoneNumber && (
                    <span>Phone: <strong className="evt-mono" style={{ color: '#16274D' }}>{p.phoneNumber}</strong></span>
                  )}
                </div>
              </div>

              <span className="evt-badge evt-badge-ok">Verified</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
