import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, Check, RefreshCw, Upload, User, UserCheck, Crop } from 'lucide-react';

/**
 * Resizes an image DataURL to max dimensions while preserving natural aspect ratio.
 */
function compressImage(dataUrl, maxDim = 640, quality = 0.84) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function Avatar({ photo, name, size = 44, style = {}, badge = null }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div 
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(135deg, #16274D 0%, #29ABE2 100%)",
        border: "2px solid #16274D",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style
      }}
    >
      {photo ? (
        <img 
          src={photo} 
          alt={name} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
      ) : (
        <span style={{ color: "#FFD400", fontWeight: 800, fontSize: Math.round(size * 0.44), userSelect: "none" }}>
          {initial}
        </span>
      )}
      {badge && (
        <div style={{ position: "absolute", bottom: 0, right: 0 }}>
          {badge}
        </div>
      )}
    </div>
  );
}

export default function PhotoModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentPhoto, 
  title = "Set Photo", 
  defaultMode = "square" 
}) {
  const [tab, setTab] = useState("camera"); // "camera" | "gallery"
  const [photoMode, setPhotoMode] = useState(defaultMode || "square"); // "portrait" (full body) | "square"
  const [preview, setPreview] = useState(currentPhoto || null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPreview(currentPhoto || null);
      setPhotoMode(defaultMode || "square");
      setCameraError("");
      if (tab === "camera") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, tab, defaultMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: photoMode === "portrait" ? 720 : 640 }, 
          height: { ideal: photoMode === "portrait" ? 960 : 640 }, 
          facingMode: "user" 
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access error:", err);
      setCameraError("Camera unavailable or permission denied. Please select 'Upload from Gallery'.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const canvas = document.createElement("canvas");

    if (photoMode === "portrait") {
      // 3:4 Full Body Portrait crop
      const targetW = 450;
      const targetH = 600;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      // Determine crop region maintaining 3:4 aspect ratio
      let cropW, cropH;
      if (vw / vh > 3 / 4) {
        cropH = vh;
        cropW = Math.round(vh * (3 / 4));
      } else {
        cropW = vw;
        cropH = Math.round(vw * (4 / 3));
      }
      const sx = Math.max(0, Math.round((vw - cropW) / 2));
      const sy = Math.max(0, Math.round((vh - cropH) / 2));

      ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
      const compressed = await compressImage(dataUrl, 640);
      setPreview(compressed);
    } else {
      // Square 1:1 Headshot crop
      const minDim = Math.min(vw, vh);
      canvas.width = 380;
      canvas.height = 380;
      const ctx = canvas.getContext("2d");

      const sx = (vw - minDim) / 2;
      const sy = (vh - minDim) / 2;
      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 380, 380);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
      const compressed = await compressImage(dataUrl, 420);
      setPreview(compressed);
    }

    stopCamera();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      // Preserves whole image aspect ratio without cropping out body!
      const compressed = await compressImage(ev.target.result, 640);
      setPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(preview);
    stopCamera();
    onClose();
  };

  const handleRemove = () => {
    setPreview(null);
    onSave(null);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  const isPortrait = photoMode === "portrait";

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(14, 24, 48, 0.78)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "evtpop .2s ease"
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        style={{
          background: "#FFFFFF",
          border: "4px solid #16274D",
          borderRadius: 22,
          width: "100%",
          maxWidth: isPortrait ? 540 : 460,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 24,
          boxShadow: "0 24px 56px rgba(0,0,0,0.45), 8px 8px 0 #16274D",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          transition: "max-width .2s ease"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#FFD400", padding: 8, borderRadius: 10, border: "2px solid #16274D" }}>
              <Camera size={20} color="#16274D" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#16274D" }}>{title}</div>
              <div className="evt-sub" style={{ fontSize: 13 }}>
                {isPortrait ? "Capture or upload a full-body standing photo" : "Capture or upload a profile photo"}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="evt-btn evt-btn-ghost" 
            style={{ padding: 6, borderRadius: "50%" }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Aspect Ratio Mode Selector: Full Body vs Headshot */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F1F4F9", padding: "6px 10px", borderRadius: 12, border: "1.5px solid #C7CEDE" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#16274D" }}>Photo Frame Style:</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => { setPhotoMode("portrait"); if (tab === "camera" && !preview) startCamera(); }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: isPortrait ? "#16274D" : "transparent",
                color: isPortrait ? "#FFD400" : "#5B6890",
                transition: "all .15s ease"
              }}
            >
              🧍 Full Body (Portrait)
            </button>
            <button
              type="button"
              onClick={() => { setPhotoMode("square"); if (tab === "camera" && !preview) startCamera(); }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: !isPortrait ? "#16274D" : "transparent",
                color: !isPortrait ? "#FFD400" : "#5B6890",
                transition: "all .15s ease"
              }}
            >
              👤 Headshot (Square)
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#F1F4F9", padding: 4, borderRadius: 12, border: "1.5px solid #C7CEDE" }}>
          <button 
            onClick={() => { setTab("camera"); setPreview(null); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: tab === "camera" ? "#16274D" : "transparent",
              color: tab === "camera" ? "#FFD400" : "#5B6890",
              transition: "all .15s ease"
            }}
          >
            <Camera size={16} /> Take Photo (Camera)
          </button>
          <button 
            onClick={() => { setTab("gallery"); stopCamera(); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: tab === "gallery" ? "#16274D" : "transparent",
              color: tab === "gallery" ? "#FFD400" : "#5B6890",
              transition: "all .15s ease"
            }}
          >
            <ImageIcon size={16} /> Upload from Gallery
          </button>
        </div>

        {/* Tab Content */}
        {tab === "camera" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {preview ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
                <div 
                  style={{ 
                    width: isPortrait ? 250 : 220, 
                    height: isPortrait ? 340 : 220, 
                    borderRadius: isPortrait ? 16 : "50%", 
                    overflow: "hidden", 
                    border: "4px solid #FFD400", 
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    background: "#0E1830",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <img 
                    src={preview} 
                    alt="Captured" 
                    style={{ width: "100%", height: "100%", objectFit: isPortrait ? "contain" : "cover" }} 
                  />
                </div>
                <button 
                  className="evt-btn evt-btn-ghost" 
                  onClick={() => { setPreview(null); startCamera(); }}
                  style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshCw size={14} /> Retake Photo
                </button>
              </div>
            ) : (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div 
                  style={{
                    width: isPortrait ? 260 : 220,
                    height: isPortrait ? 350 : 220,
                    borderRadius: isPortrait ? 16 : "50%",
                    overflow: "hidden",
                    background: "#0E1830",
                    position: "relative",
                    border: "4px solid #16274D",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
                  }}
                >
                  <video 
                    ref={videoRef} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    playsInline 
                    autoPlay 
                    muted 
                  />
                  {!cameraActive && !cameraError && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFD400", fontSize: 13 }}>
                      Starting camera…
                    </div>
                  )}
                </div>

                {isPortrait && (
                  <div className="evt-sub" style={{ fontSize: 12, color: "#16274D", fontWeight: 600, textAlign: "center" }}>
                    🧍 Stand back so your full body is visible in the frame
                  </div>
                )}

                {cameraError ? (
                  <div style={{ textAlign: "center", color: "#D93025", fontSize: 13, padding: "8px 12px", background: "#FDE8E8", borderRadius: 8 }}>
                    {cameraError}
                  </div>
                ) : (
                  <button 
                    className="evt-btn evt-btn-teal" 
                    onClick={captureSnapshot}
                    disabled={!cameraActive}
                    style={{ padding: "10px 24px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Camera size={18} /> Snap Photo
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "gallery" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {preview ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
                {/* Spacious Full Body Preview */}
                <div 
                  style={{ 
                    width: isPortrait ? 260 : 200, 
                    height: isPortrait ? 350 : 200, 
                    borderRadius: isPortrait ? 16 : "50%", 
                    overflow: "hidden", 
                    border: "4px solid #29ABE2", 
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    background: "#0E1830",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <img 
                    src={preview} 
                    alt="Selected" 
                    style={{ width: "100%", height: "100%", objectFit: isPortrait ? "contain" : "cover" }} 
                  />
                </div>
                {isPortrait && (
                  <div className="evt-sub" style={{ fontSize: 12, color: "#1C8A4C", fontWeight: 700 }}>
                    ✓ Whole-body photo preserved — will fit completely on the Projector
                  </div>
                )}
                <label 
                  className="evt-btn evt-btn-ghost" 
                  style={{ fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Upload size={14} /> Choose Different Image
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                </label>
              </div>
            ) : (
              <label 
                style={{
                  width: "100%",
                  border: "2.5px dashed #29ABE2",
                  borderRadius: 16,
                  padding: isPortrait ? "44px 20px" : "32px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  background: "#F7FBFE",
                  transition: "all .15s ease"
                }}
              >
                <div style={{ background: "#E0F2FE", padding: 14, borderRadius: "50%" }}>
                  <Upload size={32} color="#29ABE2" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800, color: "#16274D", fontSize: 16 }}>
                    {isPortrait ? "Upload Full-Body Photo from Device Gallery" : "Click to browse device gallery"}
                  </div>
                  <div className="evt-sub" style={{ fontSize: 13, marginTop: 4 }}>
                    {isPortrait ? "Supports vertical standing portraits, whole-body shots, JPG, PNG, WEBP" : "Supports JPG, PNG, WEBP"}
                  </div>
                </div>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 14, borderTop: "1px solid #E2E8F0" }}>
          {preview ? (
            <button 
              onClick={handleRemove} 
              className="evt-btn evt-btn-ghost" 
              style={{ color: "#D93025", fontSize: 13 }}
            >
              Remove
            </button>
          ) : <div />}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} className="evt-btn evt-btn-ghost" style={{ fontSize: 13 }}>
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={!preview}
              className="evt-btn evt-btn-amber" 
              style={{ fontSize: 13, padding: "8px 18px", opacity: preview ? 1 : 0.5 }}
            >
              <Check size={16} /> Apply Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
