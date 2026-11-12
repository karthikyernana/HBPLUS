import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {
  LogOut,
  Lock,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Clock,
  Activity,
  Dumbbell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ALLOWED_PRIMARY_DOMAIN,
  UserRole,
  AuditEventType,
  hasRolePermission,
} from '../utils/domainAuth';
import { UserProfile } from '../components/UserProfile';

type DashboardTab = 'overview' | 'programs' | 'directory' | 'activity';
type TrainingTrack = 'Strength & Power' | 'Metabolic Conditioning' | 'Mobility & Recovery';
type SessionStatus = 'scheduled' | 'in_progress' | 'completed';

interface TrainingSession {
  id: string;
  title: string;
  athleteName: string;
  track: TrainingTrack;
  timeSlot: string;
  durationMin: number;
  readinessScore: number;
  targetBpm: number;
  status: SessionStatus;
}

const INITIAL_SESSIONS: TrainingSession[] = [
  {
    id: 'ses_01',
    title: 'Barbell Force-Velocity Profiling',
    athleteName: 'Maya Lin',
    track: 'Strength & Power',
    timeSlot: '09:00 AM',
    durationMin: 60,
    readinessScore: 94,
    targetBpm: 148,
    status: 'in_progress',
  },
  {
    id: 'ses_02',
    title: 'Lactate Threshold & VO2 Interval Block',
    athleteName: 'Devon Brooks',
    track: 'Metabolic Conditioning',
    timeSlot: '10:30 AM',
    durationMin: 45,
    readinessScore: 89,
    targetBpm: 174,
    status: 'scheduled',
  },
  {
    id: 'ses_03',
    title: 'Neuromuscular Mobility & Cold Plunge Protocol',
    athleteName: 'Elena Vance',
    track: 'Mobility & Recovery',
    timeSlot: '01:15 PM',
    durationMin: 45,
    readinessScore: 82,
    targetBpm: 112,
    status: 'scheduled',
  },
  {
    id: 'ses_04',
    title: 'Olympic Lift Technical Periodization',
    athleteName: 'Marcus Sterling',
    track: 'Strength & Power',
    timeSlot: '03:00 PM',
    durationMin: 75,
    readinessScore: 96,
    targetBpm: 156,
    status: 'completed',
  },
];

export const DashboardScreen: React.FC = () => {
  const {
    currentUser,
    directory,
    auditLogs,
    logout,
    updateCurrentUserProfile,
    switchCurrentUserRole,
    updateMemberRole,
    toggleMemberStatus,
    provisionMember,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [sessions, setSessions] = useState<TrainingSession[]>(INITIAL_SESSIONS);
  const [trackFilter, setTrackFilter] = useState<'ALL' | TrainingTrack>('ALL');

  // New training session builder state
  const [sessionTitle, setSessionTitle] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [sessionTrack, setSessionTrack] = useState<TrainingTrack>('Strength & Power');
  const [sessionTimeSlot, setSessionTimeSlot] = useState('04:30 PM');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [sessionBpm, setSessionBpm] = useState('155');
  const [sessionFeedback, setSessionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Staff directory filtering & member invite state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('Strength & Conditioning');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [provisionFeedback, setProvisionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Activity log filter state
  const [auditFilter, setAuditFilter] = useState<'ALL' | AuditEventType>('ALL');

  if (!currentUser) {
    return null;
  }

  const canManageRoles = hasRolePermission(currentUser.role, 'manage_roles');
  const canProvision = hasRolePermission(currentUser.role, 'provision_member');

  const activeMembersCount = directory.filter((m) => m.status === 'active').length;
  const completedSessionsCount = sessions.filter((s) => s.status === 'completed').length;
  const avgReadiness = Math.round(
    sessions.reduce((acc, s) => acc + s.readinessScore, 0) / (sessions.length || 1)
  );
  const avgTargetBpm = Math.round(
    sessions.reduce((acc, s) => acc + s.targetBpm, 0) / (sessions.length || 1)
  );

  const filteredSessions = sessions.filter((s) =>
    trackFilter === 'ALL' ? true : s.track === trackFilter
  );

  const filteredDirectory = directory.filter((member) => {
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      member.email.toLowerCase().includes(q) ||
      member.displayName.toLowerCase().includes(q) ||
      member.department.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const filteredAuditLogs = auditLogs.filter((log) =>
    auditFilter === 'ALL' ? true : log.eventType === auditFilter
  );

  const cycleSessionStatus = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextStatus: SessionStatus =
          s.status === 'scheduled'
            ? 'in_progress'
            : s.status === 'in_progress'
            ? 'completed'
            : 'scheduled';
        return { ...s, status: nextStatus };
      })
    );
  };

  const handleAddSession = () => {
    setSessionFeedback(null);
    const cleanTitle = sessionTitle.trim();
    const cleanAthlete = athleteName.trim();
    const cleanSlot = sessionTimeSlot.trim() || '04:30 PM';
    const dur = parseInt(sessionDuration, 10);
    const bpm = parseInt(sessionBpm, 10);

    if (!cleanTitle || !cleanAthlete) {
      setSessionFeedback({
        type: 'error',
        message: 'Please enter both a training block title and athlete name.',
      });
      return;
    }
    if (isNaN(dur) || dur < 15 || dur > 180) {
      setSessionFeedback({
        type: 'error',
        message: 'Duration must be between 15 and 180 minutes.',
      });
      return;
    }

    const newSession: TrainingSession = {
      id: `ses_${Date.now()}`,
      title: cleanTitle,
      athleteName: cleanAthlete,
      track: sessionTrack,
      timeSlot: cleanSlot,
      durationMin: dur,
      readinessScore: 92,
      targetBpm: isNaN(bpm) ? 150 : bpm,
      status: 'scheduled',
    };

    setSessions((prev) => [newSession, ...prev]);
    setSessionTitle('');
    setAthleteName('');
    setSessionFeedback({
      type: 'success',
      message: `Scheduled "${cleanTitle}" for ${cleanAthlete} at ${cleanSlot}.`,
    });
  };

  const handleProvisionSubmit = () => {
    setProvisionFeedback(null);
    const result = provisionMember({
      email: newEmail,
      displayName: newName,
      role: newRole,
      department: newDepartment,
      platform: 'web',
    });

    if (!result.ok) {
      setProvisionFeedback({
        type: 'error',
        message: result.error || 'Failed to add coach to roster.',
      });
      return;
    }

    setProvisionFeedback({
      type: 'success',
      message: `Added ${newEmail.trim().toLowerCase()} to the HB+ coaching staff.`,
    });
    setNewEmail('');
    setNewName('');
  };

  return (
    <SafeAreaView className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col justify-between">
      {/* Top Bar Contract: Zone 1 Brand — Zone 2 4 Nav Links — Zone 3 Sign Out */}
      <View
        accessibilityRole="header"
        className="w-full bg-white border-b border-[#E4E4E7] px-6 py-3.5"
      >
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-8">
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#09090B] whitespace-nowrap shrink-0 font-display"
          >
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-md bg-[#09090B] text-white flex items-center justify-center text-xs font-extrabold tracking-tight"
            >
              HB+
            </span>
            <span>HB+ Studio</span>
          </a>

          <View
            accessibilityRole="navigation"
            accessibilityLabel="Studio Primary Navigation"
            className="hidden md:flex flex-row items-center gap-7 text-sm font-medium"
          >
            {(
              [
                { id: 'overview', label: 'Schedule' },
                { id: 'programs', label: 'Programs' },
                { id: 'directory', label: 'Team & Access' },
                { id: 'activity', label: 'Access Log' },
              ] as { id: DashboardTab; label: string }[]
            ).map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.id }}
                testID={`nav-tab-${tab.id}`}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#09090B] text-[#09090B] font-semibold'
                    : 'border-transparent text-[#71717A] hover:text-[#09090B]'
                }`}
              >
                {tab.label}
              </Pressable>
            ))}
          </View>

          <div className="flex items-center shrink-0">
            <Pressable
              onPress={logout}
              accessibilityLabel="Sign Out"
              testID="logout-button"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#09090B] hover:bg-[#27272A] rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Pressable>
          </div>
        </div>
      </View>

      {/* Main Protected Studio Content */}
      <View
        accessibilityRole="main"
        testID="dashboard-screen"
        className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6"
      >
        {/* Dedicated UserProfile Component (Google Avatar, Display Name, and Email) */}
        <UserProfile
          user={currentUser}
          onUpdateProfile={updateCurrentUserProfile}
        />

        {/* Mobile Navigation & Role Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex md:hidden items-center gap-1 p-1 bg-[#F4F4F5] rounded-lg border border-[#E4E4E7]">
            {(
              [
                { id: 'overview', label: 'Schedule' },
                { id: 'programs', label: 'Programs' },
                { id: 'directory', label: 'Team' },
                { id: 'activity', label: 'Access Log' },
              ] as { id: DashboardTab; label: string }[]
            ).map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`py-1.5 px-3 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-[#09090B] shadow-xs font-semibold'
                    : 'text-[#52525B]'
                }`}
              >
                {tab.label}
              </Pressable>
            ))}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <span className="text-xs font-medium text-[#71717A]">Workspace Role:</span>
            <div
              role="group"
              aria-label="Workspace Role"
              className="flex items-center gap-1 p-1 bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg"
            >
              <Pressable
                onPress={() => switchCurrentUserRole('admin')}
                accessibilityLabel="Switch role to Admin"
                testID="switch-role-admin"
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  currentUser.role === 'admin'
                    ? 'bg-white text-[#09090B] shadow-xs font-semibold'
                    : 'text-[#52525B] hover:text-[#09090B]'
                }`}
              >
                Admin
              </Pressable>
              <Pressable
                onPress={() => switchCurrentUserRole('user')}
                accessibilityLabel="Switch role to Coach"
                testID="switch-role-user"
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  currentUser.role === 'user'
                    ? 'bg-white text-[#09090B] shadow-xs font-semibold'
                    : 'text-[#52525B] hover:text-[#09090B]'
                }`}
              >
                Coach
              </Pressable>
            </div>
          </div>
        </div>

        {/* 4-Card Studio Performance KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#71717A]">Today&apos;s Training Blocks</div>
            <div className="text-2xl font-bold text-[#09090B] tabular-nums">
              {sessions.length}
            </div>
            <div className="text-xs text-[#52525B] tabular-nums">
              {completedSessionsCount} completed · {sessions.length - completedSessionsCount} active
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#71717A]">Cohort Readiness Avg</div>
            <div className="text-2xl font-bold text-[#15803D] tabular-nums">
              {avgReadiness}%
            </div>
            <div className="text-xs text-[#52525B]">
              HRV &amp; sleep telemetry synced
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#71717A]">HB+ Coaching Staff</div>
            <div
              data-testid="kpi-active-members"
              className="text-2xl font-bold text-[#09090B] tabular-nums"
            >
              {activeMembersCount}
            </div>
            <div className="text-xs text-[#52525B] tabular-nums">
              {directory.filter((m) => m.role === 'admin').length} Leads ·{' '}
              {directory.filter((m) => m.role === 'user').length} Coaches
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#71717A]">Studio Floor Load</div>
            <div className="text-2xl font-bold text-[#2563EB] tabular-nums">
              {avgTargetBpm} bpm
            </div>
            <div className="text-xs text-[#52525B]">
              Mean target heart rate zone
            </div>
          </div>
        </div>

        {/* TAB 1: DAILY SCHEDULE & COACHING OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Today's Training Sessions */}
            <div className="lg:col-span-8 bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Text
                    accessibilityRole="header"
                    headingLevel={2}
                    className="text-base font-bold text-[#09090B] font-display"
                  >
                    Today&apos;s Athlete Programming Schedule
                  </Text>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Select a session status control to check in or complete an athlete block
                  </p>
                </div>

                <div
                  role="group"
                  aria-label="Filter sessions by training track"
                  className="flex flex-wrap items-center gap-1 p-1 bg-[#F4F4F5] rounded-lg"
                >
                  {(
                    [
                      { id: 'ALL', label: 'All' },
                      { id: 'Strength & Power', label: 'Strength' },
                      { id: 'Metabolic Conditioning', label: 'Metabolic' },
                      { id: 'Mobility & Recovery', label: 'Recovery' },
                    ] as const
                  ).map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setTrackFilter(item.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                        trackFilter === item.id
                          ? 'bg-white text-[#09090B] shadow-xs font-semibold'
                          : 'text-[#52525B] hover:text-[#09090B]'
                      }`}
                    >
                      {item.label}
                    </Pressable>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[#E4E4E7]">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#71717A] tabular-nums">
                        <span className="font-semibold text-[#09090B]">
                          {session.timeSlot}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{session.durationMin} min</span>
                        <span aria-hidden="true">·</span>
                        <span>{session.track}</span>
                      </div>

                      <div className="text-sm font-bold text-[#09090B] font-display">
                        {session.title}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#52525B] tabular-nums">
                        <span>
                          Athlete: <strong className="text-[#09090B] font-semibold">{session.athleteName}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#15803D] font-medium">
                          Readiness {session.readinessScore}%
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Target {session.targetBpm} bpm</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Pressable
                        onPress={() => cycleSessionStatus(session.id)}
                        accessibilityLabel={`Update status for ${session.title}`}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          session.status === 'completed'
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : session.status === 'in_progress'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F4F4F5] text-[#09090B] hover:bg-[#E4E4E7]'
                        }`}
                      >
                        {session.status === 'completed'
                          ? 'Completed'
                          : session.status === 'in_progress'
                          ? 'In Progress'
                          : 'Start Session'}
                      </Pressable>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 4 Columns: Active Coaching Roster Preview */}
            <div className="lg:col-span-4 bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between">
                <div>
                  <Text
                    accessibilityRole="header"
                    headingLevel={2}
                    className="text-base font-bold text-[#09090B] font-display"
                  >
                    On-Floor Coaches
                  </Text>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Active @{ALLOWED_PRIMARY_DOMAIN} staff
                  </p>
                </div>
                <Pressable
                  onPress={() => setActiveTab('directory')}
                  className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] whitespace-nowrap"
                >
                  Full Roster →
                </Pressable>
              </div>

              <div className="divide-y divide-[#E4E4E7]">
                {directory.map((member) => {
                  const initials = member.displayName
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('');
                  return (
                    <div
                      key={member.uid}
                      className="px-5 py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-[#E4E4E7] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#F4F4F5] text-[#09090B] font-semibold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#09090B] truncate">
                            {member.displayName}
                          </div>
                          <div className="text-xs text-[#71717A] truncate">
                            {member.department}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#52525B] shrink-0">
                        {member.role === 'admin' ? 'Lead' : 'Coach'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRAINING PROGRAMS & SESSION BUILDER */}
        {activeTab === 'programs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4">
              <div className="pb-3 border-b border-[#E4E4E7]">
                <Text
                  accessibilityRole="header"
                  headingLevel={2}
                  className="text-base font-bold text-[#09090B] font-display"
                >
                  Schedule Athlete Session
                </Text>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Assign a new biometric training block to today&apos;s floor schedule
                </p>
              </div>

              {sessionFeedback && (
                <View
                  accessibilityRole="alert"
                  className={`p-3 rounded-lg border text-xs font-medium ${
                    sessionFeedback.type === 'success'
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                  }`}
                >
                  {sessionFeedback.message}
                </View>
              )}

              <div className="space-y-3">
                <div>
                  <Text
                    accessibilityRole="label"
                    htmlFor="session-title-input"
                    className="text-xs font-medium text-[#52525B] block mb-1"
                  >
                    Training Block Title
                  </Text>
                  <TextInput
                    id="session-title-input"
                    value={sessionTitle}
                    onChangeText={setSessionTitle}
                    placeholder="e.g. Eccentric Hamstring & Sprint Mechanics"
                    accessibilityLabel="Training Block Title"
                    className="w-full px-3.5 py-2 text-sm border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                  />
                </div>

                <div>
                  <Text
                    accessibilityRole="label"
                    htmlFor="session-athlete-input"
                    className="text-xs font-medium text-[#52525B] block mb-1"
                  >
                    Athlete Name
                  </Text>
                  <TextInput
                    id="session-athlete-input"
                    value={athleteName}
                    onChangeText={setAthleteName}
                    placeholder="e.g. Jordan Reyes"
                    accessibilityLabel="Athlete Name"
                    className="w-full px-3.5 py-2 text-sm border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="session-slot-input"
                      className="text-xs font-medium text-[#52525B] block mb-1"
                    >
                      Time Slot
                    </Text>
                    <TextInput
                      id="session-slot-input"
                      value={sessionTimeSlot}
                      onChangeText={setSessionTimeSlot}
                      placeholder="04:30 PM"
                      accessibilityLabel="Session Time Slot"
                      className="w-full px-3 py-2 text-xs tabular-nums border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                    />
                  </div>
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="session-duration-input"
                      className="text-xs font-medium text-[#52525B] block mb-1"
                    >
                      Duration (min)
                    </Text>
                    <TextInput
                      id="session-duration-input"
                      value={sessionDuration}
                      onChangeText={setSessionDuration}
                      placeholder="60"
                      accessibilityLabel="Session Duration Minutes"
                      className="w-full px-3 py-2 text-xs tabular-nums border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                    />
                  </div>
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="session-bpm-input"
                      className="text-xs font-medium text-[#52525B] block mb-1"
                    >
                      Target HR (bpm)
                    </Text>
                    <TextInput
                      id="session-bpm-input"
                      value={sessionBpm}
                      onChangeText={setSessionBpm}
                      placeholder="155"
                      accessibilityLabel="Target Heart Rate BPM"
                      className="w-full px-3 py-2 text-xs tabular-nums border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="session-track-select" className="text-xs font-medium text-[#52525B] block mb-1">
                    Training Track
                  </label>
                  <select
                    id="session-track-select"
                    value={sessionTrack}
                    onChange={(e) => setSessionTrack(e.target.value as TrainingTrack)}
                    className="w-full px-3.5 py-2 text-sm border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                  >
                    <option value="Strength & Power">Strength &amp; Power</option>
                    <option value="Metabolic Conditioning">Metabolic Conditioning</option>
                    <option value="Mobility & Recovery">Mobility &amp; Recovery</option>
                  </select>
                </div>

                <Pressable
                  onPress={handleAddSession}
                  accessibilityLabel="Add Session to Schedule"
                  className="w-full py-2.5 px-4 bg-[#09090B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Session to Floor Schedule</span>
                </Pressable>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E4E4E7]">
                <Text
                  accessibilityRole="header"
                  headingLevel={2}
                  className="text-base font-bold text-[#09090B] font-display tabular-nums"
                >
                  Active Program Blocks ({sessions.length})
                </Text>
              </div>
              <div className="divide-y divide-[#E4E4E7]">
                {sessions.map((s) => (
                  <div key={s.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#09090B] font-display">
                        {s.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#71717A] tabular-nums">
                        <span className="inline-flex items-center gap-1 text-[#09090B] font-medium">
                          <Dumbbell className="w-3.5 h-3.5 text-[#71717A]" />
                          {s.athleteName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {s.timeSlot} ({s.durationMin}m)
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          {s.targetBpm} bpm
                        </span>
                      </div>
                    </div>
                    <Pressable
                      onPress={() => cycleSessionStatus(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        s.status === 'completed'
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : s.status === 'in_progress'
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#09090B]'
                      }`}
                    >
                      {s.status === 'completed'
                        ? 'Completed'
                        : s.status === 'in_progress'
                        ? 'In Progress'
                        : 'Scheduled'}
                    </Pressable>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEAM & ACCESS (RBAC) */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* Admin Member Invite Form */}
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4E4E7]">
                <div>
                  <Text
                    accessibilityRole="header"
                    headingLevel={2}
                    className="text-base font-bold text-[#09090B] font-display"
                  >
                    Invite HB+ Coach or Staff Member
                  </Text>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Staff accounts require an official @{ALLOWED_PRIMARY_DOMAIN} Google Workspace email
                  </p>
                </div>
              </div>

              {!canProvision ? (
                <View
                  accessibilityRole="alert"
                  testID="rbac-restricted-notice"
                  className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#D97706] shrink-0" />
                    <span>
                      Staff onboarding and role changes require <strong>Admin</strong> access.
                    </span>
                  </div>
                  <Pressable
                    onPress={() => switchCurrentUserRole('admin')}
                    className="px-3.5 py-1.5 bg-[#09090B] text-white font-semibold rounded-lg whitespace-nowrap shrink-0"
                  >
                    Switch to Admin
                  </Pressable>
                </View>
              ) : (
                <div className="space-y-4">
                  {provisionFeedback && (
                    <View
                      accessibilityRole="alert"
                      testID="provision-feedback"
                      className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                        provisionFeedback.type === 'success'
                          ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                          : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                      }`}
                    >
                      {provisionFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                      )}
                      <span className="font-medium">{provisionFeedback.message}</span>
                    </View>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Text
                        accessibilityRole="label"
                        htmlFor="new-member-email"
                        className="text-xs font-medium text-[#52525B]"
                      >
                        Work Email (@{ALLOWED_PRIMARY_DOMAIN})
                      </Text>
                      <TextInput
                        id="new-member-email"
                        value={newEmail}
                        onChangeText={setNewEmail}
                        placeholder="jordan.lee@hbplus.fit"
                        keyboardType="email-address"
                        accessibilityLabel="New Member Official Email"
                        testID="provision-email-input"
                        className="w-full px-3 py-2 text-xs border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Text
                        accessibilityRole="label"
                        htmlFor="new-member-name"
                        className="text-xs font-medium text-[#52525B]"
                      >
                        Full Name
                      </Text>
                      <TextInput
                        id="new-member-name"
                        value={newName}
                        onChangeText={setNewName}
                        placeholder="Jordan Lee"
                        accessibilityLabel="New Member Full Name"
                        testID="provision-name-input"
                        className="w-full px-3 py-2 text-xs border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Text
                        accessibilityRole="label"
                        htmlFor="new-member-dept"
                        className="text-xs font-medium text-[#52525B]"
                      >
                        Specialty
                      </Text>
                      <TextInput
                        id="new-member-dept"
                        value={newDepartment}
                        onChangeText={setNewDepartment}
                        placeholder="Specialty"
                        accessibilityLabel="New Member Department"
                        className="w-full px-3 py-2 text-xs border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                      />
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="New Member Role"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as UserRole)}
                          className="px-3 py-2 text-xs border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                        >
                          <option value="user">Role: Coach</option>
                          <option value="admin">Role: Admin</option>
                        </select>

                        <Pressable
                          onPress={handleProvisionSubmit}
                          accessibilityLabel="Add Member"
                          testID="provision-submit-btn"
                          className="flex-1 py-2 px-3 bg-[#09090B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Staff</span>
                        </Pressable>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Staff Roster Table */}
            <div className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search coaching staff..."
                    accessibilityLabel="Search directory members"
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                  />
                </div>

                <div
                  role="group"
                  aria-label="Filter directory by role"
                  className="flex items-center gap-1 p-1 bg-[#F4F4F5] rounded-lg"
                >
                  {(['all', 'admin', 'user'] as const).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRoleFilter(r)}
                      className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                        roleFilter === r
                          ? 'bg-white text-[#09090B] shadow-xs font-semibold'
                          : 'text-[#52525B] hover:text-[#09090B]'
                      }`}
                    >
                      {r === 'all' ? 'All Staff' : r === 'admin' ? 'Admins' : 'Coaches'}
                    </Pressable>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A] font-semibold">
                      <th className="py-3 px-4">Coach / Staff</th>
                      <th className="py-3 px-4">Google Workspace Email</th>
                      <th className="py-3 px-4">Specialty</th>
                      <th className="py-3 px-4">Role &amp; Status</th>
                      <th className="py-3 px-4 text-right">Access Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {filteredDirectory.map((member) => (
                      <tr key={member.uid} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#09090B] whitespace-nowrap">
                          {member.displayName}
                        </td>
                        <td className="py-3 px-4 text-[#52525B] whitespace-nowrap">
                          {member.email}
                        </td>
                        <td className="py-3 px-4 text-[#52525B] whitespace-nowrap">
                          {member.department}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[#52525B]">
                          <span className="font-semibold text-[#09090B]">
                            {member.role === 'admin' ? 'Admin' : 'Coach'}
                          </span>
                          {' · '}
                          <span
                            className={
                              member.status === 'active'
                                ? 'text-[#15803D] font-medium'
                                : 'text-[#B91C1C] font-medium'
                            }
                          >
                            {member.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {canManageRoles ? (
                            <div className="inline-flex items-center gap-2">
                              <Pressable
                                onPress={() =>
                                  updateMemberRole(
                                    member.uid,
                                    member.role === 'admin' ? 'user' : 'admin'
                                  )
                                }
                                accessibilityLabel={`Change role for ${member.displayName}`}
                                className="px-2.5 py-1 text-xs font-medium text-[#09090B] bg-[#F4F4F5] hover:bg-[#E4E4E7] rounded-md"
                              >
                                {member.role === 'admin' ? 'Set Coach' : 'Make Admin'}
                              </Pressable>
                              {member.uid !== currentUser.uid && (
                                <Pressable
                                  onPress={() => toggleMemberStatus(member.uid)}
                                  accessibilityLabel={`${
                                    member.status === 'active' ? 'Suspend' : 'Activate'
                                  } ${member.displayName}`}
                                  className="px-2.5 py-1 text-xs font-medium text-[#52525B] hover:text-[#09090B] border border-[#D4D4D8] rounded-md"
                                >
                                  {member.status === 'active' ? 'Suspend' : 'Activate'}
                                </Pressable>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#71717A]">Admin only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCESS LOG */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-4">
              <div>
                <Text
                  accessibilityRole="header"
                  headingLevel={2}
                  className="text-base font-bold text-[#09090B] font-display"
                >
                  Studio Access &amp; Authentication Log
                </Text>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Recent staff sign-ins and domain access events
                </p>
              </div>

              <div
                role="group"
                aria-label="Filter activity events"
                className="flex flex-wrap items-center gap-1 p-1 bg-[#F4F4F5] rounded-lg"
              >
                {(
                  [
                    { id: 'ALL', label: 'All' },
                    { id: 'LOGIN_ALLOWED', label: 'Authorized' },
                    { id: 'LOGIN_RESTRICTED', label: 'Blocked' },
                    { id: 'ROLE_UPDATED', label: 'Role Changes' },
                    { id: 'LOGOUT', label: 'Sign Outs' },
                  ] as const
                ).map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setAuditFilter(item.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                      auditFilter === item.id
                        ? 'bg-white text-[#09090B] shadow-xs font-semibold'
                        : 'text-[#52525B] hover:text-[#09090B]'
                    }`}
                  >
                    {item.label}
                  </Pressable>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A] font-semibold">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4 text-right">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAFAFA]">
                      <td className="py-3 px-4 whitespace-nowrap font-semibold">
                        <span
                          className={
                            log.eventType === 'LOGIN_ALLOWED'
                              ? 'text-[#15803D]'
                              : log.eventType === 'LOGIN_RESTRICTED'
                              ? 'text-[#B91C1C]'
                              : 'text-[#09090B]'
                          }
                        >
                          {log.eventType === 'LOGIN_ALLOWED'
                            ? 'Authorized Sign-In'
                            : log.eventType === 'LOGIN_RESTRICTED'
                            ? 'Blocked External Domain'
                            : log.eventType === 'LOGOUT'
                            ? 'Signed Out'
                            : 'Role Updated'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#09090B] font-medium whitespace-nowrap">
                        {log.email}
                      </td>
                      <td className="py-3 px-4 text-[#71717A] whitespace-nowrap">
                        @{log.domain}
                      </td>
                      <td className="py-3 px-4 text-right text-[#71717A] font-mono whitespace-nowrap">
                        {log.createdAt.replace('T', ' ').slice(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </View>

      {/* Quiet Studio Footer */}
      <View
        accessibilityRole="footer"
        className="w-full border-t border-[#E4E4E7] bg-white px-6 py-4 text-xs text-[#71717A]"
      >
        <div className="max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-4">
          <span>HB+ Performance Studio · {currentUser.displayName} ({currentUser.email})</span>
          <span className="font-medium text-[#52525B]">hbplus.fit</span>
        </div>
      </View>
    </SafeAreaView>
  );
};
