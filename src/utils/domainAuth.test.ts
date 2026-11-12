import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_PRIMARY_DOMAIN,
  RESTRICTED_DOMAIN_ERROR,
  extractEmailDomain,
  validateDomainAccess,
  hasRolePermission,
  evaluateRouteGuard,
  validateUserProfilePayload,
  buildTokenClaimsSummary,
} from './domainAuth';

test('extractEmailDomain parses valid domains and normalizes case', () => {
  assert.equal(extractEmailDomain('example@hbplus.fit'), 'hbplus.fit');
  assert.equal(extractEmailDomain('  ALEX.RIVERA@HBPLUS.FIT '), 'hbplus.fit');
  assert.equal(extractEmailDomain('example@gmail.com'), 'gmail.com');
});

test('extractEmailDomain rejects malformed email strings', () => {
  assert.equal(extractEmailDomain(''), null);
  assert.equal(extractEmailDomain('not-an-email'), null);
  assert.equal(extractEmailDomain('double@@hbplus.fit'), null);
  assert.equal(extractEmailDomain('user@nodot'), null);
  assert.equal(extractEmailDomain('user @hbplus.fit'), null);
});

test('validateDomainAccess allows example@hbplus.fit', () => {
  const result = validateDomainAccess('example@hbplus.fit');
  assert.equal(result.allowed, true);
  assert.equal(result.extractedDomain, ALLOWED_PRIMARY_DOMAIN);
  assert.equal(result.errorMessage, null);
  assert.equal(result.reason, 'OFFICIAL_DOMAIN_MATCH');
});

test('validateDomainAccess restricts example@gmail.com with exact specification error message', () => {
  const result = validateDomainAccess('example@gmail.com');
  assert.equal(result.allowed, false);
  assert.equal(result.extractedDomain, 'gmail.com');
  assert.equal(
    result.errorMessage,
    'Access restricted. Please login using your official domain email.'
  );
  assert.equal(result.errorMessage, RESTRICTED_DOMAIN_ERROR);
  assert.equal(result.reason, 'UNAUTHORIZED_DOMAIN');
});

test('validateDomainAccess restricts lookalike domains like fake-hbplus.fit', () => {
  const result = validateDomainAccess('user@fake-hbplus.fit');
  assert.equal(result.allowed, false);
  assert.equal(result.errorMessage, RESTRICTED_DOMAIN_ERROR);
});

test('hasRolePermission enforces RBAC boundaries between admin and user', () => {
  assert.equal(hasRolePermission('user', 'view_dashboard'), true);
  assert.equal(hasRolePermission('user', 'view_directory'), true);
  assert.equal(hasRolePermission('user', 'manage_roles'), false);
  assert.equal(hasRolePermission('user', 'provision_member'), false);

  assert.equal(hasRolePermission('admin', 'view_dashboard'), true);
  assert.equal(hasRolePermission('admin', 'manage_roles'), true);
  assert.equal(hasRolePermission('admin', 'provision_member'), true);
  assert.equal(hasRolePermission('admin', 'configure_domain_policy'), true);
});

test('evaluateRouteGuard blocks unauthenticated access to /dashboard', () => {
  const decision = evaluateRouteGuard('/dashboard', false, null);
  assert.equal(decision.allowed, false);
  assert.equal(decision.redirectTo, '/login');
  assert.ok(decision.interceptionReason?.includes('@hbplus.fit'));
});

test('evaluateRouteGuard blocks authenticated @gmail.com user from /dashboard', () => {
  const decision = evaluateRouteGuard('/dashboard', true, 'example@gmail.com');
  assert.equal(decision.allowed, false);
  assert.equal(decision.redirectTo, '/login');
  assert.equal(decision.interceptionReason, RESTRICTED_DOMAIN_ERROR);
});

test('evaluateRouteGuard permits authenticated @hbplus.fit user on /dashboard', () => {
  const decision = evaluateRouteGuard('/dashboard', true, 'example@hbplus.fit');
  assert.equal(decision.allowed, true);
  assert.equal(decision.redirectTo, null);
  assert.equal(decision.interceptionReason, null);
});

test('validateUserProfilePayload enforces firebase-blueprint.json constraints including photoURL', () => {
  const validPayload = validateUserProfilePayload({
    uid: 'usr_hbplus_01',
    email: 'example@hbplus.fit',
    displayName: 'Alex Rivera',
    photoURL: '/src/assets/images/avatar_alex_rivera_1794475146092.jpg',
    domain: 'hbplus.fit',
    role: 'admin',
    department: 'Security Engineering',
    platform: 'web',
    status: 'active',
  });
  assert.equal(validPayload.valid, true);
  assert.equal(validPayload.errors.length, 0);

  const invalidDomainPayload = validateUserProfilePayload({
    uid: 'usr_gmail_01',
    email: 'example@gmail.com',
    displayName: 'External User',
    domain: 'gmail.com',
    role: 'user',
    department: 'External',
    platform: 'web',
    status: 'active',
  });
  assert.equal(invalidDomainPayload.valid, false);
  assert.ok(invalidDomainPayload.errors.includes(RESTRICTED_DOMAIN_ERROR));
});

test('buildTokenClaimsSummary produces OIDC claims with hd=hbplus.fit', () => {
  const claims = buildTokenClaimsSummary('example@hbplus.fit', 'admin', 'usr_01', 1762905000000);
  assert.equal(claims.hd, 'hbplus.fit');
  assert.equal(claims.email_verified, true);
  assert.equal(claims.role, 'admin');
  assert.equal(claims.exp - claims.iat, 3600);
});
