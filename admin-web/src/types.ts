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
  role: 'MR';
  status: 'ACTIVE' | 'INACTIVE';
  territory?: string;
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
