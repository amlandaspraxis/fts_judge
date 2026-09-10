import React, { useState } from 'react';
import api from '../../services/api';
import { Search, CheckCircle2, Phone, Hash } from 'lucide-react';

export default function SearchParticipant() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/participants/search?q=${encodeURIComponent(query.trim())}`);
      setResults(res.data.participants || []);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Desk Lookup</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Search Registry</h1>
        <p className="evt-sub">
          Instant participant verification by Chest Number, Registration Number, Performer Name, or Phone.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input
            className="evt-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type chest no (DAN-017), reg no, name, or phone…"
            required
          />
          <button type="submit" className="evt-btn evt-btn-amber" style={{ minWidth: 120, justifyContent: 'center' }}>
            <Search size={14} /> Search
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {loading && <div className="evt-sub" style={{ textAlign: 'center', padding: 16 }}>Searching records…</div>}
          {!loading && searched && results.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 20 }}>
              No participant found matching "{query}".
            </div>
          )}
          {results.map(p => (
            <div key={p.id} className="evt-pending-row" style={{ flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span className="evt-mono evt-badge" style={{ background: '#FFD400', color: '#16274D', border: '1.5px solid #16274D', padding: '6px 12px', fontSize: 15 }}>
                  {p.participantCode}
                </span>
                <span className="evt-sub" style={{ fontSize: 10, fontWeight: 700 }}>CHEST NO</span>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#16274D' }}>{p.name}</div>
                <div className="evt-sub" style={{ fontSize: 13 }}>Routine: <strong>{p.routineTitle || p.act}</strong></div>
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
