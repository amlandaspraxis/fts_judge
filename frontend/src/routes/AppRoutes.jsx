import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';

// Auth Pages
import Login from '../pages/auth/Login';
import JudgeLogin from '../pages/auth/JudgeLogin';
import RegDeskLogin from '../pages/auth/RegDeskLogin';
import AdminLogin from '../pages/auth/AdminLogin';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminCategories from '../pages/admin/Categories';
import AdminParticipants from '../pages/admin/Participants';
import AdminJudges from '../pages/admin/Judges';
import AdminJudgeAssignments from '../pages/admin/JudgeAssignments';
import AdminAudience from '../pages/admin/Audience';
import AdminEventControl from '../pages/admin/EventControl';
import AdminResults from '../pages/admin/Results';
import AdminAuditLogs from '../pages/admin/AuditLogs';
import AdminSettings from '../pages/admin/Settings';
import AdminProjector from '../pages/admin/Projector';
import PortalAccessHub from '../pages/admin/PortalAccessHub';
import StandaloneProjector from '../pages/public/StandaloneProjector';

// Judge Pages
import JudgeDashboard from '../pages/judge/Dashboard';
import AssignedCategories from '../pages/judge/AssignedCategories';
import JudgeParticipants from '../pages/judge/Participants';
import ScoreParticipant from '../pages/judge/ScoreParticipant';
import ScoreHistory from '../pages/judge/ScoreHistory';
import JudgeProfile from '../pages/judge/Profile';

// Audience Pages
import AudienceDashboard from '../pages/audience/Dashboard';
import AudienceCategories from '../pages/audience/Categories';
import AudienceVote from '../pages/audience/Vote';
import VoteConfirmation from '../pages/audience/VoteConfirmation';
import VoteHistory from '../pages/audience/VoteHistory';

// Help Desk Pages
import HelpDeskDashboard from '../pages/helpdesk/Dashboard';
import RegisterParticipant from '../pages/helpdesk/RegisterParticipant';
import HelpDeskParticipants from '../pages/helpdesk/Participants';
import SearchParticipant from '../pages/helpdesk/SearchParticipant';

// Real-Time Multi-Portal Live Event System
import EventJudgingApp from '../EventJudgingApp';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Audience Auth Routes (Only Audience Portal is visible on /login) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Dedicated Restricted Judges Portal Routes */}
      <Route path="/login/judges" element={<JudgeLogin />} />
      <Route path="/login/judge" element={<JudgeLogin />} />
      <Route path="/judges" element={<JudgeLogin />} />
      <Route path="/judge/login" element={<JudgeLogin />} />
      <Route path="/judge" element={<Navigate to="/judges" replace />} />

      {/* Dedicated Restricted Registration Desk Portal Routes */}
      <Route path="/login/regdesk" element={<RegDeskLogin />} />
      <Route path="/login/desk" element={<RegDeskLogin />} />
      <Route path="/login/helpdesk" element={<RegDeskLogin />} />
      <Route path="/regdesk" element={<RegDeskLogin />} />
      <Route path="/helpdesk/login" element={<RegDeskLogin />} />
      <Route path="/desk/login" element={<RegDeskLogin />} />

      {/* Dedicated Restricted Management Admin Login */}
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/login/management" element={<AdminLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/management/login" element={<Navigate to="/login/admin" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/management" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/portals" element={<PortalAccessHub />} />
          <Route path="/admin/access-links" element={<PortalAccessHub />} />
          <Route path="/admin/links" element={<PortalAccessHub />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/participants" element={<AdminParticipants />} />
          <Route path="/admin/judges" element={<AdminJudges />} />
          <Route path="/admin/judge-assignments" element={<AdminJudgeAssignments />} />
          <Route path="/admin/audience" element={<AdminAudience />} />
          <Route path="/admin/event-control" element={<AdminEventControl />} />
          <Route path="/admin/results" element={<AdminResults />} />
          <Route path="/admin/projector" element={<AdminProjector />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Protected Judge Routes */}
      <Route element={<ProtectedRoute allowedRoles={['JUDGE']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/judge/dashboard" element={<JudgeDashboard />} />
          <Route path="/judge/categories" element={<AssignedCategories />} />
          <Route path="/judge/participants" element={<JudgeParticipants />} />
          <Route path="/judge/score" element={<ScoreParticipant />} />
          <Route path="/judge/scores" element={<ScoreHistory />} />
          <Route path="/judge/profile" element={<JudgeProfile />} />
        </Route>
      </Route>

      {/* Protected Audience Routes */}
      <Route element={<ProtectedRoute allowedRoles={['AUDIENCE']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/audience/dashboard" element={<AudienceDashboard />} />
          <Route path="/audience/categories" element={<AudienceCategories />} />
          <Route path="/audience/vote" element={<AudienceVote />} />
          <Route path="/audience/confirmation" element={<VoteConfirmation />} />
          <Route path="/audience/history" element={<VoteHistory />} />
        </Route>
      </Route>

      {/* Protected Help Desk Routes */}
      <Route element={<ProtectedRoute allowedRoles={['HELP_DESK', 'ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/helpdesk/dashboard" element={<HelpDeskDashboard />} />
          <Route path="/helpdesk/register" element={<RegisterParticipant />} />
          <Route path="/helpdesk/participants" element={<HelpDeskParticipants />} />
          <Route path="/helpdesk/search" element={<SearchParticipant />} />
        </Route>
      </Route>

      {/* Public Stage / Projector Route */}
      <Route path="/projector" element={<EventJudgingApp initialRole="projector" />} />
      <Route path="/projector/leaderboard" element={<StandaloneProjector />} />

      {/* Real-Time Live Event Multi-Portal Operating System Redirects */}
      <Route path="/live" element={<Navigate to="/admin/projector" replace />} />
      <Route path="/event" element={<Navigate to="/admin/projector" replace />} />
      <Route path="/live/admin" element={<Navigate to="/admin/projector" replace />} />
      <Route path="/live/volunteer" element={<EventJudgingApp initialRole="volunteer" />} />
      <Route path="/volunteer" element={<EventJudgingApp initialRole="volunteer" />} />
      <Route path="/desk" element={<EventJudgingApp initialRole="volunteer" />} />
      <Route path="/live/enroll" element={<EventJudgingApp initialRole="enroll" />} />
      <Route path="/enroll" element={<EventJudgingApp initialRole="enroll" />} />
      <Route path="/participant" element={<EventJudgingApp initialRole="enroll" />} />
      <Route path="/live/judge" element={<EventJudgingApp initialRole="judge" />} />
      <Route path="/judge-live" element={<EventJudgingApp initialRole="judge" />} />
      <Route path="/live/audience" element={<EventJudgingApp initialRole="audience" />} />
      <Route path="/audience-live" element={<EventJudgingApp initialRole="audience" />} />
      <Route path="/live/projector" element={<EventJudgingApp initialRole="projector" />} />
      <Route path="/stage" element={<EventJudgingApp initialRole="projector" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
