import React, { useState, useMemo } from 'react';
import { 
  MonitorPlay, 
  Gavel, 
  Users, 
  UserCheck, 
  UserPlus, 
  ShieldAlert, 
  KeyRound, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Tv, 
  Globe, 
  Sparkles, 
  Download, 
  X,
  Share2,
  Info
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PortalAccessHub() {
  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const [baseUrl, setBaseUrl] = useState(defaultOrigin);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeQrModal, setActiveQrModal] = useState(null);
  const [bulkCopied, setBulkCopied] = useState(false);

  // Comprehensive Portal Registry
  const portals = useMemo(() => [
    // 1. Stage & Public Displays
    {
      id: 'projector-live',
      title: 'Live Stage Projector Display',
      subtitle: 'Primary real-time stage screen showing active act, chest number, category, timer, QR banner, and judge scores.',
      category: 'DISPLAYS',
      path: '/projector',
      aliases: ['/stage', '/live/projector'],
      deviceType: 'Big Screen / Projector / TV',
      deviceIcon: Tv,
      accessType: 'PUBLIC',
      accessBadge: 'Public Display',
      accessColor: '#22C55E',
      recommendedFor: 'Stage Production Team, Audio/Visual Desk, Audience Projection Screens',
      authInfo: 'No login required. Broadcast-ready full-screen display.'
    },
    {
      id: 'leaderboard-podium',
      title: 'Podium & Live Leaderboard',
      subtitle: 'Standalone ceremony display with animated podium, category rankings, and real-time top score revelations.',
      category: 'DISPLAYS',
      path: '/projector/leaderboard',
      aliases: [],
      deviceType: 'Stage Display / Screen',
      deviceIcon: Tv,
      accessType: 'PUBLIC',
      accessBadge: 'Public Display',
      accessColor: '#22C55E',
      recommendedFor: 'Award Ceremony, Hall Displays, Stage Screen',
      authInfo: 'No login required. Real-time podium and category standings.'
    },

    // 2. Judicial Panel
    {
      id: 'judge-live-tablet',
      title: 'Live Judge Scoring Console (Tablet)',
      subtitle: 'Touch-optimized evaluation console with interactive criterion sliders, real-time sync, and lock-in controls.',
      category: 'JUDGES',
      path: '/judge-live',
      aliases: ['/live/judge'],
      deviceType: 'iPad / Tablet / Laptop',
      deviceIcon: Tablet,
      accessType: 'RESTRICTED',
      accessBadge: 'Judge Access',
      accessColor: '#29ABE2',
      recommendedFor: 'Evaluation Bench, Category Judges',
      authInfo: 'Use pre-assigned Judge Code or registered Judge credentials.'
    },
    {
      id: 'judge-portal-dashboard',
      title: 'Judge Category Hub & Score History',
      subtitle: 'Review assigned judging categories, contestant roster, scoring guidelines, and past submitted ratings.',
      category: 'JUDGES',
      path: '/judges',
      aliases: ['/login/judges', '/judge', '/judge/dashboard'],
      deviceType: 'Tablet / Laptop',
      deviceIcon: Laptop,
      accessType: 'AUTHENTICATED',
      accessBadge: 'Judge Account',
      accessColor: '#29ABE2',
      recommendedFor: 'Judges between rounds, Scoring Review',
      authInfo: 'Sign in with Judge credentials (Email & Password) at /judges or /login/judges.'
    },

    // 3. Audience & Voting
    {
      id: 'audience-live-mobile',
      title: 'Audience Live Voting & Reactions',
      subtitle: 'Mobile-first instant voting console for spectators to rate current acts and trigger live crowd reactions.',
      category: 'AUDIENCE',
      path: '/audience-live',
      aliases: ['/live/audience'],
      deviceType: 'Mobile Phone / Smartphone',
      deviceIcon: Smartphone,
      accessType: 'PUBLIC',
      accessBadge: 'Audience Mobile',
      accessColor: '#FFD400',
      recommendedFor: 'Hall Audience, Online Viewers, Students',
      authInfo: 'Open to all audience members. 1-click star rating and live cheering.'
    },
    {
      id: 'audience-hub-portal',
      title: 'Audience Voting Hub & Categories',
      subtitle: 'Full voter registration portal with OTP verification, category voting list, and verified ballot history.',
      category: 'AUDIENCE',
      path: '/login',
      aliases: ['/audience/dashboard', '/audience/categories'],
      deviceType: 'Mobile Phone / Browser',
      deviceIcon: Smartphone,
      accessType: 'AUTHENTICATED',
      accessBadge: 'Audience OTP',
      accessColor: '#FFD400',
      recommendedFor: 'Verified Voters, Attendees',
      authInfo: 'Direct public login at /login via Student Reg No and Mobile/Email OTP.'
    },

    // 4. Registration & Volunteer Desk
    {
      id: 'volunteer-desk-live',
      title: 'Live Check-in & Volunteer Desk',
      subtitle: 'High-speed participant check-in, chest number allocation, stage queue ordering, and act status updates.',
      category: 'DESK',
      path: '/volunteer',
      aliases: ['/desk', '/live/volunteer'],
      deviceType: 'Laptop / Tablet',
      deviceIcon: Laptop,
      accessType: 'STAFF',
      accessBadge: 'Volunteer / Desk',
      accessColor: '#10B981',
      recommendedFor: 'Backstage Volunteers, Reception Counter, Green Room Coordinators',
      authInfo: 'Optimized for fast entry and contestant status management.'
    },
    {
      id: 'helpdesk-portal-dashboard',
      title: 'Help Desk Registry & Verification',
      subtitle: 'Master participant intake form, category verification, search directory, and badge print verification.',
      category: 'DESK',
      path: '/regdesk',
      aliases: ['/login/regdesk', '/helpdesk/dashboard', '/helpdesk/register'],
      deviceType: 'Desktop / Laptop',
      deviceIcon: Laptop,
      accessType: 'AUTHENTICATED',
      accessBadge: 'Staff Desk',
      accessColor: '#10B981',
      recommendedFor: 'Registration Desk Staff, Help Desk Leads',
      authInfo: 'Sign in with Staff credentials & Station PIN at /regdesk or /login/regdesk.'
    },

    // 5. Performers & Contestants
    {
      id: 'performer-self-enroll',
      title: 'Performer Self-Enrollment Portal',
      subtitle: 'Direct registration form for contestants to submit acts, performance titles, category choices, and chest numbers.',
      category: 'PERFORMERS',
      path: '/enroll',
      aliases: ['/participant', '/live/enroll'],
      deviceType: 'Mobile Phone / Tablet',
      deviceIcon: Smartphone,
      accessType: 'PUBLIC',
      accessBadge: 'Contestant Form',
      accessColor: '#8B5CF6',
      recommendedFor: 'Audition Participants, Contestants, Walk-in Performers',
      authInfo: 'Self-service registration form. Share link or QR code at registration kiosk.'
    },

    // 6. Management & Administration
    {
      id: 'admin-login-restricted',
      title: 'Restricted Admin Login (Isolated)',
      subtitle: 'Dedicated sign-in gateway exclusively for event management with concurrent multi-device session support.',
      category: 'ADMIN',
      path: '/login/admin',
      aliases: ['/admin/login', '/admin'],
      deviceType: 'Laptop / Tablet / Phone',
      deviceIcon: Laptop,
      accessType: 'RESTRICTED',
      accessBadge: 'Management Only',
      accessColor: '#EF4136',
      recommendedFor: 'Core Event Organizers, Chief Stage Directors',
      authInfo: 'Pre-issued credentials: ID `admin@admin.com` (or `admin`) | Password: `ftsadmin2026` at /login/admin'
    },
    {
      id: 'admin-master-projector',
      title: 'Stage & Projector Master Control',
      subtitle: 'Complete live control of stage screen: act switching, category filtering, PIN banner positioning, and judge score reveals.',
      category: 'ADMIN',
      path: '/admin/projector',
      aliases: [],
      deviceType: 'Laptop / Tablet',
      deviceIcon: Laptop,
      accessType: 'RESTRICTED',
      accessBadge: 'Admin Master',
      accessColor: '#EF4136',
      recommendedFor: 'Stage Director, Control Room Operator',
      authInfo: 'Requires active Admin session.'
    },
    {
      id: 'admin-judges-panel',
      title: 'Judges Management & Credential Allocator',
      subtitle: 'Create, edit, reset passwords, delete judges, and assign specific competition categories to judicial seats.',
      category: 'ADMIN',
      path: '/admin/judges',
      aliases: ['/admin/judge-assignments'],
      deviceType: 'Laptop / Desktop',
      deviceIcon: Laptop,
      accessType: 'RESTRICTED',
      accessBadge: 'Admin Management',
      accessColor: '#EF4136',
      recommendedFor: 'Event Management, Judicial Liaison',
      authInfo: 'Requires active Admin session.'
    },
    {
      id: 'admin-categories-engine',
      title: 'Competition Categories & Criteria Setup',
      subtitle: 'Configure act categories, maximum participant caps, scoring parameters, and criteria descriptions.',
      category: 'ADMIN',
      path: '/admin/categories',
      aliases: [],
      deviceType: 'Laptop / Desktop',
      deviceIcon: Laptop,
      accessType: 'RESTRICTED',
      accessBadge: 'Admin Setup',
      accessColor: '#EF4136',
      recommendedFor: 'Event Organizers',
      authInfo: 'Requires active Admin session.'
    },
    {
      id: 'admin-results-8515',
      title: 'Results Engine & 85/15 Weighted Scoring',
      subtitle: 'Live algorithm combining 85% judicial scores and 15% audience votes to compute official category winners.',
      category: 'ADMIN',
      path: '/admin/results',
      aliases: [],
      deviceType: 'Laptop / Desktop',
      deviceIcon: Laptop,
      accessType: 'RESTRICTED',
      accessBadge: 'Admin Results',
      accessColor: '#EF4136',
      recommendedFor: 'Scrutineers, Chief Judges, Management',
      authInfo: 'Requires active Admin session.'
    },
    {
      id: 'admin-event-lifecycle',
      title: 'Event State & Lifecycle Controller',
      subtitle: 'Master switch to open/close judging, open/close audience voting, lock score calculations, and publish winners.',
      category: 'ADMIN',
      path: '/admin/event-control',
      aliases: [],
      deviceType: 'Laptop / Tablet',
      deviceIcon: Laptop,
      accessType: 'RESTRICTED',
      accessBadge: 'Admin Control',
      accessColor: '#EF4136',
      recommendedFor: 'Event Director, Master of Ceremonies Lead',
      authInfo: 'Requires active Admin session.'
    },
    {
      id: 'admin-audit-security',
      title: 'Security & Audit Logs',
      subtitle: 'Immutable record of all management actions, judge modifications, stage transitions, and authentication events.',
      category: 'ADMIN',
      path: '/admin/audit-logs',
      aliases: [],
      deviceType: 'Laptop / Desktop',
      deviceIcon: Laptop,
      accessType: 'RESTRICTED',
      accessBadge: 'Admin Audit',
      accessColor: '#EF4136',
      recommendedFor: 'Lead Organizer, IT Coordinator',
      authInfo: 'Requires active Admin session.'
    },

    // 7. Public Authentication Gateway
    {
      id: 'public-login-gateway',
      title: 'Public Portal Sign-In Gateway',
      subtitle: 'Unified public login screen with isolated tabs for Staff Desk, Judge Code, and Audience Mobile OTP.',
      category: 'PUBLIC_GATEWAY',
      path: '/login',
      aliases: [],
      deviceType: 'Any Device',
      deviceIcon: Globe,
      accessType: 'PUBLIC',
      accessBadge: 'Public Gateway',
      accessColor: '#64748B',
      recommendedFor: 'Staff, Judges, Attendees (Admin login completely removed)',
      authInfo: 'Public gateway. Role-specific login without exposing management controls.'
    }
  ], []);

  const categories = [
    { id: 'ALL', label: 'All Portals', count: portals.length },
    { id: 'DISPLAYS', label: 'Stage Displays', count: portals.filter(p => p.category === 'DISPLAYS').length },
    { id: 'JUDGES', label: 'Judges', count: portals.filter(p => p.category === 'JUDGES').length },
    { id: 'AUDIENCE', label: 'Audience & Voting', count: portals.filter(p => p.category === 'AUDIENCE').length },
    { id: 'DESK', label: 'Help Desk / Volunteers', count: portals.filter(p => p.category === 'DESK').length },
    { id: 'PERFORMERS', label: 'Contestants', count: portals.filter(p => p.category === 'PERFORMERS').length },
    { id: 'ADMIN', label: 'Management & Admin', count: portals.filter(p => p.category === 'ADMIN').length }
  ];

  const filteredPortals = useMemo(() => {
    return portals.filter(portal => {
      const matchesCategory = selectedCategory === 'ALL' || portal.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        portal.title.toLowerCase().includes(q) ||
        portal.subtitle.toLowerCase().includes(q) ||
        portal.path.toLowerCase().includes(q) ||
        portal.recommendedFor.toLowerCase().includes(q) ||
        portal.accessBadge.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [portals, selectedCategory, searchQuery]);

  const copyToClipboard = async (text, id) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const copyAllLinks = async () => {
    const formatted = portals.map(p => {
      const full = `${baseUrl.replace(/\/+$/, '')}${p.path}`;
      return `• ${p.title} (${p.accessBadge}):\n  ${full}\n  Device: ${p.deviceType}\n  Target: ${p.recommendedFor}\n`;
    }).join('\n');

    const header = `=== FRESHMEN TALENT SEARCH 2026 - EVENT PORTAL ACCESS DIRECTORY ===\nGenerated: ${new Date().toLocaleString()}\nBase Host: ${baseUrl}\n\n`;

    await copyToClipboard(header + formatted, 'BULK_COPY');
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2500);
  };

  const cleanBase = baseUrl.replace(/\/+$/, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      
      {/* Header Banner */}
      <div className="evt-card" style={{
        background: 'linear-gradient(135deg, #16274D 0%, #1E3A8A 55%, #0F172A 100%)',
        color: '#FFFFFF',
        padding: '24px 28px',
        borderRadius: 20,
        boxShadow: '0 10px 25px -5px rgba(22, 39, 77, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ maxWidth: 750 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="evt-badge" style={{ background: '#FFD400', color: '#16274D', fontWeight: 900, letterSpacing: '0.05em' }}>
                MANAGEMENT HUB
              </span>
              <span style={{ fontSize: 13, color: '#93C5FD', fontWeight: 600 }}>
                Central Portal Directory & Live Links
              </span>
            </div>
            <h1 style={{ fontFamily: 'Luckiest Guy', fontSize: 32, margin: '0 0 10px', letterSpacing: '0.03em', color: '#FFFFFF' }}>
              EVENT PORTALS ACCESS DIRECTORY
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#CBD5E1', lineHeight: 1.5 }}>
              One-stop launchpad for every live screen, scoring tablet, audience voting link, volunteer desk, and management console. 
              Copy direct URLs, preview QR codes for mobile scanning, and broadcast links to staff and attendees.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={copyAllLinks}
              className="evt-btn"
              style={{
                background: bulkCopied ? '#10B981' : '#FFD400',
                color: bulkCopied ? '#FFFFFF' : '#16274D',
                fontWeight: 800,
                border: 'none',
                padding: '10px 18px',
                fontSize: 13,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              {bulkCopied ? <Check size={16} /> : <Share2 size={16} />}
              {bulkCopied ? 'All Links Copied!' : 'Copy All Links (Shareable List)'}
            </button>
          </div>
        </div>

        {/* Network Host & Origin Configurator */}
        <div style={{
          marginTop: 22,
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
            <Globe size={20} color="#60A5FA" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Active Broadcast Host / Network IP
              </div>
              <div style={{ fontSize: 12, color: '#E2E8F0', marginTop: 2 }}>
                If accessing from external mobile phones or iPads on venue Wi-Fi, replace <code>localhost</code> with your LAN IP (e.g. <code>http://192.168.1.50:5173</code>):
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              style={{
                background: '#0F172A',
                border: '1px solid #3B82F6',
                color: '#FFFFFF',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                width: 240
              }}
              placeholder="http://192.168.1.100:5173"
            />
            {baseUrl !== defaultOrigin && (
              <button
                onClick={() => setBaseUrl(defaultOrigin)}
                className="evt-btn evt-btn-ghost"
                style={{ color: '#93C5FD', borderColor: '#3B82F6', fontSize: 12, padding: '7px 12px' }}
              >
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="evt-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          
          {/* Category Chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: '1.5px solid',
                    borderColor: isActive ? '#16274D' : '#E2E8F0',
                    background: isActive ? '#16274D' : '#F8FAFC',
                    color: isActive ? '#FFD400' : '#475569',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{cat.label}</span>
                  <span style={{
                    fontSize: 10.5,
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: isActive ? '#FFD400' : '#E2E8F0',
                    color: isActive ? '#16274D' : '#64748B',
                    fontWeight: 800
                  }}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F8FAFC',
            border: '1.5px solid #CBD5E1',
            borderRadius: 10,
            padding: '6px 12px',
            minWidth: 260
          }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder="Search portal name, path, device..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                width: '100%',
                color: '#16274D'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Portals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
        {filteredPortals.map(portal => {
          const fullUrl = `${cleanBase}${portal.path}`;
          const isCopied = copiedId === portal.id;
          const DeviceIcon = portal.deviceIcon || Laptop;

          return (
            <div
              key={portal.id}
              className="evt-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 20,
                borderRadius: 16,
                border: '1.5px solid #E2E8F0',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                {/* Card Header & Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <span
                    className="evt-badge"
                    style={{
                      background: portal.accessColor,
                      color: portal.accessColor === '#FFD400' ? '#16274D' : '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px'
                    }}
                  >
                    {portal.accessBadge}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '4px 8px', borderRadius: 8 }}>
                    <DeviceIcon size={14} color="#475569" />
                    <span>{portal.deviceType}</span>
                  </div>
                </div>

                {/* Title and Subtitle */}
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#16274D', margin: '0 0 6px', lineHeight: 1.25 }}>
                  {portal.title}
                </h2>
                <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 14px', lineHeight: 1.45 }}>
                  {portal.subtitle}
                </p>

                {/* URL Display Box */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>
                    Direct Access URL
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: '#0F172A',
                    wordBreak: 'break-all',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}>
                    <span>{fullUrl}</span>
                    <button
                      onClick={() => copyToClipboard(fullUrl, portal.id)}
                      title="Copy URL"
                      style={{
                        background: isCopied ? '#10B981' : '#E2E8F0',
                        color: isCopied ? '#FFFFFF' : '#16274D',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Target & Credentials Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: '#475569', marginBottom: 14 }}>
                  <div>
                    <strong style={{ color: '#16274D' }}>Target Audience: </strong>
                    <span>{portal.recommendedFor}</span>
                  </div>
                  {portal.authInfo && (
                    <div style={{
                      background: portal.category === 'ADMIN' ? '#FEF2F2' : '#EFF6FF',
                      borderLeft: `3px solid ${portal.category === 'ADMIN' ? '#EF4136' : '#3B82F6'}`,
                      padding: '6px 10px',
                      borderRadius: '0 6px 6px 0',
                      fontSize: 11,
                      color: portal.category === 'ADMIN' ? '#991B1B' : '#1E40AF'
                    }}>
                      {portal.authInfo}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: 8,
                paddingTop: 12,
                borderTop: '1px solid #F1F5F9'
              }}>
                <button
                  onClick={() => setActiveQrModal({ ...portal, fullUrl })}
                  className="evt-btn evt-btn-ghost"
                  style={{ flex: 1, padding: '8px 10px', fontSize: 12, justifyContent: 'center' }}
                >
                  <QrCode size={14} /> View QR
                </button>

                <a
                  href={portal.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evt-btn evt-btn-teal"
                  style={{
                    flex: 1.4,
                    padding: '8px 12px',
                    fontSize: 12,
                    justifyContent: 'center',
                    textDecoration: 'none',
                    fontWeight: 800
                  }}
                >
                  <ExternalLink size={14} /> Open Portal
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPortals.length === 0 && (
        <div className="evt-card" style={{ textAlign: 'center', padding: 48 }}>
          <Info size={32} color="#94A3B8" style={{ marginBottom: 10 }} />
          <div className="evt-h2" style={{ fontSize: 20 }}>No matching portals found</div>
          <p className="evt-sub" style={{ marginTop: 6 }}>
            Try clearing your search term or switching to the "All Portals" tab.
          </p>
        </div>
      )}

      {/* QR Code Modal Dialog */}
      {activeQrModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '28px 32px',
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setActiveQrModal(null)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                border: 'none',
                background: '#F1F5F9',
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
              <X size={18} />
            </button>

            <span
              className="evt-badge"
              style={{
                background: activeQrModal.accessColor,
                color: activeQrModal.accessColor === '#FFD400' ? '#16274D' : '#FFFFFF',
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 10
              }}
            >
              {activeQrModal.accessBadge}
            </span>

            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#16274D', margin: '4px 0 8px' }}>
              {activeQrModal.title}
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px' }}>
              Scan with phone camera or tablet to immediately open this screen.
            </p>

            {/* QR Frame */}
            <div style={{
              display: 'inline-block',
              padding: 16,
              background: '#F8FAFC',
              border: '2px solid #16274D',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              marginBottom: 18
            }}>
              <QRCodeSVG
                value={activeQrModal.fullUrl}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Full URL with quick copy */}
            <div style={{
              background: '#F1F5F9',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 11.5,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#16274D',
              wordBreak: 'break-all',
              marginBottom: 16,
              textAlign: 'left'
            }}>
              {activeQrModal.fullUrl}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => copyToClipboard(activeQrModal.fullUrl, 'MODAL_COPY')}
                className="evt-btn evt-btn-amber"
                style={{ flex: 1, justifyContent: 'center', padding: '10px 14px', fontSize: 13 }}
              >
                {copiedId === 'MODAL_COPY' ? <Check size={16} /> : <Copy size={16} />}
                {copiedId === 'MODAL_COPY' ? 'Copied Link!' : 'Copy Direct Link'}
              </button>

              <a
                href={activeQrModal.fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="evt-btn evt-btn-teal"
                style={{ flex: 1, justifyContent: 'center', padding: '10px 14px', fontSize: 13, textDecoration: 'none' }}
              >
                <ExternalLink size={16} /> Launch Now
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
