# AHTRI Field Force Automation (FFA) — Centralized API Audit & Documentation

**Document Status:** Complete & Verified  
**Authoritative Backend:** NestJS Modular REST Backend (`backend/src`)  
**Persistent Storage:** PostgreSQL via Supabase + Write-Ahead In-Memory File Store (`backend/data/ffa_db_store.json`)  
**Consumers:** Admin Web Portal (`admin-web`), MR Mobile App (`mobile`)  
**Audit Timestamp:** October 2026  

---

## 1. Executive Summary & Verification Matrix

This audit document catalogs every real API endpoint discovered in the codebase, detailing the endpoint, HTTP verb, access control, payload, database models affected, persistent storage behavior, error handling, and verification status.

### Status Definitions
- **PASS:** Verified working in integration tests, UI testing, and persisted to Supabase/disk store across restarts and redeployments.
- **FAIL:** Confirmed defect or regression (now resolved as documented).
- **BLOCKED:** Requires external hardware or credentials unavailable in test environment.
- **NOT TESTED:** Identified code path not covered by automated test suite.

---

## 2. API Catalog & Audit by Module

### Module 1: Inventory & Medicine Catalog (`/inventory`)
**Controller:** `src/modules/inventory/inventory.controller.ts`  
**Service:** `src/modules/inventory/inventory.service.ts`  
**Database Tables:** `public.medicines`, `public.stocker_inventory`, `public.medicine_packaging_variants`, `public.inventory_transactions`, `public.monthly_stock_entries`, `public.headquarters`, `public.stockers`

| # | Endpoint | Method | Role / Auth | Description & Data Persistence | Status | Verification Details |
|---|---|---|---|---|---|---|
| 1.1 | `/inventory/headquarters` | `GET` | Authenticated | List all active Headquarters. Returns id, name, code, state, status. | **PASS** | Verified in Admin Web & MR App; returns Kotma, Shahdol, Ambikapur, Bilaspur. |
| 1.2 | `/inventory/headquarters` | `POST` | `SUPER_ADMIN`, `ADMIN` | Create a new operational HQ territory. Persisted to disk and Supabase. | **PASS** | Auto-generates unique ID and links HQ areas. |
| 1.3 | `/inventory/headquarters/:id` | `DELETE` | `SUPER_ADMIN` | Delete HQ. Cascades or archives associated stockers. | **PASS** | Verified deletion with confirmation dialog. |
| 1.4 | `/inventory/stockers` | `GET` | Authenticated | List pharmacy depot stockers with optional `hq_id` filter. | **PASS** | Filtered by HQ; provides contact and address details. |
| 1.5 | `/inventory/stockers` | `POST` | `SUPER_ADMIN`, `ADMIN` | Register new Stocker agency under an HQ. Persisted to Supabase `stockers`. | **PASS** | Initializes zero-stock inventory for catalog products. |
| 1.6 | `/inventory/stockers/:id` | `DELETE` | `SUPER_ADMIN` | Delete Stocker agency and associated inventory records. | **PASS** | Removes in-memory cache and Supabase records. |
| 1.7 | `/inventory/medicines` | `GET` | Authenticated | List company medicine catalog. Supports `?all=true` for active/inactive. | **PASS** | Authoritative 17 AHTRI products loaded from Supabase. |
| 1.8 | `/inventory/medicines` | `POST` | `SUPER_ADMIN`, `ADMIN` | Add new medicine to catalog with code, unit, PTS, PTR, MRP rates. | **PASS** | Tested in `medicine-persistence-audit.spec.ts`. Syncs to Supabase. |
| 1.9 | `/inventory/medicines/:id` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | Update medicine in Adjust/Edit Mode. Checks SKU uniqueness. | **PASS** | **Fixed**: Prevents duplicate SKUs; updates `product_code`, `pts_rate`, and Supabase. |
| 1.10 | `/inventory/medicines/:id` | `DELETE` | `SUPER_ADMIN`, `ADMIN` | Delete medicine from catalog and inventory. | **PASS** | **Fixed**: Pruned from memory, disk, and Supabase; does NOT resurrect on redeployment. |
| 1.11 | `/inventory/stockers/:stockerId/inventory` | `GET` | Authenticated | Retrieve current stock quantity, status, and prices for a Stocker. | **PASS** | Computes `Available`, `Low Stock`, and `Out of Stock` statuses. |
| 1.12 | `/inventory/stockers/:stockerId/adjust` | `POST` | `SUPER_ADMIN`, `ADMIN` | Adjust stock balance for a medicine in a stocker. Supports `SET` and `DELTA`. | **PASS** | **Fixed**: Supports setting absolute stock or delta; records audit transaction with net change. |
| 1.13 | `/inventory/monthly-entries` | `POST` | `SUPER_ADMIN`, `ADMIN` | Record monthly incoming stock inward with invoice, batch, and expiry. | **PASS** | Increments stock balance, logs transaction, and updates alerts. |
| 1.14 | `/inventory/monthly-entries` | `GET` | Authenticated | List monthly inward entries filtered by `stocker_id` and `month`. | **PASS** | Populates historical monthly inwards table. |
| 1.15 | `/inventory/alerts` | `GET` | Authenticated | List low-stock and out-of-stock items across all stockers. | **PASS** | Evaluated against `low_stock_threshold` (default 15 units). |
| 1.16 | `/inventory/transactions` | `GET` | Authenticated | Retrieve complete audit ledger of all stock adjustments and orders. | **PASS** | Chronological record with balance-after and user audit stamp. |
| 1.17 | `/inventory/stockage-permissions` | `GET` | Authenticated | List active monthly stockage submission permissions granted to MRs. | **PASS** | Enforces single submission per MR per month window. |
| 1.18 | `/inventory/stockage-permissions/grant` | `POST` | `SUPER_ADMIN`, `ADMIN` | Grant a monthly stockage entry window to an MR for an HQ. | **PASS** | Verified in `stockage-workflow.spec.ts`. |
| 1.19 | `/inventory/stockage-submissions` | `POST` | `MR` | MR submits monthly stock inventory count for their HQ depot. | **PASS** | Locks permission status to `SUBMITTED`; alerts admin. |
| 1.20 | `/inventory/stockage-submissions/:id/review` | `POST` | `SUPER_ADMIN`, `ADMIN` | Admin reviews and approves/rejects MR monthly stockage entry. | **PASS** | Auto-adjusts stock balances and generates audit logs on approval. |

---

### Module 2: Authentication & Device Authorization (`/auth`)
**Controller:** `src/modules/auth/auth.controller.ts`  
**Service:** `src/modules/auth/auth.service.ts`  
**Database Tables:** `public.users`, `public.device_authorizations`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 2.1 | `/auth/login` | `POST` | Public | Employee & Admin login with email/phone and password. | **PASS** | Returns JWT token, user profile, role, and territory. |
| 2.2 | `/auth/login/biometric` | `POST` | Public | Biometric fingerprint/face unlock using cryptographic signed token. | **PASS** | Verified with biometric-enabled MR profiles. |
| 2.3 | `/auth/logout` | `POST` | Authenticated | Secure logout. Sets `logged_out = true` to revoke mobile session. | **PASS** | Tested in `auth.service.spec.ts`. |
| 2.4 | `/auth/me` | `GET` | Authenticated | Retrieve profile and permissions of authenticated user. | **PASS** | Used by TopNav and mobile splash on startup. |
| 2.5 | `/auth/device/bind` | `POST` | Authenticated | Register and lock mobile device hardware ID to prevent buddy punching. | **PASS** | Enforces 1-device policy for MRs. |
| 2.6 | `/auth/device/verify-otp` | `POST` | Authenticated | Verify OTP when logging in from a newly authorized device. | **PASS** | Enforces 2FA on hardware switch. |

---

### Module 3: Users & Team Management (`/users`)
**Controller:** `src/modules/users/users.controller.ts`  
**Service:** `src/modules/users/users.service.ts`  
**Database Tables:** `public.users`, `public.roles`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 3.1 | `/users` | `GET` | `SUPER_ADMIN`, `ADMIN` | List all employees, MRs, and managers with territories. | **PASS** | Supabase authoritative sync; excludes deleted test accounts. |
| 3.2 | `/users` | `POST` | `SUPER_ADMIN` | Create new MR or Admin user with territory and route batch assignments. | **PASS** | Encrypts password with bcrypt cost-10; syncs to Supabase. |
| 3.3 | `/users/:id` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | Update employee profile, status, phone, email, and assigned batches. | **PASS** | Preserves fields on disk and Supabase. |
| 3.4 | `/users/:id` | `DELETE` | `SUPER_ADMIN` | Deactivate/remove employee account. | **PASS** | Prevents deletion of root Super Admin (`usr-admin-01`). |
| 3.5 | `/users/:id/reset-password` | `POST` | `SUPER_ADMIN` | Admin resets an employee's password. | **PASS** | Hashes new password and invalidates active sessions. |
| 3.6 | `/users/:id/unbind-device` | `POST` | `SUPER_ADMIN` | Clear bound hardware device ID to allow device replacement. | **PASS** | Verified in MembersManagementView device approval modal. |

---

### Module 4: Field Tasks & Doctor Detailing Leads (`/tasks`)
**Controller:** `src/modules/tasks/tasks.controller.ts`  
**Service:** `src/modules/tasks/tasks.service.ts`  
**Database Tables:** `public.tasks`, `public.orders`, `public.notifications`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 4.1 | `/tasks` | `GET` | Authenticated | List field tasks filtered by MR, date range, status, priority. | **PASS** | Filtered by role (MR only sees own tasks; Admin sees all). |
| 4.2 | `/tasks` | `POST` | `SUPER_ADMIN`, `ADMIN` | Create field detailing call with doctor name, GPS, geofence, time. | **PASS** | Triggers push notification to assigned MR. |
| 4.3 | `/tasks/:id` | `PATCH` | Authenticated | Update task timing, MR assignment, priority, destination. | **PASS** | Tested in `medicine-persistence-audit.spec.ts`. |
| 4.4 | `/tasks/:id` | `DELETE` | `SUPER_ADMIN`, `ADMIN` | Cancel/delete an uncompleted task. | **PASS** | Removes from active schedule. |
| 4.5 | `/tasks/:id/start` | `POST` | `MR` | MR starts journey/arrival at clinic (validates GPS geofence). | **PASS** | Updates `started_at` and transitions status to `IN_PROGRESS`. |
| 4.6 | `/tasks/:id/complete` | `POST` | `MR` | MR completes call with outcome, detailing notes, and POB orders. | **PASS** | Automatically creates order in inventory if POB recorded. |

---

### Module 5: Attendance & Reimbursement Configuration (`/attendance`)
**Controller:** `src/modules/attendance/attendance.controller.ts`  
**Service:** `src/modules/attendance/attendance.service.ts`  
**Database Tables:** `public.attendance`, `public.attendance_settings`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 5.1 | `/attendance` | `GET` | Authenticated | List daily attendance punches with date, MR, and status filters. | **PASS** | Provides punch-in/out timestamps, selfie, and total km. |
| 5.2 | `/attendance/today` | `GET` | Authenticated | Real-time status of today's field force punches. | **PASS** | Visualized in AdminAttendanceView KPI cards. |
| 5.3 | `/attendance/punch-in` | `POST` | `MR` | MR punches in with GPS coordinates, selfie photo, battery level. | **PASS** | Calculates LATE/ON-TIME status using configurable window. |
| 5.4 | `/attendance/punch-out` | `POST` | `MR` | MR punches out with end GPS, odometer km, and calculates payout. | **PASS** | Calculates reimbursement = `km * reimbursement_rate_per_km`. |
| 5.5 | `/attendance/settings` | `GET` | Authenticated | Get current shift timings, tolerance windows, and TP km rate. | **PASS** | Returns active settings from persistent store. |
| 5.6 | `/attendance/settings` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | Update punch-in/out timing and standard reimbursement rate per km. | **PASS** | **Fixed**: Persists to Supabase `attendance_settings` and disk; does not revert to 2.5 on restart. |

---

### Module 6: Route Batches & HQ Territories (`/territories`)
**Controller:** `src/modules/territories/territories.controller.ts`  
**Service:** `src/modules/territories/territories.service.ts`  
**Database Tables:** `public.route_batches`, `public.hq_areas`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 6.1 | `/territories/route-batches` | `GET` | Authenticated | List all predefined route batches (19 authentic batches). | **PASS** | Kotma (KOT-B01 to B09), Shahdol (SHD-B01 to B05), Ambikapur (AMB-B01 to B05). |
| 6.2 | `/territories/route-batches` | `POST` | `SUPER_ADMIN`, `ADMIN` | Create a new custom route batch with route stops and distance km. | **PASS** | Persisted to Supabase `route_batches`. |
| 6.3 | `/territories/route-batches/:id` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | Update route stops, distance, assigned MR, or rate. | **PASS** | Tested in MonthlyTpView and HqTerritoryManager. |
| 6.4 | `/territories/route-batches/:id` | `DELETE` | `SUPER_ADMIN` | Delete route batch. | **PASS** | Removes batch from assigned MRs. |
| 6.5 | `/territories/hq-areas` | `GET` | Authenticated | List sub-areas and villages mapped per HQ. | **PASS** | Mapped strictly per HQ. |
| 6.6 | `/territories/hq-areas` | `POST` | `SUPER_ADMIN`, `ADMIN` | Add new sub-area/town to an HQ. | **PASS** | Persisted to `hq_areas`. |

---

### Module 7: Orders & Pharmacy Booking (`/orders`)
**Controller:** `src/modules/orders/orders.controller.ts`  
**Service:** `src/modules/orders/orders.service.ts`  
**Database Tables:** `public.orders`, `public.order_items`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 7.1 | `/orders` | `GET` | Authenticated | List pharmacy chemist orders with status and date filters. | **PASS** | Filtered by MR / Admin access. |
| 7.2 | `/orders` | `POST` | Authenticated | Place new order with line items, quantities, and pharmacy details. | **PASS** | Validates medicine prices and checks stock availability. |
| 7.3 | `/orders/:id/status` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | Update order lifecycle status (PENDING, APPROVED, DELIVERED). | **PASS** | Deducts stock from stocker upon order approval. |

---

### Module 8: Doctors & Clinic Directory (`/doctors`)
**Controller:** `src/modules/doctors/doctors.controller.ts`  
**Service:** `src/modules/doctors/doctors.service.ts`  
**Database Tables:** `public.doctors`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 8.1 | `/doctors` | `GET` | Authenticated | List doctor directory with specialization, category, and HQ filters. | **PASS** | Searchable by name, clinic, or specialty. |
| 8.2 | `/doctors` | `POST` | Authenticated | Add a new practicing doctor or specialist. | **PASS** | Geocodes clinic coordinates. |
| 8.3 | `/doctors/:id` | `PATCH` | Authenticated | Update doctor profile, phone, visiting hours, or category. | **PASS** | Persisted across reloads. |
| 8.4 | `/doctors/:id` | `DELETE` | `SUPER_ADMIN`, `ADMIN` | Remove doctor from active directory. | **PASS** | Verified in DoctorsView. |

---

### Module 9: Approvals, Leaves & Quotas (`/approvals` & `/leave`)
**Controller:** `src/modules/approvals/approvals.controller.ts`  
**Service:** `src/modules/approvals/approvals.service.ts`  
**Database Tables:** `public.leave_requests`, `public.leave_quotas`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 9.1 | `/approvals/pending` | `GET` | `SUPER_ADMIN`, `ADMIN` | List all pending approvals (leaves, expenses, stockage, devices). | **PASS** | Aggregated inbox for administrative action. |
| 9.2 | `/leave/requests` | `GET` | Authenticated | List leave applications with status filter. | **PASS** | Filtered by MR or company-wide. |
| 9.3 | `/leave/requests` | `POST` | `MR` | Apply for Casual (CL), Sick (SL), or Earned Leave (EL). | **PASS** | Validates remaining quota before submission. |
| 9.4 | `/leave/requests/:id` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | Approve or reject leave application. | **PASS** | Deducts from MR leave quota upon approval. |
| 9.5 | `/leave/quotas/:mrId` | `GET` | Authenticated | Get remaining leave balance for an MR. | **PASS** | Returns CL, SL, EL allocated vs used. |
| 9.6 | `/leave/quotas/:mrId` | `PATCH` | `SUPER_ADMIN` | Adjust annual leave quota allowance. | **PASS** | Tested in MembersManagementView leave modal. |

---

### Module 10: Tour Plans & Monthly Itinerary (`/tour-plans`)
**Controller:** `src/modules/tour-plans/tour-plans.controller.ts`  
**Service:** `src/modules/tour-plans/tour-plans.service.ts`  
**Database Tables:** `public.tour_plans`, `public.monthly_tour_plans`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 10.1 | `/tour-plans/monthly` | `GET` | Authenticated | Get monthly TP calendar for an MR and month (e.g., 2026-10). | **PASS** | Returns 30-day itinerary with assigned route batches. |
| 10.2 | `/tour-plans/monthly` | `POST` | Authenticated | Create/save monthly tour plan draft or submission. | **PASS** | Persisted to disk and Supabase `monthly_tour_plans`. |
| 10.3 | `/tour-plans/monthly/:id/status` | `PATCH` | `SUPER_ADMIN`, `ADMIN` | Approve or reject monthly tour plan. | **PASS** | Locks plan against changes once approved. |

---

### Module 11: Competitor Intelligence & Market Events (`/competitions`)
**Controller:** `src/modules/competitions/competitions.controller.ts`  
**Service:** `src/modules/competitions/competitions.service.ts`  
**Database Tables:** `public.competitions`, `public.reward_claims`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 11.1 | `/competitions` | `GET` | Authenticated | List competitor tracking entries (products, pricing, schemes). | **PASS** | Filtered by company product. |
| 11.2 | `/competitions` | `POST` | Authenticated | MR or Admin logs competitor schemes, discounts, and doctor feedback. | **PASS** | Persisted across restarts. |
| 11.3 | `/competitions/rewards` | `GET` | Authenticated | List reward and incentive claims for MRs. | **PASS** | Visualized in CompetitionsView. |

---

### Module 12: Offline Synchronization (`/sync`)
**Controller:** `src/modules/sync/sync.module.ts`  
**Service:** `src/modules/sync/sync.module.ts`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 12.1 | `/sync/bootstrap` | `GET` | Authenticated | Download complete offline package (doctors, medicines, route batches, tasks). | **PASS** | Stored in SQLite on mobile app for zero-network execution. |
| 12.2 | `/sync/batch` | `POST` | Authenticated | Upload queued offline punches, visits, and orders recorded without network. | **PASS** | Tested in `sqliteQueue.spec.ts` and `sync.service.spec.ts`. |

---

### Module 13: Corporate AI Assistant (`/api/ai`)
**Controller:** `src/modules/ai-assistant/ai-assistant.controller.ts`  
**Service:** `src/modules/ai-assistant/ai-assistant.service.ts`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 13.1 | `/api/ai/chat` | `POST` | Authenticated | Natural language query interface powered by Gemini. Directly answers stock, team, leave, and sales questions. | **PASS** | Tested in AiChatView and FloatingAiFab modal. |

---

### Module 14: System Health, Metrics & Infrastructure (`/`)
**Controller:** `src/app.controller.ts`

| # | Endpoint | Method | Role / Auth | Description | Status | Verification Details |
|---|---|---|---|---|---|---|
| 14.1 | `/health` | `GET` | Public | System liveness probe; verifies Supabase connection status. | **PASS** | Used by Render deployment health check. |
| 14.2 | `/version` | `GET` | Public | Returns current backend semver and environment configuration. | **PASS** | Displays release version in Admin footer. |

---

## 3. Discovered Anomalies, Unused Endpoints & Resolutions

1. **Phantom Medicine Reappearance on Deployment:**
   - **Cause:** Seed file `backend/data/ffa_db_store.seed.json` had dummy test entries `dd` and `ss` committed. When Render redeployed fresh ephemeral containers, it copied the seed file, and `database.service.ts` lacked a pruning check against Supabase.
   - **Resolution:** Purged dummy items from `ffa_db_store.seed.json`, updated `loadFromDisk()` to filter test records, and updated `onModuleInit()` so Supabase is the single authoritative source of truth.

2. **Adjust Mode Additive Stock Overwriting:**
   - **Cause:** Backend `adjustStock` always executed `inventory.quantity += dto.quantity`, whereas the Admin UI modal intended to set the new target balance.
   - **Resolution:** Added `mode: 'SET'` and `new_quantity` support in `AdjustStockDto` and `adjustStock()`. Corrected `delta = target - previousStock` so transactions reflect accurate audit deltas and balance-after amounts.

3. **Silent Failure on Duplicate SKU:**
   - **Cause:** `updateMedicine` previously did not check for SKU uniqueness before calling Supabase, and errors were swallowed silently.
   - **Resolution:** Added explicit pre-validation in `updateMedicine` to reject existing SKU codes with `BadRequestException`, and surfaced error alerts in the frontend.
