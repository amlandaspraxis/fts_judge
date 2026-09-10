import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Plus, Search, Filter, Phone, Hash, Trash2 } from 'lucide-react';
import { broadcastStateChange, syncActionToServer, subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminParticipants() {
  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [routineTitle, setRoutineTitle] = useState('');
  const [participantCode, setParticipantCode] = useState('');
  const [photo, setPhoto] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadData = () => {
    api.get('/admin/categories').then(res => {
      const cats = res.data.categories || [];
      setCategories(cats);
      if (!categoryId && cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    });

    api.get('/participants').then(res => {
      setParticipants(res.data.participants || []);
    });
  };

  useEffect(() => {
    loadData();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast((msg) => {
      if (['ADD_PARTICIPANT', 'UPDATE_PARTICIPANT', 'REMOVE_PARTICIPANT', 'STATE_UPDATE', 'ADD_CATEGORY', 'UPDATE_CATEGORY', 'REMOVE_CATEGORY'].includes(msg.action)) {
        loadData();
      }
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const categoryCode = selectedCategory?.code || selectedCategory?.prefix || '';

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    const digits = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    try {
      const res = await api.post('/participants/register', {
        name: name.trim(),
        categoryId,
        registrationNumber: registrationNumber.trim().toUpperCase(),
        phoneNumber: phoneNumber.trim(),
        routineTitle: routineTitle.trim(),
        participantCode: participantCode.trim().toUpperCase(),
        photo: photo.trim() || null
      });
      const newPart = res.data?.participant;
      if (newPart) {
        broadcastStateChange('ADD_PARTICIPANT', { participant: newPart });
        syncActionToServer('ADD_PARTICIPANT', { participant: newPart });
      }
      setMsg(`Performer ${name} enrolled with Chest Number ${participantCode.toUpperCase()}!`);
      setName('');
      setRegistrationNumber('');
      setPhoneNumber('');
      setRoutineTitle('');
      setParticipantCode('');
      setPhoto('');
      loadData();
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleDeleteParticipant = async (p) => {
    if (!window.confirm(`Are you sure you want to remove performer "${p.name}" (${p.participantCode || p.code})?`)) {
      return;
    }
    try {
      await api.delete(`/participants/${p.id}`);
      broadcastStateChange('REMOVE_PARTICIPANT', { id: p.id, code: p.participantCode || p.code });
      syncActionToServer('REMOVE_PARTICIPANT', { id: p.id, code: p.participantCode || p.code });
      setMsg(`Performer ${p.name} removed successfully.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to remove performer');
    }
  };

  const filtered = participants.filter(p => {
    const matchesCat = filterCat ? p.categoryId === filterCat : true;
    const itemStatus = (p.status || 'REGISTERED').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' ? true : itemStatus === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch = q
      ? p.name?.toLowerCase().includes(q) ||
        p.participantCode?.toLowerCase().includes(q) ||
        p.registrationNumber?.toLowerCase().includes(q) ||
        p.phoneNumber?.includes(q) ||
        p.routineTitle?.toLowerCase().includes(q)
      : true;
    return matchesCat && matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Registration Card */}
      <div className="evt-card">
        <div className="evt-eyebrow">Performers Management</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Register New Performer</h1>
        <p className="evt-sub">
          Manual chest number assignment with category code reference.
        </p>

        {error && <div style={{ color: '#D93025', background: '#FDE8E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{error}</div>}
        {msg && <div style={{ color: '#1C8A4C', background: '#DFF6E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{msg}</div>}

        <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 16, alignItems: 'flex-end' }}>
          <div>
            <label className="evt-label">Performer Name *</label>
            <input className="evt-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
          </div>

          <div>
            <label className="evt-label">Category *</label>
            <select className="evt-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code || c.prefix})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="evt-label">Registration Number *</label>
            <input className="evt-input evt-mono" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value.toUpperCase())} placeholder="e.g. REG-2026-045" required />
          </div>

          <div>
            <label className="evt-label">Phone Number *</label>
            <input className="evt-input evt-mono" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="e.g. 9876543210" required />
          </div>

          <div>
            <label className="evt-label">Act / Routine Title *</label>
            <input className="evt-input" value={routineTitle} onChange={e => setRoutineTitle(e.target.value)} placeholder="e.g. Bollywood Fusion" required />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="evt-label" style={{ margin: 0 }}>Chest Number *</label>
              <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', fontSize: 10 }}>
                Code: {categoryCode}
              </span>
            </div>
            <input className="evt-input evt-mono" value={participantCode} onChange={e => setParticipantCode(e.target.value.toUpperCase())} placeholder={`e.g. ${categoryCode || 'DAN'}-01`} required />
          </div>

          <div>
            <label className="evt-label">Photo URL (Optional)</label>
            <input className="evt-input" value={photo} onChange={e => setPhoto(e.target.value)} placeholder="https://... or data:image/..." />
          </div>

          <button type="submit" className="evt-btn evt-btn-amber" style={{ justifyContent: 'center', height: 46 }}>
            <Plus size={15} /> Register Performer
          </button>
        </form>
      </div>

      {/* Directory Card */}
      <div className="evt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="evt-h2" style={{ margin: 0, fontSize: 22 }}>Registered Performers ({filtered.length})</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              className="evt-input"
              style={{ width: 260, padding: '8px 12px', fontSize: 13, minHeight: 40 }}
              placeholder="Search chest #, reg #, name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="evt-input"
              style={{ width: 220, padding: '8px 12px', fontSize: 13, minHeight: 40 }}
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs per Section 15 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Performers' },
            { key: 'REGISTERED', label: 'Registered' },
            { key: 'CHECKED_IN', label: 'Checked In' },
            { key: 'WAITING', label: 'Waiting' },
            { key: 'PERFORMING', label: 'Performing' },
            { key: 'COMPLETED', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className="evt-tab"
              style={{
                fontSize: 12,
                padding: '6px 14px',
                background: statusFilter === tab.key ? '#FFD400' : '#16274D',
                color: statusFilter === tab.key ? '#16274D' : '#CFE3F5',
                borderColor: statusFilter === tab.key ? '#16274D' : '#29ABE2'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {filtered.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>No performers found matching criteria.</div>
          )}
          {filtered.map(p => {
            const pStatus = (p.status || 'REGISTERED').toUpperCase();
            const badgeClass =
              pStatus === 'PERFORMING' ? 'evt-badge-live' :
              pStatus === 'COMPLETED' ? 'evt-badge-completed' :
              pStatus === 'WAITING' ? 'evt-badge-pending' : 'evt-badge-ok';

            return (
              <div key={p.id} className="evt-pending-row" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span className="evt-mono evt-badge" style={{ background: '#FFD400', color: '#16274D', border: '1.5px solid #16274D', padding: '6px 12px', fontSize: 14 }}>
                    {p.participantCode}
                  </span>
                  <span className="evt-sub" style={{ fontSize: 10, fontWeight: 700 }}>CHEST NO</span>
                </div>

                {p.photo ? (
                  <img src={p.photo} alt={p.name} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #16274D', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#FFF3C4', color: '#16274D', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #16274D', fontSize: 18, flexShrink: 0 }}>
                    {p.name?.charAt(0) || 'P'}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{p.name}</div>
                  <div className="evt-sub" style={{ fontSize: 12.5 }}>Routine: <strong>{p.routineTitle || p.act}</strong></div>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`evt-badge ${badgeClass}`}>{pStatus}</span>
                  <button
                    onClick={() => handleDeleteParticipant(p)}
                    className="evt-btn evt-btn-ghost"
                    style={{ padding: '6px 10px', color: '#D93025', borderColor: '#E2E8F0', height: 32 }}
                    title="Remove performer from competition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
