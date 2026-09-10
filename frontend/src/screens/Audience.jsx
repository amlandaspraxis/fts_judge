import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Phone, Hash, ShieldCheck, CheckCircle2, 
  AlertCircle, Star, LogOut, ArrowRight, RefreshCw 
} from 'lucide-react';
import { Avatar } from '../components/PhotoModal';
import { getClientDeviceId } from '../utils/deviceFingerprint';

export default function AudienceView({ current, votingOpen, votes = {}, setVotes, EVENT_PIN }) {
  const [step, setStep] = useState("login"); // 'login' | 'otp' | 'voted'
  const [regNo, setRegNo] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(8);

  // Load session from sessionStorage if already verified
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('fts_audience_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleAudienceDirectLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");

    const cleanRegNo = regNo.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Registration Number validation: 8 digits, starts between 120 and 126
    const regNoRegex = /^12[0-6]\d{5}$/;
    if (!cleanRegNo) {
      setError("Please enter your 8-digit Registration Number.");
      return;
    }
    if (!regNoRegex.test(cleanRegNo)) {
      setError("Registration number must be exactly 8 digits and start from 120xxxxx to 126xxxxx (e.g. 12440078).");
      return;
    }

    // 2. Phone Number validation: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!cleanPhone) {
      setError("Please enter your 10-digit mobile phone number.");
      return;
    }
    if (!phoneRegex.test(cleanPhone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    // 3. Email validation: @gmail.com, @lpu.in, or @outlook.com
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|lpu\.in|outlook\.com)$/i;
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setError("Email must belong to one of the 3 allowed domains: @gmail.com, @lpu.in, or @outlook.com.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/audience-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          regNo: cleanRegNo, 
          studentId: cleanRegNo, 
          phone: cleanPhone, 
          email: cleanEmail 
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Audience sign in failed.");
      }

      if (data.data?.token) {
        try {
          localStorage.setItem('fts_auth_token', data.data.token);
        } catch {}
      }

      const verifiedSession = {
        regNo: cleanRegNo,
        email: cleanEmail,
        phone: cleanPhone,
        verifiedAt: new Date().toISOString()
      };
      setSession(verifiedSession);
      sessionStorage.setItem('fts_audience_session', JSON.stringify(verifiedSession));
    } catch (err) {
      // Fallback for standalone/mock mode if backend is unreachable
      if (cleanRegNo && cleanPhone.length === 10 && emailRegex.test(cleanEmail)) {
        const fallbackSession = {
          regNo: cleanRegNo,
          email: cleanEmail,
          phone: cleanPhone,
          verifiedAt: new Date().toISOString()
        };
        setSession(fallbackSession);
        sessionStorage.setItem('fts_audience_session', JSON.stringify(fallbackSession));
      } else {
        setError(err.message || "Failed to sign in. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    sessionStorage.removeItem('fts_audience_session');
    setRegNo("");
    setPhone("");
    setEmail("");
    setError("");
    setInfoMsg("");
    window.location.href = '/login';
  };

  // If user is not yet logged in, show the Direct Audience Sign In Card
  if (!session) {
    return (
      <div style={{ maxWidth: 460, margin: "30px auto" }}>
        <div className="evt-ticket" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Users size={22} color="#FFD400" />
            <span className="evt-eyebrow" style={{ margin: 0 }}>PORTAL 4 · AUDIENCE PORTAL</span>
          </div>

          <h2 className="evt-h2" style={{ fontSize: 26, marginTop: 4 }}>Audience Voting Login</h2>
          <p className="evt-sub" style={{ marginBottom: 18 }}>
            Enter your Registration Number, Phone Number, and Email Address to vote for performers in real time.
          </p>

          <form onSubmit={handleAudienceDirectLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="evt-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Hash size={13} color="#D97706" /> Registration Number *
                </span>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>8 digits (120-126)</span>
              </label>
              <input 
                className="evt-input evt-mono" 
                value={regNo} 
                onChange={e => { setRegNo(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(""); }} 
                placeholder="e.g. 12440078" 
                maxLength={8}
                required 
                autoFocus
              />
            </div>

            <div>
              <label className="evt-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Phone size={13} color="#D97706" /> Phone Number *
                </span>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>10 digits</span>
              </label>
              <input 
                type="tel"
                className="evt-input evt-mono" 
                value={phone} 
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(""); }} 
                placeholder="e.g. 9876543210" 
                maxLength={10}
                required 
              />
            </div>

            <div>
              <label className="evt-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Mail size={13} color="#D97706" /> Email ID *
                </span>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>@gmail.com / @lpu.in / @outlook.com</span>
              </label>
              <input 
                type="email"
                className="evt-input" 
                value={email} 
                onChange={e => { setEmail(e.target.value); setError(""); }} 
                placeholder="e.g. student@gmail.com" 
                required 
              />
            </div>

            {error && (
              <div style={{ color: "#D93025", background: "#FDE8E8", border: "1px solid #F87171", borderRadius: 8, padding: "8px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="evt-btn evt-btn-amber" 
              disabled={loading}
              style={{ marginTop: 8, width: "100%", justifyContent: "center", fontSize: 15, padding: "12px", background: "#FFD400", color: "#16274D", fontWeight: 800 }}
            >
              {loading ? "Signing In…" : (
                <>
                  <Users size={16} /> Enter Audience Hub & Vote <ArrowRight size={15} />
                </>
              )}
            </button>

            <div style={{ marginTop: 6, textAlign: "center" }}>
              <button
                type="button"
                className="evt-btn evt-btn-ghost"
                style={{ fontSize: 11.5, padding: "4px 8px" }}
                onClick={() => {
                  setRegNo('12440078');
                  setPhone('9876543210');
                  setEmail('student@gmail.com');
                  setError('');
                }}
              >
                Fill Sample (12440078 · 9876543210 · student@gmail.com)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Audience is verified!
  const voterRegNo = session.regNo;
  const alreadyVoted = Boolean(current && votes[current.id]?.[voterRegNo] !== undefined);
  const myPreviousScore = alreadyVoted ? votes[current.id][voterRegNo] : null;

  const handleCastVote = async () => {
    if (!current || alreadyVoted || !votingOpen) return;
    setError("");
    const deviceId = getClientDeviceId();
    
    try {
      const res = await fetch('/api/votes/cast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          participantId: current.id,
          studentId: voterRegNo,
          score: Number(score),
          categoryId: current.categoryId || current.category_id,
          deviceId: deviceId,
          deviceFingerprint: deviceId
        })
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "You have already voted in this category. Each person is allowed to vote only once per category.");
        return;
      }
      setVotes(current.id, voterRegNo, score);
    } catch (err) {
      setError("You have already voted in this category. Each person is allowed to vote only once per category.");
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>
      {/* Voter Profile Bar */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: "#FFFFFF", 
        border: "2.5px solid #16274D", 
        borderRadius: 14, 
        padding: "10px 16px", 
        marginBottom: 16,
        boxShadow: "3px 3px 0 #16274D"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="evt-badge evt-badge-ok" style={{ fontSize: 11 }}>
              <CheckCircle2 size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Verified Voter
            </span>
            <span className="evt-mono" style={{ fontWeight: 800, fontSize: 13, color: "#16274D" }}>
              {voterRegNo}
            </span>
          </div>
          <div className="evt-sub" style={{ fontSize: 11 }}>{session.email}</div>
        </div>

        <button 
          onClick={handleLogout} 
          className="evt-btn evt-btn-ghost" 
          style={{ fontSize: 11, padding: "4px 8px", gap: 4 }}
          title="Sign out from this device"
        >
          <LogOut size={12} /> Sign Out
        </button>
      </div>

      {/* Main Voting Card */}
      <div className="evt-card" style={{ padding: 24 }}>
        {!current ? (
          <div style={{ textAlign: "center", padding: "26px 10px" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#FFF3C4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Users size={26} color="#8A5B00" />
            </div>
            <h2 className="evt-h2" style={{ fontSize: 22, marginBottom: 6 }}>Waiting for Event to Begin</h2>
            <p className="evt-sub" style={{ margin: 0 }}>
              The Event Admin will call the next participant to the stage shortly. Live voting controls will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Current Performer Display */}
            <div 
              style={{ 
                position: "relative", 
                overflow: "hidden", 
                borderRadius: 14, 
                padding: 16, 
                marginBottom: 16, 
                background: "#F7F9FD", 
                border: "2.5px solid #16274D" 
              }}
            >
              <div 
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "url('/Backdrop.PNG')",
                  backgroundPosition: "center right",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  opacity: 0.16,
                  pointerEvents: "none"
                }} 
              />
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar photo={current.photo} name={current.name} size={58} style={{ border: "2.5px solid #16274D", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {(current.token || current.code) && (
                      <span className="evt-mono evt-badge" style={{ fontSize: 13, background: "#16274D", color: "#FFD400" }}>
                        {current.token || current.code}
                      </span>
                    )}
                    <h2 className="evt-h2" style={{ margin: 0, fontSize: 22 }}>{current.name}</h2>
                  </div>
                  <p className="evt-sub" style={{ margin: 0, fontWeight: 600 }}>{current.act || "Performance"}</p>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ color: "#991B1B", background: "#FEF2F2", border: "1.5px solid #F87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Voting Status State */}
            {!votingOpen && (
              <div style={{ 
                background: "#F3F4F6", 
                border: "2px dashed #9CA3AF", 
                borderRadius: 12, 
                padding: "16px 18px", 
                textAlign: "center", 
                marginBottom: 10 
              }}>
                <div className="evt-closed" style={{ marginBottom: 6 }}>Voting is Currently Closed</div>
                <div className="evt-sub" style={{ fontSize: 12 }}>
                  Voting will open when the performance finishes. Please wait for the Admin to activate the poll.
                </div>
              </div>
            )}

            {/* Already Voted state - strictly one vote enforced */}
            {alreadyVoted && (
              <div style={{ 
                background: "#ECFDF5", 
                border: "2px solid #10B981", 
                borderRadius: 12, 
                padding: "16px 18px", 
                textAlign: "center",
                animation: "evtpop .3s ease"
              }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#065F46", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  Your Vote is Locked!
                </div>
                <p className="evt-sub" style={{ fontSize: 12, color: "#047857", marginBottom: 10 }}>
                  You rated this performer <strong>{myPreviousScore} / 10</strong>. Only one vote per participant is permitted.
                </p>
                <div className="evt-mono" style={{ fontSize: 28, fontWeight: 900, color: "#065F46" }}>
                  ★ {myPreviousScore} / 10
                </div>
              </div>
            )}

            {/* Voting Open and not yet voted */}
            {votingOpen && !alreadyVoted && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="evt-live"><span className="evt-live-dot" /> Poll Active</span>
                  <span className="evt-eyebrow" style={{ margin: 0 }}>Strictly 1 Vote Allowed</span>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span className="evt-label" style={{ margin: 0 }}>Rate This Performance:</span>
                    <span className="evt-mono" style={{ fontSize: 22, fontWeight: 900, color: "#16274D" }}>
                      ★ {score} / 10
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min={1} 
                    max={10} 
                    step={1} 
                    className="evt-slider" 
                    value={score} 
                    onChange={e => setScore(+e.target.value)} 
                    style={{ height: 10 }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#5B6890", marginTop: 4 }}>
                    <span>1 (Average)</span>
                    <span>5 (Great)</span>
                    <span>10 (Outstanding)</span>
                  </div>
                </div>

                <button 
                  className="evt-btn evt-btn-amber" 
                  style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 18px", marginTop: 4 }} 
                  onClick={handleCastVote}
                >
                  <Star size={16} /> Submit My Rating ({score}/10)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
