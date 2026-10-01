# Phase 2: Code Cleanup & Dead Code Audit

## 1. Backend Audit (Laravel 11)

### 1.1 Routes & Controllers
- **Dual API Route Inclusion**:
  - `backend/routes/web.php` lines 6–8 includes `api.php` under `Route::middleware('api')`.
  - `backend/bootstrap/app.php` also registers `api.php` under the default Laravel API prefix (`/api`).
  - *Observation*: This registers endpoints twice (e.g. `/v1/members` and `/api/v1/members`).
  - *Decision*: **Retained**. The repository comment explicitly notes this is a fallback for shared cPanel hosting environments where server rewrite rules strip the `/api` prefix.
- **Hardware ADMS Routes**:
  - Registered both at the root `/iclock/*` (in `web.php`) and under `/api/v1/iclock/*` (in `api.php`).
  - *Decision*: **Retained**. Hardware biometric clocks (eSSL, ZKTeco) send HTTP POST directly to root `/iclock/cdata`.
- **Controllers & Models**:
  - Checked all 27 controllers in `app/Http/Controllers/Api/` and all 39 Eloquent models in `app/Models/`.
  - Every controller maps to active API routes.
  - Every model is queried by at least one controller or seeder. None are orphaned.

### 1.2 Composer Packages
- Verified `backend/composer.json`:
  - Core runtime dependencies: `php ^8.2`, `laravel/framework ^12.0`, `laravel/sanctum ^4.0`, `laravel/tinker ^2.10.1`.
  - Dev dependencies: `fakerphp/faker`, `laravel/pail`, `laravel/pint`, `laravel/sail`, `mockery/mockery`, `nunomaduro/collision`, `phpunit/phpunit`.
  - *Conclusion*: Lean, no unnecessary third-party packages installed.

### 1.3 Migrations
- 46 database migrations exist.
- Per safety rules: **Never delete or modify existing migrations that have already run.**
- Migrations that introduced columns subsequently updated by comprehensive sync migrations (e.g. `2026_09_28_150000_comprehensive_sync_all_tables_and_columns.php`) are maintained as part of the immutable migration history.

---

## 2. Frontend Audit (React & Vite)

### 2.1 Confirmed Dead Code Removed
- **Unused Seed Arrays in `GymDataContext.jsx`**:
  - `SEED_ADVANCE_REQUESTS` (lines 477–517)
  - `SEED_PT_SESSIONS` (lines 519–560)
  - `SEED_TRAINER_REVIEWS` (lines 561–602)
  - `SEED_EQUIPMENT` (lines 604–612)
  - `SEED_BODY_METRICS` (lines 633–640)
  - *Action*: **Safely removed** (~160 lines of unreachable legacy seed mock data). Dynamic API fetching and empty state fallbacks are used in all corresponding views.
- **Duplicate Context Export Keys in `GymDataContext.jsx`**:
  - `fetchCommissions` (duplicated at lines 3841 & 3871)
  - `fetchPayroll` (duplicated at lines 3844 & 3882)
  - *Action*: **Safely removed** duplicate dictionary entries.

### 2.2 Uncertain / Retained Code
- **`PlanUpgradeLockView.jsx`**:
  - Component is not currently referenced in `App.jsx`, but implements SaaS tier gating (`Basic`, `Gold`, `Platinum`) for future tier locks.
  - *Decision*: **Retained** per Ponytail rule (delete only what is clearly safe, list uncertain items).
- **`ArchFitLogo.jsx`**:
  - Acts as a backward-compatible proxy re-export for `PulseFitLogo.jsx`.
  - *Decision*: **Retained** to avoid breaking any prospective or dynamically imported logo references.
- **`MemberProfilePage.jsx` vs `MemberProfileView.jsx`**:
  - Both serve distinct UI requirements: `MemberProfilePage` renders the dedicated full-screen page route (`case 'member-profile'`), while `MemberProfileView` renders the slide-over inspector modal in the owner dashboard.
  - *Decision*: **Retained both**.

---

## 3. Post-Cleanup Verification

| Check | Baseline | Post-Cleanup | Status |
|---|---|---|---|
| `npm run build` | 1.55s | 1.49s (clean build) | **PASS** |
| `php artisan test` | 2 passed (0.72s) | 2 passed (0.51s) | **PASS** |

---
*Generated as part of Phase 2 of the Ponytail audit ruleset.*
