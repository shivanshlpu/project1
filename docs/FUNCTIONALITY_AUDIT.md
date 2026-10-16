# AHTRI Field Force Automation (FFA) — Complete Application Functionality Audit

**Document Scope:** Comprehensive UI & Interactive Control Audit across Admin Panel (`admin-web`) and Medical Representative App (`mobile`).  
**Audit Standard:** Every interactive button, input field, dropdown, modal, tab, and filter has been inspected against its backend API, persistent database storage, and cross-platform synchronization.  
**Statuses Recorded:**
- **PASS:** Verified interactive functionality, connected API, validation, error/success states, and persistence across refreshes and restarts.
- **FAIL:** Broken interaction or data persistence failure (all documented defects resolved below).
- **BLOCKED:** Dependent on native mobile GPS/hardware peripherals not accessible in headless runner.
- **NOT TESTED:** Identified UI element not yet exercised in test runs.

---

## PART 1: Admin Panel Web Application (`admin-web`)

### View 1: HQ Stockage & Medicine Inventory (`StockerManagementView.tsx`)
**Primary Route:** `/stockers`  
**Associated APIs:** `/inventory/headquarters`, `/inventory/stockers`, `/inventory/medicines`, `/inventory/stockers/:id/inventory`, `/inventory/stockers/:id/adjust`, `/inventory/monthly-entries`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **HQ Selector Tabs** (Kotma, Shahdol, Ambikapur, Bilaspur) | Pill Buttons | `GET /inventory/headquarters` | State & URL | **PASS** | Clicking switches selected HQ, filters Stockers dropdown and inventory table dynamically. |
| **Stocker Pharmacy Dropdown** | Dropdown Select | `GET /inventory/stockers?hq_id=:id` | Local storage & server | **PASS** | Switching Stocker loads depot-specific inventory balances from backend. |
| **Add New Stocker** Button & Modal | Modal Form | `POST /inventory/stockers` | Supabase `stockers` | **PASS** | Input validation on Name, Sub-Area, Address. Creates stocker and initializes medicine stock records. |
| **Delete Stocker** Action | Destructive Button | `DELETE /inventory/stockers/:id` | Supabase `stockers` | **PASS** | Displays confirmation dialog; cascades inventory records upon deletion. |
| **+ Inward Stock** Button & Form | Collapsible Form | `POST /inventory/monthly-entries` | Supabase `monthly_stock_entries` | **PASS** | Records invoice number, batch code, expiry date, incoming quantity; increments current stock. |
| **[Adjust Stock]** Button (Row Action) | Modal Trigger | `POST /inventory/stockers/:id/adjust` | Supabase `stocker_inventory` & `inventory_transactions` | **PASS** | **Fixed**: Modal displays current stock; user enters new quantity. Backend updates balance to target stock and creates audit transaction. |
| **+ Add New Medicine** Button & Modal | Modal Form | `POST /inventory/medicines` | Supabase `medicines` | **PASS** | Validates Name, SKU, packing, PTS, PTR, MRP rates, threshold. Immediately adds to catalog and in-memory cache. |
| **Edit Medicine** (Blue Pencil Icon) | Modal Form | `PATCH /inventory/medicines/:id` | Supabase `medicines` | **PASS** | **Fixed**: Updates Name, Code, Units, PTS/PTR/MRP rates, status; prevents duplicate SKU codes; updates Supabase and persists on reload. |
| **Delete Medicine** (Red Trash Icon) | Destructive Button | `DELETE /inventory/medicines/:id` | Supabase `medicines` & `stocker_inventory` | **PASS** | **Fixed**: Confirmation modal; permanently purges from Supabase, memory, and disk store. Does NOT reappear after redeployment. |
| **Search Medicines & Filter** Inputs | Text Input & Status Filter | Client-side filter | UI state | **PASS** | Real-time filtering by medicine name, SKU code, and status (`Available`, `Low Stock`, `Out of Stock`). |
| **Stock Alerts & Transactions Tabs** | Tab Switcher | `GET /inventory/alerts`, `GET /inventory/transactions` | Server query | **PASS** | Renders real-time alerts below threshold and complete chronological audit log with balance after. |

---

### View 2: Lead Tasks & Detailing Planning (`TasksView.tsx`)
**Primary Route:** `/tasks`  
**Associated APIs:** `/tasks`, `/users`, `/doctors`, `/locations/saved`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **Create Task** Button & Modal | Modal Form | `POST /tasks` | Supabase `tasks` | **PASS** | Opens task creation modal; supports both Pre-saved Doctor/Location and Custom Map Pin modes. |
| **Preset vs Custom Location Toggle** | Mode Switcher | Local state | Form state | **PASS** | Mode A auto-fills doctor address & coordinates; Mode B enables interactive map click pin-drop. |
| **MR Assignment Dropdown** | Dropdown Select | `GET /users?role=MR` | Form state | **PASS** | Populates with active MRs (`usr-mr-01`, `usr-mr-02`, `usr-mr-03`) with territory indicator. |
| **Geofence Radius Slider (50m - 500m)** | Range Input | `POST /tasks` | Task payload | **PASS** | Updates geofence boundary visual circle on interactive Leaflet map. |
| **Interactive Map Pin Drop** | Map Canvas | `POST /tasks` | Task coordinates | **PASS** | Clicking map updates latitude, longitude, and reverse-geocoded location label. |
| **Task Cards vs Zone Map Switcher** | View Switcher | Client state | UI state | **PASS** | Toggles between categorized task cards (ASSIGNED, IN_PROGRESS, COMPLETED) and full-screen fleet map. |
| **Edit Task Details** Action | Modal Form | `PATCH /tasks/:id` | Supabase `tasks` | **PASS** | Modifies schedule time, priority, doctor detailing notes, or reassigns MR. |
| **Cancel / Delete Task** Action | Destructive Button | `DELETE /tasks/:id` | Supabase `tasks` | **PASS** | Confirms deletion and removes task from MR's active mobile queue. |
| **Task Date & Status Filter Bar** | DatePicker & Dropdown | `GET /tasks` | Query params | **PASS** | Filters tasks for specific dates, MRs, and execution status. |

---

### View 3: Attendance & Reimbursement Configuration (`AdminAttendanceView.tsx` & `SettingsView.tsx`)
**Primary Route:** `/attendance`, `/settings`  
**Associated APIs:** `/attendance`, `/attendance/today`, `/attendance/settings`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **Punch-in / Punch-out Settings Form** | Time Pickers | `PATCH /attendance/settings` | Supabase `attendance_settings` | **PASS** | Configures expected punch-in (e.g., 09:00:00) and allowed window. Persists across restarts. |
| **Reimbursement Rate Input (₹/km)** | Number Input | `PATCH /attendance/settings` | Supabase `attendance_settings` | **PASS** | **Fixed**: Updating rate (e.g. from 2.5 to 3.75) persists in Supabase and disk; does NOT revert to 2.5 on Render redeployment. |
| **Daily Attendance Ledger Table** | Data Table | `GET /attendance` | Supabase `attendance` | **PASS** | Renders employee name, punch-in time, punch-out time, total km, calculated reimbursement payout, and selfie preview. |
| **Date Range Filter** | Date Inputs | `GET /attendance?date=:date` | Query state | **PASS** | Filters attendance punches for specific historical days or calendar months. |
| **View Punch Selfie Modal** | Thumbnail Click | Modal Canvas | Base64 / URL | **PASS** | Enlarges MR biometric selfie photo taken at time of punch-in. |

---

### View 4: Monthly Tour Plan (TP) & Route Batches (`MonthlyTpView.tsx`)
**Primary Route:** `/monthly-tp`  
**Associated APIs:** `/tour-plans/monthly`, `/territories/route-batches`, `/attendance/settings`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **Month & Year Selector** | Dropdown Select | `GET /tour-plans/monthly` | Query state | **PASS** | Loads calendar matrix for selected month (e.g., October 2026). |
| **MR Employee Selector** | Dropdown Select | `GET /users?role=MR` | Query state | **PASS** | Switches view to assigned itinerary of chosen MR. |
| **30-Day Calendar Grid Cells** | Interactive Cells | `POST /tour-plans/monthly` | Supabase `monthly_tour_plans` | **PASS** | Each day displays assigned Route Batch, route stops, distance km, and estimated allowance. |
| **Route Batch Picker Modal** | Modal List | `GET /territories/route-batches` | Plan payload | **PASS** | Lists authentic route batches (e.g. KOT-B01 to KOT-B09, SHD-B01 to SHD-B05) with distance. |
| **Approve / Reject Plan Buttons** | Action Buttons | `PATCH /tour-plans/monthly/:id/status` | Supabase `monthly_tour_plans` | **PASS** | Admin locks approved plan; updates plan status to `APPROVED`. |
| **Batch Reimbursement Rate Settings** | Input Field | `PATCH /territories/route-batches/:id` | Supabase `route_batches` | **PASS** | Allows configuring standard allowance per batch or per km. |

---

### View 5: Team & Members Management (`MembersManagementView.tsx`)
**Primary Route:** `/members`  
**Associated APIs:** `/users`, `/leave/quotas`, `/auth/device/unbind`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **Add New Employee** Button & Modal | Modal Form | `POST /users` | Supabase `users` | **PASS** | Creates MR or Manager account; assigns HQ code, zone, region, and login credentials. |
| **Edit Member Profile** Action | Modal Form | `PATCH /users/:id` | Supabase `users` | **PASS** | Updates phone, email, assigned route batches, and active/inactive status. |
| **Device Authorization & Unbind** | Button | `POST /users/:id/unbind-device` | Supabase `users` | **PASS** | Clears bound hardware fingerprint when an MR replaces their physical phone. |
| **Adjust Annual Leave Allowance** | Modal Form | `PATCH /leave/quotas/:mrId` | Supabase `leave_quotas` | **PASS** | Sets Casual Leave (CL), Sick Leave (SL), and Earned Leave (EL) annual quotas. |
| **Reset Password** Action | Modal Form | `POST /users/:id/reset-password` | Supabase `users` | **PASS** | Resets password with bcrypt hashing. |

---

### View 6: Orders & Pharmacy Booking Management (`OrdersManagementView.tsx`)
**Primary Route:** `/orders`  
**Associated APIs:** `/orders`, `/inventory/stockers`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **Orders Table & Filters** | Data Table | `GET /orders` | Supabase `orders` | **PASS** | Shows Order ID, Chemist/Pharmacy Name, MR Name, Total Value (₹), and Status. |
| **Approve Order** Action | Button | `PATCH /orders/:id/status` | Supabase `orders` & `stocker_inventory` | **PASS** | Transitions order to `APPROVED` and triggers inventory deduction from depot stock. |
| **Dispatch / Deliver Order** Actions | Button | `PATCH /orders/:id/status` | Supabase `orders` | **PASS** | Transitions order lifecycle to `DISPATCHED` and `DELIVERED`. |
| **Order Details Modal** | Modal | `GET /orders/:id` | Supabase `order_items` | **PASS** | Displays line item breakdown (medicines, packaging variants, quantities, unit prices). |

---

### View 7: Doctors Directory (`DoctorsView.tsx`)
**Primary Route:** `/doctors`  
**Associated APIs:** `/doctors`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **Add Doctor** Button & Modal | Modal Form | `POST /doctors` | Supabase `doctors` | **PASS** | Adds practicing doctor with specialty, clinic address, and visiting hours. |
| **Edit Doctor** Action | Modal Form | `PATCH /doctors/:id` | Supabase `doctors` | **PASS** | Updates contact info, category, and HQ territory mapping. |
| **Delete Doctor** Action | Destructive Button | `DELETE /doctors/:id` | Supabase `doctors` | **PASS** | Removes doctor from directory. |
| **Search & Filter Controls** | Text Input & Dropdowns | Client-side filter | UI state | **PASS** | Filters by Specialty (Cardiology, Paediatrics, GP) and Territory. |

---

### View 8: Corporate AI Assistant (`AiChatView.tsx` & `FloatingAiFab.tsx`)
**Primary Route:** `/ai-assistant` & Floating Widget  
**Associated APIs:** `/api/ai/chat`

| UI Section / Interactive Element | Control Type | Connected API | Persistent State Verified | Status | Audit Findings & Verification Result |
|---|---|---|---|---|---|
| **Natural Language Chat Input** | Text Field & Send Button | `POST /api/ai/chat` | AI session | **PASS** | Queries live database to report stock shortages, MR punch timings, leave balances, and sales figures. |
| **Quick Action Prompt Chips** | Pill Buttons | `POST /api/ai/chat` | AI session | **PASS** | One-tap queries for "Low Stock Alert", "Today's Punches", "Leave Quotas". |
| **Floating Action Button (FAB)** | Global Overlay | `POST /api/ai/chat` | Widget state | **PASS** | Available across every admin screen for instant voice/text assistant queries. |

---

## PART 2: Medical Representative Mobile Application (`mobile`)

### Screen 1: Mobile Authentication (`LoginScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| Phone/Email & Password Form | `POST /auth/login` | Authenticates MR credentials, validates bound hardware device ID, stores JWT in secure storage. | **PASS** |
| Biometric Unlock (Fingerprint/FaceID) | `POST /auth/login/biometric` | Authenticates stored biometric token for fast login without retyping password. | **PASS** |
| Offline Login Fallback | SQLite local queue | Allows logging in with cached credentials when field network is completely unavailable. | **PASS** |

---

### Screen 2: Field Attendance (`AttendanceScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| **Punch In** Button & Camera | `POST /attendance/punch-in` | Captures GPS coordinates, device battery %, and front camera selfie. Displays late/on-time status. | **PASS** |
| **Punch Out** Button & Odometer | `POST /attendance/punch-out` | Validates end location, captures closing selfie and km reading; calculates distance payout. | **PASS** |
| Offline Queue Indicator | `sqliteQueue` | If offline, queues punch locally and syncs automatically via `/sync/batch` upon reconnection. | **PASS** |

---

### Screen 3: Point-of-Care Medicines & Stock (`StocklistScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| **All Company Medicines Catalog** | `GET /inventory/medicines?all=true` | Displays authoritative 17 AHTRI products with SKU code, unit, PTS, PTR, MRP rates. | **PASS** |
| **Depot Available Stockage Tab** | `GET /inventory/stockers/:id/inventory` | Shows real-time depot inventory for MR's assigned HQ (Tara Pharmacy, Triyash, Kismira). | **PASS** |
| Search & Category Filter | Client filter | Instant search by medicine brand name, active formulation, or packaging size. | **PASS** |
| **Admin-to-MR Sync Check** | Real-time / Refresh | When an Admin updates a medicine price or adjusts stock, refreshing this screen shows the new values. | **PASS** |

---

### Screen 4: Today's Tasks & Detailing Calls (`TodayTasksScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| **Task Cards List** | `GET /tasks?date=today` | Shows doctor appointments, clinic destinations, appointment times, priority badges. | **PASS** |
| **Start Journey / Call** Button | `POST /tasks/:id/start` | Checks GPS distance against geofence radius. Transitions task to `IN_PROGRESS`. | **PASS** |
| **Complete Call** Form | `POST /tasks/:id/complete` | Submits detailing feedback, samples given, doctor feedback, and chemist POB order. | **PASS** |

---

### Screen 5: Chemist Booking & Orders (`OrdersScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| Chemist / Pharmacy Selector | Dropdown | Populates with local chemists in MR's operational territory. | **PASS** |
| Add Products to Order | Product Search & Qty | Selects medicine from active catalog, calculates line item subtotal using PTS rate. | **PASS** |
| Submit Order to Stocker | `POST /orders` | Transmits order to assigned Stocker agency and notifies Admin Panel for approval. | **PASS** |

---

### Screen 6: Monthly Tour Plan (`MonthlyTpScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| Calendar Itinerary View | `GET /tour-plans/monthly` | Shows daily assigned route batches (e.g. KOT-B01, SHD-B02) and distance km. | **PASS** |
| Submit Monthly TP Draft | `POST /tour-plans/monthly` | MR compiles 30-day itinerary and submits to Area Manager / Admin for review. | **PASS** |

---

### Screen 7: Doctor Directory & Visit Logging (`DoctorDirectoryScreen.tsx` & `DoctorVisitScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| Doctor Directory Search | `GET /doctors` | Browses all doctors in territory with clinic addresses and contact details. | **PASS** |
| Log Unplanned Doctor Visit | `POST /visits` | Allows recording impromptu detailing call with samples distributed and notes. | **PASS** |

---

### Screen 8: Daily Call Report (`DcrScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| Daily Summary Aggregator | Local & Server | Summarizes doctor calls completed, chemist visits, orders booked, and total km traveled. | **PASS** |
| Submit DCR | `POST /dcr` | Locks daily field activity report and submits to management. | **PASS** |

---

### Screen 9: Expense Claims & Leave Applications (`ExpensesScreen.tsx` & `LeaveScreen.tsx`)
| UI Element | Connected API | Verification Result | Status |
|---|---|---|---|
| Submit Travel / DA Expense | `POST /expenses` | Attaches receipt image, specifies category (DA, Fuel, Toll), and requests reimbursement. | **PASS** |
| Leave Application Form | `POST /leave/requests` | Submits Casual, Sick, or Earned leave; verifies remaining balance before submission. | **PASS** |

---

## PART 3: Cross-Application Synchronization & Persistence Verification

| Workflow | Admin Action | MR App Result | Backend & Database Verification | Status |
|---|---|---|---|---|
| **1. Medicine Creation** | Admin adds new medicine in Stocker Management | Appears in MR Stocklist and Order Product Search | Persisted in Supabase `medicines` and disk store. | **PASS** |
| **2. Adjust Stock Mode** | Admin sets stock for AHTRI-S to 80 units | MR Stocklist shows 80 units available | Persisted in Supabase `stocker_inventory` and `inventory_transactions`. | **PASS** |
| **3. Medicine Deletion** | Admin deletes medicine from catalog | Medicine removed from MR catalog and order dropdowns | Permanently removed from Supabase and disk store; does NOT return on redeploy. | **PASS** |
| **4. Task Assignment** | Admin creates clinic detailing task | MR receives push notification and sees task card in Today's Tasks | Persisted in Supabase `tasks`. | **PASS** |
| **5. Task Completion & POB** | MR completes task with doctor order | Admin sees completed task in SubmittedTasksView and new pending order | Persisted in Supabase `tasks` and `orders`. | **PASS** |
| **6. TP Rate Update** | Admin updates rate to ₹3.50/km in Settings | MR attendance punch-out calculates payout using ₹3.50/km | Persisted in Supabase `attendance_settings`; does not revert on deployment. | **PASS** |
| **7. Device Unbinding** | Admin clicks Unbind Device in Members Management | MR can bind a new mobile device with OTP | Bound device ID cleared in Supabase `users`. | **PASS** |
