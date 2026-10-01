export interface Role {
  id: string;
  name: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'MR';
  description: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface Zone {
  id: string;
  name: string;
}

export interface Region {
  id: string;
  zone_id: string;
  name: string;
}

export interface Area {
  id: string;
  region_id: string;
  name: string;
  manager_id?: string;
}

export interface Territory {
  id: string;
  area_id: string;
  mr_user_id: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  password_hash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'MR';
  zone_id?: string;
  region_id?: string;
  area_id?: string;
  manager_id?: string;
  status: 'ACTIVE' | 'INACTIVE';
  last_login_at?: string;
  device_id?: string;
  device_model?: string;
  device_bound_at?: string;
  biometric_enabled: boolean;
  created_at: string;
  deleted_at?: string;
}

export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'ORDER_PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'SUSPENDED';

export interface TaskOrderItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  distributor?: string;
  stocker_id?: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_mr_id: string;
  created_by: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number; // default 20m
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: TaskStatus;
  created_at: string;
  deleted_at?: string;
  started_at?: string;
  completed_at?: string;
  order_pending_at?: string;
  duration_seconds?: number; // Secret tracked on-site duration in seconds
  location_name?: string;
  hq_id?: string;
  hq_name?: string;
  stocker_id?: string;
  stocker_name?: string;
  outcome?: string; // Meeting summary / doctor reaction
  orders?: TaskOrderItem[]; // Immediate orders captured
  verification_photo_key?: string;
  verification_photo_source?: 'CAMERA' | 'GALLERY';
  device_integrity_status?: string;
  suspended_at?: string;
  suspended_reason?: string;
  unsuspended_at?: string;
  unsuspended_by?: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  mr_id: string;
  assigned_at: string;
}

export interface LocationVerification {
  id: string;
  task_id: string;
  type: 'START' | 'COMPLETE';
  user_id: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  gps_accuracy_m: number;
  verified: boolean;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  class: 'A' | 'B' | 'C';
  potential_score: number;
  phone: string;
  whatsapp?: string;
  clinic: string;
  hospital?: string;
  address: string;
  latitude: number;
  longitude: number;
  area_id: string;
  created_by: string;
  created_by_role?: string;
  created_by_name?: string;
  category?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';
  assigned_mr_id?: string;
  assigned_mr_name?: string;
  created_at: string;
  deleted_at?: string;
}

export interface DoctorVisit {
  id: string;
  doctor_id: string;
  mr_id: string;
  start_time: string;
  end_time?: string;
  start_lat: number;
  start_lng: number;
  end_lat?: number;
  end_lng?: number;
  duration_seconds?: number;
  gps_accuracy_m: number;
  signature_file_key?: string;
  remarks?: string;
  follow_up_date?: string;
  created_at: string;
}

export interface VisitDetail {
  id: string;
  visit_id: string;
  product_id: string;
  product_name: string;
  samples_given: number;
  notes?: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in_at: string;
  check_in_lat: number;
  check_in_lng: number;
  check_out_at?: string;
  check_out_lat?: number;
  check_out_lng?: number;
  distance_meters?: number;
  is_verified_location?: boolean;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'INCOMPLETE';
  punch_in_photo_key?: string;
  punch_in_photo_source?: 'CAMERA' | 'GALLERY';
  punch_out_photo_key?: string;
  punch_out_photo_source?: 'CAMERA' | 'GALLERY';
  late_minutes?: number;
  early_minutes?: number;
  working_hours?: number;
  device_integrity_status?: string;
  hq_id?: string;
  hq_name?: string;
  created_at?: string;
}

export interface DCR {
  id: string;
  mr_id: string;
  date: string; // YYYY-MM-DD
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CORRECTION_REQUESTED';
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  manager_comment?: string;
}

export interface DCRItem {
  id: string;
  dcr_id: string;
  visit_id: string;
  doctor_name: string;
  products_discussed: string[];
  samples: number;
  order_taken: boolean;
  remarks?: string;
}

export interface Expense {
  id: string;
  mr_id: string;
  category: 'TA_DA' | 'FOOD' | 'ACCOMMODATION' | 'CONVEYANCE' | 'ENTERTAINMENT';
  amount: number;
  receipt_file_key?: string;
  ocr_extracted_amount?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  mr_id: string;
  category?: 'CASUAL' | 'SICK' | 'EARNED';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  created_at: string;
}

export interface LeaveQuota {
  mr_id: string;
  casual_total: number;
  sick_total: number;
  earned_total: number;
  updated_at: string;
}

export interface TourPlan {
  id: string;
  mr_id: string;
  month: string; // YYYY-MM
  plan_json: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Approval {
  id: string;
  entity_type: 'LEAVE' | 'EXPENSE' | 'DCR_CORRECTION' | 'TOUR_PLAN';
  entity_id: string;
  requested_by: string;
  approver_id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  created_at: string;
  decided_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data_json?: any;
  read_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value_json?: any;
  new_value_json?: any;
  ip_address?: string;
  device_info?: string;
  created_at: string;
}

export interface DeviceAuthorizationRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_email: string;
  device_id: string;
  device_model: string;
  ip_address?: string;
  otp: string; // 6-digit verification code
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  approved_at?: string;
  approved_by?: string;
}

// === NEW ENHANCEMENT MODELS ===

export interface Headquarter {
  id: string;
  name: string;
  code: string;
  state?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface HqArea {
  id: string;
  hq_id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Stocker {
  id: string;
  hq_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Medicine {
  id: string;
  name: string;
  code: string;
  unit: string;
  base_price: number;
  low_stock_threshold?: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface MonthlyStockEntry {
  id: string;
  hq_id: string;
  hq_name?: string;
  stocker_id: string;
  stocker_name?: string;
  month: string; // e.g. "2026-10"
  entry_date: string; // "2026-10-01"
  invoice_no?: string;
  medicine_id: string;
  medicine_name: string;
  medicine_code: string;
  quantity: number;
  unit: string;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export interface StockerInventory {
  id: string;
  hq_id: string;
  stocker_id: string;
  medicine_id: string;
  quantity: number; // Can be negative for backorder / shortage per §17
  low_stock_threshold: number;
  updated_at: string;
}

export type InventoryTransactionType = 'INITIAL' | 'RESTOCK' | 'ORDER_DEDUCTION' | 'ADJUSTMENT' | 'RETURN';

export interface InventoryTransaction {
  id: string;
  hq_id: string;
  stocker_id: string;
  medicine_id: string;
  quantity: number;
  balance_after: number;
  transaction_type: InventoryTransactionType;
  order_id?: string;
  task_id?: string;
  user_id: string;
  reason?: string;
  timestamp: string;
}

export interface VerificationPhoto {
  id: string;
  user_id: string;
  task_id?: string;
  doctor_id?: string;
  hq_id?: string;
  photo_key: string;
  photo_source: 'CAMERA' | 'GALLERY';
  latitude: number;
  longitude: number;
  gps_accuracy_m: number;
  timestamp: string;
  created_at: string;
}

export interface MonthlyTpItem {
  id: string;
  date: string; // YYYY-MM-DD
  hq_id: string;
  hq_name: string;
  planned_area: string;
  work_type: string; // "Transit" | "Induction" | "Doctor Visit" | "Order Collection" | "Follow-up" | "Other"
  planned_kol_drs: string;
  planned_activity: string;
}

export interface MonthlyTourPlan {
  id: string;
  mr_id: string;
  mr_name: string;
  month: string; // YYYY-MM
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  entries: MonthlyTpItem[];
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  remarks?: string;
}

export interface AttendanceSettings {
  id: string;
  expected_punch_in_time: string; // e.g. "10:00:00"
  allowed_punch_in_window_minutes: number; // e.g. 30
  expected_punch_out_time: string; // e.g. "18:00:00"
  allowed_punch_out_window_minutes: number; // e.g. 30
  updated_at: string;
}

export interface Competition {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  hq_id: string;
  hq_name: string;
  medicine_id: string;
  medicine_name: string;
  target_quantity: number;
  reward_amount: number;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  created_at: string;
}

export type RewardClaimStatus = 'ELIGIBLE' | 'APPLIED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface RewardClaim {
  id: string;
  competition_id: string;
  competition_name: string;
  mr_id: string;
  mr_name: string;
  achieved_quantity: number;
  target_quantity: number;
  reward_amount: number;
  eligible_at: string;
  claimed_at: string;
  status: RewardClaimStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_comment?: string;
  order_ids: string[];
}


