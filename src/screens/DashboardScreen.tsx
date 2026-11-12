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
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ALLOWED_PRIMARY_DOMAIN,
  UserRole,
  AuditEventType,
  TrainingTrack,
  hasRolePermission,
} from '../utils/domainAuth';
import { UserProfile } from '../components/UserProfile';

type DashboardTab = 'overview' | 'programs' | 'directory' | 'activity';

export const DashboardScreen: React.FC = () => {
  const {
    currentUser,
    directory,
    sessions,
    auditLogs,
    logout,
    updateCurrentUserProfile,
    addTrainingSession,
    cycleSessionStatus,
    deleteTrainingSession,
    updateMemberRole,
    toggleMemberStatus,
    provisionMember,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [trackFilter, setTrackFilter] = useState<'ALL' | TrainingTrack>('ALL');

  // New training session builder state
  const [sessionTitle, setSessionTitle] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [sessionTrack, setSessionTrack] = useState<TrainingTrack>('Strength & Power');
  const [sessionTimeSlot, setSessionTimeSlot] = useState('06:30 PM');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [sessionBpm, setSessionBpm] = useState('148');
  const [sessionFeedback, setSessionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Staff directory filtering & member invite state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('Strength & Conditioning · Indiranagar');
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

  const handleAddSession = () => {
    setSessionFeedback(null);
    const dur = parseInt(sessionDuration, 10);
    const bpm = parseInt(sessionBpm, 10);

    const result = addTrainingSession({
      title: sessionTitle,
      athleteName,
      track: sessionTrack,
      timeSlot: sessionTimeSlot,
      durationMin: dur,
      targetBpm: bpm,
    });

    if (!result.ok) {
      setSessionFeedback({
        type: 'error',
        message: result.error || 'Unable to schedule session.',
      });
      return;
    }

    setSessionFeedback({
      type: 'success',
      message: `Added "${sessionTitle.trim()}" for ${athleteName.trim()} to the floor schedule.`,
    });
    setSessionTitle('');
    setAthleteName('');
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
      message: `Added ${newEmail.trim().toLowerCase()} to the HB+ studio roster.`,
    });
    setNewEmail('');
    setNewName('');
  };

  return (
    <SafeAreaView className="min-h-screen bg-[#F7F6F2] text-[#181816] flex flex-col justify-between">
      {/* Top Bar Contract: Zone 1 Brand — Zone 2 4 Nav Links — Zone 3 Sign Out */}
      <View
        accessibilityRole="header"
        className="w-full bg-white border-b border-[#E6E4DD] px-6 py-3.5"
      >
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-8">
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#181816] whitespace-nowrap shrink-0 font-display"
          >
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-md bg-[#181816] text-[#F7F6F2] flex items-center justify-center text-xs font-extrabold tracking-tight"
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
            ).map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  testID={`nav-tab-${tab.id}`}
                  className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 ${
                    isSelected
                      ? 'border-[#2C4A3E] text-[#181816] font-semibold'
                      : 'border-transparent text-[#78756C] hover:text-[#181816]'
                  }`}
                >
                  {tab.label}
                </Pressable>
              );
            })}
          </View>

          <div className="flex items-center shrink-0">
            <Pressable
              onPress={logout}
              accessibilityLabel="Sign Out"
              testID="logout-button"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#181816] hover:bg-[#2E2D2A] rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0"
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
        className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6"
      >
        {/* Dedicated UserProfile Component (Google Avatar, Display Name, and Email) */}
        <UserProfile
          user={currentUser}
          onUpdateProfile={updateCurrentUserProfile}
        />

        {/* Mobile Navigation Strip */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-[#EDEBE4] rounded-lg border border-[#E6E4DD]">
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
              className={`py-1.5 px-3 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white text-[#181816] shadow-xs font-semibold'
                  : 'text-[#57554E]'
              }`}
            >
              {tab.label}
            </Pressable>
          ))}
        </div>

        {/* 4-Card Studio Floor Overview Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-studio-stagger-2">
          <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#78756C]">Today&apos;s Floor Sessions</div>
            <div className="text-2xl font-bold text-[#181816] tabular-nums">
              {sessions.length}
            </div>
            <div className="text-xs text-[#57554E] tabular-nums">
              {completedSessionsCount} completed · {sessions.length - completedSessionsCount} active
            </div>
          </div>

          <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#78756C]">Member Readiness Mean</div>
            <div className="text-2xl font-bold text-[#2C4A3E] tabular-nums">
              {avgReadiness}%
            </div>
            <div className="text-xs text-[#57554E]">
              Morning check-in average
            </div>
          </div>

          <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#78756C]">HB+ Coaching Roster</div>
            <div
              data-testid="kpi-active-members"
              className="text-2xl font-bold text-[#181816] tabular-nums"
            >
              {activeMembersCount}
            </div>
            <div className="text-xs text-[#57554E] tabular-nums">
              {directory.filter((m) => m.role === 'admin').length} Admins ·{' '}
              {directory.filter((m) => m.role === 'user').length} Coaches
            </div>
          </div>

          <div className="bg-white border border-[#E6E4DD] rounded-xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#78756C]">Target Pacing Zone</div>
            <div className="text-2xl font-bold text-[#181816] tabular-nums">
              {avgTargetBpm} bpm
            </div>
            <div className="text-xs text-[#57554E]">
              Indiranagar · Bandra · Vasant Vihar
            </div>
          </div>
        </div>

        {/* TAB 1: DAILY SCHEDULE & COACHING OVERVIEW */}
        {activeTab === 'overview' && (
          <div
            key="tab-overview"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-studio-tab"
          >
            {/* Left 8 Columns: Today's Training Sessions */}
            <div className="lg:col-span-8 bg-white border border-[#E6E4DD] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Text
                    accessibilityRole="header"
                    headingLevel={2}
                    className="text-base font-bold text-[#181816] font-display"
                  >
                    Today&apos;s Floor Programming
                  </Text>
                  <p className="text-xs text-[#78756C] mt-0.5">
                    Update session check-in status or filter by training discipline
                  </p>
                </div>

                <div
                  role="group"
                  aria-label="Filter sessions by training track"
                  className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EA] rounded-lg"
                >
                  {(
                    [
                      { id: 'ALL', label: 'All' },
                      { id: 'Strength & Power', label: 'Strength' },
                      { id: 'Metabolic Conditioning', label: 'Metabolic' },
                      { id: 'Mobility & Recovery', label: 'Mobility' },
                    ] as const
                  ).map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setTrackFilter(item.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                        trackFilter === item.id
                          ? 'bg-white text-[#181816] shadow-xs font-semibold'
                          : 'text-[#57554E] hover:text-[#181816]'
                      }`}
                    >
                      {item.label}
                    </Pressable>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[#E6E4DD]">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F7F6F2]/60 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#78756C] tabular-nums">
                        <span className="font-semibold text-[#181816]">
                          {session.timeSlot}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{session.durationMin} min</span>
                        <span aria-hidden="true">·</span>
                        <span>{session.track}</span>
                      </div>

                      <div className="text-sm font-bold text-[#181816] font-display">
                        {session.title}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#57554E] tabular-nums">
                        <span>
                          Member: <strong className="text-[#181816] font-semibold">{session.athleteName}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#2C4A3E] font-medium">
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
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                          session.status === 'completed'
                            ? 'bg-[#E6EFEA] text-[#2C4A3E]'
                            : session.status === 'in_progress'
                            ? 'bg-[#2C4A3E] text-white'
                            : 'bg-[#F2F0EA] text-[#181816] hover:bg-[#E6E4DD]'
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
            <div className="lg:col-span-4 bg-white border border-[#E6E4DD] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E6E4DD] flex items-center justify-between">
                <div>
                  <Text
                    accessibilityRole="header"
                    headingLevel={2}
                    className="text-base font-bold text-[#181816] font-display"
                  >
                    Studio Coaches
                  </Text>
                  <p className="text-xs text-[#78756C] mt-0.5">
                    Verified @{ALLOWED_PRIMARY_DOMAIN} team
                  </p>
                </div>
                <Pressable
                  onPress={() => setActiveTab('directory')}
                  className="text-xs font-semibold text-[#2C4A3E] hover:underline whitespace-nowrap"
                >
                  Manage Roster →
                </Pressable>
              </div>

              <div className="divide-y divide-[#E6E4DD]">
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
                            className="w-9 h-9 rounded-full object-cover border border-[#E6E4DD] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#F2F0EA] text-[#181816] font-semibold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#181816] truncate">
                            {member.displayName}
                          </div>
                          <div className="text-xs text-[#78756C] truncate">
                            {member.department}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#57554E] shrink-0">
                        {member.role === 'admin' ? 'Admin' : 'Coach'}
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
          <div
            key="tab-programs"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-studio-tab"
          >
            <div className="lg:col-span-5 bg-white border border-[#E6E4DD] rounded-xl p-6 space-y-4">
              <div className="pb-3 border-b border-[#E6E4DD]">
                <Text
                  accessibilityRole="header"
                  headingLevel={2}
                  className="text-base font-bold text-[#181816] font-display"
                >
                  Schedule Member Session
                </Text>
                <p className="text-xs text-[#78756C] mt-0.5">
                  Add a new training block to the studio floor schedule
                </p>
              </div>

              {sessionFeedback && (
                <div className="animate-studio-alert">
                  <View
                    accessibilityRole="alert"
                    className={`p-3 rounded-lg border text-xs font-medium ${
                      sessionFeedback.type === 'success'
                        ? 'bg-[#E6EFEA] border-[#B8D4C5] text-[#2C4A3E]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                    }`}
                  >
                    {sessionFeedback.message}
                  </View>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Text
                    accessibilityRole="label"
                    htmlFor="session-title-input"
                    className="text-xs font-medium text-[#57554E] block mb-1"
                  >
                    Training Block Title
                  </Text>
                  <TextInput
                    id="session-title-input"
                    value={sessionTitle}
                    onChangeText={setSessionTitle}
                    placeholder="e.g. Posterior Chain & Trap Bar Deadlift"
                    accessibilityLabel="Training Block Title"
                    className="w-full px-3.5 py-2 text-sm border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                  />
                </div>

                <div>
                  <Text
                    accessibilityRole="label"
                    htmlFor="session-athlete-input"
                    className="text-xs font-medium text-[#57554E] block mb-1"
                  >
                    Member Name
                  </Text>
                  <TextInput
                    id="session-athlete-input"
                    value={athleteName}
                    onChangeText={setAthleteName}
                    placeholder="e.g. Pranav Subramanian"
                    accessibilityLabel="Athlete Name"
                    className="w-full px-3.5 py-2 text-sm border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="session-slot-input"
                      className="text-xs font-medium text-[#57554E] block mb-1"
                    >
                      Time Slot
                    </Text>
                    <TextInput
                      id="session-slot-input"
                      value={sessionTimeSlot}
                      onChangeText={setSessionTimeSlot}
                      placeholder="06:30 PM"
                      accessibilityLabel="Session Time Slot"
                      className="w-full px-3 py-2 text-xs tabular-nums border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                    />
                  </div>
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="session-duration-input"
                      className="text-xs font-medium text-[#57554E] block mb-1"
                    >
                      Duration (min)
                    </Text>
                    <TextInput
                      id="session-duration-input"
                      value={sessionDuration}
                      onChangeText={setSessionDuration}
                      placeholder="60"
                      accessibilityLabel="Session Duration Minutes"
                      className="w-full px-3 py-2 text-xs tabular-nums border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                    />
                  </div>
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="session-bpm-input"
                      className="text-xs font-medium text-[#57554E] block mb-1"
                    >
                      Target HR (bpm)
                    </Text>
                    <TextInput
                      id="session-bpm-input"
                      value={sessionBpm}
                      onChangeText={setSessionBpm}
                      placeholder="148"
                      accessibilityLabel="Target Heart Rate BPM"
                      className="w-full px-3 py-2 text-xs tabular-nums border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="session-track-select" className="text-xs font-medium text-[#57554E] block mb-1">
                    Training Discipline
                  </label>
                  <select
                    id="session-track-select"
                    value={sessionTrack}
                    onChange={(e) => setSessionTrack(e.target.value as TrainingTrack)}
                    className="w-full px-3.5 py-2 text-sm border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                  >
                    <option value="Strength & Power">Strength &amp; Power</option>
                    <option value="Metabolic Conditioning">Metabolic Conditioning</option>
                    <option value="Mobility & Recovery">Mobility &amp; Recovery</option>
                  </select>
                </div>

                <Pressable
                  onPress={handleAddSession}
                  accessibilityLabel="Add Session to Schedule"
                  className="w-full py-2.5 px-4 bg-[#181816] hover:bg-[#2E2D2A] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Session to Floor Schedule</span>
                </Pressable>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-[#E6E4DD] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E6E4DD]">
                <Text
                  accessibilityRole="header"
                  headingLevel={2}
                  className="text-base font-bold text-[#181816] font-display tabular-nums"
                >
                  Active Program Blocks ({sessions.length})
                </Text>
              </div>
              <div className="divide-y divide-[#E6E4DD]">
                {sessions.map((s) => (
                  <div key={s.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="text-sm font-bold text-[#181816] font-display">
                        {s.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#78756C] tabular-nums">
                        <span className="inline-flex items-center gap-1 text-[#181816] font-medium">
                          <Dumbbell className="w-3.5 h-3.5 text-[#78756C]" />
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
                    <div className="flex items-center gap-2 shrink-0">
                      <Pressable
                        onPress={() => cycleSessionStatus(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                          s.status === 'completed'
                            ? 'bg-[#E6EFEA] text-[#2C4A3E]'
                            : s.status === 'in_progress'
                            ? 'bg-[#2C4A3E] text-white'
                            : 'bg-[#F2F0EA] hover:bg-[#E6E4DD] text-[#181816]'
                        }`}
                      >
                        {s.status === 'completed'
                          ? 'Completed'
                          : s.status === 'in_progress'
                          ? 'In Progress'
                          : 'Scheduled'}
                      </Pressable>
                      <Pressable
                        onPress={() => deleteTrainingSession(s.id)}
                        accessibilityLabel={`Delete session ${s.title}`}
                        className="p-1.5 rounded-lg text-[#78756C] hover:text-[#B91C1C] hover:bg-[#FEF2F2]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Pressable>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEAM & ACCESS (STRICT RBAC — NO SELF-PROMOTION) */}
        {activeTab === 'directory' && (
          <div
            key="tab-directory"
            className="space-y-6 animate-studio-tab"
          >
            {/* Admin Member Invite Form or Coach Read-Only Notice */}
            <div className="bg-white border border-[#E6E4DD] rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6E4DD]">
                <div>
                  <Text
                    accessibilityRole="header"
                    headingLevel={2}
                    className="text-base font-bold text-[#181816] font-display"
                  >
                    HB+ Studio Staff &amp; Role Permissions
                  </Text>
                  <p className="text-xs text-[#78756C] mt-0.5">
                    Staff accounts require a verified @{ALLOWED_PRIMARY_DOMAIN} Google Workspace email
                  </p>
                </div>
              </div>

              {!canProvision ? (
                <View
                  accessibilityRole="alert"
                  testID="rbac-restricted-notice"
                  className="p-4 rounded-lg bg-[#F7F6F2] border border-[#E6E4DD] text-[#57554E] flex items-center gap-3 text-xs"
                >
                  <Lock className="w-4 h-4 text-[#78756C] shrink-0" />
                  <span>
                    Signed in as <strong className="text-[#181816]">Coach ({currentUser.email})</strong> — Read-only roster access. Only Studio Admins can onboard new @{ALLOWED_PRIMARY_DOMAIN} staff or modify role permissions.
                  </span>
                </View>
              ) : (
                <div className="space-y-4">
                  {provisionFeedback && (
                    <div className="animate-studio-alert">
                      <View
                        accessibilityRole="alert"
                        testID="provision-feedback"
                        className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                          provisionFeedback.type === 'success'
                            ? 'bg-[#E6EFEA] border-[#B8D4C5] text-[#2C4A3E]'
                            : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                        }`}
                      >
                        {provisionFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#2C4A3E] shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                        )}
                        <span className="font-medium">{provisionFeedback.message}</span>
                      </View>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Text
                        accessibilityRole="label"
                        htmlFor="new-member-email"
                        className="text-xs font-medium text-[#57554E]"
                      >
                        Work Email (@{ALLOWED_PRIMARY_DOMAIN})
                      </Text>
                      <TextInput
                        id="new-member-email"
                        value={newEmail}
                        onChangeText={setNewEmail}
                        placeholder="karthik.rao@hbplus.fit"
                        keyboardType="email-address"
                        accessibilityLabel="New Member Official Email"
                        testID="provision-email-input"
                        className="w-full px-3 py-2 text-xs border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Text
                        accessibilityRole="label"
                        htmlFor="new-member-name"
                        className="text-xs font-medium text-[#57554E]"
                      >
                        Full Name
                      </Text>
                      <TextInput
                        id="new-member-name"
                        value={newName}
                        onChangeText={setNewName}
                        placeholder="Karthik Rao"
                        accessibilityLabel="New Member Full Name"
                        testID="provision-name-input"
                        className="w-full px-3 py-2 text-xs border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Text
                        accessibilityRole="label"
                        htmlFor="new-member-dept"
                        className="text-xs font-medium text-[#57554E]"
                      >
                        Discipline &amp; Studio
                      </Text>
                      <TextInput
                        id="new-member-dept"
                        value={newDepartment}
                        onChangeText={setNewDepartment}
                        placeholder="Discipline · Studio"
                        accessibilityLabel="New Member Department"
                        className="w-full px-3 py-2 text-xs border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                      />
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="New Member Role"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as UserRole)}
                          className="px-3 py-2 text-xs border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                        >
                          <option value="user">Role: Coach</option>
                          <option value="admin">Role: Admin</option>
                        </select>

                        <Pressable
                          onPress={handleProvisionSubmit}
                          accessibilityLabel="Add Member"
                          testID="provision-submit-btn"
                          className="flex-1 py-2 px-3 bg-[#181816] hover:bg-[#2E2D2A] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
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
            <div className="bg-white border border-[#E6E4DD] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 text-[#78756C] absolute left-3 top-2.5 pointer-events-none" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search coaching staff..."
                    accessibilityLabel="Search directory members"
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                  />
                </div>

                <div
                  role="group"
                  aria-label="Filter directory by role"
                  className="flex items-center gap-1 p-1 bg-[#F2F0EA] rounded-lg"
                >
                  {(['all', 'admin', 'user'] as const).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRoleFilter(r)}
                      className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                        roleFilter === r
                          ? 'bg-white text-[#181816] shadow-xs font-semibold'
                          : 'text-[#57554E] hover:text-[#181816]'
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
                    <tr className="border-b border-[#E6E4DD] bg-[#F7F6F2] text-[#78756C] font-semibold">
                      <th className="py-3 px-4">Coach / Staff</th>
                      <th className="py-3 px-4">Google Workspace Email</th>
                      <th className="py-3 px-4">Discipline &amp; Studio</th>
                      <th className="py-3 px-4">Role &amp; Status</th>
                      <th className="py-3 px-4 text-right">Permissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E4DD]">
                    {filteredDirectory.map((member) => {
                      const isSelf = member.uid === currentUser.uid;
                      return (
                        <tr key={member.uid} className="hover:bg-[#F7F6F2]/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#181816] whitespace-nowrap">
                            {member.displayName} {isSelf && <span className="text-[#78756C] font-normal">(You)</span>}
                          </td>
                          <td className="py-3 px-4 text-[#57554E] whitespace-nowrap">
                            {member.email}
                          </td>
                          <td className="py-3 px-4 text-[#57554E] whitespace-nowrap">
                            {member.department}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-[#57554E]">
                            <span className="font-semibold text-[#181816]">
                              {member.role === 'admin' ? 'Admin' : 'Coach'}
                            </span>
                            {' · '}
                            <span
                              className={
                                member.status === 'active'
                                  ? 'text-[#2C4A3E] font-medium'
                                  : 'text-[#B91C1C] font-medium'
                              }
                            >
                              {member.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {canManageRoles ? (
                              isSelf ? (
                                <span className="text-[#78756C]">Current Admin Session</span>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <Pressable
                                    onPress={() =>
                                      updateMemberRole(
                                        member.uid,
                                        member.role === 'admin' ? 'user' : 'admin'
                                      )
                                    }
                                    accessibilityLabel={`Change role for ${member.displayName}`}
                                    className="px-2.5 py-1 text-xs font-medium text-[#181816] bg-[#F2F0EA] hover:bg-[#E6E4DD] rounded-md"
                                  >
                                    {member.role === 'admin' ? 'Set Coach' : 'Make Admin'}
                                  </Pressable>
                                  <Pressable
                                    onPress={() => toggleMemberStatus(member.uid)}
                                    accessibilityLabel={`${
                                      member.status === 'active' ? 'Suspend' : 'Activate'
                                    } ${member.displayName}`}
                                    className="px-2.5 py-1 text-xs font-medium text-[#57554E] hover:text-[#181816] border border-[#D5D2C8] rounded-md"
                                  >
                                    {member.status === 'active' ? 'Suspend' : 'Activate'}
                                  </Pressable>
                                </div>
                              )
                            ) : (
                              <span className="text-[#78756C]">Read-only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCESS LOG */}
        {activeTab === 'activity' && (
          <div
            key="tab-activity"
            className="bg-white border border-[#E6E4DD] rounded-xl overflow-hidden animate-studio-tab"
          >
            <div className="p-5 border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-4">
              <div>
                <Text
                  accessibilityRole="header"
                  headingLevel={2}
                  className="text-base font-bold text-[#181816] font-display"
                >
                  Studio Access &amp; Domain Verification Log
                </Text>
                <p className="text-xs text-[#78756C] mt-0.5">
                  Persisted authentication and role permission events
                </p>
              </div>

              <div
                role="group"
                aria-label="Filter activity events"
                className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EA] rounded-lg"
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
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                      auditFilter === item.id
                        ? 'bg-white text-[#181816] shadow-xs font-semibold'
                        : 'text-[#57554E] hover:text-[#181816]'
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
                  <tr className="border-b border-[#E6E4DD] bg-[#F7F6F2] text-[#78756C] font-semibold">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4 text-right">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E4DD]">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F7F6F2]/60">
                      <td className="py-3 px-4 whitespace-nowrap font-semibold">
                        <span
                          className={
                            log.eventType === 'LOGIN_ALLOWED'
                              ? 'text-[#2C4A3E]'
                              : log.eventType === 'LOGIN_RESTRICTED'
                              ? 'text-[#B91C1C]'
                              : 'text-[#181816]'
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
                      <td className="py-3 px-4 text-[#181816] font-medium whitespace-nowrap">
                        {log.email}
                      </td>
                      <td className="py-3 px-4 text-[#78756C] whitespace-nowrap">
                        @{log.domain}
                      </td>
                      <td className="py-3 px-4 text-right text-[#78756C] font-mono whitespace-nowrap">
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
        className="w-full border-t border-[#E6E4DD] bg-white px-6 py-4 text-xs text-[#78756C]"
      >
        <div className="max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-4">
          <span>HB+ Performance Studio · {currentUser.displayName} ({currentUser.email})</span>
          <span className="font-medium text-[#57554E]">hbplus.fit · Bengaluru · Mumbai · New Delhi</span>
        </div>
      </View>
    </SafeAreaView>
  );
};
