import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  User,
  Role,
  Permission,
  Zone,
  Region,
  Area,
  Territory,
  Task,
  TaskAssignment,
  LocationVerification,
  Doctor,
  DoctorVisit,
  VisitDetail,
  Attendance,
  DCR,
  DCRItem,
  Expense,
  LeaveRequest,
  TourPlan,
  Approval,
  Notification,
  AuditLog,
  DeviceAuthorizationRequest,
} from './database.types';
import { SupabaseService } from './supabase.service';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public roles: Role[] = [];
  public permissions: Permission[] = [];
  public zones: Zone[] = [];
  public regions: Region[] = [];
  public areas: Area[] = [];
  public territories: Territory[] = [];
  public users: User[] = [];
  public refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  public otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  public fcmTokens: Map<string, string> = new Map(); // userId -> fcmToken

  public tasks: Task[] = [];
  public taskAssignments: TaskAssignment[] = [];
  public locationVerifications: LocationVerification[] = [];

  public doctors: Doctor[] = [];
  public doctorVisits: DoctorVisit[] = [];
  public visitDetails: VisitDetail[] = [];

  public attendance: Attendance[] = [];
  public dcrList: DCR[] = [];
  public dcrItems: DCRItem[] = [];

  public expenses: Expense[] = [];
  public leaveRequests: LeaveRequest[] = [];
  public tourPlans: TourPlan[] = [];
  public approvals: Approval[] = [];

  public notifications: Notification[] = [];
  public announcements: any[] = [];
  public auditLogs: AuditLog[] = [];
  public deviceAuthorizations: DeviceAuthorizationRequest[] = [];

  constructor(public readonly supabase: SupabaseService) {}

  async onModuleInit() {
    await this.seedInitialData();
    if (this.supabase && this.supabase.isConnected) {
      try {
        const adminUser = this.users.find((u) => u.email === 'shivanshti10@gmail.com');
        if (adminUser) {
          await this.supabase.upsertUser({
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            phone: adminUser.phone,
            password_hash: adminUser.password_hash,
            role: adminUser.role,
            status: adminUser.status,
            biometric_enabled: adminUser.biometric_enabled,
          });
        }
      } catch {
        // Resilient fallback
      }
    }
  }

  private async seedInitialData() {
    // 1. Roles
    this.roles = [
      { id: 'role-1', name: 'SUPER_ADMIN', description: 'Complete system access' },
      { id: 'role-2', name: 'ADMIN', description: 'Administrative operations' },
      { id: 'role-3', name: 'MANAGER', description: 'Territory and MR team manager' },
      { id: 'role-4', name: 'MR', description: 'Field Medical Representative' },
    ];

    // 2. Hierarchy: Zone -> Region -> Area
    const zoneId = 'zone-north-1';
    this.zones.push({ id: zoneId, name: 'North Zone' });

    const regionId = 'reg-delhi-1';
    this.regions.push({ id: regionId, zone_id: zoneId, name: 'Delhi NCR' });

    const areaId = 'area-sdelhi-1';
    this.areas.push({ id: areaId, region_id: regionId, name: 'South Delhi' });

    // 3. Seed Users
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
    const shivanshPasswordHash = await bcrypt.hash('12345678', 10);

    // Primary Super Admin: Shivansh Tiwari (Requested ID: shivanshti10@gmail.com, Mobile: 9009149694)
    const shivanshAdmin: User = {
      id: 'usr-admin-shivansh',
      name: 'Shivansh Tiwari',
      phone: '9009149694',
      email: 'shivanshti10@gmail.com',
      password_hash: shivanshPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    const superAdmin: User = {
      id: 'usr-admin-01',
      name: 'System Admin',
      phone: '9876543210',
      email: 'admin@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    const manager: User = {
      id: 'usr-mgr-01',
      name: 'Anil Kumar (Area Manager)',
      phone: '9876543211',
      email: 'manager@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MANAGER',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      status: 'ACTIVE',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    const mr: User = {
      id: 'usr-mr-01',
      name: 'Rahul Sharma (Field MR)',
      phone: '9876543212',
      email: 'mr@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    const mr2: User = {
      id: 'usr-mr-02',
      name: 'Vikram Malhotra',
      phone: '9876543213',
      email: 'vikram@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    const mr3: User = {
      id: 'usr-mr-03',
      name: 'Pooja Verma',
      phone: '9876543214',
      email: 'pooja@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    this.users.push(shivanshAdmin, superAdmin, manager, mr, mr2, mr3);

    // Territory link
    this.territories.push({
      id: 'terr-01',
      area_id: areaId,
      mr_user_id: mr.id,
    });

    // 4. Doctors
    const doc1: Doctor = {
      id: 'doc-01',
      name: 'Dr. Rajesh Sharma',
      qualification: 'MD, DM (Cardiology)',
      specialization: 'Cardiologist',
      class: 'A',
      potential_score: 95,
      phone: '9811122233',
      clinic: 'Apex Heart Centre',
      hospital: 'Max Super Specialty Hospital',
      address: 'Ring Road, Saket, New Delhi',
      latitude: 28.5245,
      longitude: 77.2066,
      area_id: areaId,
      assigned_mr_id: mr.id,
      assigned_mr_name: mr.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    const doc2: Doctor = {
      id: 'doc-02',
      name: 'Dr. Priya Verma',
      qualification: 'MBBS, DNB (Paediatrics)',
      specialization: 'Paediatrician',
      class: 'B',
      potential_score: 82,
      phone: '9811144455',
      clinic: 'Little Care Clinic',
      address: 'Green Park Extension, New Delhi',
      latitude: 28.5585,
      longitude: 77.2028,
      area_id: areaId,
      assigned_mr_id: mr.id,
      assigned_mr_name: mr.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    this.doctors.push(doc1, doc2);

    // 5. Seed Tasks for today
    const todayStr = new Date().toISOString().split('T')[0];
    const task1: Task = {
      id: 'task-01',
      title: 'Dr. Rajesh Sharma Clinic Detailing',
      description: 'Present CardioFix-50 scheme and distribute product samples.',
      assigned_mr_id: mr.id,
      created_by: manager.id,
      date: todayStr,
      time: '10:30:00',
      latitude: doc1.latitude,
      longitude: doc1.longitude,
      geofence_radius_m: 20,
      priority: 'HIGH',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    const task2: Task = {
      id: 'task-02',
      title: 'Dr. Priya Verma Evening Visit',
      description: 'Follow-up on pediatric antibiotic suspension samples.',
      assigned_mr_id: mr.id,
      created_by: manager.id,
      date: todayStr,
      time: '17:00:00',
      latitude: doc2.latitude,
      longitude: doc2.longitude,
      geofence_radius_m: 20,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    this.tasks.push(task1, task2);
    this.taskAssignments.push(
      { id: 'ta-01', task_id: task1.id, mr_id: mr.id, assigned_at: new Date().toISOString() },
      { id: 'ta-02', task_id: task2.id, mr_id: mr.id, assigned_at: new Date().toISOString() },
    );

    // 6. Seed Initial Leave Request and Approval (Rahul Sharma)
    const seedLeave: LeaveRequest = {
      id: 'leave-101',
      mr_id: mr.id,
      start_date: '2026-09-12',
      end_date: '2026-09-13',
      reason: 'Casual Leave: Family occasion',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    this.leaveRequests.push(seedLeave);
    this.approvals.push({
      id: 'appr-01',
      entity_type: 'LEAVE',
      entity_id: seedLeave.id,
      requested_by: mr.id,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });

    // 7. Seed Initial Expense (Rahul Sharma)
    const seedExpense: Expense = {
      id: 'exp-102',
      mr_id: mr.id,
      category: 'CONVEYANCE',
      amount: 450,
      receipt_file_key: 'receipt_capture_01.jpg',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    this.expenses.push(seedExpense);
    this.approvals.push({
      id: 'appr-02',
      entity_type: 'EXPENSE',
      entity_id: seedExpense.id,
      requested_by: mr.id,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });
  }
}
