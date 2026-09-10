import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Edit2, List, CheckCircle2, AlertCircle } from 'lucide-react';
import { broadcastStateChange, syncActionToServer, subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadCategories = () => {
    api.get('/admin/categories')
      .then(res => setCategories(res.data.categories))
      .catch(err => setError(err.message));
  };

  useEffect(() => {
    loadCategories();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast((m) => {
      if (['ADD_CATEGORY', 'UPDATE_CATEGORY', 'REMOVE_CATEGORY', 'STATE_UPDATE'].includes(m.action)) {
        loadCategories();
      }
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      if (editingId) {
        const res = await api.put(`/admin/categories/${editingId}`, { name, prefix, description });
        const updatedCat = res.data?.category || { id: editingId, name, prefix, description };
        broadcastStateChange('UPDATE_CATEGORY', { category: updatedCat });
        syncActionToServer('UPDATE_CATEGORY', { category: updatedCat });
        setMsg('Category updated successfully');
      } else {
        const res = await api.post('/admin/categories', { name, prefix, description });
        const newCat = res.data?.category || { id: `cat_${Date.now()}`, name, prefix, description };
        broadcastStateChange('ADD_CATEGORY', { category: newCat });
        syncActionToServer('ADD_CATEGORY', { category: newCat });
        setMsg('Category created successfully');
      }
      setName('');
      setPrefix('');
      setDescription('');
      setEditingId(null);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Action failed');
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setName(c.name);
    setPrefix(c.prefix);
    setDescription(c.description || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      broadcastStateChange('REMOVE_CATEGORY', { id });
      syncActionToServer('REMOVE_CATEGORY', { id });
      loadCategories();
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Competition Setup</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Categories Management</h1>
        <p className="evt-sub">
          Manually create, update, and manage categories for the event.
        </p>

        {error && <div style={{ color: '#D93025', background: '#FDE8E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{error}</div>}
        {msg && <div style={{ color: '#1C8A4C', background: '#DFF6E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{msg}</div>}

        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16, alignItems: 'flex-end' }}>
          <div>
            <label className="evt-label">Category Name</label>
            <input className="evt-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Classical Dance" required />
          </div>
          <div>
            <label className="evt-label">Code Prefix (2-4 chars)</label>
            <input className="evt-input evt-mono" value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} placeholder="e.g. DNC" required />
          </div>
          <div>
            <label className="evt-label">Description</label>
            <input className="evt-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short overview of act criteria" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="evt-btn evt-btn-amber" style={{ flex: 1, justifyContent: 'center' }}>
              {editingId ? 'Update Category' : 'Create Category'}
            </button>
            {editingId && (
              <button type="button" className="evt-btn evt-btn-ghost" onClick={() => { setEditingId(null); setName(''); setPrefix(''); setDescription(''); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="evt-card">
        <div className="evt-h2" style={{ fontSize: 22 }}>Existing Categories ({categories.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {categories.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 20 }}>No categories created yet.</div>
          )}
          {categories.map(c => (
            <div key={c.id} className="evt-pending-row">
              <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', padding: '6px 12px', fontSize: 13 }}>
                {c.prefix}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{c.name}</div>
                <div className="evt-sub" style={{ fontSize: 12 }}>{c.description || 'No description provided'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="evt-btn evt-btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleEdit(c)}>
                  <Edit2 size={13} /> Edit
                </button>
                <button className="evt-btn evt-btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: '#D93025' }} onClick={() => handleDelete(c.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
