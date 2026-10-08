export type UiState = 'success' | 'loading' | 'empty' | 'error' | 'offline';

export interface TaskOrderItem {
  product_name: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  distributor?: string;
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  date: string;
  time: string;
  assigned_mr_name: string;
  assigned_mr_id?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  geofence_radius_m: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'SUSPENDED';
  distance_verified?: boolean;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number; // Secret meeting duration visible to Owner
  outcome?: string; // Doctor feedback / interest
  orders?: TaskOrderItem[]; // Immediate orders captured
  visit_photo?: string; // On-site clinic / doctor detailing proof photo (base64 data URL)
  verification_photo_key?: string;
  suspended_at?: string;
  suspended_reason?: string;
  unsuspended_at?: string;
  unsuspended_by?: string;
}

export interface VerificationLogItem {
  id: string;
  task_title: string;
  mr_name: string;
  type: 'START' | 'COMPLETE';
  distance_m: number;
  gps_accuracy_m: number;
  verified: boolean;
  timestamp: string;
}

export interface DoctorItem {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  class: 'A' | 'B' | 'C';
  potential_score: number;
  clinic: string;
  area_name: string;
  phone: string;
  latitude: number;
  longitude: number;
  visit_count: number;
  category?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';
  created_by_role?: string;
  created_by_name?: string;
  address?: string;
  assigned_mr_id?: string;
  assigned_mr_name?: string;
  is_new?: boolean;
  geofence_radius_m?: number;
  doctor_name?: string;
}

export interface MRMemberItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'MR' | 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | string;
  status: 'ACTIVE' | 'INACTIVE';
  hq_name?: string;
  hq_code?: string;
  hq_id?: string;
  territory?: string;
  assigned_territory?: string;
  route_batches?: string[];
  assigned_route_batches?: string[];
  password?: string;
  device_id?: string;
  device_model?: string;
  device_bound_at?: string;
  created_at: string;
}

export interface ApprovalItem {
  id: string;
  entity_type: 'LEAVE' | 'EXPENSE' | 'DCR_CORRECTION' | 'TOUR_PLAN';
  entity_id: string;
  requester_name: string;
  details: string;
  amount?: number;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface MonthlyTpRowItem {
  id: string;
  tp_id: string;
  entry_id: string;
  mr_id: string;
  mr_name: string;
  month: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  plan_status?: string;
  date: string;
  hq_id: string;
  hq_name: string;
  planned_area: string;
  destination?: string;
  work_type: string;
  planned_kol_drs: string;
  planned_activity: string;
  route_batch_id?: string;
  route_batch_code?: string;
  route?: string;
  route_stops?: string[];
  is_round_trip?: boolean;
  one_way_distance_km?: number;
  round_trip_distance_km?: number;
  distance_km?: number;
  reimbursement_rate?: number;
  reimbursement_amount?: number;
  reimbursement_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  calculation_basis?: 'ROUND_TRIP_BATCH' | 'ROUND_TRIP_CENTER_TO_BOUNDARY' | 'MANUAL' | string;
  remarks?: string;
  created_at?: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface RouteBatchItem {
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
  areas?: string[];
  distance_km: number;
  standard_reimbursement_rate?: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export type OrderDeliveryStatus = 'PENDING' | 'DELIVERED';

export interface OrderProductItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  distributor?: string;
}

export interface OrderItemRecord {
  id: string;
  order_number: string;
  task_id?: string;
  mr_id: string;
  mr_name: string;
  customer_name: string;
  location_name?: string;
  hq_id: string;
  hq_name: string;
  stocker_id?: string;
  stocker_name?: string;
  items: OrderProductItem[];
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
  created_at: string;
  updated_at: string;
}

