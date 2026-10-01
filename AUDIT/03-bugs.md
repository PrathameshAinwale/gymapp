# Phase 3: Bugs, Errors & Reliability Audit

This report documents bugs, performance anti-patterns, and reliability issues identified across the Laravel backend and React frontend.

---

## 1. Findings & Remediation Log

| ID | File : Line | Description | Severity | Status |
|---|---|---|---|---|
| **BUG-01** | `backend/app/Http/Controllers/Api/InvoiceController.php:28` | **Severe N+1 Query in Invoices Index**: Iterated over all invoices in PHP collection map and executed 2 individual database queries per invoice (`RevenueBilling::where('reference_no', ...)` and `User::where('role', 'owner')`). For 100 invoices, this caused 200+ redundant SQL queries per request. | **High** | **FIXED** (Batch pre-fetched RevenueBilling using `whereIn` and cached gym owner in a single pass; reduced queries from `2N + 1` to 3). |
| **BUG-02** | `backend/app/Http/Controllers/Api/MemberController.php:234` | **Redundant Relationship Queries in `show()`**: Called relation query methods `$user->workoutPlans()->latest()->first()`, `$user->dietPlans()->latest()->first()`, `$user->bodyMetrics()->latest()->get()`, and `$user->invoices()->latest()->get()` despite all four relations already being eager-loaded at line 195. | **Medium** | **FIXED** (Switched to sorting the already loaded Eloquent collections in memory via `sortByDesc`, saving 4 DB roundtrips per profile view). |
| **BUG-03** | `backend/app/Http/Controllers/Api/OperationsController.php:167` | **Hardcoded Foreign Key & Non-Transactional Stock Sale**: `sellProduct()` hardcoded `'user_id' => 1` for product invoices without checking if user 1 exists, triggering foreign key constraint failure if user 1 is absent. Also lacked database transactions, risking inventory inconsistency if invoice insertion failed. | **High** | **FIXED** (Safely resolves purchaser ID or fallback active gym owner; wrapped stock deduction and invoice creation inside `DB::transaction`). |
| **BUG-04** | `backend/app/Http/Controllers/Api/StaffController.php:56` | **CPU-Intensive Bcrypt Loop in Staff Listing**: Inside the collection map for staff accounts, repeated `Hash::check()` calls were executed with hardcoded strings (`sohan123`, `trainer123`, `123456`) across all staff members without stored plain passwords, degrading response latency under load. | **Medium** | **FIXED** (Eliminated iterative bcrypt hashes in read path; credentials authenticated on login instead). |
| **BUG-05** | `backend/app/Http/Controllers/Api/MemberController.php:357` | **Non-Transactional Multi-Entity Write in Member Registration**: Member registration creates a `User`, `MemberProfile`, `Invoice`, `RevenueBilling`, and optional `PtSession`. A database crash or validation exception mid-flow leaves orphaned user accounts. | **Medium** | **Documented** (Recommend wrapping entire creation pipeline in `DB::transaction`). |
| **BUG-06** | `backend/app/Http/Controllers/Api/EnquiryController.php:399` | **Non-Transactional Lead Conversion**: Converting an enquiry lead to a member executes multi-table mutations across `users`, `member_profiles`, and `plans` without an atomic transaction boundary. | **Medium** | **Documented** (Recommend `DB::transaction`). |
| **BUG-07** | `frontend/src/context/GymDataContext.jsx:3841` | **Duplicate Context Dictionary Keys**: Duplicate declarations of `fetchCommissions` and `fetchPayroll` in context provider value object. | **Low** | **FIXED** (Removed duplicates in Phase 2). |
| **BUG-08** | `frontend/src/context/GymDataContext.jsx:477` | **160+ Lines of Unreachable Dead Seed Constants**: `SEED_ADVANCE_REQUESTS`, `SEED_PT_SESSIONS`, `SEED_TRAINER_REVIEWS`, `SEED_EQUIPMENT`, `SEED_BODY_METRICS` declared in module scope but never consumed. | **Low** | **FIXED** (Cleaned up in Phase 2). |
| **BUG-09** | `backend/app/Http/Controllers/Controller.php:54` | **Tenant Isolation Default Fallback**: If an incoming request lacks an authenticated Sanctum user, `X-Gym-Id` header, or `gym_id` parameter, `resolveGymId()` falls back to `Gym::first()?->id ?? 1`. While convenient for single-tenant local dev, in multi-tenant production this leaks Gym 1 data to unauthenticated requests. | **High** | **Documented** (Addressed in Phase 4 Security: require authentication middleware). |
| **BUG-10** | `frontend/src/components/owner/OwnerDashboard.jsx:2206` | **Duplicate Profile Views (`MemberProfilePage` vs `MemberProfileView`)**: Both a full-page component and a modal slide-over component exist for member profile inspection with overlapping state handling. | **Low** | **Documented** (Retained for different interaction contexts; recommended to consolidate into a single shared profile details presenter). |

---

## 2. Test & Verification Summary

- **PHPUnit / Artisan Tests**: 2 passed (0.50s)
- **Vite Production Build**: Passed in 2.43s with zero build errors
- **Static Code Analysis**: oxlint errors related to duplicate keys resolved

---
*Generated as part of Phase 3 of the Ponytail audit ruleset.*
