import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Gavel, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { broadcastStateChange, syncActionToServer, subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminJudgeAssignments() {
  const [judges, setJudges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadData = () => {
    api.get('/admin/judges').then(res => {
      setJudges(res.data.judges);
      if (!selectedJudge && res.data.judges.length > 0) setSelectedJudge(res.data.judges[0].id);
    });
    api.get('/admin/categories').then(res => {
      setCategories(res.data.categories);
      if (!selectedCat && res.data.categories.length > 0) setSelectedCat(res.data.categories[0].id);
    });
  };

  useEffect(() => {
    loadData();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast((m) => {
      if (['ADD_JUDGE', 'UPDATE_JUDGE', 'REMOVE_JUDGE', 'ADD_CATEGORY', 'UPDATE_CATEGORY', 'REMOVE_CATEGORY', 'STATE_UPDATE'].includes(m.action)) {
        loadData();
      }
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.post('/admin/judge-assignments', { judgeId: selectedJudge, categoryId: selectedCat });
      broadcastStateChange('UPDATE_JUDGE', { id: selectedJudge });
      syncActionToServer('UPDATE_JUDGE', { id: selectedJudge });
      setMsg('Judge successfully assigned to category!');
      loadData();
    } catch (err) {
      setError(err.message || 'Assignment failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Authorization Matrix</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Judge Category Allocations</h1>
        <p className="evt-sub">
          Assign judges to specific categories. The backend strictly prevents judges from viewing or scoring unassigned categories.
        </p>

        {error && <div style={{ color: '#D93025', background: '#FDE8E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{error}</div>}
        {msg && <div style={{ color: '#1C8A4C', background: '#DFF6E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{msg}</div>}

        <form onSubmit={handleAssign} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16, alignItems: 'flex-end' }}>
          <div>
            <label className="evt-label">Select Judge</label>
            <select className="evt-input" value={selectedJudge} onChange={e => setSelectedJudge(e.target.value)} required>
              {judges.map(j => (
                <option key={j.id} value={j.id}>{j.name} ({j.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="evt-label">Assign to Category</label>
            <select className="evt-input" value={selectedCat} onChange={e => setSelectedCat(e.target.value)} required>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.prefix})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="evt-btn evt-btn-amber" style={{ justifyContent: 'center' }}>
            <Plus size={14} /> Confirm Assignment
          </button>
        </form>
      </div>

      <div className="evt-card">
        <div className="evt-h2" style={{ fontSize: 22 }}>Current Allocations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {judges.map(j => {
            const assignedCats = (j.assignedCategories || []).map(catId => categories.find(c => c.id === catId)).filter(Boolean);
            return (
              <div key={j.id} className="evt-pending-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{j.name}</div>
                  <div className="evt-sub">{j.email}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {assignedCats.length === 0 && (
                      <span className="evt-sub">No categories allocated</span>
                    )}
                    {assignedCats.map(c => (
                      <span key={c.id} className="evt-mono evt-badge" style={{ background: '#E7F5FF', color: '#087df0', border: '1.5px solid #159bd7', padding: '4px 10px', fontSize: 12 }}>
                        [{c.prefix || c.code}] {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
