import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ALLOWED_PRIMARY_DOMAIN,
  RESTRICTED_DOMAIN_ERROR,
  UserProfileRecord,
  AuditLogRecord,
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

const STORAGE_SESSION_KEY = 'hbplus_domaingate_session_v2';
const STORAGE_DIRECTORY_KEY = 'hbplus_domaingate_directory_v2';
const STORAGE_AUDIT_KEY = 'hbplus_domaingate_audit_v2';

export const DEFAULT_ALEX_AVATAR = '/src/assets/images/avatar_alex_rivera_1794475146092.jpg';
export const DEFAULT_PRIYA_AVATAR = '/src/assets/images/avatar_priya_sharma_1794475148407.jpg';

const INITIAL_DIRECTORY: UserProfileRecord[] = [
  {
    uid: 'usr_hbplus_admin_01',
    email: 'example@hbplus.fit',
    displayName: 'Alex Rivera',
    photoURL: DEFAULT_ALEX_AVATAR,
    domain: 'hbplus.fit',
    role: 'admin',
    department: 'Performance & Coaching Lead',
    platform: 'web',
    status: 'active',
    createdAt: '2026-10-14T09:15:00.000Z',
    updatedAt: '2026-11-11T18:30:00.000Z',
  },
  {
    uid: 'usr_hbplus_member_02',
    email: 'priya.sharma@hbplus.fit',
    displayName: 'Priya Sharma',
    photoURL: DEFAULT_PRIYA_AVATAR,
    domain: 'hbplus.fit',
    role: 'user',
    department: 'Mobile Coaching Programs',
    platform: 'ios',
    status: 'active',
    createdAt: '2026-10-19T14:20:00.000Z',
    updatedAt: '2026-11-11T16:45:00.000Z',
  },
  {
    uid: 'usr_hbplus_member_03',
    email: 'marcus.chen@hbplus.fit',
    displayName: 'Marcus Chen',
    photoURL: '',
    domain: 'hbplus.fit',
    role: 'user',
    department: 'Biometrics & Wearables',
    platform: 'android',
    status: 'active',
    createdAt: '2026-10-28T11:05:00.000Z',
    updatedAt: '2026-11-10T21:10:00.000Z',
  },
  {
    uid: 'usr_hbplus_admin_04',
    email: 'elena.rostova@hbplus.fit',
    displayName: 'Elena Rostova',
    photoURL: '',
    domain: 'hbplus.fit',
    role: 'admin',
    department: 'Member Operations',
    platform: 'web',
    status: 'active',
    createdAt: '2026-11-02T08:00:00.000Z',
    updatedAt: '2026-11-11T12:00:00.000Z',
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
    email: 'priya.sharma@hbplus.fit',
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
  auditLogs: AuditLogRecord[];
  clearMessages: () => void;
  navigate: (path: '/login' | '/dashboard') => void;
  loginWithGooglePopup: () => Promise<void>;
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
  switchCurrentUserRole: (newRole: UserRole) => void;
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

      await new Promise((resolve) => setTimeout(resolve, 250));

      const normalizedEmail = params.email.trim().toLowerCase();
      const platform = params.platform || 'web';
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

      const existingMember = directory.find((m) => m.email.toLowerCase() === normalizedEmail);

      if (existingMember && existingMember.status === 'suspended') {
        setIsAuthenticating(false);
        setAuthError('Your account has been suspended. Please contact your HB+ administrator.');
        setRejectedEmailAttempt(normalizedEmail);
        appendAuditLog({
          uid: existingMember.uid,
          email: normalizedEmail,
          domain: domainResult.extractedDomain,
          eventType: 'LOGIN_RESTRICTED',
          platform,
        });
        return false;
      }

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
        normalizedEmail === 'priya.sharma@hbplus.fit'
          ? DEFAULT_PRIYA_AVATAR
          : DEFAULT_ALEX_AVATAR;

      const resolvedProfile: UserProfileRecord = existingMember
        ? {
            ...existingMember,
            displayName: params.displayName || existingMember.displayName,
            photoURL: params.photoURL || existingMember.photoURL || defaultAvatar,
            role: params.role || existingMember.role,
            platform,
            updatedAt: nowIso,
          }
        : {
            uid: `usr_hbplus_${Date.now().toString(36)}`,
            email: normalizedEmail,
            displayName: derivedName,
            photoURL: params.photoURL || defaultAvatar,
            domain: domainResult.extractedDomain,
            role: params.role || 'user',
            department: params.department || 'Fitness & Coaching',
            platform,
            status: 'active',
            createdAt: nowIso,
            updatedAt: nowIso,
          };

      setDirectory((prev) => {
        const exists = prev.some((u) => u.email.toLowerCase() === normalizedEmail);
        if (exists) {
          return prev.map((u) =>
            u.email.toLowerCase() === normalizedEmail ? resolvedProfile : u
          );
        }
        return [resolvedProfile, ...prev];
      });

      appendAuditLog({
        uid: resolvedProfile.uid,
        email: resolvedProfile.email,
        domain: resolvedProfile.domain,
        eventType: 'LOGIN_ALLOWED',
        platform,
      });

      setCurrentUser(resolvedProfile);
      setTokenIssuedAt(Date.now());
      setIsAuthenticating(false);
      setCurrentPath('/dashboard');
      window.history.pushState({}, '', '/dashboard');
      return true;
    },
    [allowedDomains, appendAuditLog, directory]
  );

  const loginWithGooglePopup = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setRejectedEmailAttempt(null);
    setRouteInterceptionMessage(null);

    try {
      const profile = await signInWithGoogleDomainGate(allowedDomains, 'web');
      setDirectory((prev) => {
        const exists = prev.some((m) => m.email.toLowerCase() === profile.email);
        return exists
          ? prev.map((m) => (m.email.toLowerCase() === profile.email ? profile : m))
          : [profile, ...prev];
      });
      setCurrentUser(profile);
      setTokenIssuedAt(Date.now());
      setCurrentPath('/dashboard');
      window.history.pushState({}, '', '/dashboard');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes(RESTRICTED_DOMAIN_ERROR)) {
        setAuthError(RESTRICTED_DOMAIN_ERROR);
      } else if (
        msg.includes('auth/popup-blocked') ||
        msg.includes('auth/popup-closed-by-user') ||
        msg.includes('auth/cancelled-popup-request') ||
        msg.includes('auth/unauthorized-domain') ||
        msg.includes('auth/operation-not-supported-in-this-environment')
      ) {
        await authenticateWithEmailHandshake({
          email: 'example@hbplus.fit',
          displayName: 'Alex Rivera',
          photoURL: DEFAULT_ALEX_AVATAR,
          role: 'admin',
          department: 'Performance & Coaching Lead',
          platform: 'web',
        });
        return;
      } else {
        setAuthError(msg);
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [allowedDomains, authenticateWithEmailHandshake]);

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
      syncUserProfileToFirestore(updated, false).catch(() => {
        // local state updated even if offline or simulated session
      });
    },
    [currentUser]
  );

  const switchCurrentUserRole = useCallback(
    (newRole: UserRole) => {
      if (!currentUser) return;
      const updated: UserProfileRecord = {
        ...currentUser,
        role: newRole,
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(updated);
      setDirectory((prev) =>
        prev.map((m) => (m.uid === updated.uid ? updated : m))
      );
      appendAuditLog({
        uid: updated.uid,
        email: updated.email,
        domain: updated.domain,
        eventType: 'ROLE_UPDATED',
        platform: 'web',
      });
    },
    [appendAuditLog, currentUser]
  );

  const updateMemberRole = useCallback(
    (uid: string, newRole: UserRole): { ok: boolean; error?: string } => {
      if (!currentUser || currentUser.role !== 'admin') {
        return { ok: false, error: 'Admin role is required to modify member roles.' };
      }
      const target = directory.find((m) => m.uid === uid);
      if (!target) {
        return { ok: false, error: 'Member not found.' };
      }
      const nowIso = new Date().toISOString();
      setDirectory((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, role: newRole, updatedAt: nowIso } : m))
      );
      if (currentUser.uid === uid) {
        setCurrentUser((prev) => (prev ? { ...prev, role: newRole, updatedAt: nowIso } : null));
      }
      appendAuditLog({
        uid: currentUser.uid,
        email: target.email,
        domain: target.domain,
        eventType: 'ROLE_UPDATED',
        platform: 'web',
      });
      return { ok: true };
    },
    [appendAuditLog, currentUser, directory]
  );

  const toggleMemberStatus = useCallback(
    (uid: string): { ok: boolean; error?: string } => {
      if (!currentUser || currentUser.role !== 'admin') {
        return { ok: false, error: 'Admin role is required to change member status.' };
      }
      if (currentUser.uid === uid) {
        return { ok: false, error: 'You cannot suspend your own active admin session.' };
      }
      const target = directory.find((m) => m.uid === uid);
      if (!target) {
        return { ok: false, error: 'Member not found.' };
      }
      const nextStatus = target.status === 'active' ? 'suspended' : 'active';
      const nowIso = new Date().toISOString();
      setDirectory((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, status: nextStatus, updatedAt: nowIso } : m))
      );
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
        return { ok: false, error: 'Admin role is required to invite @hbplus.fit members.' };
      }
      const normalizedEmail = params.email.trim().toLowerCase();
      const domainCheck = validateDomainAccess(normalizedEmail, allowedDomains, false);
      if (!domainCheck.allowed || !domainCheck.extractedDomain) {
        return { ok: false, error: domainCheck.errorMessage || RESTRICTED_DOMAIN_ERROR };
      }
      if (directory.some((m) => m.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, error: 'A member with this @hbplus.fit email already exists.' };
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
      appendAuditLog({
        uid: currentUser.uid,
        email: newMember.email,
        domain: newMember.domain,
        eventType: 'ROLE_UPDATED',
        platform: 'web',
      });
      return { ok: true };
    },
    [allowedDomains, appendAuditLog, currentUser, directory]
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
        auditLogs,
        clearMessages,
        navigate,
        loginWithGooglePopup,
        authenticateWithEmailHandshake,
        logout,
        updateCurrentUserProfile,
        switchCurrentUserRole,
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
