# HB+ DomainGate — Cross-Platform React Native & Web Authentication Gateway

A secure, cross-platform enterprise application built with **React Native (React Native for Web)**, **Google OAuth 2.0**, and **Firebase (Authentication & Cloud Firestore)**. It enforces strict organization email domain verification (`@hbplus.fit`), Role-Based Access Control (`Admin` / `User`), protected routing, and immutable security audit logging across **Android**, **iOS**, and **Web** from a single shared TypeScript codebase.

---

## 1. Setup Instructions

### Prerequisites
- **Node.js** `>= 20.x` and `npm` / `bun`
- **Firebase Project** with **Google Sign-In** enabled under *Authentication → Sign-in method* and **Cloud Firestore** provisioned
- **Android Studio** (for Android Emulator) or **Xcode** (for iOS Simulator on macOS) when testing native mobile targets

### Installation
```bash
# 1. Clone the repository
git clone <repository-url>
cd hbplus-domaingate-auth

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
2. In the **Firebase Console → Authentication → Settings → Authorized domains**, ensure `localhost` and your production domain are listed.

### Running the Application
```bash
# Start Web Development Server (Port 3000)
npm run dev

# Run Automated Unit & Security Rule Tests (Domain Validation, RBAC, Dirty-Dozen Firestore Rules)
npx tsx --test src/utils/domainAuth.test.ts
npx tsx --test firestore.rules.test.ts

# Build for Production Web
npm run build
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
│    GoogleAuthProviderConfigured with hd: "hbplus.fit" & select_account │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Client & Token Domain Verification (validateDomainAccess)            │
│    Extracts normalized email domain from OAuth credential               │
└─────────────────┬─────────────────────────────────────┬─────────────────┘
                  │                                     │
     [email = example@hbplus.fit]          [email = example@gmail.com]
                  │                                     │
                  ▼                                     ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│ 4A. Access Granted                │ │ 4B. Access Restricted             │
│ • Upserts /users/{uid} profile    │ │ • Immediately revokes session &   │
│ • Logs LOGIN_ALLOWED in Firestore │ │   calls signOut(auth)             │
│ • Issues session & routes to      │ │ • Displays error:                 │
│   Protected /dashboard            │ │   "Access restricted. Please      │
│                                   │ │    login using your official      │
│                                   │ │    domain email."                 │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 3. How Domain Restriction Works

Domain restriction is enforced through a **three-layer Defense-in-Depth architecture**:

1. **Layer 1 — OAuth Provider Hint (`hd` Parameter)**:
   When initializing `GoogleAuthProvider`, the app sets `provider.setCustomParameters({ hd: 'hbplus.fit', prompt: 'select_account' })`. This instructs Google's OAuth 2.0 consent screen to prioritize `@hbplus.fit` workspace accounts.

2. **Layer 2 — Deterministic Post-Auth Domain Gate (`src/utils/domainAuth.ts`)**:
   Because OAuth client hints can be bypassed by a user manually choosing a personal account, `validateDomainAccess(email)` parses and normalizes the authenticated user's email address immediately after the OAuth handshake:
   - Splits on `@`, rejects malformed or multi-`@` addresses, and compares the lowercase domain against `hbplus.fit`.
   - If the email ends in `@gmail.com` or any unauthorized domain, the session is **immediately terminated** (`await signOut(auth)`), the token is discarded, and the UI surfaces the exact required error:
     > `"Access restricted. Please login using your official domain email."`

3. **Layer 3 — Zero-Trust Firestore Security Rules (`firestore.rules`)**:
   Even if a malicious client attempted to bypass the frontend code and write directly to Firestore, `firestore.rules` enforces `isValidUserProfile(incoming())` on every write:
   ```javascript
   data.email.matches('^[^@\\s]+@hbplus\\.fit$') &&
   data.domain == 'hbplus.fit' &&
   request.auth.token.email_verified == true
   ```
   Any attempt to persist a `@gmail.com` user profile is rejected at the database layer with `PERMISSION_DENIED`.

---

## 4. Folder Structure

```text
├── app.json                      # Cross-platform React Native (iOS / Android / Web) manifest
├── firebase-blueprint.json       # Strict JSON Schema blueprint for Firestore entities
├── firestore.rules               # Hardened Zero-Trust Firestore security rules
├── firestore.rules.test.ts       # Automated Dirty-Dozen security rule test suite
├── security_spec.md              # Security invariants and adversarial test specification
├── src/
│   ├── primitives/
│   │   └── react-native.tsx      # React Native for Web cross-platform UI primitives
│   ├── utils/
│   │   ├── domainAuth.ts         # Pure domain validation, route guard, and RBAC logic
│   │   └── domainAuth.test.ts    # Unit test suite for domain restriction & route protection
│   ├── services/
│   │   └── firebase.ts           # Firebase Auth, Firestore sync, and structured error handler
│   ├── context/
│   │   └── AuthContext.tsx       # Centralized session, route protection, and RBAC provider
│   ├── screens/
│   │   ├── LoginScreen.tsx       # Cross-platform Google OAuth login & domain verifier
│   │   └── DashboardScreen.tsx   # Protected enterprise dashboard with RBAC & audit logs
│   └── App.tsx                   # Root router with URL guard & cross-platform shell
```
