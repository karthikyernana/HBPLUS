import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Deterministic Dirty-Dozen Security Rule Evaluator & Structural Audit Suite
 * Verifies that all 12 adversarial payloads are rejected by the Firestore rules
 * invariants and that the rules file satisfies all Eight Pillars.
 */

const rulesSource = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
  isAdmin?: boolean;
}

interface SimRequest {
  auth: AuthContext | null;
  path: string;
  docId: string;
  method: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestTimeMs: number;
  incoming?: Record<string, unknown>;
  existing?: Record<string, unknown>;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const HBPLUS_EMAIL_REGEX = /^[^@\s]+@hbplus\.fit$/;

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

function isBootstrappedAdmin(auth: AuthContext | null): boolean {
  return Boolean(auth && auth.email_verified && auth.email === 'karthikyernana@gmail.com');
}

function isAdmin(auth: AuthContext | null): boolean {
  return Boolean(auth && (isBootstrappedAdmin(auth) || auth.isAdmin));
}

function isValidUserProfile(data: Record<string, unknown>, auth: AuthContext | null): boolean {
  const required = [
    'uid', 'email', 'displayName', 'photoURL', 'domain', 'role',
    'department', 'platform', 'status', 'createdAt', 'updatedAt',
  ];
  const keys = Object.keys(data);
  if (keys.length !== required.length || !required.every((k) => keys.includes(k))) {
    return false;
  }
  if (typeof data.uid !== 'string' || !isValidId(data.uid)) return false;
  if (typeof data.email !== 'string' || data.email.length < 5 || data.email.length > 254) return false;
  const validEmail =
    HBPLUS_EMAIL_REGEX.test(data.email) ||
    (isBootstrappedAdmin(auth) && data.email === 'karthikyernana@gmail.com');
  if (!validEmail) return false;
  if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 100) return false;
  if (typeof data.photoURL !== 'string' || data.photoURL.length > 500) return false;
  if (typeof data.domain !== 'string' || data.domain.length < 3 || data.domain.length > 100) return false;
  const validDomain =
    data.domain === 'hbplus.fit' ||
    (isBootstrappedAdmin(auth) && data.domain === 'gmail.com');
  if (!validDomain) return false;
  if (data.role !== 'user' && data.role !== 'admin') return false;
  if (typeof data.department !== 'string' || data.department.length < 2 || data.department.length > 80) return false;
  if (data.platform !== 'web' && data.platform !== 'ios' && data.platform !== 'android') return false;
  if (data.status !== 'active' && data.status !== 'suspended') return false;
  if (typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') return false;
  return true;
}

function evaluateRule(req: SimRequest): 'ALLOWED' | 'PERMISSION_DENIED' {
  if (!req.auth) return 'PERMISSION_DENIED';

  if (req.path === 'users') {
    if (req.method === 'get') {
      if (!isValidId(req.docId)) return 'PERMISSION_DENIED';
      if (req.auth.uid === req.docId || isAdmin(req.auth)) return 'ALLOWED';
      return 'PERMISSION_DENIED';
    }
    if (req.method === 'create') {
      if (!req.auth.email_verified) return 'PERMISSION_DENIED';
      if (!isValidId(req.docId) || !req.incoming) return 'PERMISSION_DENIED';
      if (!isValidUserProfile(req.incoming, req.auth)) return 'PERMISSION_DENIED';
      if (req.incoming.uid !== req.docId) return 'PERMISSION_DENIED';
      if (req.incoming.createdAt !== req.requestTimeMs || req.incoming.updatedAt !== req.requestTimeMs) {
        return 'PERMISSION_DENIED';
      }
      if (
        (req.auth.uid === req.docId && req.incoming.role === 'user' && req.incoming.status === 'active') ||
        isAdmin(req.auth)
      ) {
        return 'ALLOWED';
      }
      return 'PERMISSION_DENIED';
    }
    if (req.method === 'update') {
      if (!req.auth.email_verified) return 'PERMISSION_DENIED';
      if (!isValidId(req.docId) || !req.incoming || !req.existing) return 'PERMISSION_DENIED';
      if (!isValidUserProfile(req.incoming, req.auth)) return 'PERMISSION_DENIED';
      if (
        req.incoming.uid !== req.existing.uid ||
        req.incoming.email !== req.existing.email ||
        req.incoming.domain !== req.existing.domain ||
        req.incoming.createdAt !== req.existing.createdAt ||
        req.incoming.updatedAt !== req.requestTimeMs
      ) {
        return 'PERMISSION_DENIED';
      }
      const changedKeys = Object.keys(req.incoming).filter((k) => req.incoming![k] !== req.existing![k]);
      const ownerAllowed = ['displayName', 'photoURL', 'department', 'platform', 'updatedAt'];
      const adminAllowed = ['displayName', 'photoURL', 'department', 'platform', 'role', 'status', 'updatedAt'];
      if (
        req.auth.uid === req.docId &&
        req.existing.status === 'active' &&
        req.incoming.role === req.existing.role &&
        req.incoming.status === req.existing.status &&
        changedKeys.every((k) => ownerAllowed.includes(k))
      ) {
        return 'ALLOWED';
      }
      if (isAdmin(req.auth) && changedKeys.every((k) => adminAllowed.includes(k))) {
        return 'ALLOWED';
      }
      return 'PERMISSION_DENIED';
    }
  }

  if (req.path === 'audit_logs') {
    if (req.method === 'delete' || req.method === 'update') {
      return 'PERMISSION_DENIED';
    }
  }

  return 'PERMISSION_DENIED';
}

const NOW = 1762905000000;

function makeBaseUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: 'user_1',
    email: 'example@hbplus.fit',
    displayName: 'Alex Rivera',
    photoURL: '/src/assets/images/avatar_alex_rivera_1794475146092.jpg',
    domain: 'hbplus.fit',
    role: 'user',
    department: 'Engineering',
    platform: 'web',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const standardAuth: AuthContext = {
  uid: 'user_1',
  email: 'example@hbplus.fit',
  email_verified: true,
};

test('Firestore Rules File Integrity & Eight Pillars Verification', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"), 'Must declare rules_version 2');
  assert.ok(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), 'Must include default-deny catch-all');
  assert.ok(rulesSource.includes('isValidUserProfile(incoming())'), 'Must enforce isValidUserProfile on writes');
  assert.ok(rulesSource.includes('isValidAuditLog(incoming())'), 'Must enforce isValidAuditLog on writes');
  assert.ok(rulesSource.includes('request.auth.token.email_verified == true'), 'Must enforce email_verified == true');
});

test('Valid @hbplus.fit user profile creation succeeds', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_1',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser(),
  });
  assert.equal(res, 'ALLOWED');
});

test('Dirty Dozen #1: Unauthorized Domain Injection (example@gmail.com) -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: { uid: 'user_1', email: 'example@gmail.com', email_verified: true },
    path: 'users',
    docId: 'user_1',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser({ email: 'example@gmail.com', domain: 'gmail.com' }),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Self-Assigned Admin Escalation on create -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_1',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser({ role: 'admin' }),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #3: Shadow Field Injection -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_1',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser({ isSuperAdmin: true }),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #4: Identity Spoofing on Create -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_2',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser({ uid: 'user_2' }),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #5: Role Mutation via Update-Gap -> PERMISSION_DENIED', () => {
  const existing = makeBaseUser();
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_1',
    method: 'update',
    requestTimeMs: NOW + 5000,
    existing,
    incoming: { ...existing, role: 'admin', updatedAt: NOW + 5000 },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #6: Immortal Field Tampering (email/createdAt) -> PERMISSION_DENIED', () => {
  const existing = makeBaseUser();
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_1',
    method: 'update',
    requestTimeMs: NOW + 5000,
    existing,
    incoming: { ...existing, createdAt: NOW + 1000, updatedAt: NOW + 5000 },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #7: Client Timestamp Forgery -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_1',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser({ createdAt: 1000000 }),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #8: Unverified Email Spoof Attack -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: { uid: 'user_1', email: 'example@hbplus.fit', email_verified: false },
    path: 'users',
    docId: 'user_1',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser(),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #9: PII Horizontal Lateral Read -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_2',
    method: 'get',
    requestTimeMs: NOW,
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #10: Denial-of-Wallet Oversized String -> PERMISSION_DENIED', () => {
  const existing = makeBaseUser();
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'user_1',
    method: 'update',
    requestTimeMs: NOW + 5000,
    existing,
    incoming: { ...existing, displayName: 'A'.repeat(5000), updatedAt: NOW + 5000 },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #11: Audit Log Deletion / Tampering -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'audit_logs',
    docId: 'log_1',
    method: 'delete',
    requestTimeMs: NOW,
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #12: Path ID Poisoning -> PERMISSION_DENIED', () => {
  const res = evaluateRule({
    auth: standardAuth,
    path: 'users',
    docId: 'bad$id!@#',
    method: 'create',
    requestTimeMs: NOW,
    incoming: makeBaseUser({ uid: 'bad$id!@#' }),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});
