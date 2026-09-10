import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Sliders } from 'lucide-react';

export default function AdminSettings() {
  const [judgeWeight, setJudgeWeight] = useState(85);
  const [audienceWeight, setAudienceWeight] = useState(15);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">System Configuration</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Weighting & Scoring Parameters</h1>
        <p className="evt-sub">
          Parameters are enforced server-side by the backend result calculation engine.
        </p>

        {saved && (
          <div style={{ color: '#1C8A4C', background: '#DFF6E8', padding: '10px 14px', borderRadius: 8, marginTop: 12 }}>
            Parameters confirmed.
          </div>
        )}

        <form onSubmit={handleSave} style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="evt-label" style={{ margin: 0 }}>Judge Weight</span>
              <span className="evt-mono" style={{ fontWeight: 800, color: '#16274D' }}>{judgeWeight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={judgeWeight}
              onChange={e => {
                const val = Number(e.target.value);
                setJudgeWeight(val);
                setAudienceWeight(100 - val);
              }}
              className="evt-slider"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="evt-label" style={{ margin: 0 }}>Audience Weight</span>
              <span className="evt-mono" style={{ fontWeight: 800, color: '#16274D' }}>{audienceWeight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={audienceWeight}
              onChange={e => {
                const val = Number(e.target.value);
                setAudienceWeight(val);
                setJudgeWeight(100 - val);
              }}
              className="evt-slider"
            />
          </div>

          <div style={{ background: '#F7F9FD', border: '1.5px solid #C7CEDE', padding: 14, borderRadius: 10 }}>
            <div className="evt-eyebrow" style={{ margin: 0 }}>Active Weighting Formula</div>
            <div style={{ fontWeight: 800, color: '#16274D', marginTop: 4 }}>
              Final Score = (Judge Score × {judgeWeight / 100}) + (Audience Score × {audienceWeight / 100})
            </div>
          </div>

          <button type="submit" className="evt-btn evt-btn-amber" style={{ justifyContent: 'center' }}>
            Save Weighting Rules
          </button>
        </form>
      </div>
    </div>
  );
}
