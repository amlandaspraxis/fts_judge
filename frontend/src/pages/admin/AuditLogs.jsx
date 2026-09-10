import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Eye, Shield, RefreshCw } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    api.get('/admin/audit-logs')
      .then(res => setLogs(res.data.auditLogs || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="evt-eyebrow">Immutable Operational Trail</div>
            <h1 className="evt-h1" style={{ fontSize: 32 }}>Security & Audit Logs</h1>
          </div>
          <button className="evt-btn evt-btn-ghost" onClick={loadLogs}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <p className="evt-sub">
          All score submissions, single-edits, category alterations, and state transitions are logged with user ID, timestamps, and IP addresses.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          {logs.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>No audit records generated yet.</div>
          )}
          {logs.map(log => (
            <div key={log.id} className="evt-pending-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', fontSize: 11 }}>
                    {log.action}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#16274D' }}>
                    Entity: {log.entityType} ({log.entityId || 'N/A'})
                  </span>
                </div>
                <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
                  By: <strong>{log.userId || 'System'}</strong> · IP: {log.ipAddress} · {new Date(log.createdAt).toLocaleString()}
                </div>
                {(log.oldValue || log.newValue) && (
                  <div style={{ fontSize: 11, background: '#F7F9FD', padding: 6, borderRadius: 6, marginTop: 6, fontFamily: 'monospace' }}>
                    {log.oldValue && <div>Old: {log.oldValue}</div>}
                    {log.newValue && <div>New: {log.newValue}</div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
