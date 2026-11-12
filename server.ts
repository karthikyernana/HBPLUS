import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  ALLOWED_PRIMARY_DOMAIN,
  RESTRICTED_DOMAIN_ERROR,
  UserProfileRecord,
  AuditLogRecord,
  TrainingSession,
  UserRole,
  RuntimePlatform,
  SessionStatus,
  TrainingTrack,
  validateDomainAccess,
  validateUserProfilePayload,
  extractEmailDomain,
} from './src/utils/domainAuth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'studio-db.json');

const DEFAULT_ARJUN_AVATAR = '/src/assets/images/avatar_arjun_nair_1794490222184.jpg';
const DEFAULT_ANANYA_AVATAR = '/src/assets/images/avatar_ananya_iyer_1794490222450.jpg';

interface StudioDatabaseSchema {
  version: number;
  directory: UserProfileRecord[];
  sessions: TrainingSession[];
  auditLogs: AuditLogRecord[];
}

const SEED_DATABASE: StudioDatabaseSchema = {
  version: 4,
  directory: [
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
  ],
  sessions: [
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
  ],
  auditLogs: [
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
  ],
};

function loadDatabase(): StudioDatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StudioDatabaseSchema;
      if (parsed && parsed.version === 4 && Array.isArray(parsed.directory) && Array.isArray(parsed.sessions)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading studio database, initializing seed:', err);
  }
  saveDatabase(SEED_DATABASE);
  return JSON.parse(JSON.stringify(SEED_DATABASE));
}

function saveDatabase(dbState: StudioDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving studio database:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  let dbState = loadDatabase();

  // GET /api/state — Fetch persisted studio state (directory, sessions, auditLogs)
  app.get('/api/state', (_req, res) => {
    dbState = loadDatabase();
    res.json({
      directory: dbState.directory,
      sessions: dbState.sessions,
      auditLogs: dbState.auditLogs,
    });
  });

  // POST /api/auth/verify — Verify Google / Workspace email domain & persist login event
  app.post('/api/auth/verify', (req, res) => {
    const {
      email = '',
      displayName,
      photoURL,
      department,
      platform = 'web',
    } = req.body as {
      email?: string;
      displayName?: string;
      photoURL?: string;
      department?: string;
      platform?: RuntimePlatform;
    };

    const normalizedEmail = String(email).trim().toLowerCase();
    const domainResult = validateDomainAccess(normalizedEmail, [ALLOWED_PRIMARY_DOMAIN], false);

    if (!domainResult.allowed || !domainResult.extractedDomain) {
      const logEntry: AuditLogRecord = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uid: 'usr_restricted_attempt',
        email: normalizedEmail || 'invalid-email',
        domain: domainResult.extractedDomain || 'invalid',
        eventType: 'LOGIN_RESTRICTED',
        platform,
        createdAt: new Date().toISOString(),
      };
      dbState.auditLogs = [logEntry, ...dbState.auditLogs];
      saveDatabase(dbState);

      res.status(200).json({
        allowed: false,
        errorMessage: domainResult.errorMessage || RESTRICTED_DOMAIN_ERROR,
        directory: dbState.directory,
        auditLogs: dbState.auditLogs,
      });
      return;
    }

    const existingMember = dbState.directory.find(
      (m) => m.email.toLowerCase() === normalizedEmail
    );

    if (existingMember && existingMember.status === 'suspended') {
      const logEntry: AuditLogRecord = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uid: existingMember.uid,
        email: normalizedEmail,
        domain: domainResult.extractedDomain,
        eventType: 'LOGIN_RESTRICTED',
        platform,
        createdAt: new Date().toISOString(),
      };
      dbState.auditLogs = [logEntry, ...dbState.auditLogs];
      saveDatabase(dbState);

      res.status(200).json({
        allowed: false,
        errorMessage: 'Your account has been suspended. Please contact your HB+ administrator.',
        directory: dbState.directory,
        auditLogs: dbState.auditLogs,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const derivedName =
      displayName ||
      existingMember?.displayName ||
      normalizedEmail
        .split('@')[0]
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    const defaultAvatar =
      normalizedEmail === 'ananya.iyer@hbplus.fit'
        ? DEFAULT_ANANYA_AVATAR
        : normalizedEmail === 'example@hbplus.fit' || normalizedEmail === 'arjun.nair@hbplus.fit'
        ? DEFAULT_ARJUN_AVATAR
        : '';

    const resolvedRole: UserRole = existingMember
      ? existingMember.role
      : normalizedEmail === 'example@hbplus.fit' || normalizedEmail === 'arjun.nair@hbplus.fit'
      ? 'admin'
      : 'user';

    const resolvedProfile: UserProfileRecord = existingMember
      ? {
          ...existingMember,
          displayName: displayName || existingMember.displayName,
          photoURL: photoURL || existingMember.photoURL || defaultAvatar,
          role: resolvedRole,
          platform,
          updatedAt: nowIso,
        }
      : {
          uid: `usr_hbplus_${Date.now().toString(36)}`,
          email: normalizedEmail,
          displayName: derivedName,
          photoURL: photoURL || defaultAvatar,
          domain: domainResult.extractedDomain,
          role: resolvedRole,
          department: department || 'Strength & Conditioning · Indiranagar',
          platform,
          status: 'active',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    const exists = dbState.directory.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (exists) {
      dbState.directory = dbState.directory.map((u) =>
        u.email.toLowerCase() === normalizedEmail ? resolvedProfile : u
      );
    } else {
      dbState.directory = [resolvedProfile, ...dbState.directory];
    }

    const logEntry: AuditLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uid: resolvedProfile.uid,
      email: resolvedProfile.email,
      domain: resolvedProfile.domain,
      eventType: 'LOGIN_ALLOWED',
      platform,
      createdAt: nowIso,
    };
    dbState.auditLogs = [logEntry, ...dbState.auditLogs];
    saveDatabase(dbState);

    res.json({
      allowed: true,
      profile: resolvedProfile,
      directory: dbState.directory,
      auditLogs: dbState.auditLogs,
    });
  });

  // PUT /api/profile — Update authenticated user's profile (displayName, department)
  app.put('/api/profile', (req, res) => {
    const { uid, displayName, department } = req.body as {
      uid: string;
      displayName: string;
      department: string;
    };

    const existing = dbState.directory.find((m) => m.uid === uid);
    if (!existing) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const updated: UserProfileRecord = {
      ...existing,
      displayName: String(displayName || existing.displayName).trim().slice(0, 100),
      department: String(department || existing.department).trim().slice(0, 80),
      updatedAt: new Date().toISOString(),
    };

    dbState.directory = dbState.directory.map((m) => (m.uid === uid ? updated : m));
    saveDatabase(dbState);

    res.json({
      profile: updated,
      directory: dbState.directory,
    });
  });

  // POST /api/sessions — Create a new training session and persist to database
  app.post('/api/sessions', (req, res) => {
    const {
      title,
      athleteName,
      track = 'Strength & Power',
      timeSlot = '04:30 PM',
      durationMin = 60,
      readinessScore = 92,
      targetBpm = 150,
    } = req.body as Partial<TrainingSession>;

    const cleanTitle = String(title || '').trim();
    const cleanAthlete = String(athleteName || '').trim();
    if (!cleanTitle || !cleanAthlete) {
      res.status(400).json({ error: 'Please enter both a training block title and member name.' });
      return;
    }

    const newSession: TrainingSession = {
      id: `ses_${Date.now()}`,
      title: cleanTitle.slice(0, 120),
      athleteName: cleanAthlete.slice(0, 80),
      track: track as TrainingTrack,
      timeSlot: String(timeSlot || '04:30 PM').trim(),
      durationMin: Number(durationMin) || 60,
      readinessScore: Number(readinessScore) || 92,
      targetBpm: Number(targetBpm) || 150,
      status: 'scheduled',
    };

    dbState.sessions = [newSession, ...dbState.sessions];
    saveDatabase(dbState);

    res.json({
      session: newSession,
      sessions: dbState.sessions,
    });
  });

  // PATCH /api/sessions/:id — Update training session status and persist
  app.patch('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status?: SessionStatus };

    dbState.sessions = dbState.sessions.map((s) => {
      if (s.id !== id) return s;
      const nextStatus: SessionStatus =
        status ||
        (s.status === 'scheduled'
          ? 'in_progress'
          : s.status === 'in_progress'
          ? 'completed'
          : 'scheduled');
      return { ...s, status: nextStatus };
    });

    saveDatabase(dbState);
    res.json({ sessions: dbState.sessions });
  });

  // DELETE /api/sessions/:id — Delete training session and persist
  app.delete('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    dbState.sessions = dbState.sessions.filter((s) => s.id !== id);
    saveDatabase(dbState);
    res.json({ sessions: dbState.sessions });
  });

  // POST /api/directory — Admin-only staff onboarding with @hbplus.fit validation
  app.post('/api/directory', (req, res) => {
    const { actorUid, email, displayName, role = 'user', department, platform = 'web' } = req.body as {
      actorUid: string;
      email: string;
      displayName: string;
      role: UserRole;
      department: string;
      platform: RuntimePlatform;
    };

    const actor = dbState.directory.find((m) => m.uid === actorUid);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: 'Studio Admin role is required to invite @hbplus.fit staff.' });
      return;
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const domainCheck = validateDomainAccess(normalizedEmail, [ALLOWED_PRIMARY_DOMAIN], false);
    if (!domainCheck.allowed || !domainCheck.extractedDomain) {
      res.status(400).json({ error: domainCheck.errorMessage || RESTRICTED_DOMAIN_ERROR });
      return;
    }

    if (dbState.directory.some((m) => m.email.toLowerCase() === normalizedEmail)) {
      res.status(400).json({ error: 'A staff member with this @hbplus.fit email already exists.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newMember: UserProfileRecord = {
      uid: `usr_hbplus_${Date.now().toString(36)}`,
      email: normalizedEmail,
      displayName: String(displayName || '').trim(),
      photoURL: '',
      domain: extractEmailDomain(normalizedEmail) || ALLOWED_PRIMARY_DOMAIN,
      role: role === 'admin' ? 'admin' : 'user',
      department: String(department || 'Strength & Conditioning').trim(),
      platform,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const schemaCheck = validateUserProfilePayload(newMember, false);
    if (!schemaCheck.valid) {
      res.status(400).json({ error: schemaCheck.errors[0] });
      return;
    }

    dbState.directory = [newMember, ...dbState.directory];
    const logEntry: AuditLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uid: actor.uid,
      email: newMember.email,
      domain: newMember.domain,
      eventType: 'ROLE_UPDATED',
      platform: 'web',
      createdAt: nowIso,
    };
    dbState.auditLogs = [logEntry, ...dbState.auditLogs];
    saveDatabase(dbState);

    res.json({
      member: newMember,
      directory: dbState.directory,
      auditLogs: dbState.auditLogs,
    });
  });

  // PATCH /api/directory/:uid/role — Admin-only role change (forbids self-promotion/self-demotion)
  app.patch('/api/directory/:uid/role', (req, res) => {
    const { uid } = req.params;
    const { actorUid, newRole } = req.body as { actorUid: string; newRole: UserRole };

    const actor = dbState.directory.find((m) => m.uid === actorUid);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: 'Only Studio Admins can modify staff role permissions.' });
      return;
    }
    if (actor.uid === uid) {
      res.status(400).json({ error: 'You cannot change your own active admin role.' });
      return;
    }

    const target = dbState.directory.find((m) => m.uid === uid);
    if (!target) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    dbState.directory = dbState.directory.map((m) =>
      m.uid === uid ? { ...m, role: newRole === 'admin' ? 'admin' : 'user', updatedAt: nowIso } : m
    );

    const logEntry: AuditLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uid: actor.uid,
      email: target.email,
      domain: target.domain,
      eventType: 'ROLE_UPDATED',
      platform: 'web',
      createdAt: nowIso,
    };
    dbState.auditLogs = [logEntry, ...dbState.auditLogs];
    saveDatabase(dbState);

    res.json({
      directory: dbState.directory,
      auditLogs: dbState.auditLogs,
    });
  });

  // PATCH /api/directory/:uid/status — Admin-only account suspend/activate
  app.patch('/api/directory/:uid/status', (req, res) => {
    const { uid } = req.params;
    const { actorUid } = req.body as { actorUid: string };

    const actor = dbState.directory.find((m) => m.uid === actorUid);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: 'Only Studio Admins can suspend or activate staff accounts.' });
      return;
    }
    if (actor.uid === uid) {
      res.status(400).json({ error: 'You cannot suspend your own active admin account.' });
      return;
    }

    const target = dbState.directory.find((m) => m.uid === uid);
    if (!target) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const nextStatus = target.status === 'active' ? 'suspended' : 'active';
    const nowIso = new Date().toISOString();
    dbState.directory = dbState.directory.map((m) =>
      m.uid === uid ? { ...m, status: nextStatus, updatedAt: nowIso } : m
    );
    saveDatabase(dbState);

    res.json({ directory: dbState.directory });
  });

  // POST /api/audit-logs — Record logout or security event
  app.post('/api/audit-logs', (req, res) => {
    const { uid, email, domain, eventType, platform = 'web' } = req.body as Omit<
      AuditLogRecord,
      'id' | 'createdAt'
    >;

    const logEntry: AuditLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uid: String(uid || 'usr_anonymous'),
      email: String(email || 'unknown'),
      domain: String(domain || 'hbplus.fit'),
      eventType: eventType || 'LOGOUT',
      platform,
      createdAt: new Date().toISOString(),
    };

    dbState.auditLogs = [logEntry, ...dbState.auditLogs];
    saveDatabase(dbState);

    res.json({ auditLogs: dbState.auditLogs });
  });

  // Mount Vite middleware in development or static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HB+ Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
