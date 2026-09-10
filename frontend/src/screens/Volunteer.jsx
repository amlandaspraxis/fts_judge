import React, { useState } from 'react';
import { 
  KeyRound, CheckCircle2, AlertCircle, ArrowRight, UserPlus, 
  Phone, Hash, Tag, Sparkles, Search, Printer, Copy, Check, Filter, LogOut
} from 'lucide-react';

export default function VolunteerView({ registrations = [], participants = [], generateRegistrationCode, CATEGORIES = [] }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]?.id || "dance");
  const [phone, setPhone] = useState("");
  const [regNo, setRegNo] = useState("");
  const [token, setToken] = useState("");
  const [act, setAct] = useState("");
  const [justGenerated, setJustGenerated] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [copiedToken, setCopiedToken] = useState(false);

  const selectedCategory = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  const categoryCode = selectedCategory?.prefix || "GEN";

  // Auto-generate suggestion for token based on category and current count
  const suggestToken = () => {
    const catParticipants = (participants || []).filter(p => p.categoryId === categoryId);
    const nextNum = String(catParticipants.length + 1).padStart(2, '0');
    setToken(`${categoryCode}-${nextNum}`);
    setError("");
  };

  const handleRegister = (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the participant's full name.");
      return;
    }
    if (!categoryId) {
      setError("Please select an event category.");
      return;
    }
    if (!regNo.trim()) {
      setError("Please enter the student's registration / roll number.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError("Please enter a valid 10-digit mobile phone number.");
      return;
    }
    if (!token.trim()) {
      setError("Please assign a participation token (or click 'Auto-Suggest').");
      return;
    }

    const cleanToken = token.trim().toUpperCase();

    // Call generateRegistrationCode with full participant metadata
    const res = generateRegistrationCode(
      name.trim(), 
      categoryId, 
      "", 
      {
        token: cleanToken,
        categoryCode,
        phone: phone.trim(),
        regNo: regNo.trim().toUpperCase(),
        act: act.trim() || selectedCategory?.label || "Live Performance"
      }
    );

    if (!res || !res.ok) {
      setError(res?.error || "Failed to register participant.");
      return;
    }

    setJustGenerated({
      ...res.reg,
      token: cleanToken,
      categoryLabel: selectedCategory?.label,
      categoryCode,
      phone: phone.trim(),
      regNo: regNo.trim().toUpperCase(),
      act: act.trim() || selectedCategory?.label
    });

    setError("");
    setName("");
    setPhone("");
    setRegNo("");
    setToken("");
    setAct("");
  };

  const copyToClipboard = (text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Combine and deduplicate participants and registrations for the desk table
  const allRegistrations = [...registrations];
  
  // Filter registered list
  const filteredList = allRegistrations.filter(r => {
    const matchesSearch = 
      !searchQuery ||
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.token?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.regNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone?.includes(searchQuery);

    const matchesCat = filterCategory === "all" || r.categoryId === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header Banner */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="evt-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <UserPlus size={14} color="#29ABE2" />
            <span>PORTAL 2 · VOLUNTEER REGISTRATION DESK</span>
          </div>
          <h1 className="evt-h1" style={{ fontSize: 36, marginTop: 4 }}>Participant Registration & Token Desk</h1>
          <p className="evt-sub" style={{ fontSize: 14, margin: 0 }}>
            Register arriving participants manually, record their contact & category details, and assign physical participation tokens.
          </p>
        </div>
        <button
          onClick={() => { window.location.href = '/login'; }}
          className="evt-btn evt-btn-ghost"
          style={{ fontSize: 12, padding: "8px 14px", color: "#EF4136", borderColor: "#EF4136", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          title="Sign out of Volunteer Desk and return to Login"
        >
          <LogOut size={14} color="#EF4136" /> Log Out Desk
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        {/* Registration Form Card */}
        <form onSubmit={handleRegister} className="evt-card" style={{ padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, borderBottom: "2px solid #E7EAF2", paddingBottom: 12 }}>
            <Tag size={18} color="#16274D" />
            <h2 className="evt-h2" style={{ margin: 0, fontSize: 20 }}>Participant Enrolment Details</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {/* 1. Participant Name */}
            <div>
              <label className="evt-label">1. Full Name *</label>
              <input 
                className="evt-input" 
                value={name} 
                onChange={e => { setName(e.target.value); setError(""); }} 
                placeholder="e.g. Aarav Sharma" 
                required
              />
            </div>

            {/* 2. Registration Number */}
            <div>
              <label className="evt-label">2. University / Student Reg Number *</label>
              <div style={{ position: "relative" }}>
                <input 
                  className="evt-input evt-mono" 
                  value={regNo} 
                  onChange={e => { setRegNo(e.target.value.toUpperCase()); setError(""); }} 
                  placeholder="e.g. 2026FTS042" 
                  required
                />
              </div>
            </div>

            {/* 3. Event Category & Category Code */}
            <div>
              <label className="evt-label">3. Event Category & Code *</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select 
                  className="evt-input" 
                  value={categoryId} 
                  onChange={e => { setCategoryId(e.target.value); setError(""); }} 
                  style={{ flex: 1 }}
                  required
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.prefix})
                    </option>
                  ))}
                </select>
                <span 
                  className="evt-mono"
                  style={{ 
                    background: "#16274D", 
                    color: "#FFD400", 
                    padding: "11px 14px", 
                    borderRadius: 10, 
                    fontWeight: 800,
                    fontSize: 14,
                    border: "2px solid #0E1830",
                    flexShrink: 0
                  }}
                  title="Category Code"
                >
                  {categoryCode}
                </span>
              </div>
            </div>

            {/* 4. Phone Number */}
            <div>
              <label className="evt-label">4. Phone Number *</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="tel"
                  className="evt-input" 
                  value={phone} 
                  onChange={e => { setPhone(e.target.value.replace(/[^\d+]/g, '')); setError(""); }} 
                  placeholder="10-digit mobile number" 
                  maxLength={15}
                  required
                />
              </div>
            </div>

            {/* 5. Participation Token */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="evt-label" style={{ margin: 0 }}>5. Participation Token *</label>
                <button 
                  type="button" 
                  onClick={suggestToken} 
                  className="evt-btn evt-btn-ghost" 
                  style={{ fontSize: 11, padding: "3px 8px", height: "auto" }}
                >
                  <Sparkles size={11} color="#29ABE2" /> Auto-Suggest
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input 
                  className="evt-input evt-mono" 
                  value={token} 
                  onChange={e => { setToken(e.target.value.replace(/\s+/g, '').toUpperCase()); setError(""); }} 
                  placeholder={`e.g. ${categoryCode}-01`} 
                  style={{ fontSize: 16, fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            {/* 6. Act / Performance Title (Optional) */}
            <div>
              <label className="evt-label">6. Act / Performance Routine (Optional)</label>
              <input 
                className="evt-input" 
                value={act} 
                onChange={e => setAct(e.target.value)} 
                placeholder="e.g. Hip Hop Freestyle / Classical Vocal" 
              />
            </div>
          </div>

          {/* Error notification */}
          {error && (
            <div style={{ 
              color: "#D93025", 
              background: "#FDE8E8", 
              border: "1.5px solid #F87171", 
              borderRadius: 8, 
              padding: "10px 14px", 
              fontSize: 13, 
              marginTop: 16, 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              fontWeight: 600 
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button 
              type="submit" 
              className="evt-btn evt-btn-amber" 
              style={{ flex: 1, justifyContent: "center", fontSize: 15, padding: "12px 20px" }}
            >
              <KeyRound size={16} /> Register & Issue Participation Token {token ? `[${token}]` : ""}
            </button>
          </div>
        </form>

        {/* Issued Participation Token Slip Preview */}
        {justGenerated && (
          <div 
            className="evt-card" 
            style={{ 
              background: "linear-gradient(135deg, #FFF9E0 0%, #FFFFFF 100%)", 
              border: "3px solid #16274D", 
              padding: 24,
              animation: "evtpop .3s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={20} color="#10B981" />
                <span className="evt-h2" style={{ margin: 0, fontSize: 20, color: "#16274D" }}>
                  Official Participation Token Slip
                </span>
              </div>
              <button 
                type="button" 
                className="evt-btn evt-btn-ghost" 
                style={{ fontSize: 12, padding: "5px 10px" }}
                onClick={() => copyToClipboard(justGenerated.token || justGenerated.code)}
              >
                {copiedToken ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                {copiedToken ? "Copied!" : "Copy Token"}
              </button>
            </div>

            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
              gap: 12, 
              background: "#FFFFFF", 
              border: "2px dashed #16274D", 
              borderRadius: 14, 
              padding: 18 
            }}>
              <div>
                <div className="evt-eyebrow">Participation Token</div>
                <div className="evt-mono" style={{ fontSize: 32, fontWeight: 900, color: "#16274D", letterSpacing: "0.06em" }}>
                  {justGenerated.token || justGenerated.code}
                </div>
              </div>

              <div>
                <div className="evt-eyebrow">Participant Name</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#16274D" }}>{justGenerated.name}</div>
                <div className="evt-sub" style={{ fontSize: 12 }}>{justGenerated.act || "Performance"}</div>
              </div>

              <div>
                <div className="evt-eyebrow">Category & Code</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="evt-badge" style={{ background: "#16274D", color: "#FFD400", fontWeight: 800, fontSize: 12 }}>
                    {justGenerated.categoryCode}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{justGenerated.categoryLabel}</span>
                </div>
              </div>

              <div>
                <div className="evt-eyebrow">Registration / Student No.</div>
                <div className="evt-mono" style={{ fontSize: 14, fontWeight: 700 }}>{justGenerated.regNo || "—"}</div>
                <div className="evt-sub" style={{ fontSize: 12 }}>Phone: {justGenerated.phone || "—"}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <span className="evt-badge evt-badge-ok" style={{ padding: "6px 12px", fontSize: 12 }}>
                <CheckCircle2 size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> 
                Enrolled into Event · Ready for Stage
              </span>
              <button 
                type="button" 
                className="evt-btn evt-btn-amber" 
                style={{ fontSize: 12, padding: "6px 14px" }}
                onClick={() => setJustGenerated(null)}
              >
                + Register Another Participant
              </button>
            </div>
          </div>
        )}

        {/* Registered Participants Table & Search */}
        <div className="evt-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 className="evt-h2" style={{ margin: 0, fontSize: 20 }}>Registered Participants ({allRegistrations.length})</h2>
              <p className="evt-sub" style={{ margin: 0, fontSize: 12 }}>Issued tokens and verified participant records</p>
            </div>

            {/* Category quick filter */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button 
                className={`evt-chip ${filterCategory === 'all' ? 'active' : ''}`}
                onClick={() => setFilterCategory('all')}
                style={{ fontSize: 11, padding: "5px 10px" }}
              >
                All Categories
              </button>
              {CATEGORIES.map(c => (
                <button 
                  key={c.id}
                  className={`evt-chip ${filterCategory === c.id ? 'active' : ''}`}
                  onClick={() => setFilterCategory(c.id)}
                  style={{ fontSize: 11, padding: "5px 10px" }}
                >
                  {c.prefix}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={16} color="#5B6890" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              className="evt-input" 
              style={{ paddingLeft: 38 }}
              placeholder="Search by participant name, token, registration number, or phone..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Participants Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F7F9FD", borderBottom: "2px solid #C7CEDE" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 800, color: "#5B6890" }}>TOKEN</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, color: "#5B6890" }}>PARTICIPANT</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, color: "#5B6890" }}>CATEGORY & CODE</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, color: "#5B6890" }}>REG NO.</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, color: "#5B6890" }}>PHONE</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, color: "#5B6890", textAlign: "right" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 28, textAlign: "center", color: "#5B6890" }}>
                      No registered participants found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((r, idx) => {
                    const cat = CATEGORIES.find(c => c.id === r.categoryId);
                    const tokenText = r.token || r.code;
                    return (
                      <tr 
                        key={r.id || idx} 
                        style={{ 
                          borderBottom: "1px solid #E7EAF2",
                          background: idx % 2 === 0 ? "#FFFFFF" : "#FAFBFE"
                        }}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <span 
                            className="evt-mono"
                            style={{ 
                              background: "#16274D", 
                              color: "#FFD400", 
                              padding: "4px 8px", 
                              borderRadius: 6, 
                              fontWeight: 800, 
                              fontSize: 13,
                              border: "1px solid #0E1830",
                              display: "inline-block"
                            }}
                          >
                            {tokenText}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 700, color: "#16274D" }}>{r.name}</div>
                          {r.act && <div className="evt-sub" style={{ fontSize: 11 }}>{r.act}</div>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span className="evt-badge" style={{ background: "#E2E8F0", color: "#1E293B", marginRight: 6 }}>
                            {r.categoryCode || cat?.prefix || "—"}
                          </span>
                          <span style={{ fontWeight: 600 }}>{cat?.label || r.categoryName || "General"}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }} className="evt-mono">
                          {r.regNo || "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {r.phone || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <span className="evt-badge evt-badge-ok">
                            <CheckCircle2 size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                            Enrolled
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
