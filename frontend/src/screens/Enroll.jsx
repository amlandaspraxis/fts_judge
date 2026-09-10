import React, { useState } from 'react';
import { BadgeCheck, ChevronRight, CheckCircle2, Camera, Upload, Sparkles, RefreshCw, UserCheck, LogOut } from 'lucide-react';
import PhotoModal, { Avatar } from '../components/PhotoModal';

export default function ParticipantEnrollView({ 
  claimRegistration, 
  participants = [], 
  updateParticipant, 
  registrations = [], 
  CATEGORIES = [] 
}) {
  const [step, setStep] = useState("code"); // "code" | "details" | "profile" | "done"
  const [code, setCode] = useState("");
  const [act, setAct] = useState("");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [matchedParticipant, setMatchedParticipant] = useState(null);
  const [matchedReg, setMatchedReg] = useState(null);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState("");

  // Photo modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const verify = () => {
    const trimmed = (code || "").trim().toUpperCase();
    if (!trimmed) { 
      setError("Please enter your participant code."); 
      return; 
    }
    setError("");
    setPhotoSuccessMsg("");

    // 1. Check if participant is already actively enrolled in the competition
    const existingPart = participants.find(p => p.code && p.code.toUpperCase() === trimmed);
    if (existingPart) {
      setMatchedParticipant(existingPart);
      setPhoto(existingPart.photo || null);
      setAct(existingPart.act || "");
      setStep("profile");
      return;
    }

    // 2. Check in pending registrations from the desk
    const reg = registrations.find(r => r.code && r.code.toUpperCase() === trimmed);
    if (reg) {
      if (reg.status === "enrolled") {
        const p = participants.find(part => part.code?.toUpperCase() === trimmed || part.name.toLowerCase() === reg.name.toLowerCase());
        if (p) {
          setMatchedParticipant(p);
          setPhoto(p.photo || null);
          setAct(p.act || "");
          setStep("profile");
          return;
        }
      }
      setMatchedReg(reg);
      setPhoto(null);
      setAct("");
      setStep("details");
      return;
    }

    // 3. Fallback: ask desk
    setError(`Code "${trimmed}" doesn't match any registered participant. Please check your code with the registration desk.`);
  };

  const complete = () => {
    const res = claimRegistration(code, act, photo);
    if (!res.ok) { 
      setError(res.error); 
      setStep("code"); 
      return; 
    }
    setResult(res);
    setError("");
    setStep("done");
  };

  const handleProfilePhotoSave = (newPhoto) => {
    setPhoto(newPhoto);
    if (matchedParticipant && updateParticipant) {
      updateParticipant(matchedParticipant.id, { photo: newPhoto });
      setMatchedParticipant(prev => ({ ...prev, photo: newPhoto }));
      setPhotoSuccessMsg("Photo updated! The Admin can now see your picture in the master console and on the stage projector.");
      setTimeout(() => setPhotoSuccessMsg(""), 6000);
    }
  };

  const startOver = () => {
    setStep("code"); 
    setCode(""); 
    setAct(""); 
    setPhoto(null);
    setError(""); 
    setResult(null);
    setMatchedParticipant(null);
    setMatchedReg(null);
    setPhotoSuccessMsg("");
  };

  return (
    <div className="evt-ticket" style={{ maxWidth: 540 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BadgeCheck size={20} color="#16274D" />
          <span className="evt-eyebrow" style={{ margin: 0, fontSize: 13, letterSpacing: "0.12em" }}>
            PORTAL 6 · PARTICIPANT PORTAL
          </span>
        </div>
        <button
          onClick={() => { window.location.href = '/login'; }}
          className="evt-btn evt-btn-ghost"
          style={{ fontSize: 11.5, padding: "5px 10px", color: "#EF4136", borderColor: "#EF4136", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}
          title="Exit to Login"
        >
          <LogOut size={12} color="#EF4136" /> Exit
        </button>
      </div>

      {/* STEP 1: ENTER CODE */}
      {step === "code" && (
        <>
          <h2 className="evt-h2" style={{ margin: "4px 0 8px" }}>Enter Your Participant Code</h2>
          <p className="evt-sub" style={{ marginBottom: 16 }}>
            Got a code from the registration desk (e.g. <span className="evt-mono" style={{ color: "#16274D", fontWeight: 700 }}>DNC3</span>)? Enter it below to enrol and set your photo.
          </p>
          <input 
            className="evt-input evt-mono" 
            value={code} 
            onChange={e => setCode(e.target.value.toUpperCase())} 
            placeholder="e.g. DNC3" 
            autoFocus
            onKeyDown={e => e.key === "Enter" && verify()}
            style={{ fontSize: 18, letterSpacing: "0.08em", textAlign: "center", padding: "10px 14px" }}
          />
          {error && <div style={{ color: "#D93025", fontSize: 13, marginTop: 10, fontWeight: 600 }}>{error}</div>}
          <button 
            className="evt-btn evt-btn-amber" 
            style={{ marginTop: 16, width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 18px" }} 
            onClick={verify}
          >
            Continue <ChevronRight size={17} />
          </button>
        </>
      )}

      {/* STEP 2: NEW REGISTRATION ENROLMENT & PHOTO */}
      {step === "details" && matchedReg && (
        <>
          <span className="evt-badge evt-badge-ok" style={{ marginBottom: 8, display: "inline-block" }}>
            <CheckCircle2 size={12} style={{ marginRight: 4 }} />Registration Verified
          </span>
          <h2 className="evt-h2" style={{ margin: "2px 0 4px" }}>Welcome, {matchedReg.name}!</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span className="evt-mono evt-badge" style={{ background: "#16274D", color: "#FFD400", fontSize: 14 }}>
              {matchedReg.code}
            </span>
            <span className="evt-sub" style={{ fontWeight: 700, color: "#29ABE2" }}>
              {CATEGORIES.find(c => c.id === matchedReg.categoryId)?.label}
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="evt-label">Performance / Act Title (optional)</label>
            <input 
              className="evt-input" 
              value={act} 
              onChange={e => setAct(e.target.value)} 
              placeholder="e.g. Classical Solo / Hip-Hop Medley" 
            />
          </div>

          {/* Photo Section */}
          <div 
            style={{ 
              background: "#F7F9FD", 
              border: "2px dashed #C7CEDE", 
              borderRadius: 16, 
              padding: "16px 20px", 
              marginBottom: 18,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center"
            }}
          >
            <div className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800 }}>
              Add Your Profile Photo
            </div>
            <Avatar 
              photo={photo} 
              name={matchedReg.name} 
              size={90} 
              style={{ border: photo ? "3px solid #FFD400" : "2px dashed #16274D" }} 
            />
            <div className="evt-sub" style={{ fontSize: 12.5 }}>
              {photo ? "Looking great! Admin and projector will show this photo." : "Take a live photo or upload from your device gallery"}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button 
                type="button"
                className="evt-btn evt-btn-teal"
                onClick={() => setIsPhotoModalOpen(true)}
                style={{ fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Camera size={15} />
                {photo ? "Change Photo" : "Add Photo (Camera / Gallery)"}
              </button>
              {photo && (
                <button 
                  type="button"
                  className="evt-btn evt-btn-ghost"
                  onClick={() => setPhoto(null)}
                  style={{ fontSize: 12.5, padding: "8px 12px" }}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          {error && <div style={{ color: "#D93025", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button 
            className="evt-btn evt-btn-amber" 
            style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 18px" }} 
            onClick={complete}
          >
            <BadgeCheck size={17} /> Complete Enrolment
          </button>
        </>
      )}

      {/* STEP 3: EXISTING PARTICIPANT PROFILE & PHOTO UPDATE */}
      {step === "profile" && matchedParticipant && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="evt-badge evt-badge-ok">
              <CheckCircle2 size={12} style={{ marginRight: 4 }} />Enrolled Competitor
            </span>
            <span className="evt-mono evt-badge" style={{ background: "#16274D", color: "#FFD400", fontSize: 14 }}>
              {matchedParticipant.code}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", marginBottom: 18 }}>
            <Avatar 
              photo={matchedParticipant.photo} 
              name={matchedParticipant.name} 
              size={110} 
              style={{ border: "3.5px solid #FFD400", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }} 
            />

            <div>
              <h2 className="evt-h2" style={{ margin: "4px 0 2px", fontSize: 26 }}>{matchedParticipant.name}</h2>
              <div className="evt-sub" style={{ fontWeight: 700, color: "#29ABE2", fontSize: 15 }}>
                {matchedParticipant.act || "Competitor"}
              </div>
            </div>

            {photoSuccessMsg && (
              <div 
                style={{ 
                  background: "#E6F4EA", 
                  color: "#137333", 
                  border: "1.5px solid #34A853", 
                  borderRadius: 10, 
                  padding: "10px 16px", 
                  fontSize: 13, 
                  fontWeight: 600,
                  animation: "evtpop .25s ease" 
                }}
              >
                {photoSuccessMsg}
              </div>
            )}

            <p className="evt-sub" style={{ fontSize: 13, margin: "2px 0" }}>
              Admin has full master access to view your photo in the console, and it will be presented on the Projector stage when you perform!
            </p>

            <button 
              type="button"
              className="evt-btn evt-btn-teal"
              onClick={() => setIsPhotoModalOpen(true)}
              style={{ fontSize: 14, padding: "10px 22px", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}
            >
              <Camera size={16} />
              {matchedParticipant.photo ? "Update Photo (Camera / Gallery)" : "Add Photo (Camera / Gallery)"}
            </button>
          </div>

          <button 
            className="evt-btn evt-btn-ghost" 
            style={{ width: "100%", justifyContent: "center" }} 
            onClick={startOver}
          >
            Lookup Another Participant Code
          </button>
        </>
      )}

      {/* STEP 4: ENROLMENT COMPLETED */}
      {step === "done" && result && (
        <>
          <span className="evt-badge evt-badge-ok" style={{ marginBottom: 12, display: "inline-block" }}>
            <CheckCircle2 size={12} style={{ marginRight: 4 }} />Enrolled & Ready
          </span>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", marginBottom: 18 }}>
            <Avatar 
              photo={result.participant?.photo || photo} 
              name={result.reg?.name || result.participant?.name} 
              size={100} 
              style={{ border: "3.5px solid #FFD400", boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }} 
            />

            <div>
              <h2 className="evt-h2" style={{ margin: "4px 0 2px" }}>You're all set, {result.reg?.name || result.participant?.name}!</h2>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}>
                <span className="evt-mono evt-badge" style={{ background: "#16274D", color: "#FFD400" }}>
                  {result.participant?.code || code}
                </span>
                <span className="evt-sub" style={{ fontWeight: 700 }}>
                  {result.category?.label}
                </span>
              </div>
            </div>

            <div style={{ background: "#EBF5FB", color: "#16274D", padding: "12px 18px", borderRadius: 12, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              Your photo and details are now visible to the Admin in the master console and will appear on the Projector during your live stage performance.
            </div>
          </div>

          <button 
            className="evt-btn evt-btn-ghost" 
            style={{ width: "100%", justifyContent: "center" }} 
            onClick={startOver}
          >
            Enrol Another Participant
          </button>
        </>
      )}

      {/* Photo Capture / Upload Modal */}
      <PhotoModal 
        isOpen={isPhotoModalOpen}
        title={`Profile Photo for ${matchedParticipant?.name || matchedReg?.name || "Participant"}`}
        currentPhoto={matchedParticipant?.photo || photo}
        onSave={matchedParticipant ? handleProfilePhotoSave : (p) => setPhoto(p)}
        onClose={() => setIsPhotoModalOpen(false)}
      />
    </div>
  );
}
