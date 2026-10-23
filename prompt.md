# MR Tour Plan Management, Change Requests, and Geofenced Task Automation
## Comprehensive Technical Architecture, Implementation Log & Handover Guide

This document captures all functional requirements, root-cause analyses, architectural decisions, code changes, database models, and verification steps implemented across the **Backend**, **Mobile App**, and **Admin Web Dashboard**. Any incoming agent or developer can use this document to understand the system in its entirety and continue development seamlessly.

---

### 1. Executive Summary & Objectives

The Medical Representative (MR) Tour Plan (TP) system was upgraded according to the Functional Requirements Document (FRD) to resolve key operational gaps:
1. **TP Approval Status Synchronization**: Fixed an issue where an approved Tour Plan remained displayed as "Submitted" in the MR mobile application.
2. **Admin-Approved TP Change Request Workflow**: Implemented a formal deviation/modification request system allowing MRs to request changes to already approved plans while keeping the current approved plan active until admin authorization.
3. **Automated Geofenced Task Generation**: Automated the generation of location-based tasks from approved Tour Plans with strict 50m geofences, sequential timing, and dynamic coordinate resolution with zero hardcoded fallbacks.
4. **Preservation of Manual Tasks**: Maintained full capability for manual task assignment alongside automated Tour Plan tasks, distinguished by task source tags.
5. **Task Reconciliation Engine**: Built an idempotent reconciliation algorithm that updates tasks when an approved Tour Plan changes without destroying completed tasks or historical audits.
6. **Strict Backend Geofence Enforcement**: Enforced real-time GPS verification at the server API layer to prevent geofence bypasses.

---

### 2. Root Cause Analysis & Solutions

#### Problem A: Approved Tour Plan Stuck on "Submitted" in Mobile App
- **Root Cause 1 (Backend/Admin Interaction)**: In `MonthlyTpView.tsx`, the admin approve button was originally hitting `/tour-plans/:id/entries/:entryId/reimbursement`, which updated `entry.reimbursement_status = 'APPROVED'` but left the parent `plan.status = 'SUBMITTED'`.
- **Root Cause 2 (Casing Mismatch)**: The mobile app checked strict equality `plan.status === 'APPROVED'`. When backend returned `'Approved'` or when legacy data contained mixed casing, the check failed.
- **Root Cause 3 (Client Cache Stale Overwrite)**: In `MonthlyTpScreen.tsx`, local offline cache was improperly prioritized or merged, allowing stale cached `'SUBMITTED'` records to overwrite authoritative server records.
- **Solution Implemented**:
  1. Updated `MonthlyTpView.tsx` with explicit top-level **"Approve Plan"** and **"Reject Plan"** actions hitting `PATCH /tour-plans/:id/status` with `{ status: 'APPROVED' }`.
  2. Enhanced `decideReimbursement` in `tour-plans.service.ts`: when all entries in a plan are approved, the plan automatically transitions to `'APPROVED'` and triggers task generation.
  3. Added `normalizeTourPlans()` in `MonthlyTpScreen.tsx` to handle case-insensitive statuses (`'APPROVED' | 'Approved' | 'REJECTED' | 'Rejected'`).
  4. Updated `fetchMyTourPlans()` to ensure server records are authoritative and immediately persist normalized data to `@ahtri_tp_cache_${currentUserId}`.

#### Problem B: Geofence Validation Client Bypass
- **Root Cause**: `completeTask` previously defaulted `lat = dto.latitude || task.latitude`, allowing callers to omit GPS coordinates and automatically pass distance checks.
- **Solution Implemented**: Enforced strict backend validation: rejected non-admin completion requests if GPS coordinates are missing or if the user is outside `geofence_radius_m + accuracyBuffer`.

#### Problem C: Hardcoded Fallback Coordinates
- **Root Cause**: Legacy code previously fell back to Shahdol coordinates (`23.2953, 81.3586`) when resolving location coordinates.
- **Solution Implemented**: Built `resolveLocationCoordinates()` in `tour-plans.service.ts` to dynamically resolve coordinates from:
  1. Marked Saved Locations (`savedLocations`),
  2. Doctors directory (`doctors`),
  3. Dynamic Multi-Territory Headquarters Centers (`HQ_CENTERS` for Kotma, Ambikapur, Shahdol, Manpur, Baikunthpur, etc.),
  4. Territory boundary center calculations.
  Zero hardcoding of Shahdol or any single territory fallback exists.

---

### 3. Detailed Architectural Implementation

#### A. Backend Changes

1. **Database Schema & Types (`backend/src/database/database.types.ts`)**:
   - `Task`: Added `source?: 'Manual' | 'TourPlan'` and `tp_id?: string`.
   - `SavedLocation`: Added `geofence_radius_m?: number`.
   - `RouteChangeRequest`: Extended with:
     - `original_area?: string`
     - `requested_area?: string`
     - `requested_locations?: Array<{ id: string; name: string; category?: string; address?: string; latitude?: number; longitude?: number }>`
     - `requested_work_type?: string`
     - `requested_kol_drs?: string`
     - `requested_activity?: string`

2. **DTOs (`backend/src/modules/tour-plans/tour-plans.dto.ts`)**:
   - `UpdateTpStatusDto`: Added `@IsIn(['APPROVED', 'REJECTED', 'Approved', 'Rejected'])`.
   - `CreateRouteChangeRequestDto`: Added `requested_area`, `requested_locations`, `requested_work_type`, `requested_kol_drs`, `requested_activity`.
   - `ReviewRouteChangeRequestDto`: Added `@IsIn(['APPROVED', 'REJECTED', 'Approved', 'Rejected'])`.

3. **Tasks Service (`backend/src/modules/tasks/tasks.service.ts`)**:
   - `createTask()`: Explicitly sets `source: 'Manual'` on all manually created tasks.
   - `completeTask()`: Enforces real-time GPS coordinate validation and geofence boundary checks. Rejects API bypasses.

4. **Tour Plans Service (`backend/src/modules/tour-plans/tour-plans.service.ts`)**:
   - `updateTpStatus()`: Normalizes status case-insensitively, updates all item reimbursement statuses, invokes `reconcileTasksForTourPlan()`, sends push notifications, and calls `this.db.flushToDisk()`.
   - `decideReimbursement()`: Transitions the entire plan to `'APPROVED'` if all visits are approved, triggering task generation.
   - `resolveLocationCoordinates()`: Dynamically extracts coordinates for any location string or doctor from saved locations, doctors database, or territory HQ center mappings.
   - `reconcileTasksForTourPlan()`:
     - Detects unchanged visits and preserves existing tasks and their completion state.
     - Creates new 50m geofenced tasks with sequential timestamps (e.g., 10:00 AM, 11:30 AM, 2:00 PM) for new locations.
     - Cancels unstarted tasks for superseded dates/routes (`status = 'CANCELLED'`).
     - Never deletes or overwrites completed tasks or audit history.
     - Operates idempotently: repeated calls produce no duplicate tasks.
     - Tags all generated tasks with `source: 'TourPlan'` and `tp_id: plan.id`.
   - `submitRouteChangeRequest()`:
     - Validates that the plan is in `APPROVED` status.
     - Prevents duplicate pending requests for the same date.
     - Captures original route/area/locations and requested route/area/locations.
     - Leaves the active plan and active tasks unchanged while request is `PENDING`.
   - `reviewRouteChangeRequest()`:
     - On approval, updates the target Tour Plan entry with new route, area, and locations.
     - Recalculates distance and reimbursement amount.
     - Triggers `reconcileTasksForTourPlan()` to synchronize the MR's task agenda.
     - Notifies the MR of the approval or rejection with admin remarks.

---

#### B. Mobile Application Changes

1. **Tour Plan Screen (`mobile/src/screens/MonthlyTpScreen.tsx`)**:
   - **Case-Insensitive Normalization**: Implemented `normalizeTourPlans()` mapping backend casing to standard `'Approved'`, `'Rejected'`, `'Submitted'`.
   - **Authoritative Server Sync**: `fetchMyTourPlans()` updates state directly from server response and stores in `@ahtri_tp_cache_${currentUserId}`.
   - **Approval Badges**: Checks `['APPROVED', 'Approved'].includes(plan.status)` and renders green `● Approved` badge.
   - **Route Change Request Submission Modal**:
     - Removed invalid web `<strong>` tags, using `<Text style={{ fontWeight: 'bold' }}>`.
     - Added Planned Area input (`rcRequestedArea`).
     - Added Route Batch selector from HQ batches (`rcRequestedBatch`).
     - Added Doctor / Location selection checkboxes from `mrLocations` (`rcSelectedLocIds`).
     - Added Reason for Deviation multiline input (`rcReason`).
   - **Pending Status Visibility**:
     - Visually flags entries that have pending change requests with an amber banner: `⏳ Change Request Pending: ... Reason: ...`.
     - Displays admin remarks on rejected change requests: `❌ Change Request Declined: "..."`.
     - Disables duplicate change request submissions while one is pending.

---

#### C. Admin Web Application Changes

1. **TypeScript Definitions (`admin-web/src/types.ts`)**:
   - Extended `TaskItem` with `source?: 'Manual' | 'TourPlan'` and `tp_id?: string`.

2. **Monthly Tour Plan View (`admin-web/src/views/MonthlyTpView.tsx`)**:
   - **Plan-Level Approval Banner**: Displays distinct tour plans in current view with an **"Approve Plan"** button (triggers task generation) and **"Reject Plan"** button.
   - **Route Change Requests Subtab**:
     - Added 3rd subtab: `Route Change Requests (${pendingCount} Pending)`.
     - Features side-by-side comparison cards:
       - **Current Approved**: Route Batch, Area, Planned Stops.
       - **Requested Deviation**: Requested Batch, Area, Proposed Stops.
       - **MR Reason**: Displayed in prominent callout box.
       - **Actions**: "Approve & Update Tour Plan" (green) and "Reject Deviation" (red).

3. **Approvals View (`admin-web/src/views/ApprovalsView.tsx`)**:
   - Dedicated `ROUTE_CHANGE` filter to review, approve, or reject route change requests alongside leave and suspended tasks.

4. **Tasks View (`admin-web/src/views/TasksView.tsx`)**:
   - **Source Filter**: Added dropdown `Source: All Sources | 🗺️ Tour Plan Generated | 👤 Manually Assigned`.
   - **Origin Badges**: Each card displays `🗺️ TP Task` (with TP ID reference) or `👤 Manual`.

---

### 4. Verification & Testing Results

All components were built, compiled, and verified with zero errors:

| Component | Test / Build Command | Result |
| :--- | :--- | :--- |
| **Backend** | `npm --prefix backend run build` | **Exit Code 0** (0 TypeScript errors) |
| **Admin Web** | `npm --prefix admin-web run build` | **Exit Code 0** (0 TypeScript errors, Vite build succeeded in 10.04s) |
| **Mobile App** | `npx tsc --noEmit` in `mobile` | **Exit Code 0** (0 TypeScript errors) |
| **Verification Script** | `node test_tp_and_tasks.js` | **ALL 14 CHECKS PASSED (100% OK)** |

The functional test script verified:
- Database schema extensions (`Task.source`, `Task.tp_id`, `SavedLocation.geofence_radius_m`, `RouteChangeRequest` fields).
- Task reconciliation logic and zero hardcoding of Shahdol in coordinates resolution.
- Multi-territory `HQ_CENTERS` dynamic coordinate mapping.
- Change request submission and review workflows.
- Status normalization across uppercase and title-case variants.
- Strict server-side geofence presence verification.
- Mobile cache synchronization and absence of invalid web elements.
- Admin Web task source filtering and badges.

---

### 5. Key File Paths for Reference

- **Backend**:
  - `backend/src/database/database.types.ts`: Core data models and types.
  - `backend/src/modules/tour-plans/tour-plans.service.ts`: TP approval, reconciliation, and change request logic.
  - `backend/src/modules/tour-plans/tour-plans.controller.ts`: TP and change request REST endpoints.
  - `backend/src/modules/tour-plans/tour-plans.dto.ts`: DTO validations.
  - `backend/src/modules/tasks/tasks.service.ts`: Task creation, geofence verification, and completion.
- **Mobile**:
  - `mobile/src/screens/MonthlyTpScreen.tsx`: Tour plan display, caching, and change request modal.
- **Admin Web**:
  - `admin-web/src/views/MonthlyTpView.tsx`: Plan approval banner and Route Change Requests subtab.
  - `admin-web/src/views/ApprovalsView.tsx`: Approvals central queue.
  - `admin-web/src/views/TasksView.tsx`: Tasks dashboard with source filtering and badges.
  - `admin-web/src/types.ts`: Shared web interfaces.
- **Test Scripts**:
  - `test_tp_and_tasks.js`: Verification test suite.

---

### 6. Guide for Incoming Agents

1. **Database Persistence**: The backend uses an in-memory database with asynchronous disk flushing (`this.db.flushToDisk()`). Always invoke `await this.db.flushToDisk()` after mutating Tour Plans, Tasks, or Change Requests.
2. **Dynamic Coordinates**: Never hardcode coordinate fallbacks. Use `this.resolveLocationCoordinates()` which handles marked locations, doctor clinics, and HQ territory centers dynamically.
3. **Task Sources**: All tasks created from Tour Plans must have `source: 'TourPlan'` and `tp_id: plan.id`. All manually assigned tasks must have `source: 'Manual'`.
4. **Task Reconciliation**: When modifying an approved Tour Plan, always invoke `await this.reconcileTasksForTourPlan(plan, adminId)` to ensure the MR's on-ground agenda remains synchronized with approved routes.

---

### 7. Mobile APK Build & Distribution (Version 1.0.41 / Build Code 42)

The project leverages a dual-pipeline release architecture:
1. **GitHub Actions Automated APK Builder (`.github/workflows/build-apk.yml`)**:
   - **Trigger**: Automatic on push to `main` with `mobile/**` changes.
   - **Run ID**: `39942910637` (Status: `Success`)
   - **Tooling**: Gradle 8, OpenJDK 17, Android SDK cmdline-tools, `assembleRelease`.
   - **GitHub Release Created**: `v1.0.41` at [GitHub Releases](https://github.com/shivanshlpu/project1/releases/tag/v1.0.41)
   - **Release Artifacts**:
     - `ahtri-ffa-mobile-v1.0.41.apk` (63.15 MB)
     - `ahtri-ffa-mobile.apk` (63.15 MB)

2. **EAS Cloud Builder (`eas.json`)**:
   - **EAS Project**: `@shiva900/ahtri-ffa-mobile`
   - **EAS Build ID**: `281ca3d1-3078-496d-8628-3c4328729908`
   - **EAS Build Status**: `FINISHED` (Exit Code 0)
   - **Expo Direct Artifact**: `https://expo.dev/artifacts/eas/XzwNupggRzqHIntEABXt5II4wGtqS7MbSBmhOH6URMg.apk`

- **Local Binary Artifacts (~63.15 MB)**:
  - `mobile/ahtri-ffa-latest.apk`
  - `mobile/build-output/ahtri-ffa-mobile-v1.0.41.apk`
  - `mobile/build-output/ahtri-ffa-mobile.apk`
- **Public & Permanent Download Links**:
  - GitHub Release Link: `https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile.apk`
  - Versioned Link: `https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile-v1.0.41.apk`
  - Backend Universal Redirect: `https://ahtri-backend.onrender.com/download-apk`
  - Backend Version Info: `https://ahtri-backend.onrender.com/api/app/version`
- **Synchronized Version Config Files**:
  - `mobile/app.json`: `version: "1.0.41"`, `versionCode: 42`
  - `mobile/package.json`: `version: "1.0.41"`
  - `mobile/src/services/appUpdateService.ts`: `CURRENT_APP_VERSION = '1.0.41'`, `CURRENT_APP_VERSION_CODE = 42`
  - `backend/src/app.controller.ts`: `defaultAppVersion` set to `1.0.41`, `42`
  - `backend/data/app_version.json`: `latestVersion: "1.0.41"`, `latestVersionCode: 42`
  - `admin-web/src/views/SettingsView.tsx`: `v1.0.41`, `Code 42`
  - `LATEST_APK_INFO.md`: Full release documentation and employee instructions.


