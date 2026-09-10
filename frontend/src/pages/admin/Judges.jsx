import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Gavel,
  UserPlus,
  Mail,
  Key,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldCheck,
  Award,
  Layers
} from 'lucide-react';
import { broadcastStateChange, syncActionToServer, subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminJudges() {
  const [judges, setJudges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createAssignedCats, setCreateAssignedCats] = useState([]);
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editAssignedCats, setEditAssignedCats] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingJudge, setDeletingJudge] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback Notifications
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      const [resJudges, resCats] = await Promise.all([
        api.get('/admin/judges'),
        api.get('/admin/categories')
      ]);
      setJudges(resJudges.data.judges || []);
      setCategories(resJudges.data.categories || resCats.data.categories || []);
    } catch (err) {
      console.error('Failed to load judge admin data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast((msg) => {
      if (['ADD_JUDGE', 'UPDATE_JUDGE', 'REMOVE_JUDGE', 'SUBMIT_JUDGE_SCORE', 'STATE_UPDATE', 'ADD_CATEGORY', 'UPDATE_CATEGORY', 'REMOVE_CATEGORY'].includes(msg.action)) {
        loadData();
      }
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  // Quick auto-dismiss for message
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(''), 6000);
    return () => clearTimeout(timer);
  }, [msg]);

  // Create Judge Handler
  const handleCreateJudge = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setCreating(true);

    try {
      const res = await api.post('/admin/judges', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || 'judge123',
        assignedCategories: createAssignedCats
      });

      const newJudge = res?.data?.judge || {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        assignedCategories: createAssignedCats
      };

      broadcastStateChange('ADD_JUDGE', { judge: newJudge });
      syncActionToServer('ADD_JUDGE', { judge: newJudge });

      setMsg(`Judge "${name.trim()}" created successfully! (Default password: ${password.trim() || 'judge123'})`);
      setName('');
      setEmail('');
      setPassword('');
      setCreateAssignedCats([]);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create judge');
    } finally {
      setCreating(false);
    }
  };

  // Toggle Category Assignment in Create Form
  const toggleCreateCategory = (catId) => {
    setCreateAssignedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  // Open Edit Modal
  const openEditModal = (judge) => {
    setEditingJudge(judge);
    setEditName(judge.name || '');
    setEditEmail(judge.email || '');
    setEditPassword('');
    setEditStatus(judge.status || 'ACTIVE');
    setEditAssignedCats(judge.assignedCategories ? [...judge.assignedCategories] : []);
    setError('');
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingJudge(null);
  };

  // Toggle Category Assignment in Edit Form
  const toggleEditCategory = (catId) => {
    setEditAssignedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  // Save Edit Judge
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingJudge) return;
    setError('');
    setSavingEdit(true);

    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        status: editStatus,
        assignedCategories: editAssignedCats
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await api.put(`/admin/judges/${editingJudge.id}`, payload);
      broadcastStateChange('UPDATE_JUDGE', { id: editingJudge.id, ...payload });
      syncActionToServer('UPDATE_JUDGE', { id: editingJudge.id, fields: payload });

      setMsg(`Judge "${editName.trim()}" updated successfully!`);
      closeEditModal();
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update judge');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (judge) => {
    setDeletingJudge(judge);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingJudge(null);
  };

  // Confirm Delete Judge
  const handleConfirmDelete = async () => {
    if (!deletingJudge) return;
    setDeleting(true);
    setError('');

    try {
      await api.delete(`/admin/judges/${deletingJudge.id}`);
      broadcastStateChange('REMOVE_JUDGE', { id: deletingJudge.id });
      syncActionToServer('REMOVE_JUDGE', { id: deletingJudge.id });

      setMsg(`Judge "${deletingJudge.name}" has been removed.`);
      closeDeleteModal();
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete judge');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Judges list based on search
  const filteredJudges = judges.filter(j => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (j.name || '').toLowerCase().includes(q) ||
      (j.email || '').toLowerCase().includes(q)
    );
  });

  const activeJudgesCount = judges.filter(j => j.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div className="evt-eyebrow" style={{ margin: 0 }}>Panel Management</div>
          <h1 className="evt-h1" style={{ fontSize: 32, margin: '2px 0 0 0' }}>Judicial Panel & Evaluators</h1>
          <p className="evt-sub" style={{ margin: '4px 0 0 0' }}>
            Register new evaluators, configure category judging assignments, update credentials, or manage panel seats.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            borderRadius: 12,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{ background: '#E0F2FE', color: '#0284C7', padding: 8, borderRadius: 8 }}>
              <Gavel size={18} />
            </div>
            <div>
              <div className="evt-mono" style={{ fontSize: 18, fontWeight: 900, color: '#16274D', lineHeight: 1.1 }}>
                {judges.length}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Total Judges</div>
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            borderRadius: 12,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{ background: '#DCFCE7', color: '#16A34A', padding: 8, borderRadius: 8 }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="evt-mono" style={{ fontSize: 18, fontWeight: 900, color: '#16274D', lineHeight: 1.1 }}>
                {activeJudgesCount}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Active Seats</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Notifications */}
      {error && (
        <div style={{
          color: '#D93025',
          background: '#FDE8E8',
          border: '1.5px solid #F87171',
          padding: '12px 16px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13.5,
          fontWeight: 600
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {msg && (
        <div style={{
          color: '#1C8A4C',
          background: '#DFF6E8',
          border: '1.5px solid #86EFAC',
          padding: '12px 16px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13.5,
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{msg}</span>
        </div>
      )}

      {/* Create Judge Account Card */}
      <div className="evt-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <UserPlus size={20} color="#EF4136" />
          <h2 className="evt-h2" style={{ fontSize: 20, margin: 0 }}>Create Judge Account</h2>
        </div>
        <p className="evt-sub" style={{ fontSize: 12.5, marginBottom: 16 }}>
          Set up login credentials for a new judge. They can sign in using their email and password to evaluate assigned categories.
        </p>

        <form onSubmit={handleCreateJudge} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label className="evt-label">Judge Full Name *</label>
              <input
                className="evt-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dr. N. Kapoor"
                required
              />
            </div>
            <div>
              <label className="evt-label">Login Email *</label>
              <input
                className="evt-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. judge1@event.local"
                required
              />
            </div>
            <div>
              <label className="evt-label">Initial Password (Optional)</label>
              <input
                className="evt-input"
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Default: judge123"
              />
            </div>
          </div>

          {/* Quick Category Assignments */}
          {categories.length > 0 && (
            <div>
              <label className="evt-label" style={{ marginBottom: 6, display: 'block' }}>
                Assign Initial Judging Categories (Optional):
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {categories.map(c => {
                  const isSelected = createAssignedCats.includes(c.id);
                  const title = c.name || c.label || c.title || c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCreateCategory(c.id)}
                      style={{
                        background: isSelected ? '#16274D' : '#F1F4F9',
                        color: isSelected ? '#FFD400' : '#475569',
                        border: isSelected ? '1.5px solid #16274D' : '1.5px solid #CBD5E1',
                        borderRadius: 8,
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected && <Check size={13} />}
                      {title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="submit"
              className="evt-btn evt-btn-amber"
              disabled={creating}
              style={{ padding: '10px 20px', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <UserPlus size={16} />
              {creating ? 'Creating Judge...' : 'Create Judge Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Registered Judges Card */}
      <div className="evt-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gavel size={20} color="#29ABE2" />
            <h2 className="evt-h2" style={{ fontSize: 20, margin: 0 }}>
              Registered Judges ({judges.length})
            </h2>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search judges by name or email..."
              className="evt-input"
              style={{ paddingLeft: 32, fontSize: 12.5, height: 36 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredJudges.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              background: '#F8FAFC',
              borderRadius: 12,
              border: '2px dashed #E2E8F0',
              color: '#64748B'
            }}>
              <Gavel size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {searchQuery ? 'No judges found matching your search.' : 'No judges registered yet.'}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {searchQuery ? 'Try another keyword or clear the search.' : 'Use the form above to create your first judge account.'}
              </div>
            </div>
          ) : (
            filteredJudges.map(j => {
              const assignedCats = (j.assignedCategories || []).map(catId => {
                const found = categories.find(c => c.id === catId);
                return {
                  id: catId,
                  name: found?.name || found?.label || catId
                };
              });

              const isActive = j.status === 'ACTIVE';

              return (
                <div
                  key={j.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: 12,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Left: Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260, flex: '1 1 300px' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#16274D',
                      color: '#FFD400',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 16,
                      border: '2px solid #FFD400',
                      flexShrink: 0
                    }}>
                      {j.name ? j.name.charAt(0).toUpperCase() : 'J'}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#16274D' }}>
                          {j.name}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: isActive ? '#DCFCE7' : '#F1F5F9',
                          color: isActive ? '#15803D' : '#64748B',
                          border: isActive ? '1px solid #86EFAC' : '1px solid #CBD5E1'
                        }}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 12, marginTop: 3 }}>
                        <Mail size={12} />
                        <span>{j.email}</span>
                      </div>

                      {/* Categories Badges */}
                      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginRight: 2 }}>
                          Assigned:
                        </span>
                        {assignedCats.length === 0 ? (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA'
                          }}>
                            No categories assigned
                          </span>
                        ) : (
                          assignedCats.map(cat => (
                            <span
                              key={cat.id}
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#E0F2FE',
                                color: '#0369A1',
                                border: '1px solid #BAE6FD'
                              }}
                            >
                              {cat.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Stats & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                    {/* Score stats */}
                    <div style={{ textAlign: 'right', minWidth: 90 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <Award size={14} color="#FFD400" />
                        <span className="evt-mono" style={{ fontWeight: 900, fontSize: 16, color: '#16274D' }}>
                          {j.scoresSubmitted ?? 0}
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600 }}>Scores Submitted</div>
                    </div>

                    {/* Action Buttons: Edit & Delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => openEditModal(j)}
                        className="evt-btn evt-btn-ghost"
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#16274D',
                          borderColor: '#CBD5E1',
                          background: '#F8FAFC'
                        }}
                        title={`Edit details for ${j.name}`}
                      >
                        <Pencil size={13} color="#29ABE2" /> Edit
                      </button>

                      <button
                        onClick={() => openDeleteModal(j)}
                        className="evt-btn evt-btn-ghost"
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#DC2626',
                          borderColor: '#FECACA',
                          background: '#FEF2F2'
                        }}
                        title={`Delete judge account for ${j.name}`}
                      >
                        <Trash2 size={13} color="#DC2626" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Judge Modal */}
      {editModalOpen && editingJudge && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(14, 24, 48, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 540,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '2px solid #16274D'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: '#E0F2FE', color: '#0284C7', padding: 6, borderRadius: 8 }}>
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#16274D', margin: 0 }}>
                    Edit Judge Details
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>
                    ID: {editingJudge.id}
                  </div>
                </div>
              </div>

              <button
                onClick={closeEditModal}
                style={{
                  background: '#F1F4F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="evt-label">Full Name *</label>
                <input
                  className="evt-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="evt-label">Login Email *</label>
                  <input
                    className="evt-input"
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="evt-label">Account Status</label>
                  <select
                    className="evt-select"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    style={{ width: '100%', height: 42 }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="evt-label">
                  Change Password (Optional)
                  <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 4 }}>Leave blank to keep current</span>
                </label>
                <input
                  className="evt-input"
                  type="text"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              {/* Assigned Categories Multi-select */}
              {categories.length > 0 && (
                <div>
                  <label className="evt-label" style={{ marginBottom: 6, display: 'block' }}>
                    Assigned Judging Categories:
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 120, overflowY: 'auto' }}>
                    {categories.map(c => {
                      const isSelected = editAssignedCats.includes(c.id);
                      const title = c.name || c.label || c.title || c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleEditCategory(c.id)}
                          style={{
                            background: isSelected ? '#16274D' : '#F1F4F9',
                            color: isSelected ? '#FFD400' : '#475569',
                            border: isSelected ? '1.5px solid #16274D' : '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            padding: '5px 10px',
                            fontSize: 11.5,
                            fontWeight: isSelected ? 800 : 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <Check size={12} />}
                          {title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="evt-btn evt-btn-ghost"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="evt-btn evt-btn-amber"
                  disabled={savingEdit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Check size={15} />
                  {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Judge Confirmation Modal */}
      {deleteModalOpen && deletingJudge && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(14, 24, 48, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 440,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '2px solid #DC2626'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                background: '#FEE2E2',
                color: '#DC2626',
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#16274D', margin: 0 }}>
                  Delete Judge Account?
                </h3>
                <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 700 }}>
                  Irreversible Action
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
              Are you sure you want to delete judge <strong>{deletingJudge.name}</strong> (<code>{deletingJudge.email}</code>)?
              This will remove their login access and revoke all their category judging assignments.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="evt-btn evt-btn-ghost"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="evt-btn evt-btn-amber"
                disabled={deleting}
                style={{
                  background: '#DC2626',
                  borderColor: '#DC2626',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Trash2 size={15} />
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
