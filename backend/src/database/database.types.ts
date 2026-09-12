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

export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'SUSPENDED';

export interface TaskOrderItem {
  product_name: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  distributor?: string;
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
  duration_seconds?: number; // Secret tracked on-site duration in seconds
  location_name?: string;
  outcome?: string; // Meeting summary / doctor reaction
  orders?: TaskOrderItem[]; // Immediate orders captured
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
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
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

