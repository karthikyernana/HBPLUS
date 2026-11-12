import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ALLOWED_PRIMARY_DOMAIN,
  RESTRICTED_DOMAIN_ERROR,
  UserProfileRecord,
  AuditLogRecord,
  TrainingSession,
  TrainingTrack,
  SessionStatus,
  UserRole,
  RuntimePlatform,
  TokenClaimsSummary,
  validateDomainAccess,
  evaluateRouteGuard,
  validateUserProfilePayload,
  buildTokenClaimsSummary,
  extractEmailDomain,
} from '../utils/domainAuth';
import {
  signInWithGoogleDomainGate,
  signOutFirebaseSession,
  syncUserProfileToFirestore,
} from '../services/firebase';

const STORAGE_SESSION_KEY = 'hbplus_domaingate_session_v4';
const STORAGE_DIRECTORY_KEY = 'hbplus_domaingate_directory_v4';
const STORAGE_SESSIONS_KEY = 'hbplus_domaingate_sessions_v4';
const STORAGE_AUDIT_KEY = 'hbplus_domaingate_audit_v4';

export const DEFAULT_ARJUN_AVATAR = '/src/assets/images/avatar_arjun_nair_1794490222184.jpg';
export const DEFAULT_ANANYA_AVATAR = '/src/assets/images/avatar_ananya_iyer_1794490222450.jpg';

const INITIAL_DIRECTORY: UserProfileRecord[] = [
  {
    uid: 'usr_hbplus_admin_01',
    email: 'example@hbplus.fit',
    displayName: 'Arjun Nair',
    photoURL: DEFAULT_ARJUN_AVATAR,
    domain: 'hbplus.fit',
    role: 'admin',
    department: 'Head of Strength & Conditioning · Indiranagar',
    platform: 'web',
    status: 'active',
    createdAt: '2026-10-14T09:15:00.000Z',
    updatedAt: '2026-11-11T18:30:00.000Z',
  },
  {
    uid: 'usr_hbplus_member_02',
    email: 'ananya.iyer@hbplus.fit',
    displayName: 'Ananya Iyer',
    photoURL: DEFAULT_ANANYA_AVATAR,
    domain: 'hbplus.fit',
    role: 'user',
    department: 'Mobility & Movement Specialist · Indiranagar',
    platform: 'ios',
    status: 'active',
    createdAt: '2026-10-19T14:20:00.000Z',
    updatedAt: '2026-11-11T16:45:00.000Z',
  },
  {
    uid: 'usr_hbplus_member_03',
    email: 'rohan.deshmukh@hbplus.fit',
    displayName: 'Rohan Deshmukh',
    photoURL: '',
    domain: 'hbplus.fit',
    role: 'user',
    department: 'Metabolic Conditioning · Bandra West',
    platform: 'android',
    status: 'active',
    createdAt: '2026-10-28T11:05:00.000Z',
    updatedAt: '2026-11-10T21:10:00.000Z',
  },
  {
    uid: 'usr_hbplus_admin_04',
    email: 'kavya.menon@hbplus.fit',
    displayName: 'Kavya Menon',
    photoURL: '',
    domain: 'hbplus.fit',
    role: 'admin',
    department: 'Studio Operations Lead · Vasant Vihar',
    platform: 'web',
    status: 'active',
    createdAt: '2026-11-02T08:00:00.000Z',
    updatedAt: '2026-11-11T12:00:00.000Z',
  },
  {
    uid: 'usr_hbplus_member_05',
    email: 'vikram.rao@hbplus.fit',
    displayName: 'Vikramaditya Rao',
    photoURL: '',
    domain: 'hbplus.fit',
    role: 'user',
    department: 'Barbell & Olympic Lifting · Indiranagar',
    platform: 'android',
    status: 'active',
    createdAt: '2026-11-04T07:30:00.000Z',
    updatedAt: '2026-11-11T14:20:00.000Z',
  },
];

const INITIAL_SESSIONS: TrainingSession[] = [
  {
    id: 'ses_01',
    title: 'Compound Lower Body & Barbell Mechanics',
    athleteName: 'Siddharth Kulkarni',
    track: 'Strength & Power',
    timeSlot: '07:30 AM',
    durationMin: 60,
    readinessScore: 94,
    targetBpm: 146,
    status: 'in_progress',
  },
  {
    id: 'ses_02',
    title: 'Thoracic & Hip Capsule Mobility Flow',
    athleteName: 'Meera Krishnan',
    track: 'Mobility & Recovery',
    timeSlot: '09:00 AM',
    durationMin: 45,
    readinessScore: 89,
    targetBpm: 114,
    status: 'scheduled',
  },
  {
    id: 'ses_03',
    title: 'Aerobic Capacity & Rowing Intervals',
    athleteName: 'Aditya Verma',
    track: 'Metabolic Conditioning',
    timeSlot: '11:00 AM',
    durationMin: 60,
    readinessScore: 86,
    targetBpm: 168,
    status: 'scheduled',
  },
  {
    id: 'ses_04',
    title: 'Overhead Stability & Kettlebell Complexes',
    athleteName: 'Nandini Chatterjee',
    track: 'Strength & Power',
    timeSlot: '05:30 PM',
    durationMin: 75,
    readinessScore: 95,
    targetBpm: 152,
    status: 'completed',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'log_init_01',
    uid: 'usr_hbplus_admin_01',
    email: 'example@hbplus.fit',
    domain: 'hbplus.fit',
    eventType: 'LOGIN_ALLOWED',
    platform: 'web',
    createdAt: '2026-11-11T22:14:10.000Z',
  },
  {
    id: 'log_init_02',
    uid: 'usr_unverified_ext',
    email: 'example@gmail.com',
    domain: 'gmail.com',
    eventType: 'LOGIN_RESTRICTED',
    platform: 'android',
    createdAt: '2026-11-11T22:41:05.000Z',
  },
  {
    id: 'log_init_03',
    uid: 'usr_hbplus_member_02',
    email: 'ananya.iyer@hbplus.fit',
    domain: 'hbplus.fit',
    eventType: 'LOGIN_ALLOWED',
    platform: 'ios',
    createdAt: '2026-11-11T23:05:44.000Z',
  },
];

export interface AuthContextValue {
  currentUser: UserProfileRecord | null;
  tokenClaims: TokenClaimsSummary | null;
  isAuthenticating: boolean;
  authError: string | null;
  rejectedEmailAttempt: string | null;
  routeInterceptionMessage: string | null;
  currentPath: '/login' | '/dashboard';
  allowedDomains: string[];
  directory: UserProfileRecord[];
  sessions: TrainingSession[];
  auditLogs: AuditLogRecord[];
  clearMessages: () => void;
  navigate: (path: '/login' | '/dashboard') => void;
  loginWithGooglePopup: (bridgedHbplusEmail?: string | null) => Promise<void>;
  authenticateWithEmailHandshake: (params: {
    email: string;
    displayName?: string;
    photoURL?: string;
    role?: UserRole;
    department?: string;
    platform?: RuntimePlatform;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateCurrentUserProfile: (updates: { displayName: string; department: string }) => void;
  addTrainingSession: (params: {
    title: string;
    athleteName: string;
    track: TrainingTrack;
    timeSlot: string;
    durationMin: number;
    targetBpm: number;
  }) => { ok: boolean; error?: string };
  cycleSessionStatus: (id: string) => void;
  deleteTrainingSession: (id: string) => void;
  updateMemberRole: (uid: string, newRole: UserRole) => { ok: boolean; error?: string };
  toggleMemberStatus: (uid: string) => { ok: boolean; error?: string };
  provisionMember: (params: {
    email: string;
    displayName: string;
    role: UserRole;
    department: string;
    platform: RuntimePlatform;
  }) => { ok: boolean; error?: string };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [directory, setDirectory] = useState<UserProfileRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DIRECTORY_KEY);
      return saved ? JSON.parse(saved) : INITIAL_DIRECTORY;
    } catch {
      return INITIAL_DIRECTORY;
    }
  });

  const [sessions, setSessions] = useState<TrainingSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
    } catch {
      return INITIAL_SESSIONS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUDIT_KEY);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!saved) return null;
      const parsed: UserProfileRecord = JSON.parse(saved);
      const check = validateDomainAccess(parsed.email, [ALLOWED_PRIMARY_DOMAIN]);
      return check.allowed ? parsed : null;
    } catch {
      return null;
    }
  });

  const [tokenIssuedAt, setTokenIssuedAt] = useState<number>(() => Date.now());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [rejectedEmailAttempt, setRejectedEmailAttempt] = useState<string | null>(null);
  const [routeInterceptionMessage, setRouteInterceptionMessage] = useState<string | null>(null);
  const allowedDomains = [ALLOWED_PRIMARY_DOMAIN];

  const [currentPath, setCurrentPath] = useState<'/login' | '/dashboard'>(() => {
    const rawPath = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const requestedDashboard =
      rawPath.startsWith('/dashboard') || params.get('route') === 'dashboard';

    if (requestedDashboard) {
      const decision = evaluateRouteGuard(
        '/dashboard',
        Boolean(currentUser),
        currentUser?.email || null,
        [ALLOWED_PRIMARY_DOMAIN]
      );
      if (decision.allowed) {
        return '/dashboard';
      }
      return '/login';
    }
    return currentUser ? '/dashboard' : '/login';
  });

  // Hydrate persistent state from Express backend (/api/state) on boot
  useEffect(() => {
    let active = true;
    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (Array.isArray(data.directory) && data.directory.length > 0) {
          setDirectory(data.directory);
          setCurrentUser((prev) => {
            if (!prev) return null;
            const latest = (data.directory as UserProfileRecord[]).find(
              (m) => m.uid === prev.uid || m.email.toLowerCase() === prev.email.toLowerCase()
            );
            return latest && latest.status === 'active' ? latest : prev;
          });
        }
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        }
        if (Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
      })
      .catch(() => {
        // Fallback to localStorage if offline
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const rawPath = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if ((rawPath.startsWith('/dashboard') || params.get('route') === 'dashboard') && !currentUser) {
      setRouteInterceptionMessage(
        'Please sign in with your @hbplus.fit Google account to access the dashboard.'
      );
      window.history.replaceState({}, '', '/login');
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DIRECTORY_KEY, JSON.stringify(directory));
    } catch {
      // ignore storage errors
    }
  }, [directory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      // ignore storage errors
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(auditLogs));
    } catch {
      // ignore storage errors
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [currentUser]);

  const appendAuditLog = useCallback(
    (entry: Omit<AuditLogRecord, 'id' | 'createdAt'>) => {
      const newRecord: AuditLogRecord = {
        ...entry,
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      setAuditLogs((prev) => [newRecord, ...prev]);
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.auditLogs) setAuditLogs(data.auditLogs);
        })
        .catch(() => {});
    },
    []
  );

  const clearMessages = useCallback(() => {
    setAuthError(null);
    setRejectedEmailAttempt(null);
    setRouteInterceptionMessage(null);
  }, []);

  const navigate = useCallback(
    (targetPath: '/login' | '/dashboard') => {
      const decision = evaluateRouteGuard(
        targetPath,
        Boolean(currentUser),
        currentUser?.email || null,
        allowedDomains
      );

      if (!decision.allowed) {
        setRouteInterceptionMessage(decision.interceptionReason);
        setCurrentPath('/login');
        window.history.pushState({}, '', '/login');
        return;
      }

      const finalPath = decision.redirectTo || targetPath;
      setRouteInterceptionMessage(null);
      setCurrentPath(finalPath);
      window.history.pushState({}, '', finalPath);
    },
    [currentUser, allowedDomains]
  );

  const authenticateWithEmailHandshake = useCallback(
    async (params: {
      email: string;
      displayName?: string;
      photoURL?: string;
      role?: UserRole;
      department?: string;
      platform?: RuntimePlatform;
    }): Promise<boolean> => {
      setIsAuthenticating(true);
      setAuthError(null);
      setRejectedEmailAttempt(null);
      setRouteInterceptionMessage(null);

      const normalizedEmail = params.email.trim().toLowerCase();
      const platform = params.platform || 'web';

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            displayName: params.displayName,
            photoURL: params.photoURL,
            department: params.department,
            platform,
          }),
        });
        const data = await response.json();
        if (Array.isArray(data.directory)) setDirectory(data.directory);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);

        if (!response.ok || !data.allowed || !data.profile) {
          setIsAuthenticating(false);
          setAuthError(data.errorMessage || RESTRICTED_DOMAIN_ERROR);
          setRejectedEmailAttempt(normalizedEmail || 'empty');
          return false;
        }

        setCurrentUser(data.profile);
        setTokenIssuedAt(Date.now());
        setIsAuthenticating(false);
        setCurrentPath('/dashboard');
        window.history.pushState({}, '', '/dashboard');
        return true;
      } catch {
        // Fallback deterministic client verification if backend unreachable
        const domainResult = validateDomainAccess(normalizedEmail, allowedDomains, false);
        if (!domainResult.allowed || !domainResult.extractedDomain) {
          setIsAuthenticating(false);
          setAuthError(domainResult.errorMessage || RESTRICTED_DOMAIN_ERROR);
          setRejectedEmailAttempt(normalizedEmail || 'empty');
          appendAuditLog({
            uid: 'usr_restricted_attempt',
            email: normalizedEmail || 'invalid-email',
            domain: domainResult.extractedDomain || 'invalid',
            eventType: 'LOGIN_RESTRICTED',
            platform,
          });
          return false;
        }

        const existingMember = directory.find(
          (m) => m.email.toLowerCase() === normalizedEmail
        );
        const nowIso = new Date().toISOString();
        const derivedName =
          params.displayName ||
          existingMember?.displayName ||
          normalizedEmail
            .split('@')[0]
            .split(/[._-]/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

        const defaultAvatar =
          normalizedEmail === 'ananya.iyer@hbplus.fit'
            ? DEFAULT_ANANYA_AVATAR
            : normalizedEmail === 'example@hbplus.fit'
            ? DEFAULT_ARJUN_AVATAR
            : '';

        const resolvedRole: UserRole = existingMember
          ? existingMember.role
          : normalizedEmail === 'example@hbplus.fit'
          ? 'admin'
          : 'user';

        const resolvedProfile: UserProfileRecord = existingMember
          ? {
              ...existingMember,
              displayName: params.displayName || existingMember.displayName,
              photoURL: params.photoURL || existingMember.photoURL || defaultAvatar,
              role: resolvedRole,
              platform,
              updatedAt: nowIso,
            }
          : {
              uid: `usr_hbplus_${Date.now().toString(36)}`,
              email: normalizedEmail,
              displayName: derivedName,
              photoURL: params.photoURL || defaultAvatar,
              domain: domainResult.extractedDomain,
              role: resolvedRole,
              department: params.department || 'Strength & Conditioning · Indiranagar',
              platform,
              status: 'active',
              createdAt: nowIso,
              updatedAt: nowIso,
            };

        setDirectory((prev) => {
          const exists = prev.some((u) => u.email.toLowerCase() === normalizedEmail);
          return exists
            ? prev.map((u) =>
                u.email.toLowerCase() === normalizedEmail ? resolvedProfile : u
              )
            : [resolvedProfile, ...prev];
        });

        setCurrentUser(resolvedProfile);
        setTokenIssuedAt(Date.now());
        setIsAuthenticating(false);
        setCurrentPath('/dashboard');
        window.history.pushState({}, '', '/dashboard');
        return true;
      }
    },
    [allowedDomains, appendAuditLog, directory]
  );

  const loginWithGooglePopup = useCallback(
    async (bridgedHbplusEmail: string | null = 'example@hbplus.fit') => {
      setIsAuthenticating(true);
      setAuthError(null);
      setRejectedEmailAttempt(null);
      setRouteInterceptionMessage(null);

      try {
        const profile = await signInWithGoogleDomainGate(
          allowedDomains,
          'web',
          bridgedHbplusEmail
        );
        // Sync verified Google profile to backend database
        await authenticateWithEmailHandshake({
          email: profile.email,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          role: profile.role,
          department: profile.department,
          platform: 'web',
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes(RESTRICTED_DOMAIN_ERROR)) {
          setAuthError(RESTRICTED_DOMAIN_ERROR);
          setRejectedEmailAttempt('example@gmail.com');
        } else if (
          msg.includes('auth/popup-blocked') ||
          msg.includes('auth/popup-closed-by-user') ||
          msg.includes('auth/cancelled-popup-request') ||
          msg.includes('auth/unauthorized-domain') ||
          msg.includes('auth/operation-not-supported-in-this-environment')
        ) {
          // If popup is blocked in iframe preview, complete handshake with the selected mailbox mode
          const targetEmail = bridgedHbplusEmail || 'example@gmail.com';
          await authenticateWithEmailHandshake({
            email: targetEmail,
            displayName:
              targetEmail === 'ananya.iyer@hbplus.fit'
                ? 'Ananya Iyer'
                : targetEmail === 'example@hbplus.fit'
                ? 'Arjun Nair'
                : undefined,
            photoURL:
              targetEmail === 'ananya.iyer@hbplus.fit'
                ? DEFAULT_ANANYA_AVATAR
                : targetEmail === 'example@hbplus.fit'
                ? DEFAULT_ARJUN_AVATAR
                : undefined,
            platform: 'web',
          });
          return;
        } else {
          setAuthError(msg);
        }
      } finally {
        setIsAuthenticating(false);
      }
    },
    [allowedDomains, authenticateWithEmailHandshake]
  );

  const logout = useCallback(async () => {
    const departingUser = currentUser;
    setIsAuthenticating(true);
    try {
      await signOutFirebaseSession();
    } catch {
      // ignore firebase signout error if using local handshake
    }
    if (departingUser) {
      appendAuditLog({
        uid: departingUser.uid,
        email: departingUser.email,
        domain: departingUser.domain,
        eventType: 'LOGOUT',
        platform: 'web',
      });
    }
    setCurrentUser(null);
    setAuthError(null);
    setRejectedEmailAttempt(null);
    setRouteInterceptionMessage(null);
    setIsAuthenticating(false);
    setCurrentPath('/login');
    window.history.pushState({}, '', '/login');
  }, [appendAuditLog, currentUser]);

  const updateCurrentUserProfile = useCallback(
    (updates: { displayName: string; department: string }) => {
      if (!currentUser) return;
      const updated: UserProfileRecord = {
        ...currentUser,
        displayName: updates.displayName.slice(0, 100),
        department: updates.department.slice(0, 80),
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(updated);
      setDirectory((prev) =>
        prev.map((m) => (m.uid === updated.uid ? updated : m))
      );

      // Persist to backend database
      fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: updated.uid,
          displayName: updated.displayName,
          department: updated.department,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.profile) setCurrentUser(data.profile);
          if (Array.isArray(data?.directory)) setDirectory(data.directory);
        })
        .catch(() => {});

      // Persist to Firebase Firestore if real Firebase session is active
      syncUserProfileToFirestore(updated, true).catch(() => {});
    },
    [currentUser]
  );

  const addTrainingSession = useCallback(
    (params: {
      title: string;
      athleteName: string;
      track: TrainingTrack;
      timeSlot: string;
      durationMin: number;
      targetBpm: number;
    }): { ok: boolean; error?: string } => {
      const cleanTitle = params.title.trim();
      const cleanAthlete = params.athleteName.trim();
      if (!cleanTitle || !cleanAthlete) {
        return {
          ok: false,
          error: 'Please enter both a training block title and member name.',
        };
      }
      if (isNaN(params.durationMin) || params.durationMin < 15 || params.durationMin > 180) {
        return {
          ok: false,
          error: 'Duration must be between 15 and 180 minutes.',
        };
      }

      const optimistic: TrainingSession = {
        id: `ses_${Date.now()}`,
        title: cleanTitle,
        athleteName: cleanAthlete,
        track: params.track,
        timeSlot: params.timeSlot.trim() || '04:30 PM',
        durationMin: params.durationMin,
        readinessScore: 92,
        targetBpm: isNaN(params.targetBpm) ? 150 : params.targetBpm,
        status: 'scheduled',
      };

      setSessions((prev) => [optimistic, ...prev]);

      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimistic),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data?.sessions)) {
            setSessions(data.sessions);
          }
        })
        .catch(() => {});

      return { ok: true };
    },
    []
  );

  const cycleSessionStatus = useCallback((id: string) => {
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

    fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.sessions)) {
          setSessions(data.sessions);
        }
      })
      .catch(() => {});
  }, []);

  const deleteTrainingSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.sessions)) {
          setSessions(data.sessions);
        }
      })
      .catch(() => {});
  }, []);

  const updateMemberRole = useCallback(
    (uid: string, newRole: UserRole): { ok: boolean; error?: string } => {
      if (!currentUser || currentUser.role !== 'admin') {
        return { ok: false, error: 'Only Studio Admins can modify staff roles.' };
      }
      if (currentUser.uid === uid) {
        return { ok: false, error: 'You cannot modify your own active admin role.' };
      }
      const target = directory.find((m) => m.uid === uid);
      if (!target) {
        return { ok: false, error: 'Staff member not found.' };
      }
      const nowIso = new Date().toISOString();
      setDirectory((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, role: newRole, updatedAt: nowIso } : m))
      );

      fetch(`/api/directory/${encodeURIComponent(uid)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorUid: currentUser.uid, newRole }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data?.directory)) setDirectory(data.directory);
          if (Array.isArray(data?.auditLogs)) setAuditLogs(data.auditLogs);
        })
        .catch(() => {});

      return { ok: true };
    },
    [currentUser, directory]
  );

  const toggleMemberStatus = useCallback(
    (uid: string): { ok: boolean; error?: string } => {
      if (!currentUser || currentUser.role !== 'admin') {
        return { ok: false, error: 'Only Studio Admins can change staff status.' };
      }
      if (currentUser.uid === uid) {
        return { ok: false, error: 'You cannot suspend your own active admin session.' };
      }
      const target = directory.find((m) => m.uid === uid);
      if (!target) {
        return { ok: false, error: 'Staff member not found.' };
      }
      const nextStatus = target.status === 'active' ? 'suspended' : 'active';
      const nowIso = new Date().toISOString();
      setDirectory((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, status: nextStatus, updatedAt: nowIso } : m))
      );

      fetch(`/api/directory/${encodeURIComponent(uid)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorUid: currentUser.uid }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data?.directory)) setDirectory(data.directory);
        })
        .catch(() => {});

      return { ok: true };
    },
    [currentUser, directory]
  );

  const provisionMember = useCallback(
    (params: {
      email: string;
      displayName: string;
      role: UserRole;
      department: string;
      platform: RuntimePlatform;
    }): { ok: boolean; error?: string } => {
      if (!currentUser || currentUser.role !== 'admin') {
        return { ok: false, error: 'Only Studio Admins can invite @hbplus.fit staff.' };
      }
      const normalizedEmail = params.email.trim().toLowerCase();
      const domainCheck = validateDomainAccess(normalizedEmail, allowedDomains, false);
      if (!domainCheck.allowed || !domainCheck.extractedDomain) {
        return { ok: false, error: domainCheck.errorMessage || RESTRICTED_DOMAIN_ERROR };
      }
      if (directory.some((m) => m.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, error: 'A staff member with this @hbplus.fit email already exists.' };
      }

      const nowIso = new Date().toISOString();
      const newMember: UserProfileRecord = {
        uid: `usr_hbplus_${Date.now().toString(36)}`,
        email: normalizedEmail,
        displayName: params.displayName.trim(),
        photoURL: '',
        domain: extractEmailDomain(normalizedEmail) || ALLOWED_PRIMARY_DOMAIN,
        role: params.role,
        department: params.department.trim(),
        platform: params.platform,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const schemaCheck = validateUserProfilePayload(newMember, false);
      if (!schemaCheck.valid) {
        return { ok: false, error: schemaCheck.errors[0] };
      }

      setDirectory((prev) => [newMember, ...prev]);

      fetch('/api/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUid: currentUser.uid,
          email: normalizedEmail,
          displayName: params.displayName.trim(),
          role: params.role,
          department: params.department.trim(),
          platform: params.platform,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data?.directory)) setDirectory(data.directory);
          if (Array.isArray(data?.auditLogs)) setAuditLogs(data.auditLogs);
        })
        .catch(() => {});

      return { ok: true };
    },
    [allowedDomains, currentUser, directory]
  );

  const tokenClaims = currentUser
    ? buildTokenClaimsSummary(currentUser.email, currentUser.role, currentUser.uid, tokenIssuedAt)
    : null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        tokenClaims,
        isAuthenticating,
        authError,
        rejectedEmailAttempt,
        routeInterceptionMessage,
        currentPath,
        allowedDomains,
        directory,
        sessions,
        auditLogs,
        clearMessages,
        navigate,
        loginWithGooglePopup,
        authenticateWithEmailHandshake,
        logout,
        updateCurrentUserProfile,
        addTrainingSession,
        cycleSessionStatus,
        deleteTrainingSession,
        updateMemberRole,
        toggleMemberStatus,
        provisionMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
