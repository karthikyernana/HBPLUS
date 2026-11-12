# Security Specification (`security_spec.md`)

## 1. Data Invariants & Relational Source of Truth

1. **Default-Deny Catch-All**: Every path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Domain Enforcement Invariant**: A `UserProfile` document in `/users/{userId}` can only be created or updated if `email` matches `^[^@\s]+@hbplus\.fit$` and `domain == 'hbplus.fit'`, or if the user is the bootstrapped administrator (`karthikyernana@gmail.com` with `email_verified == true`).
3. **Identity Integrity & Anti-Spoofing**:
   - `userId` path variable must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars) and equal `request.auth.uid` (unless modified by a verified `isAdmin()`).
   - `incoming().uid == request.auth.uid` on profile creation and user self-updates.
4. **Privilege Escalation Prevention**:
   - Non-admin users creating `/users/{userId}` MUST set `role == 'user'` and `status == 'active'`. Self-assigning `role == 'admin'` is strictly forbidden unless `isAdmin()` is true.
   - Non-admin users updating `/users/{userId}` can ONLY update `['displayName', 'department', 'platform', 'updatedAt']` while keeping `uid`, `email`, `domain`, `role`, `status`, and `createdAt` strictly immutable.
5. **PII Isolation**:
   - `/users/{userId}` contains `email` (PII). Blanket `isSignedIn()` reads are forbidden. Only `isOwner(userId)` or `isAdmin()` may `get` or `list` records.
6. **Temporal Integrity**:
   - `createdAt == request.time` on `create`.
   - `updatedAt == request.time` on `update`.
   - `createdAt` is immortal (`incoming().createdAt == existing().createdAt`).
7. **Immutable Audit Logs**:
   - `/audit_logs/{logId}` allows `create` only for authenticated, verified users where `incoming().uid == request.auth.uid` and `incoming().createdAt == request.time`.
   - `update` and `delete` on `/audit_logs/{logId}` are permanently forbidden (`if false`).

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Malicious Payload | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Unauthorized Domain Injection** | `POST /users/user_1` | `email: "attacker@gmail.com", domain: "gmail.com"` | `PERMISSION_DENIED` |
| 2 | **Self-Assigned Admin Escalation** | `POST /users/user_1` | `uid: "user_1", role: "admin"` (by non-admin) | `PERMISSION_DENIED` |
| 3 | **Shadow Field Injection** | `POST /users/user_1` | `{ ...validUser, isSuperAdmin: true }` | `PERMISSION_DENIED` |
| 4 | **Identity Spoofing on Create** | `POST /users/user_2` | Authenticated as `user_1`, writing `uid: "user_2"` | `PERMISSION_DENIED` |
| 5 | **Role Mutation via Update-Gap** | `PATCH /users/user_1` | Updating `role: "admin"` as standard user | `PERMISSION_DENIED` |
| 6 | **Immortal Field Tampering** | `PATCH /users/user_1` | Modifying `createdAt` or `email` on update | `PERMISSION_DENIED` |
| 7 | **Client Timestamp Forgery** | `POST /users/user_1` | `createdAt: Timestamp.fromMillis(1000000)` (`!= request.time`) | `PERMISSION_DENIED` |
| 8 | **Unverified Email Spoof Attack** | `POST /users/user_1` | `request.auth.token.email_verified == false` | `PERMISSION_DENIED` |
| 9 | **PII Horizontal Lateral Read** | `GET /users/user_2` | Authenticated as non-admin `user_1` reading `user_2` | `PERMISSION_DENIED` |
| 10 | **Denial-of-Wallet Oversized String** | `PATCH /users/user_1` | `displayName` with 5,000 characters (`> 100`) | `PERMISSION_DENIED` |
| 11 | **Audit Log Tampering / Deletion** | `DELETE /audit_logs/log_1` | Authenticated user attempting to erase audit trail | `PERMISSION_DENIED` |
| 12 | **Path ID Poisoning** | `POST /users/bad$id!@#` | Invalid characters in document ID | `PERMISSION_DENIED` |

---

## 3. Red Team Audit Report

- **Shadow Update Test**: Passed. `data.keys().hasAll(...)` and `data.keys().hasOnly(...)` on create, combined with `incoming().diff(existing()).affectedKeys().hasOnly(...)` wrapped inside `isValidUserProfile(incoming())` on update, reject any undeclared keys.
- **Email Spoofing Test**: Passed. `isVerifiedUser()` enforces `request.auth.token.email_verified == true` across all writes and admin email checks.
- **PII Blanket Test**: Passed. `/users/{userId}` restricts `get` and `list` to `resource.data.uid == request.auth.uid || isAdmin()`.
- **Query Trust Test**: Passed. `allow list` checks `resource.data.uid == request.auth.uid || isAdmin()` without delegating security to client queries.
- **Value Poisoning Test**: Passed. `allow update` begins with `isValidUserProfile(incoming())`, ensuring whitelisted keys cannot be poisoned with invalid types or oversized strings.
