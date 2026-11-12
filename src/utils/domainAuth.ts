/**
 * Pure domain verification, RBAC permission resolution, route guard,
 * and schema validation utilities synchronized with firebase-blueprint.json.
 */

export const ALLOWED_PRIMARY_DOMAIN = 'hbplus.fit';
export const BOOTSTRAPPED_ADMIN_EMAIL = 'karthikyernana@gmail.com';
export const RESTRICTED_DOMAIN_ERROR =
  'Access restricted. Please login using your official domain email.';

export type UserRole = 'admin' | 'user';
export type RuntimePlatform = 'web' | 'ios' | 'android';
export type AccountStatus = 'active' | 'suspended';
export type AuditEventType = 'LOGIN_ALLOWED' | 'LOGIN_RESTRICTED' | 'LOGOUT' | 'ROLE_UPDATED';

export type PermissionKey =
  | 'view_dashboard'
  | 'view_directory'
  | 'view_audit_logs'
  | 'manage_roles'
  | 'provision_member'
  | 'suspend_member'
  | 'configure_domain_policy';

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  domain: string;
  role: UserRole;
  department: string;
  platform: RuntimePlatform;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  uid: string;
  email: string;
  domain: string;
  eventType: AuditEventType;
  platform: RuntimePlatform;
  createdAt: string;
}

export interface DomainValidationResult {
  allowed: boolean;
  normalizedEmail: string;
  extractedDomain: string | null;
  errorMessage: string | null;
  reason: 'OFFICIAL_DOMAIN_MATCH' | 'BOOTSTRAPPED_ADMIN_OVERRIDE' | 'INVALID_EMAIL_FORMAT' | 'UNAUTHORIZED_DOMAIN';
}

export interface RouteGuardDecision {
  allowed: boolean;
  redirectTo: '/login' | '/dashboard' | null;
  interceptionReason: string | null;
}

export interface TokenClaimsSummary {
  iss: string;
  sub: string;
  email: string;
  email_verified: boolean;
  hd: string;
  role: UserRole;
  iat: number;
  exp: number;
  maskedToken: string;
}

// Verbatim constants from firebase-blueprint.json
export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
export const HBPLUS_EMAIL_REGEX = /^[^@\s]+@hbplus\.fit$/;
export const MAX_UID_LENGTH = 128;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_PHOTO_URL_LENGTH = 500;
export const MAX_DEPARTMENT_LENGTH = 80;

/**
 * Extracts and normalizes the domain portion of an email address.
 * Returns null if the email is empty, contains spaces, or does not have exactly one '@'.
 */
export function extractEmailDomain(rawEmail: string): string | null {
  if (typeof rawEmail !== 'string') return null;
  const trimmed = rawEmail.trim().toLowerCase();
  if (!trimmed || trimmed.length < 5 || trimmed.length > MAX_EMAIL_LENGTH) return null;
  if (/\s/.test(trimmed)) return null;

  const parts = trimmed.split('@');
  if (parts.length !== 2) return null;

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart || !domainPart.includes('.')) return null;
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) return null;

  return domainPart;
}

/**
 * Validates whether an email belongs to the allowed official domain (@hbplus.fit).
 * Enforces the exact error message required by the specification when rejected.
 */
export function validateDomainAccess(
  rawEmail: string,
  allowedDomains: string[] = [ALLOWED_PRIMARY_DOMAIN],
  allowBootstrappedAdmin = false
): DomainValidationResult {
  const normalizedEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const extractedDomain = extractEmailDomain(normalizedEmail);

  if (!extractedDomain) {
    return {
      allowed: false,
      normalizedEmail,
      extractedDomain: null,
      errorMessage: 'Please enter a valid email address (e.g., name@hbplus.fit).',
      reason: 'INVALID_EMAIL_FORMAT',
    };
  }

  const normalizedAllowed = allowedDomains.map((d) => d.trim().toLowerCase().replace(/^@/, ''));

  if (normalizedAllowed.includes(extractedDomain)) {
    return {
      allowed: true,
      normalizedEmail,
      extractedDomain,
      errorMessage: null,
      reason: 'OFFICIAL_DOMAIN_MATCH',
    };
  }

  if (allowBootstrappedAdmin && normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL) {
    return {
      allowed: true,
      normalizedEmail,
      extractedDomain,
      errorMessage: null,
      reason: 'BOOTSTRAPPED_ADMIN_OVERRIDE',
    };
  }

  return {
    allowed: false,
    normalizedEmail,
    extractedDomain,
    errorMessage: RESTRICTED_DOMAIN_ERROR,
    reason: 'UNAUTHORIZED_DOMAIN',
  };
}

/**
 * Evaluates Role-Based Access Control (RBAC) permissions for Admin vs User roles.
 */
export function hasRolePermission(role: UserRole, permission: PermissionKey): boolean {
  const userPermissions: PermissionKey[] = [
    'view_dashboard',
    'view_directory',
    'view_audit_logs',
  ];

  const adminPermissions: PermissionKey[] = [
    ...userPermissions,
    'manage_roles',
    'provision_member',
    'suspend_member',
    'configure_domain_policy',
  ];

  if (role === 'admin') {
    return adminPermissions.includes(permission);
  }
  return userPermissions.includes(permission);
}

/**
 * Enforces route protection so unauthenticated or unauthorized users cannot access /dashboard.
 */
export function evaluateRouteGuard(
  requestedPath: string,
  isAuthenticated: boolean,
  userEmail: string | null,
  allowedDomains: string[] = [ALLOWED_PRIMARY_DOMAIN],
  allowBootstrappedAdmin = false
): RouteGuardDecision {
  const normalizedPath = requestedPath.startsWith('/dashboard') ? '/dashboard' : '/login';

  if (normalizedPath === '/dashboard') {
    if (!isAuthenticated || !userEmail) {
      return {
        allowed: false,
        redirectTo: '/login',
        interceptionReason: 'Please sign in with your @hbplus.fit Google account to access the dashboard.',
      };
    }

    const domainCheck = validateDomainAccess(userEmail, allowedDomains, allowBootstrappedAdmin);
    if (!domainCheck.allowed) {
      return {
        allowed: false,
        redirectTo: '/login',
        interceptionReason: RESTRICTED_DOMAIN_ERROR,
      };
    }

    return {
      allowed: true,
      redirectTo: null,
      interceptionReason: null,
    };
  }

  // On /login when already authenticated with a valid domain
  if (isAuthenticated && userEmail) {
    const domainCheck = validateDomainAccess(userEmail, allowedDomains, allowBootstrappedAdmin);
    if (domainCheck.allowed) {
      return {
        allowed: true,
        redirectTo: '/dashboard',
        interceptionReason: null,
      };
    }
  }

  return {
    allowed: true,
    redirectTo: null,
    interceptionReason: null,
  };
}

/**
 * Defensive payload validation synchronized verbatim with firebase-blueprint.json
 * before any Firestore mutation is executed.
 */
export function validateUserProfilePayload(
  payload: Partial<UserProfileRecord>,
  allowBootstrappedAdmin = false
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.uid || payload.uid.length > MAX_UID_LENGTH || !VALID_ID_REGEX.test(payload.uid)) {
    errors.push('Invalid UID format.');
  }

  const email = (payload.email || '').trim().toLowerCase();
  const isOfficialEmail = HBPLUS_EMAIL_REGEX.test(email);
  const isBootstrap = allowBootstrappedAdmin && email === BOOTSTRAPPED_ADMIN_EMAIL;
  if (!email || email.length < 5 || email.length > MAX_EMAIL_LENGTH || (!isOfficialEmail && !isBootstrap)) {
    errors.push(RESTRICTED_DOMAIN_ERROR);
  }

  const displayName = (payload.displayName || '').trim();
  if (!displayName || displayName.length < 1 || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    errors.push('Display name must be between 1 and 100 characters.');
  }

  if (typeof payload.photoURL === 'string' && payload.photoURL.length > MAX_PHOTO_URL_LENGTH) {
    errors.push('Photo URL must be at most 500 characters.');
  }

  const department = (payload.department || '').trim();
  if (!department || department.length < 2 || department.length > MAX_DEPARTMENT_LENGTH) {
    errors.push('Department must be between 2 and 80 characters.');
  }

  if (payload.role !== 'admin' && payload.role !== 'user') {
    errors.push('Role must be either "admin" or "user".');
  }

  if (payload.platform !== 'web' && payload.platform !== 'ios' && payload.platform !== 'android') {
    errors.push('Platform must be "web", "ios", or "android".');
  }

  if (payload.status !== 'active' && payload.status !== 'suspended') {
    errors.push('Status must be "active" or "suspended".');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Builds a structured OAuth 2.0 / OIDC JWT claims summary for token handling inspection.
 */
export function buildTokenClaimsSummary(
  email: string,
  role: UserRole,
  uid: string,
  issuedAtMs: number
): TokenClaimsSummary {
  const domain = extractEmailDomain(email) || 'hbplus.fit';
  const iat = Math.floor(issuedAtMs / 1000);
  const exp = iat + 3600;
  const pseudoHash = Array.from(uid + email)
    .reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0)
    .toString(16)
    .replace('-', 'f');

  return {
    iss: 'https://securetoken.google.com/gen-lang-client-0649545095',
    sub: uid,
    email: email.toLowerCase(),
    email_verified: true,
    hd: domain,
    role,
    iat,
    exp,
    maskedToken: `eyJhbGciOiJSUzI1NiIsImtpZCI6ImhicGx1cyJ9.eyJhdWQiOiJoYnBsdXMiLCJSubI6IiR7dWlkfSJ9.${pseudoHash}9a8b7c`,
  };
}
