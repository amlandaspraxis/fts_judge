import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, Users, Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpDeskDashboard() {
  const [participantsCount, setParticipantsCount] = useState(0);

  useEffect(() => {
    api.get('/participants').then(res => setParticipantsCount(res.data.count || 0));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Registration Desk Operations</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Participant Desk Portal</h1>
        <p className="evt-sub">
          Register arriving contestants, issue unique performer verification codes, and look up entries.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 }}>
          <div className="evt-card" style={{ padding: 18 }}>
            <div className="evt-eyebrow">Total Enrolled Performers</div>
            <div className="evt-h1" style={{ fontSize: 40, margin: '8px 0 4px', color: '#16274D' }}>
              {participantsCount}
            </div>
            <div className="evt-sub">Contestants checked in</div>
          </div>

          <Link to="/helpdesk/register" className="evt-pchip" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <UserPlus size={20} color="#29ABE2" />
              <ArrowRight size={16} color="#16274D" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#16274D', marginTop: 12 }}>
              Register Performer
            </div>
            <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
              Assign code and enroll in category
            </div>
          </Link>

          <Link to="/helpdesk/search" className="evt-pchip" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Search size={20} color="#FFD400" />
              <ArrowRight size={16} color="#16274D" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#16274D', marginTop: 12 }}>
              Search Registry
            </div>
            <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
              Instant lookup by code or name
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
