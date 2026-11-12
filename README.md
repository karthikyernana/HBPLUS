# HB+ Performance Studio (`hbplus.fit`) — Cross-Platform React Native & Web Authentication Platform

A cross-platform strength, conditioning, and coaching studio application built with **React Native (React Native for Web)**, **Google OAuth 2.0**, **Firebase (Authentication & Cloud Firestore)**, and a persistent **Node.js / Express backend (`server.ts`)**. It enforces strict organization email domain verification (`@hbplus.fit`), Role-Based Access Control (`Admin` / `Coach`), protected routing, and persistent database storage across **Android**, **iOS**, and **Web** from a single shared TypeScript codebase.

---

## Visual Assets Included in Repository

| Asset | File Path | Usage |
| :--- | :--- | :--- |
| **Indiranagar Studio Hero** | `src/assets/images/indian_fitness_studio_hero_1794490220381.jpg` | Split-screen editorial login visual (`LoginScreen.tsx`) |
| **Arjun Nair (Studio Admin)** | `src/assets/images/avatar_arjun_nair_1794490222184.jpg` | Google Workspace Admin profile avatar (`example@hbplus.fit`) |
| **Ananya Iyer (Coach)** | `src/assets/images/avatar_ananya_iyer_1794490222450.jpg` | Google Workspace Coach profile avatar (`ananya.iyer@hbplus.fit`) |

---

## 1. Setup Instructions

### Prerequisites
- **Node.js** `>= 20.x` and `npm`
- **Firebase Project** with **Google Sign-In** enabled under *Authentication → Sign-in method* and **Cloud Firestore** provisioned
- **Android Studio** (Android Emulator) or **Xcode** (iOS Simulator on macOS) when running native mobile targets

### Installation
```bash
# 1. Clone the repository
git clone <repository-url>
cd hbplus-performance-studio

# 2. Install dependencies
npm install
```

### Firebase & Google OAuth 2.0 Configuration
1. Ensure `firebase-applet-config.json` in the project root contains your Firebase project credentials:
   ```json
   {
     "projectId": "your-firebase-project-id",
     "appId": "your-firebase-app-id",
     "apiKey": "your-api-key",
     "authDomain": "your-project.firebaseapp.com",
     "firestoreDatabaseId": "your-database-id",
     "oAuthClientId": "your-google-oauth-client-id.apps.googleusercontent.com"
   }
   ```
2. In the **Firebase Console → Authentication → Settings → Authorized domains**, ensure `localhost` and your deployment domain are listed.

### Running the Application
```bash
# Start Full-Stack Express + Vite Development Server (Port 3000)
npm run dev

# Run Automated Unit & Security Rule Tests (Domain Validation, RBAC, Dirty-Dozen Firestore Rules)
npx tsx --test src/utils/domainAuth.test.ts
npx tsx --test firestore.rules.test.ts

# Build for Production Web
npm run build

# Start Production Server
npm start
```

---

## 2. Authentication Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Login with Google" on Web or Mobile                     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Google OAuth 2.0 Handshake                                           │
│    Firebase GoogleAuthProvider (signInWithPopup) + HB+ Mailbox Bridge   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Client & Backend Domain Verification (validateDomainAccess)          │
│    Extracts normalized email domain from OAuth credential               │
└─────────────────┬─────────────────────────────────────┬─────────────────┘
                  │                                     │
     [email = example@hbplus.fit]          [email = example@gmail.com]
                  │                                     │
                  ▼                                     ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│ 4A. Access Granted                │ │ 4B. Access Restricted             │
│ • Upserts user profile in DB      │ │ • Immediately revokes session &   │
│   (/api/auth/verify & Firestore)  │ │   calls signOut(auth)             │
│ • Logs LOGIN_ALLOWED in Audit Log │ │ • Displays exact error:           │
│ • Issues session & routes to      │ │   "Access restricted. Please      │
│   Protected /dashboard            │ │    login using your official      │
│                                   │ │    domain email."                 │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

### Pre-Provisioned Test Accounts (for Evaluators without a live `@hbplus.fit` Google Workspace Account)
- **`example@hbplus.fit`** — **Arjun Nair** (`Studio Admin · Indiranagar`): Grants full dashboard access, session scheduling, staff onboarding, and role management.
- **`ananya.iyer@hbplus.fit`** — **Ananya Iyer** (`Coach · Indiranagar`): Grants dashboard and floor scheduling access; enforces strict read-only RBAC on staff roles (coaches cannot self-promote to Admin).
- **`example@gmail.com`** — **Personal Google Account**: Immediately blocks login and displays `"Access restricted. Please login using your official domain email."`

---

## 3. How Domain Restriction & Role-Based Access Control (RBAC) Work

### Three-Layer Domain Restriction
1. **Layer 1 — Client Domain Gate (`src/utils/domainAuth.ts`)**:
   `validateDomainAccess(email)` normalizes the email string, validates RFC structure, extracts the domain after `@`, and strictly checks `domain === 'hbplus.fit'`. Any `@gmail.com` or lookalike domain (`@fake-hbplus.fit`) is rejected with:
   > `"Access restricted. Please login using your official domain email."`
2. **Layer 2 — Express Backend Gate (`server.ts` → `POST /api/auth/verify` & `POST /api/directory`)**:
   Every login handshake and staff onboarding request is verified on the server before persisting to `data/studio-db.json`. Unauthorized domains return `HTTP 403` and record an immutable `LOGIN_RESTRICTED` audit event.
3. **Layer 3 — Zero-Trust Firestore Security Rules (`firestore.rules`)**:
   Enforces `data.email.matches('^[^@\\s]+@hbplus\\.fit$')` and `data.domain == 'hbplus.fit'` at the database engine level so unauthorized domains cannot be written to `/users/{userId}`.

### Strict Role-Based Access Control (RBAC)
- Roles (`admin` vs `user` / Coach) are bound to the user's persistent database record.
- **Coaches (`role: 'user'`)** can manage daily member training sessions and edit their own display name and specialty, but **cannot** invite staff, modify roles, or promote themselves to Admin.
- **Studio Admins (`role: 'admin'`)** can onboard verified `@hbplus.fit` staff members, update other staff members' roles (`Coach` ↔ `Admin`), and suspend/activate accounts.

---

## 4. Folder Structure

```text
├── app.json                      # Cross-platform React Native (iOS / Android / Web) manifest
├── server.ts                     # Express backend server with persistent database (data/studio-db.json)
├── firebase-blueprint.json       # Strict JSON Schema blueprint for Firestore entities
├── firestore.rules               # Hardened Zero-Trust Firestore security rules
├── firestore.rules.test.ts       # Automated Dirty-Dozen security rule test suite
├── security_spec.md              # Security invariants and adversarial test specification
├── src/
│   ├── assets/images/            # Studio hero photography & coach portrait avatars
│   ├── primitives/
│   │   └── react-native.tsx      # React Native for Web cross-platform UI primitives
│   ├── utils/
│   │   ├── domainAuth.ts         # Pure domain validation, route guard, and RBAC logic
│   │   └── domainAuth.test.ts    # Unit test suite for domain restriction & route protection
│   ├── services/
│   │   └── firebase.ts           # Firebase Auth, Firestore sync, and structured error handler
│   ├── context/
│   │   └── AuthContext.tsx       # Centralized session, backend API sync, and RBAC provider
│   ├── components/
│   │   └── UserProfile.tsx       # Authenticated Google user profile card (avatar, name, email)
│   ├── screens/
│   │   ├── LoginScreen.tsx       # Cross-platform Google OAuth login & domain verifier
│   │   └── DashboardScreen.tsx   # Protected studio dashboard with persistent sessions & RBAC
│   └── App.tsx                   # Root router with URL guard & animated route transitions
```
