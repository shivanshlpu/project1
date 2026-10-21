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
  hq_id?: string;
  hq_code?: string;
  hq_name?: string;
  territory?: string;
  assigned_territory?: string;
  route_batches?: string[];
  assigned_route_batches?: string[];
  zone_id?: string;
  region_id?: string;
  area_id?: string;
  manager_id?: string;
  status: 'ACTIVE' | 'INACTIVE';
  last_login_at?: string;
  device_id?: string;
  device_model?: string;
  device_bound_at?: string;
  requires_device_otp_on_login?: boolean;
  logged_out?: boolean;
  biometric_enabled: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'ORDER_PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'SUSPENDED';

export type OrderDeliveryStatus = 'PENDING' | 'DELIVERED';

export interface TaskOrderItem {
  product_id?: string;
  product_name: string;
  packaging_id?: string;
  packaging_size?: string;
  packaging_unit?: string;
  quantity: number;
  unit_price?: number;
  pts_rate?: number;
  mrp?: number;
  total_amount?: number;
  distributor?: string;
  stocker_id?: string;
  notes?: string;
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';
  available_stock?: number;
}

export interface Order {
  id: string;
  order_number: string;
  task_id?: string;
  mr_id: string;
  mr_name: string;
  customer_name: string;
  location_name?: string;
  hq_id: string;
  hq_name: string;
  stocker_id: string;
  stocker_name: string;
  items: TaskOrderItem[];
  total_units: number;
  total_amount: number;
  delivery_status: OrderDeliveryStatus;
  delivered_at?: string;
  delivered_by_user_id?: string;
  delivery_notes?: string;
  hq_accepted: boolean;
  accepted_at?: string;
  accepted_by_user_id?: string;
  inventory_deducted: boolean;
  inventory_deducted_at?: string;
  has_stock_warning?: boolean;
  stock_warning_type?: 'OUT_OF_STOCK' | 'LOW_STOCK' | null;
  stock_warning_summary?: string;
  item_stock_details?: any[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_mr_id: string;
  assigned_mr_name?: string;
  created_by: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number; 
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: TaskStatus;
  created_at: string;
  deleted_at?: string;
  started_at?: string;
  completed_at?: string;
  order_pending_at?: string;
  duration_seconds?: number; 
  location_name?: string;
  products?: string[];
  hq_id?: string;
  hq_name?: string;
  stocker_id?: string;
  stocker_name?: string;
  outcome?: string; 
  orders?: TaskOrderItem[]; 
  order_id?: string;
  delivery_status?: OrderDeliveryStatus;
  hq_accepted?: boolean;
  inventory_deducted?: boolean;
  verification_photo_key?: string;
  verification_photo_source?: 'CAMERA' | 'GALLERY';
  visit_photo?: string | null; 
  visit_photo_captured_at?: string;
  device_integrity_status?: string;
  suspended_at?: string;
  suspended_reason?: string;
  unsuspended_at?: string;
  unsuspended_by?: string;
  route_batch_id?: string;
  route_batch_name?: string;
  tp_entry_id?: string;
  sequence_order?: number;
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
  batch_id?: string;
  batch_code?: string;
  batch_name?: string;
  created_at: string;
  deleted_at?: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  clinic: string;
  doctor_name?: string;
  qualification: string;
  specialization: string;
  class: 'A' | 'B' | 'C';
  potential_score: number;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  category: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';
  created_by: string;
  created_by_role: 'ADMIN' | 'MR';
  created_by_name: string;
  area_name: string;
  visit_count: number;
  is_new?: boolean;
  batch_id?: string;
  batch_code?: string;
  batch_name?: string;
  created_at: string;
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
  date: string; 
  check_in_at: string;
  check_in_lat: number;
  check_in_lng: number;
  check_in_location_name?: string;
  check_in_photo?: string | null; 
  photo_captured_at?: string;
  photo_purged?: boolean; 
  check_out_at?: string;
  check_out_lat?: number;
  check_out_lng?: number;
  check_out_location_name?: string;
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
  is_mocked?: boolean;
  user_name?: string;
  hq_id?: string;
  hq_name?: string;
  created_at?: string;
}

export interface DCR {
  id: string;
  mr_id: string;
  date: string; 
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
  hq_id?: string;
  hq_code?: string;
  route_batch_id?: string;
  distance_km?: number;
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
  month: string; 
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
  otp: string; 
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface Headquarter {
  id: string;
  hq_id: string;
  name: string;
  code: string;
  hq_code: string;
  legacy_id?: string;
  state?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface RouteBatch {
  id: string;
  batch_code: string;
  name: string;
  hq_id: string;
  hq_code: string;
  hq_name: string;
  mr_id?: string;
  mr_name?: string;
  territory_name?: string;
  route_stops: string[]; 
  areas: string[]; 
  distance_km: number;
  standard_reimbursement_rate?: number;
  status: 'ACTIVE' | 'INACTIVE';
  location_ids?: string[];
  locations?: Array<{
    id: string;
    name: string;
    clinic?: string;
    doctor_name?: string;
    category?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    created_by?: string;
    created_by_name?: string;
  }>;
  created_at: string;
  updated_at?: string;
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
  sub_area?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface MedicinePackagingVariant {
  id: string;
  medicine_id: string;
  variant_name?: string;
  package_size: number; 
  package_unit: string; 
  size?: number;
  unit?: string;
  display_label?: string; 
  display_name?: string;
  packing?: string;
  pts_rate: number; 
  ptr_rate?: number; 
  mrp: number; 
  status: 'ACTIVE' | 'INACTIVE';
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Medicine {
  id: string;
  name: string;
  code: string;
  product_code?: string;
  sku?: string;
  composition?: string;
  category?: string;
  unit: string;
  packing?: string;
  base_price?: number | null; 
  pts_rate?: number; 
  pts?: number;
  ptr?: number; 
  ptr_rate?: number;
  mrp?: number; 
  packaging_variants?: MedicinePackagingVariant[];
  low_stock_threshold?: number;
  status: 'ACTIVE' | 'INACTIVE';
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export type StockagePermissionStatus = 'AVAILABLE' | 'RESERVED' | 'CONSUMED' | 'REVOKED' | 'EXPIRED';

export interface MonthlyStockagePermission {
  id: string;
  mr_id: string;
  mr_name: string;
  mr_email?: string;
  mr_phone?: string;
  hq_id?: string;
  hq_name?: string;
  stocker_id?: string;
  stocker_name?: string;
  year: number; 
  month: number; 
  month_str: string; 
  status: StockagePermissionStatus;
  submission_id?: string;
  granted_by_id: string;
  granted_by_name: string;
  granted_at: string;
  revoked_by_id?: string;
  revoked_by_name?: string;
  revoked_at?: string;
  revoke_reason?: string;
  consumed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type StockageSubmissionStatus = 'PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED';

export interface StockageSubmissionItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  medicine_code: string;
  variant_id?: string;
  package_size?: number;
  package_unit?: string;
  packaging_display: string;
  pts_rate?: number;
  mrp?: number;
  submitted_quantity: number;
  approved_quantity?: number;
  previous_stock?: number;
  final_stock?: number;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
}

export interface StockageSubmissionRequest {
  id: string;
  permission_id: string;
  mr_id: string;
  mr_name: string;
  mr_phone?: string;
  hq_id: string;
  hq_name: string;
  stocker_id: string;
  stocker_name: string;
  month: string; 
  month_year?: string; 
  year: number;
  month_num: number;
  status: StockageSubmissionStatus;
  items: StockageSubmissionItem[];
  total_items: number;
  total_quantity: number;
  submitted_at: string;
  reviewed_by_id?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  admin_comment?: string;
  admin_notes?: string; 
  applied_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyStockEntry {
  id: string;
  hq_id: string;
  hq_name?: string;
  stocker_id: string;
  stocker_name?: string;
  month: string; 
  entry_date: string; 
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
  variant_id?: string;
  packaging_display?: string;
  quantity: number; 
  low_stock_threshold: number;
  updated_at: string;
}

export type InventoryTransactionType = 'INITIAL' | 'RESTOCK' | 'ORDER_DEDUCTION' | 'ADJUSTMENT' | 'RETURN' | 'STOCKAGE_APPROVED_INWARD' | 'ORDER_RESTORE';

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
  date: string; 
  hq_id: string;
  hq_name: string;
  planned_area: string;
  work_type: string; 
  planned_kol_drs: string;
  planned_activity: string;

  
  route_batch_id?: string;
  route_batch_code?: string;
  route_batch_name?: string;
  route?: string; 
  route_stops?: string[];
  location_ids?: string[];
  selected_locations?: Array<{
    id: string;
    name: string;
    category?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }>;
  is_round_trip?: boolean; 
  one_way_distance_km?: number; 
  round_trip_distance_km?: number; 
  distance_km?: number; 
  reimbursement_rate?: number; 
  reimbursement_amount?: number; 
  reimbursement_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  calculation_basis?: 'ROUND_TRIP_BATCH' | 'ROUND_TRIP_CENTER_TO_BOUNDARY' | 'MANUAL';
}

export interface RouteChangeRequest {
  id: string;
  mr_id: string;
  mr_name: string;
  hq_id: string;
  hq_name: string;
  date: string;
  tour_plan_id: string;
  tour_plan_item_id: string;
  original_batch_id?: string;
  original_batch_code?: string;
  original_batch_name: string;
  original_locations?: Array<{ id: string; name: string; category?: string }>;
  requested_batch_id?: string;
  requested_batch_code?: string;
  requested_batch_name: string;
  requested_locations?: Array<{ id: string; name: string; category?: string; address?: string; latitude?: number; longitude?: number }>;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_id?: string;
  admin_name?: string;
  admin_remarks?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface MonthlyTourPlan {
  id: string;
  mr_id: string;
  mr_name: string;
  month: string; 
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  entries: MonthlyTpItem[];
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  remarks?: string;
  created_at?: string;
}

export interface AttendanceSettings {
  id: string;
  expected_punch_in_time: string; 
  allowed_punch_in_window_minutes: number; 
  expected_punch_out_time: string; 
  allowed_punch_out_window_minutes: number; 
  reimbursement_rate_per_km?: number; 
  updated_at: string;
}

export interface Competition {
  id: string;
  name: string;
  start_date: string; 
  end_date: string; 
  hq_id: string;
  hq_name: string;
  medicine_id: string;
  medicine_name: string;
  target_quantity: number;
  reward_amount: number;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'UPCOMING' | 'CANCELLED';
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

