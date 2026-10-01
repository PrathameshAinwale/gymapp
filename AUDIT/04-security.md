# Phase 4: Security Vulnerability & Risk Assessment

This audit evaluates security across Laravel API backend, MySQL database, React frontend, authentication mechanisms, and external dependencies.

---

## 1. Vulnerability Findings Matrix

| ID | Location | Vulnerability Type | Severity | Status |
|---|---|---|---|---|
| **SEC-01** | `backend/routes/api.php:63-104` | **Remote Database Reconfiguration & Hardcoded Secret Exposure** | **Critical** | **Documented** (Needs decision / removal in production) |
| **SEC-02** | `backend/routes/api.php:241-428` | **Missing Authentication & Authorization Across API Resources** | **Critical** | **Documented** (Needs architectural grouping under `auth:sanctum`) |
| **SEC-03** | `backend/app/Models/User.php:36` | **Plaintext Password Exposure via JSON Serialization** | **High** | **FIXED** (Added `plain_password` to `$hidden`) |
| **SEC-04** | `backend/database/migrations/2026_09_21_000001_add_plain_password_to_users_table.php` | **Plaintext Password Storage in Database** | **High** | **Documented** (Design decision needed: phase out plaintext passwords) |
| **SEC-05** | `backend/routes/api.php:230` | **Missing Rate Limiting on Login & Registration** | **Medium** | **FIXED** (Applied `throttle:15,1` and `throttle:10,1`) |
| **SEC-06** | `backend/config/cors.php:22` | **Permissive Wildcard CORS Origins** | **Medium** | **Documented** (Restrict to trusted production origins) |
| **SEC-07** | `frontend/src/services/api.js:157` | **Bearer Token & Tenant State in Browser LocalStorage** | **Medium** | **Documented** (Recommend migration to HttpOnly SameSite cookies) |
| **SEC-08** | `backend/bootstrap/app.php:26-48` | **Database Schema Disclosure via Exception Handler** | **Low** | **Documented** (Suppress internal column/table names when `APP_DEBUG=false`) |
| **SEC-09** | `composer.json` / `package.json` | **Vulnerable Third-Party Dependencies** | **Medium** | **Documented** (`league/commonmark`, `brace-expansion`, `dompurify`) |

---

## 2. Detailed Vulnerability Analyses

### SEC-01: Remote Database Reconfiguration & Hardcoded Secret Exposure
- **File & Line**: `backend/routes/api.php:63-104`, `backend/routes/api.php:151`
- **Vulnerability**: Remote Code/State Execution via public endpoint with hardcoded credentials and self-disclosing authorization prompt.
- **Exploit Scenario**:
  The route `/api/setup-database` accepts a `?key=` query parameter. If visited without a key, the JSON response returns:
  `"Unauthorized. Pass ?key=pulsefit_setup_****"`.
  Any attacker reading this error message can immediately replay the request with `?key=pulsefit_setup_****`. The endpoint then executes Artisan migrations, triggers `db:seed`, and accepts query parameters (`db_pass`, `db_user`, `db_host`) to rewrite the server's `.env` file with hardcoded fallback database credentials (`u773098752_gym_app_db` / `H^8v****`).
- **Recommendation**:
  1. Remove this route or restrict it strictly to local CLI / SSH environments (`if (!app()->environment('local')) abort(404);`).
  2. Rotate the production database password immediately on the host.
  3. Never hardcode plaintext database passwords or application keys in route files.

---

### SEC-02: Missing Authentication & Authorization on Core Business Endpoints
- **File & Line**: `backend/routes/api.php:241-428`
- **Vulnerability**: Broken Object Level Authorization (BOLA / IDOR) & Missing Function Level Access Control.
- **Exploit Scenario**:
  Almost all `/v1/*` API endpoints (including `members`, `trainers`, `invoices`, `payroll`, `shifts`, `revenue-billing`, and `superadmin/gyms`) are declared outside `Route::middleware('auth:sanctum')`.
  An unauthenticated attacker can send:
  - `GET /api/v1/invoices`: Returns all customer billing records and payment methods.
  - `DELETE /api/v1/members/mem-5`: Permanently deletes members without an active session or role check.
  - `POST /api/v1/superadmin/gyms`: Provisions or alters tenant gyms.
  Because `Controller::resolveGymId()` falls back to `Gym::first()`, unauthenticated requests automatically receive full read access to the primary gym.
- **Recommendation**:
  Group all business endpoints under `Route::middleware('auth:sanctum')`. Apply role-based gates (`can:manage-members`, `can:view-financials`) and enforce tenant ownership validation in base queries (`where('gym_id', $user->gym_id)`).

---

### SEC-03: Plaintext Password Exposure via Serialization
- **File & Line**: `backend/app/Models/User.php:36`
- **Vulnerability**: Sensitive Data Exposure in API responses.
- **Exploit Scenario**:
  `plain_password` was added to `$fillable` in `User.php` without being included in `$hidden`. When users were returned in JSON (e.g. `POST /api/v1/auth/login` or `GET /api/v1/staff`), cleartext passwords were transmitted over the network and visible in browser DevTools.
- **Remediation**:
  **FIXED**. Added `'plain_password'` to `protected $hidden` in `User.php`.

---

### SEC-04: Plaintext Password Storage in Database
- **File & Line**: `backend/database/migrations/2026_09_21_000001_add_plain_password_to_users_table.php`, `backend/app/Http/Controllers/Api/AuthController.php:61`
- **Vulnerability**: Insecure Credential Storage (CWE-256).
- **Exploit Scenario**:
  Passwords entered during login or staff provisioning are stored directly in `users.plain_password`. A database leak or SQL dump compromises all user and staff credentials in clear text.
- **Recommendation**:
  1. Deprecate and drop `plain_password` from `users` table via a future migration.
  2. Rely exclusively on standard one-way bcrypt hashing (`Hash::make`, `Hash::check`).
  3. Provide a password reset / temporary OTP mechanism for staff instead of storing plaintext credentials.

---

### SEC-05: Missing Rate Limiting on Authentication Endpoints
- **File & Line**: `backend/routes/api.php:230-231`
- **Vulnerability**: Brute Force & Credential Stuffing (CWE-307).
- **Exploit Scenario**:
  An attacker could automate thousands of login attempts per second against `/api/v1/auth/login` without being throttled.
- **Remediation**:
  **FIXED**. Attached `throttle:15,1` (15 requests per minute) to `/api/v1/auth/login` and `throttle:10,1` to registration.

---

### SEC-06: Permissive Wildcard CORS Origins
- **File & Line**: `backend/config/cors.php:22`
- **Vulnerability**: Overly Permissive CORS Policy (`allowed_origins => ['*']`).
- **Exploit Scenario**:
  Any third-party website can make cross-origin JavaScript requests to the gym API on behalf of a user on the same internal network.
- **Recommendation**:
  Replace `allowed_origins => ['*']` with an explicit whitelist:
  `['https://archfit.archenterprises.co.in', 'http://localhost:5173', 'http://127.0.0.1:5173']`.

---

### SEC-07: Bearer Token Storage in Client LocalStorage
- **File & Line**: `frontend/src/services/api.js:157`, `frontend/src/context/AuthContext.jsx:208`
- **Vulnerability**: Token Storage Vulnerable to XSS.
- **Exploit Scenario**:
  Tokens stored in `localStorage` are accessible by any JavaScript running in the same origin. An XSS vulnerability in an npm dependency could exfiltrate `pulsefit_token`.
- **Recommendation**:
  For web clients, implement Laravel Sanctum cookie-based session authentication (`sanctum/csrf-cookie`) with `HttpOnly`, `Secure`, `SameSite=Lax` cookies.

---

### SEC-08: Dependency Vulnerabilities
- **Composer Audit**:
  - `league/commonmark` (affected `<= 2.10.1`, advisory GHSA-97jj-33gv-5xf9 & GHSA-3q6v-r5mr-hxv8).
  - *Recommendation*: Run `composer update league/commonmark` once an upstream release addressing these CVEs is verified.
- **NPM Audit**:
  - `brace-expansion` (High, ReDoS).
  - `dompurify` (DOM XSS in version 3.4.13–3.4.15).
  - *Recommendation*: Run `npm update dompurify brace-expansion` in `frontend/`.

---
*Generated as part of Phase 4 of the Ponytail audit ruleset.*
