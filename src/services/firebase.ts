import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  UserProfileRecord,
  AuditEventType,
  RuntimePlatform,
  UserRole,
  validateDomainAccess,
  validateUserProfilePayload,
  RESTRICTED_DOMAIN_ERROR,
} from '../utils/domainAuth';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Persists a verified @hbplus.fit user profile to Firestore (/users/{uid}).
 */
export async function syncUserProfileToFirestore(
  profile: UserProfileRecord,
  allowBootstrappedAdmin = false
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) {
    return;
  }

  const validation = validateUserProfilePayload(profile, allowBootstrappedAdmin);
  if (!validation.valid) {
    throw new Error(validation.errors[0] || RESTRICTED_DOMAIN_ERROR);
  }

  const userPath = `users/${profile.uid}`;
  const userRef = doc(db, 'users', profile.uid);

  let exists = false;
  try {
    const snap = await getDoc(userRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (!exists) {
    try {
      await setDoc(userRef, {
        uid: profile.uid.slice(0, 128),
        email: profile.email.slice(0, 254),
        displayName: profile.displayName.slice(0, 100),
        photoURL: (profile.photoURL || '').slice(0, 500),
        domain: profile.domain.slice(0, 100),
        role: profile.role,
        department: profile.department.slice(0, 80),
        platform: profile.platform,
        status: profile.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  } else {
    try {
      await updateDoc(userRef, {
        displayName: profile.displayName.slice(0, 100),
        photoURL: (profile.photoURL || '').slice(0, 500),
        department: profile.department.slice(0, 80),
        platform: profile.platform,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }
}

/**
 * Records an immutable authentication audit log in Firestore (/audit_logs/{logId})
 * when a real Firebase Auth session is active.
 */
export async function recordFirestoreAuditLog(params: {
  logId: string;
  uid: string;
  email: string;
  domain: string;
  eventType: AuditEventType;
  platform: RuntimePlatform;
}): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== params.uid) {
    return;
  }
  const cleanId = params.logId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const logPath = `audit_logs/${cleanId}`;
  try {
    await setDoc(doc(db, 'audit_logs', cleanId), {
      uid: params.uid.slice(0, 128),
      email: params.email.slice(0, 254),
      domain: params.domain.slice(0, 100),
      eventType: params.eventType,
      platform: params.platform,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, logPath);
  }
}

/**
 * Initiates Google OAuth 2.0 Popup Sign-In with hosted domain hint (`hd: 'hbplus.fit'`)
 * and immediately enforces domain verification.
 */
export async function signInWithGoogleDomainGate(
  allowedDomains: string[],
  platform: RuntimePlatform = 'web'
): Promise<UserProfileRecord> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    hd: 'hbplus.fit',
    prompt: 'select_account',
  });

  const credential = await signInWithPopup(auth, provider);
  const fbUser: FirebaseUser = credential.user;
  const email = (fbUser.email || '').trim().toLowerCase();

  const domainValidation = validateDomainAccess(email, allowedDomains, false);

  if (!domainValidation.allowed || !domainValidation.extractedDomain) {
    await firebaseSignOut(auth);
    throw new Error(domainValidation.errorMessage || RESTRICTED_DOMAIN_ERROR);
  }

  const nowIso = new Date().toISOString();
  const role: UserRole = email.startsWith('admin') || email.startsWith('alex') ? 'admin' : 'user';

  const profile: UserProfileRecord = {
    uid: fbUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'usr_google_oauth',
    email,
    displayName: (fbUser.displayName || email.split('@')[0] || 'HB+ Member').slice(0, 100),
    photoURL: (fbUser.photoURL || '/src/assets/images/avatar_alex_rivera_1794475146092.jpg').slice(0, 500),
    domain: domainValidation.extractedDomain,
    role,
    department: 'Product & Engineering',
    platform,
    status: 'active',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await syncUserProfileToFirestore(profile, false);
  await recordFirestoreAuditLog({
    logId: `log_${Date.now()}`,
    uid: profile.uid,
    email: profile.email,
    domain: profile.domain,
    eventType: 'LOGIN_ALLOWED',
    platform,
  });

  return profile;
}

export async function signOutFirebaseSession(): Promise<void> {
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

export { onAuthStateChanged };
