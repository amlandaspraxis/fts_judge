import React, { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  Shield,
  Gavel,
  Users,
  UserPlus,
  Trophy,
  List,
  Settings,
  Eye,
  CheckCircle2,
  Search,
  Bell,
  MessageSquare,
  Menu,
  X,
  Sparkles,
  MonitorPlay,
  QrCode
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Single shared sliding active indicator state & refs
  const navRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [pillStyle, setPillStyle] = useState({ top: 0, height: 48, ready: false });
  const [animating, setAnimating] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (user?.role === 'HELP_DESK' || user?.role === 'ADMIN') {
      navigate(`/helpdesk/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (user?.role === 'JUDGE') {
      navigate(`/judge/participants`);
    } else {
      navigate(`/audience/categories`);
    }
  };

  const links = useMemo(() => {
    if (!user) return [];
    switch (user.role) {
      case 'ADMIN':
        return [
          { to: '/admin/dashboard', label: 'Dashboard', icon: Shield },
          { to: '/admin/portals', label: 'Portal Access Hub', icon: QrCode },
          { to: '/admin/categories', label: 'Categories', icon: List },
          { to: '/admin/participants', label: 'Participants', icon: Users },
          { to: '/admin/judges', label: 'Judges', icon: Gavel },
          { to: '/admin/judge-assignments', label: 'Assignments', icon: List },
          { to: '/admin/audience', label: 'Audience', icon: Users },
          { to: '/admin/event-control', label: 'Event Control', icon: Settings },
          { to: '/admin/results', label: 'Results (85/15)', icon: Trophy },
          { to: '/admin/projector', label: 'Live Projector', icon: MonitorPlay },
          { to: '/admin/audit-logs', label: 'Audit Logs', icon: Eye }
        ];
      case 'JUDGE':
        return [
          { to: '/judge/dashboard', label: 'Dashboard', icon: Gavel },
          { to: '/judge/categories', label: 'Categories', icon: List },
          { to: '/judge/participants', label: 'Score Acts', icon: Users },
          { to: '/judge/scores', label: 'Score History', icon: Trophy },
          { to: '/judge/profile', label: 'My Profile', icon: Shield }
        ];
      case 'AUDIENCE':
        return [
          { to: '/audience/dashboard', label: 'Voting Hub', icon: Users },
          { to: '/audience/categories', label: 'Categories', icon: List },
          { to: '/audience/history', label: 'My Votes', icon: CheckCircle2 }
        ];
      case 'HELP_DESK':
        return [
          { to: '/helpdesk/dashboard', label: 'Desk Overview', icon: Users },
          { to: '/helpdesk/register', label: 'Performer Registration', icon: UserPlus },
          { to: '/helpdesk/participants', label: 'Performer List', icon: List },
          { to: '/helpdesk/search', label: 'Search Registry', icon: Search }
        ];
      default:
        return [];
    }
  }, [user?.role]);

  const roleColors = {
    ADMIN: { bg: '#EF4136', text: '#FFFFFF', dot: '#EF4136' },
    JUDGE: { bg: '#29ABE2', text: '#0E1830', dot: '#29ABE2' },
    AUDIENCE: { bg: '#FFD400', text: '#16274D', dot: '#FFD400' },
    HELP_DESK: { bg: '#10B981', text: '#FFFFFF', dot: '#10B981' }
  };

  const activeRole = roleColors[user?.role] || { bg: '#FFD400', text: '#16274D', dot: '#FFD400' };

  // Current active link determination (memoized to prevent reference churn)
  const activeLink = useMemo(() => {
    return links.find(l => {
      if (['/admin/dashboard', '/judge/dashboard', '/audience/dashboard', '/helpdesk/dashboard'].includes(l.to)) {
        return location.pathname === l.to;
      }
      return location.pathname.startsWith(l.to);
    }) || links[0];
  }, [links, location.pathname]);

  const currentTitle = activeLink?.label || 'Portal';

  // Synchronize the single active indicator position to the active navigation item
  const updatePillPosition = useCallback(() => {
    if (!activeLink?.to) return;
    const el = itemRefs.current.get(activeLink.to);
    if (el) {
      const top = el.offsetTop;
      const height = el.offsetHeight || 48;
      setPillStyle(prev => {
        if (prev.top === top && prev.height === height && prev.ready) {
          return prev; // Same state -> bail out of re-render
        }
        return { top, height, ready: true };
      });
    }
  }, [activeLink?.to]);

  useLayoutEffect(() => {
    updatePillPosition();
  }, [updatePillPosition]);

  useEffect(() => {
    // Enable sliding transition after initial mount sets initial coordinates
    const timer = setTimeout(() => {
      setAnimating(true);
    }, 60);

    const handleResize = () => updatePillPosition();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [updatePillPosition]);

  // Initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'FT';

  return (
    <div className="jobie-shell">
      {/* 1. Left Sidebar Navigation */}
      <aside className={`jobie-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="jobie-sidebar-brand">
          <img
            src="/main_logo.png"
            alt="FTS 2026 Logo"
            style={{
              height: 44,
              width: 'auto',
              objectFit: 'contain',
              flexShrink: 0,
              filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'Luckiest Guy', fontSize: 20, color: '#FFD400', letterSpacing: '0.04em', lineHeight: 1.1 }}>
              FTS 2026
            </span>
            <span style={{ fontSize: 11, color: '#CFE3F5', fontWeight: 600, letterSpacing: '0.04em' }}>
              TALENT SEARCH
            </span>
          </div>
        </div>

        {/* Vertical Links with Single Continuous Sliding Pill */}
        <nav className="jobie-sidebar-nav" ref={navRef}>
          {/* Single physical active indicator that smoothly travels between links */}
          <div
            className={`jobie-active-pill ${animating ? 'animated' : ''}`}
            style={{
              transform: `translateY(${pillStyle.top}px)`,
              height: `${pillStyle.height}px`,
              opacity: pillStyle.ready ? 1 : 0
            }}
          />

          {links.map(({ to, label, icon: Icon }) => {
            const isCurrent = activeLink?.to === to;
            return (
              <NavLink
                key={to}
                to={to}
                ref={el => {
                  if (el) itemRefs.current.set(to, el);
                  else itemRefs.current.delete(to);
                }}
                onClick={() => setSidebarOpen(false)}
                className={`jobie-nav-link ${isCurrent ? 'active' : ''}`}
              >
                {Icon && (
                  <Icon
                    size={19}
                    style={{
                      flexShrink: 0,
                      color: isCurrent ? '#16274D' : '#94A3B8',
                      transition: 'color 260ms ease'
                    }}
                  />
                )}
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer with Role Status */}
        <div className="jobie-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeRole.dot, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#CFE3F5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {user?.role?.replace('_', ' ')} ACTIVE
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#8297BC' }}>
            FTS Event System © 2026
          </div>
        </div>
      </aside>

      {/* 2. Main Area with Topbar & Content */}
      <div className="jobie-main">
        {/* Top Header Bar */}
        <header className="jobie-topbar">
          {/* Left: Mobile Toggle & Page Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="jobie-icon-btn"
              style={{ display: 'flex' }}
              aria-label="Toggle Navigation"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5B6890' }}>
                {user?.role?.replace('_', ' ')} PORTAL
              </div>
              <h1 style={{ fontFamily: 'Luckiest Guy', fontSize: 24, margin: 0, color: '#16274D', lineHeight: 1.1 }}>
                {currentTitle}
              </h1>
            </div>
          </div>

          {/* Center: Search Bar */}
          <form onSubmit={handleSearchSubmit} className="jobie-search-bar">
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              className="jobie-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search performers, chest #, acts..."
            />
          </form>

          {/* Right: Notifications, Avatar, User Profile, Exit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Message Dot */}
            <div className="jobie-icon-btn" title="Live Channel">
              <MessageSquare size={17} />
              <span className="jobie-badge-dot">Live</span>
            </div>

            {/* Notification Bell */}
            <div className="jobie-icon-btn" title="System Alerts">
              <Bell size={17} />
              <span className="jobie-badge-dot">9</span>
            </div>

            {/* User Profile Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#F1F4F9',
              padding: '5px 12px 5px 6px',
              borderRadius: 999,
              border: '1.5px solid #CBD5E1'
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#16274D',
                color: '#FFD400',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13,
                fontFamily: 'JetBrains Mono',
                border: '2px solid #FFD400'
              }}>
                {initials}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#16274D' }}>
                  {user?.name || 'User'}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: activeRole.bg }}>
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Exit / Logout */}
            <button
              onClick={handleLogout}
              className="evt-btn evt-btn-ghost"
              style={{ padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              title="Sign Out"
            >
              <LogOut size={14} /> Exit
            </button>
          </div>
        </header>

        {/* 3. Stage Content Area */}
        <main className="jobie-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
