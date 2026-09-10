import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Gavel, Trophy, List, Shield, Settings, Play, Square, Lock, CheckCircle2, Download, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportVotesToCsv } from '../../utils/csvDownloader';
import { subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    api.get('/admin/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast(() => {
      loadData();
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  const changeState = async (newStatus) => {
    try {
      await api.post('/admin/event/state', { status: newStatus });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update state');
    }
  };

  if (loading) {
    return <div className="evt-card" style={{ padding: 24, textAlign: 'center' }}>Loading dashboard…</div>;
  }

  const status = data?.eventStatus || 'SETUP';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner / Event Control Summary */}
      <div className="evt-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div className="evt-eyebrow">Event Lifecycle Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span className="evt-badge" style={{
              background: status.includes('OPEN') ? '#EF4136' : status.includes('LOCKED') ? '#16274D' : '#FFD400',
              color: status.includes('LOCKED') ? '#FFD400' : status.includes('OPEN') ? '#FFF' : '#16274D',
              fontSize: 14,
              padding: '6px 14px'
            }}>
              {status}
            </span>
            <span className="evt-sub">{data?.event?.name}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {status === 'SETUP' && (
            <button className="evt-btn evt-btn-teal" onClick={() => changeState('JUDGING_OPEN')}>
              <Play size={14} /> Open Judging
            </button>
          )}
          {status === 'JUDGING_OPEN' && (
            <button className="evt-btn evt-btn-amber" onClick={() => changeState('VOTING_OPEN')}>
              <Play size={14} /> Open Audience Voting
            </button>
          )}
          {status === 'VOTING_OPEN' && (
            <button className="evt-btn evt-btn-ghost" onClick={() => changeState('VOTING_CLOSED')}>
              <Square size={14} /> Close Voting
            </button>
          )}
          {status === 'VOTING_CLOSED' && (
            <button className="evt-btn evt-btn-teal" onClick={() => changeState('RESULTS_LOCKED')}>
              <Lock size={14} /> Lock Results
            </button>
          )}
          {status === 'RESULTS_LOCKED' && (
            <button className="evt-btn evt-btn-amber" onClick={() => changeState('RESULTS_PUBLISHED')}>
              <CheckCircle2 size={14} /> Publish Results
            </button>
          )}
          <button
            className="evt-btn evt-btn-amber"
            onClick={async () => {
              try {
                const res = await api.get('/results/export');
                if (res.data?.votes) {
                  exportVotesToCsv(res.data.votes, data?.categories || [], 'fts_audience_votes.csv');
                }
              } catch (err) {
                alert('Export failed: ' + (err.message || 'Unknown error'));
              }
            }}
          >
            <Download size={14} /> Download Voting Data (.CSV)
          </button>
          <Link to="/admin/event-control" className="evt-btn evt-btn-ghost" style={{ textDecoration: 'none' }}>
            <Settings size={14} /> Manage States
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="evt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="evt-eyebrow">Participants</span>
            <Users size={18} color="#29ABE2" />
          </div>
          <div className="evt-h1" style={{ fontSize: 38, margin: '8px 0 2px' }}>{data?.totalParticipants ?? 0}</div>
          <Link to="/admin/participants" className="evt-sub" style={{ textDecoration: 'none', color: '#16274D', fontWeight: 600 }}>
            View Directory →
          </Link>
        </div>

        <div className="evt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="evt-eyebrow">Active Judges</span>
            <Gavel size={18} color="#29ABE2" />
          </div>
          <div className="evt-h1" style={{ fontSize: 38, margin: '8px 0 2px' }}>{data?.totalJudges ?? 0}</div>
          <Link to="/admin/judges" className="evt-sub" style={{ textDecoration: 'none', color: '#16274D', fontWeight: 600 }}>
            Manage Judges →
          </Link>
        </div>

        <div className="evt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="evt-eyebrow">Audience Users</span>
            <Users size={18} color="#29ABE2" />
          </div>
          <div className="evt-h1" style={{ fontSize: 38, margin: '8px 0 2px' }}>{data?.totalAudience ?? 0}</div>
          <Link to="/admin/audience" className="evt-sub" style={{ textDecoration: 'none', color: '#16274D', fontWeight: 600 }}>
            View Voters →
          </Link>
        </div>

        <div className="evt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="evt-eyebrow">Categories</span>
            <List size={18} color="#29ABE2" />
          </div>
          <div className="evt-h1" style={{ fontSize: 38, margin: '8px 0 2px' }}>{data?.categoriesCount ?? 0}</div>
          <Link to="/admin/categories" className="evt-sub" style={{ textDecoration: 'none', color: '#16274D', fontWeight: 600 }}>
            View Categories →
          </Link>
        </div>
      </div>

      {/* Portals Access Directory Banner */}
      <div className="evt-card" style={{
        background: 'linear-gradient(135deg, #16274D 0%, #1E3A8A 60%, #0F172A 100%)',
        color: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        padding: '20px 24px',
        borderRadius: 16,
        border: '1.5px solid rgba(255, 255, 255, 0.15)'
      }}>
        <div style={{ maxWidth: 650 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="evt-badge" style={{ background: '#FFD400', color: '#16274D', fontWeight: 900, fontSize: 11 }}>
              CENTRAL DIRECTORY
            </span>
            <span style={{ fontSize: 12, color: '#93C5FD', fontWeight: 600 }}>All Event Portals & Live Links</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', fontFamily: 'Luckiest Guy', letterSpacing: '0.03em' }}>
            PORTAL ACCESS & LIVE LINKS HUB
          </div>
          <div style={{ fontSize: 13, color: '#CBD5E1', marginTop: 4, lineHeight: 1.4 }}>
            Get direct access links, full URLs, and scannable QR codes for Stage Projector, Live Judge Tablets, Audience Voting, Volunteer Desk, and Admin panels.
          </div>
        </div>

        <Link
          to="/admin/portals"
          className="evt-btn"
          style={{
            background: '#FFD400',
            color: '#16274D',
            fontWeight: 800,
            textDecoration: 'none',
            padding: '10px 20px',
            fontSize: 13,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <QrCode size={16} /> Open Portal Directory →
        </Link>
      </div>

      {/* Quick Action Navigation */}
      <div className="evt-card">
        <div className="evt-h2" style={{ fontSize: 22 }}>System Control Modules</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
          <Link to="/admin/portals" className="evt-pchip" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 800, color: '#16274D', display: 'flex', alignItems: 'center', gap: 8 }}>
              <QrCode size={16} color="#FFD400" /> Portal Access Hub & QR Codes
            </div>
            <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
              Links and QR codes for all 14 event portals
            </div>
          </Link>

          <Link to="/admin/results" className="evt-pchip" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 800, color: '#16274D', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={16} color="#FFD400" /> Results Engine (85 / 15)
            </div>
            <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
              Calculate weighted judge and audience outcome
            </div>
          </Link>

          <Link to="/admin/judge-assignments" className="evt-pchip" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 800, color: '#16274D', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gavel size={16} color="#29ABE2" /> Judge Category Allocations
            </div>
            <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
              Restrict judges to authorized categories
            </div>
          </Link>

          <Link to="/admin/audit-logs" className="evt-pchip" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 800, color: '#16274D', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} color="#EF4136" /> Security & Audit Logs
            </div>
            <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
              Inspect immutable audit trail of all operations
            </div>
          </Link>
        </div>
      </div>

      {/* Recommended Additions: LIVE NOW & UP NEXT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* LIVE NOW */}
        <div className="evt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="evt-eyebrow" style={{ color: '#EF4444' }}>● LIVE NOW</span>
            <span className="evt-badge evt-badge-live">Stage Active</span>
          </div>

          {data?.liveNow ? (
            <div style={{ background: '#F8FAFC', border: '2px solid #16274D', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span className="evt-mono evt-badge" style={{ background: '#FFD400', color: '#16274D', fontSize: 15, padding: '6px 12px' }}>
                  {data.liveNow.participantCode || data.liveNow.token || data.liveNow.code || 'DAN-017'}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#16274D' }}>{data.liveNow.name}</div>
                  <div className="evt-sub" style={{ fontSize: 12.5 }}>{data.liveNow.categoryName}</div>
                </div>
              </div>
              <div className="evt-sub" style={{ fontSize: 13, marginBottom: 14 }}>
                Act: <strong>{data.liveNow.routineTitle || data.liveNow.act || 'Stage Performance'}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/admin/projector" className="evt-btn evt-btn-teal" style={{ flex: 1, padding: '8px 12px', fontSize: 12, justifyContent: 'center' }}>
                  Open Stage Display →
                </Link>
                <Link to="/admin/participants" className="evt-btn evt-btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>
                  Directory
                </Link>
              </div>
            </div>
          ) : (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 24, background: '#F8FAFC', borderRadius: 12 }}>
              Stage is awaiting next participant call.
            </div>
          )}
        </div>

        {/* UP NEXT */}
        <div className="evt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="evt-eyebrow">UP NEXT</span>
            <span className="evt-badge evt-badge-pending">Queued</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!data?.upNext || data.upNext.length === 0) && (
              <div className="evt-sub" style={{ textAlign: 'center', padding: 24, background: '#F8FAFC', borderRadius: 12 }}>
                No additional queued performers.
              </div>
            )}
            {data?.upNext?.map((item, idx) => (
              <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', fontSize: 12 }}>
                    {item.participantCode || item.token || item.code}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#16274D' }}>{item.name}</div>
                    <div className="evt-sub" style={{ fontSize: 11 }}>{item.categoryName}</div>
                  </div>
                </div>
                <span className="evt-badge" style={{ background: '#E2E8F0', color: '#475569', fontSize: 11 }}>
                  Slot #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Additions: SYSTEM HEALTH & RECENT ACTIVITY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* SYSTEM HEALTH */}
        <div className="evt-card">
          <div className="evt-eyebrow">SYSTEM HEALTH</div>
          <div className="evt-h2" style={{ fontSize: 20, marginBottom: 14 }}>Real-Time Infrastructure</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>API Server Status:</span>
              <span className="evt-badge evt-badge-ok">● ONLINE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Real-Time Sync Engine:</span>
              <span className="evt-badge evt-badge-ok">● SSE CONNECTED</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Database Health:</span>
              <span className="evt-badge evt-badge-ok">Synced ({data?.systemHealth?.dbRecords || 0} entities)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <span className="evt-sub" style={{ fontWeight: 600 }}>Uptime:</span>
              <span className="evt-mono" style={{ fontWeight: 700, fontSize: 13, color: '#16274D' }}>
                {data?.systemHealth?.uptimeSeconds ? `${Math.floor(data.systemHealth.uptimeSeconds / 60)}m ${data.systemHealth.uptimeSeconds % 60}s` : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="evt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div className="evt-eyebrow">OPERATIONAL AUDIT</div>
              <div className="evt-h2" style={{ fontSize: 20, margin: 0 }}>Recent Activity</div>
            </div>
            <Link to="/admin/audit-logs" className="evt-sub" style={{ textDecoration: 'none', fontWeight: 700 }}>
              Full Log →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {(!data?.recentActivity || data.recentActivity.length === 0) && (
              <div className="evt-sub" style={{ textAlign: 'center', padding: 20 }}>No recent log records.</div>
            )}
            {data?.recentActivity?.slice(0, 4).map(act => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', fontSize: 10 }}>
                  {act.action}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#16274D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {act.entityType}: {act.entityId}
                  </div>
                  <div className="evt-sub" style={{ fontSize: 11 }}>
                    {new Date(act.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
