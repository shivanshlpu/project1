import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
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
  LeaveQuota,
  TourPlan,
  Approval,
  Notification,
  AuditLog,
  DeviceAuthorizationRequest,
  Headquarter,
  HqArea,
  Stocker,
  Medicine,
  StockerInventory,
  InventoryTransaction,
  VerificationPhoto,
  MonthlyTourPlan,
  MonthlyTpItem,
  AttendanceSettings,
  Competition,
  RewardClaim,
  MonthlyStockEntry,
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
  public leaveQuotas: LeaveQuota[] = [];
  public tourPlans: TourPlan[] = [];
  public approvals: Approval[] = [];

  public notifications: Notification[] = [];
  public announcements: any[] = [];
  public auditLogs: AuditLog[] = [];
  public deviceAuthorizations: DeviceAuthorizationRequest[] = [];

  // Enhancement collections
  public headquarters: Headquarter[] = [];
  public hqAreas: HqArea[] = [];
  public stockers: Stocker[] = [];
  public medicines: Medicine[] = [];
  public stockerInventory: StockerInventory[] = [];
  public inventoryTransactions: InventoryTransaction[] = [];
  public verificationPhotos: VerificationPhoto[] = [];
  public monthlyTourPlans: MonthlyTourPlan[] = [];
  public attendanceSettings: AttendanceSettings = {
    id: 'att-settings-default',
    expected_punch_in_time: '10:00:00',
    allowed_punch_in_window_minutes: 30,
    expected_punch_out_time: '18:00:00',
    allowed_punch_out_window_minutes: 30,
    updated_at: new Date().toISOString(),
  };
  public competitions: Competition[] = [];
  public rewardClaims: RewardClaim[] = [];
  public monthlyStockEntries: MonthlyStockEntry[] = [];

  constructor(public readonly supabase: SupabaseService) {}

  public getStorageFilePath(): string {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    return path.join(dataDir, 'ffa_db_store.json');
  }

  public persistToDisk() {
    try {
      const filePath = this.getStorageFilePath();
      const payload = {
        tasks: this.tasks,
        attendance: this.attendance,
        attendanceSettings: this.attendanceSettings,
        doctorVisits: this.doctorVisits,
        visitDetails: this.visitDetails,
        dcrList: this.dcrList,
        dcrItems: this.dcrItems,
        expenses: this.expenses,
        leaveRequests: this.leaveRequests,
        tourPlans: this.tourPlans,
        monthlyTourPlans: this.monthlyTourPlans,
        stockerInventory: this.stockerInventory,
        verificationPhotos: this.verificationPhotos,
        saved_at: new Date().toISOString(),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[DatabaseService] Failed to persist data to disk:', err);
    }
  }

  public loadFromDisk(): boolean {
    try {
      const filePath = this.getStorageFilePath();
      if (!fs.existsSync(filePath)) return false;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.tasks)) {
        this.tasks = data.tasks;
        if (Array.isArray(data.attendance)) this.attendance = data.attendance;
        if (data.attendanceSettings) this.attendanceSettings = data.attendanceSettings;
        if (Array.isArray(data.doctorVisits)) this.doctorVisits = data.doctorVisits;
        if (Array.isArray(data.visitDetails)) this.visitDetails = data.visitDetails;
        if (Array.isArray(data.dcrList)) this.dcrList = data.dcrList;
        if (Array.isArray(data.dcrItems)) this.dcrItems = data.dcrItems;
        if (Array.isArray(data.expenses)) this.expenses = data.expenses;
        if (Array.isArray(data.leaveRequests)) this.leaveRequests = data.leaveRequests;
        if (Array.isArray(data.tourPlans)) this.tourPlans = data.tourPlans;
        if (Array.isArray(data.monthlyTourPlans)) this.monthlyTourPlans = data.monthlyTourPlans;
        if (Array.isArray(data.stockerInventory)) this.stockerInventory = data.stockerInventory;
        if (Array.isArray(data.verificationPhotos)) this.verificationPhotos = data.verificationPhotos;
        console.log(
          `[DatabaseService] Successfully restored ${this.tasks.length} tasks and ${this.attendance.length} attendance records from persistent disk store.`,
        );
        return true;
      }
    } catch (err) {
      console.warn('[DatabaseService] Failed to restore from disk store:', err);
    }
    return false;
  }

  async onModuleInit() {
    await this.seedInitialData();
    // Restore persistent tasks, visits & attendance from disk if available
    const restored = this.loadFromDisk();
    if (!restored) {
      this.persistToDisk();
    }

    if (this.supabase && this.supabase.isConnected) {
      try {
        const client = this.supabase.getClient();
        if (client) {
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

          // Sync tasks with Supabase
          const { data: remoteTasks, error: taskErr } = await client.from('tasks').select('*');
          if (!taskErr && remoteTasks && remoteTasks.length > 0) {
            console.log(`[DatabaseService] Synced ${remoteTasks.length} tasks from Supabase.`);
            for (const rt of remoteTasks) {
              const idx = this.tasks.findIndex((t) => t.id === rt.id);
              if (idx >= 0) {
                this.tasks[idx] = { ...this.tasks[idx], ...rt };
              } else {
                this.tasks.push(rt);
              }
            }
          } else if (this.tasks.length > 0) {
            for (const task of this.tasks) {
              await this.syncTaskToSupabase(task);
            }
          }

          // Sync attendance with Supabase
          const { data: remoteAtt, error: attErr } = await client.from('attendance').select('*');
          if (!attErr && remoteAtt && remoteAtt.length > 0) {
            console.log(`[DatabaseService] Synced ${remoteAtt.length} attendance records from Supabase.`);
            for (const ra of remoteAtt) {
              const idx = this.attendance.findIndex((a) => a.id === ra.id);
              if (idx >= 0) {
                this.attendance[idx] = { ...this.attendance[idx], ...ra };
              } else {
                this.attendance.push(ra);
              }
            }
          } else if (this.attendance.length > 0) {
            for (const att of this.attendance) {
              await this.syncAttendanceToSupabase(att);
            }
          }
        }
      } catch (err: any) {
        console.warn('[DatabaseService] Supabase onModuleInit notice:', err?.message);
      }
    }

    // Employee Zone Data Correction (§1.9)
    // Normalize any existing employee records storing 'Delhi Zone' or 'zone-north-1' to 'HQ Zone'
    for (const u of this.users) {
      if (
        u.zone_id === 'zone-north-1' ||
        u.zone_id === 'zone-delhi' ||
        (u as any).zone === 'Delhi Zone' ||
        (u as any).zone_name === 'Delhi Zone'
      ) {
        u.zone_id = 'zone-hq-1';
        (u as any).zone = 'HQ Zone';
        (u as any).zone_name = 'HQ Zone';
      }
    }
  }

  public async syncTaskToSupabase(task: any) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('tasks').upsert({
        id: task.id,
        title: task.title,
        description: task.description || '',
        assigned_mr_id: task.assigned_mr_id,
        assigned_mr_name: task.assigned_mr_name,
        created_by: task.created_by,
        date: task.date,
        time: task.time,
        location_name: task.location_name,
        address: task.address,
        latitude: task.latitude,
        longitude: task.longitude,
        geofence_radius_m: task.geofence_radius_m || 20,
        status: task.status || 'ASSIGNED',
        priority: task.priority || 'MEDIUM',
        started_at: task.started_at,
        completed_at: task.completed_at,
        duration_seconds: task.duration_seconds || 0,
        outcome: task.outcome,
        orders: task.orders ? (typeof task.orders === 'string' ? task.orders : JSON.stringify(task.orders)) : null,
        visit_photo: task.visit_photo || null,
        visit_photo_captured_at: task.visit_photo_captured_at,
        verification_photo_key: task.verification_photo_key,
        verification_photo_source: task.verification_photo_source,
        device_integrity_status: task.device_integrity_status || 'VERIFIED',
        suspended_at: task.suspended_at,
        suspended_reason: task.suspended_reason,
        unsuspended_at: task.unsuspended_at,
        unsuspended_by: task.unsuspended_by,
        hq_id: task.hq_id,
        hq_name: task.hq_name,
        stocker_id: task.stocker_id,
        stocker_name: task.stocker_name,
        created_at: task.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync task ${task.id}:`, err?.message);
    }
  }

  public async syncAttendanceToSupabase(att: any) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('attendance').upsert({
        id: att.id,
        user_id: att.user_id,
        user_name: att.user_name,
        date: att.date,
        check_in_at: att.check_in_at,
        check_in_lat: att.check_in_lat,
        check_in_lng: att.check_in_lng,
        check_in_location_name: att.check_in_location_name,
        check_in_photo: att.check_in_photo,
        photo_captured_at: att.photo_captured_at,
        photo_purged: att.photo_purged || false,
        check_out_at: att.check_out_at,
        check_out_lat: att.check_out_lat,
        check_out_lng: att.check_out_lng,
        check_out_location_name: att.check_out_location_name,
        distance_meters: att.distance_meters,
        is_verified_location: att.is_verified_location !== false,
        status: att.status || 'PRESENT',
        punch_in_photo_key: att.punch_in_photo_key,
        punch_in_photo_source: att.punch_in_photo_source || 'CAMERA',
        punch_out_photo_key: att.punch_out_photo_key,
        punch_out_photo_source: att.punch_out_photo_source || 'CAMERA',
        late_minutes: att.late_minutes || 0,
        early_minutes: att.early_minutes || 0,
        working_hours: att.working_hours || 0,
        device_integrity_status: att.device_integrity_status || 'VERIFIED',
        is_mocked: att.is_mocked || false,
        hq_id: att.hq_id,
        hq_name: att.hq_name,
        created_at: att.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync attendance ${att.id}:`, err?.message);
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
    const zoneId = 'zone-hq-1';
    this.zones.push({ id: zoneId, name: 'HQ Zone' });

    const regionId = 'reg-delhi-1';
    this.regions.push({ id: regionId, zone_id: zoneId, name: 'Delhi NCR' });

    const areaId = 'area-sdelhi-1';
    this.areas.push({ id: areaId, region_id: regionId, name: 'South Delhi' });

    // 3. Seed Users
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
    const shivanshPasswordHash = await bcrypt.hash('87654321', 10);

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

    // 4. Doctors / Healthcare Points of Care
    const doc1: Doctor = {
      id: 'doc-01',
      name: 'District Hospital Shahdol',
      qualification: 'Civil Surgeon, MS',
      specialization: 'District Healthcare Centre',
      class: 'A',
      potential_score: 95,
      phone: '9811122233',
      clinic: 'Civil Hospital & Trauma Centre',
      hospital: 'Shahdol District Hospital',
      address: 'Hospital Road, Bicharpur, Shahdol, MP',
      latitude: 23.2953,
      longitude: 81.3586,
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
      clinic: 'Shahdol Child Clinic',
      address: 'Station Road, Shahdol, MP',
      latitude: 23.3012,
      longitude: 81.3620,
      area_id: areaId,
      assigned_mr_id: mr.id,
      assigned_mr_name: mr.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    const doc3: Doctor = {
      id: 'doc-03',
      name: 'Ambikapur Civil Hospital',
      qualification: 'Chief Medical Officer',
      specialization: 'Multispecialty Public Healthcare',
      class: 'A',
      potential_score: 91,
      phone: '9877766554',
      clinic: 'Surguja District Hospital',
      hospital: 'Ambikapur Medical College Hospital',
      address: 'Hospital Chowk, Ambikapur, Chhattisgarh',
      latitude: 23.1197,
      longitude: 83.1979,
      area_id: areaId,
      assigned_mr_id: mr3.id,
      assigned_mr_name: mr3.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    const doc4: Doctor = {
      id: 'doc-04',
      name: 'Bilaspur Healthcare Centre',
      qualification: 'MD (General Medicine)',
      specialization: 'Super Specialty Hospital',
      class: 'C',
      potential_score: 64,
      phone: '9899911122',
      clinic: 'Apollo Regional Medical Centre',
      address: 'Vyapar Vihar, Bilaspur, Chhattisgarh',
      latitude: 22.0797,
      longitude: 82.1409,
      area_id: areaId,
      assigned_mr_id: mr3.id,
      assigned_mr_name: mr3.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    const doc5: Doctor = {
      id: 'doc-05',
      name: 'Kotma Primary Health Centre',
      qualification: 'MBBS, MD',
      specialization: 'Primary Healthcare',
      class: 'B',
      potential_score: 78,
      phone: '9827110022',
      clinic: 'Kotma PHC & Wellness Centre',
      address: 'Main Road, Kotma, Madhya Pradesh',
      latitude: 23.2035,
      longitude: 81.9669,
      area_id: areaId,
      assigned_mr_id: mr2.id,
      assigned_mr_name: mr2.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    this.doctors.push(doc1, doc2, doc3, doc4, doc5);

    // Initial tasks initialized empty (dummy seed tasks removed)
    this.tasks = [];
    this.taskAssignments = [];

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

    // 8. Seed Initial Leave Quotas
    this.leaveQuotas.push(
      {
        mr_id: mr.id,
        casual_total: 12,
        sick_total: 10,
        earned_total: 15,
        updated_at: new Date().toISOString(),
      },
      {
        mr_id: mr2.id,
        casual_total: 12,
        sick_total: 10,
        earned_total: 15,
        updated_at: new Date().toISOString(),
      },
      {
        mr_id: mr3.id,
        casual_total: 12,
        sick_total: 10,
        earned_total: 15,
        updated_at: new Date().toISOString(),
      },
    );

    // 9. Attendance starts completely empty - only real employee mobile punches are recorded
    this.attendance = [];

    // 10. Seed Headquarters (§6 & §10)
    const hqShahdol: Headquarter = {
      id: 'hq-shahdol',
      name: 'Shahdol',
      code: 'HQ-SHD',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqAmbikapur: Headquarter = {
      id: 'hq-ambikapur',
      name: 'Ambikapur',
      code: 'HQ-AMB',
      state: 'Chhattisgarh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqBilaspur: Headquarter = {
      id: 'hq-bilaspur',
      name: 'Bilaspur',
      code: 'HQ-BSP',
      state: 'Chhattisgarh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqKotma: Headquarter = {
      id: 'hq-kotma',
      name: 'Kotma',
      code: 'HQ-KTM',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqDelhi: Headquarter = {
      id: 'hq-delhi',
      name: 'Delhi NCR',
      code: 'HQ-DEL',
      state: 'Delhi',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.headquarters.push(
      hqShahdol,
      hqAmbikapur,
      hqBilaspur,
      hqKotma,
      hqDelhi,
    );

    // 11. Seed HQ Areas (Mapped strictly per HQ)
    const areas = [
      // Shahdol District Sub-Areas & Villages
      { id: 'area-shd-01', hq_id: hqShahdol.id, name: 'Burhar' },
      { id: 'area-shd-02', hq_id: hqShahdol.id, name: 'Gohparu' },
      { id: 'area-shd-03', hq_id: hqShahdol.id, name: 'Beohari' },
      { id: 'area-shd-04', hq_id: hqShahdol.id, name: 'Jaisinghnagar' },
      { id: 'area-shd-05', hq_id: hqShahdol.id, name: 'Sohagpur' },
      { id: 'area-shd-06', hq_id: hqShahdol.id, name: 'Singhpur' },
      { id: 'area-shd-07', hq_id: hqShahdol.id, name: 'Shahdol Central' },

      // Ambikapur District Sub-Areas & Villages
      { id: 'area-amb-01', hq_id: hqAmbikapur.id, name: 'Sitapur' },
      { id: 'area-amb-02', hq_id: hqAmbikapur.id, name: 'Lundra' },
      { id: 'area-amb-03', hq_id: hqAmbikapur.id, name: 'Batoli' },
      { id: 'area-amb-04', hq_id: hqAmbikapur.id, name: 'Mainpat' },
      { id: 'area-amb-05', hq_id: hqAmbikapur.id, name: 'Udaipur' },
      { id: 'area-amb-06', hq_id: hqAmbikapur.id, name: 'Lakhanpur' },
      { id: 'area-amb-07', hq_id: hqAmbikapur.id, name: 'Surguja' },
      { id: 'area-amb-08', hq_id: hqAmbikapur.id, name: 'Ramanujganj' },
      { id: 'area-amb-09', hq_id: hqAmbikapur.id, name: 'Ambikapur Central' },

      // Bilaspur District Sub-Areas & Villages
      { id: 'area-bsp-01', hq_id: hqBilaspur.id, name: 'Kota' },
      { id: 'area-bsp-02', hq_id: hqBilaspur.id, name: 'Takhatpur' },
      { id: 'area-bsp-03', hq_id: hqBilaspur.id, name: 'Masturi' },
      { id: 'area-bsp-04', hq_id: hqBilaspur.id, name: 'Bilha' },
      { id: 'area-bsp-05', hq_id: hqBilaspur.id, name: 'Ratanpur' },
      { id: 'area-bsp-06', hq_id: hqBilaspur.id, name: 'Bodri' },
      { id: 'area-bsp-07', hq_id: hqBilaspur.id, name: 'Sakri' },
      { id: 'area-bsp-08', hq_id: hqBilaspur.id, name: 'Bilaspur City' },

      // Kotma Sub-Areas & Villages
      { id: 'area-ktm-01', hq_id: hqKotma.id, name: 'Kotma Town' },
      { id: 'area-ktm-02', hq_id: hqKotma.id, name: 'Anuppur' },
      { id: 'area-ktm-03', hq_id: hqKotma.id, name: 'Jaithari' },
      { id: 'area-ktm-04', hq_id: hqKotma.id, name: 'Bijuri' },
      { id: 'area-ktm-05', hq_id: hqKotma.id, name: 'Rajendragram' },
      { id: 'area-ktm-06', hq_id: hqKotma.id, name: 'Bhalumuda' },

      // Jaisinghnagar & Burhar are Sub-Areas under Shahdol HQ
      { id: 'area-jsn-01', hq_id: hqShahdol.id, name: 'Jaisinghnagar Town' },
      { id: 'area-jsn-02', hq_id: hqShahdol.id, name: 'Amdih' },
      { id: 'area-jsn-03', hq_id: hqShahdol.id, name: 'Janakpur Road' },
      { id: 'area-bhr-01', hq_id: hqShahdol.id, name: 'Burhar Town' },
      { id: 'area-bhr-02', hq_id: hqShahdol.id, name: 'Dhanpuri' },
      { id: 'area-bhr-03', hq_id: hqShahdol.id, name: 'Amlai' },
      { id: 'area-bhr-04', hq_id: hqShahdol.id, name: 'Bakaho' },

      // Delhi District Sub-Areas
      { id: 'area-del-01', hq_id: hqDelhi.id, name: 'Saket' },
      { id: 'area-del-02', hq_id: hqDelhi.id, name: 'Hauz Khas' },
      { id: 'area-del-03', hq_id: hqDelhi.id, name: 'Green Park' },
      { id: 'area-del-04', hq_id: hqDelhi.id, name: 'South Extension' },
      { id: 'area-del-05', hq_id: hqDelhi.id, name: 'Malviya Nagar' },
    ];
    for (const a of areas) {
      this.hqAreas.push({
        id: a.id,
        hq_id: a.hq_id,
        name: a.name,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });
    }

    // 12. Seed Stockers (§9 & §10) with sub_area assigned
    const stocker1: Stocker = {
      id: 'stk-shd-01',
      hq_id: hqShahdol.id,
      name: 'Shahdol Stocker 1 (Central Depot)',
      sub_area: 'Shahdol Central',
      contact_person: 'Ramesh Patel',
      phone: '9826112233',
      address: 'Main Market Road, Shahdol, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker2: Stocker = {
      id: 'stk-shd-02',
      hq_id: hqShahdol.id,
      name: 'Shahdol Stocker 2 (Station Road)',
      sub_area: 'Shahdol Central',
      contact_person: 'Sanjay Gupta',
      phone: '9826144556',
      address: 'Station Road, Near Bus Stand, Shahdol, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker3: Stocker = {
      id: 'stk-shd-03',
      hq_id: hqShahdol.id,
      name: 'Jaisinghnagar Medical Agency',
      sub_area: 'Jaisinghnagar',
      contact_person: 'Anil Mishra',
      phone: '9826188990',
      address: 'Block Colony, Jaisinghnagar, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker4: Stocker = {
      id: 'stk-shd-04',
      hq_id: hqShahdol.id,
      name: 'Burhar Pharma Distributors',
      sub_area: 'Burhar',
      contact_person: 'Manoj Soni',
      phone: '9826177889',
      address: 'Railway Gate Road, Burhar, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker5: Stocker = {
      id: 'stk-bsp-01',
      hq_id: hqBilaspur.id,
      name: 'Bilaspur Pharma Depot',
      sub_area: 'Vyapar Vihar',
      contact_person: 'Vijay Agrawal',
      phone: '9827155667',
      address: 'Vyapar Vihar, Bilaspur, CG',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker6: Stocker = {
      id: 'stk-amb-01',
      hq_id: hqAmbikapur.id,
      name: 'Ambikapur Medical Store',
      sub_area: 'Main Market',
      contact_person: 'Rajesh Singhal',
      phone: '9827199001',
      address: 'Hospital Road, Ambikapur, CG',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker7: Stocker = {
      id: 'stk-ktm-01',
      hq_id: hqKotma.id,
      name: 'Kotma Healthcare Depot',
      sub_area: 'Station Chowk',
      contact_person: 'Deepak Tiwari',
      phone: '9827133445',
      address: 'Colliery Road, Kotma, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker8: Stocker = {
      id: 'stk-del-01',
      hq_id: hqDelhi.id,
      name: 'MedPlus Saket Central Depot',
      sub_area: 'Saket',
      contact_person: 'Amitav Ghosh',
      phone: '9811100221',
      address: 'Community Centre, Saket, New Delhi',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker9: Stocker = {
      id: 'stk-del-02',
      hq_id: hqDelhi.id,
      name: 'Apollo Pharmacy Hauz Khas Hub',
      sub_area: 'Hauz Khas',
      contact_person: 'Vikas Mehra',
      phone: '9811144332',
      address: 'Aurobindo Marg, Hauz Khas, New Delhi',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    this.stockers.push(stocker1, stocker2, stocker3, stocker4, stocker5, stocker6, stocker7, stocker8, stocker9);

    // 13. Seed Medicines Master (§11)
    const med1: Medicine = {
      id: 'med-01',
      name: 'CardioFix-50 (Telmisartan 40mg)',
      code: 'CF-50',
      unit: 'Box of 10x10',
      base_price: 180,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med2: Medicine = {
      id: 'med-02',
      name: 'CardioFix-AM (Telmisartan + Amlodipine)',
      code: 'CF-AM',
      unit: 'Box of 10x10',
      base_price: 220,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med3: Medicine = {
      id: 'med-03',
      name: 'DermaSoothe Cream 30g',
      code: 'DS-30',
      unit: 'Tube',
      base_price: 210,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med4: Medicine = {
      id: 'med-04',
      name: 'Glucotrol-M (Metformin 500mg)',
      code: 'GM-500',
      unit: 'Box of 10x10',
      base_price: 145,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med5: Medicine = {
      id: 'med-05',
      name: 'AhtriCef-O 200mg (Cefixime)',
      code: 'ACO-200',
      unit: 'Strip of 10',
      base_price: 165,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    this.medicines.push(med1, med2, med3, med4, med5);

    // 14. Seed Stocker Inventory (§12 & §13) - Seed every stocker with complete medicines inventory
    for (const stk of this.stockers) {
      let mIdx = 1;
      for (const med of this.medicines) {
        const qty = mIdx === 3 ? 15 : mIdx === 2 ? 30 : 50 + (mIdx * 10);
        this.stockerInventory.push({
          id: `inv-${stk.id}-${med.id}`,
          hq_id: stk.hq_id,
          stocker_id: stk.id,
          medicine_id: med.id,
          quantity: qty,
          low_stock_threshold: 15,
          updated_at: new Date().toISOString(),
        });
        mIdx++;
      }
    }

    // Initial Audit Logs for stock seed
    this.inventoryTransactions.push({
      id: 'tx-init-01',
      hq_id: hqShahdol.id,
      stocker_id: stocker1.id,
      medicine_id: med1.id,
      quantity: 50,
      balance_after: 50,
      transaction_type: 'INITIAL',
      user_id: 'usr-admin-shivansh',
      reason: 'Initial stock intake on system commissioning',
      timestamp: new Date().toISOString(),
    });

    // Seed Sample Monthly Stock Inward Entries
    this.monthlyStockEntries.push(
      {
        id: 'entry-oct-01',
        hq_id: hqShahdol.id,
        hq_name: hqShahdol.name,
        stocker_id: stocker1.id,
        stocker_name: stocker1.name,
        month: '2026-10',
        entry_date: '2026-10-01',
        invoice_no: 'INV-AHTRI-2026/10-01',
        medicine_id: med1.id,
        medicine_name: med1.name,
        medicine_code: med1.code,
        quantity: 50,
        unit: med1.unit,
        batch_no: 'CF50-B2610',
        expiry_date: '2028-09-30',
        notes: 'Monthly batch delivery from central warehouse',
        user_id: 'usr-admin-shivansh',
        user_name: 'Shivansh Tripathi (Admin)',
        created_at: new Date().toISOString(),
      },
      {
        id: 'entry-oct-02',
        hq_id: hqShahdol.id,
        hq_name: hqShahdol.name,
        stocker_id: stocker1.id,
        stocker_name: stocker1.name,
        month: '2026-10',
        entry_date: '2026-10-01',
        invoice_no: 'INV-AHTRI-2026/10-01',
        medicine_id: med4.id,
        medicine_name: med4.name,
        medicine_code: med4.code,
        quantity: 85,
        unit: med4.unit,
        batch_no: 'GM500-B2610',
        expiry_date: '2028-11-30',
        notes: 'Regular monthly replenishment',
        user_id: 'usr-admin-shivansh',
        user_name: 'Shivansh Tripathi (Admin)',
        created_at: new Date().toISOString(),
      },
    );

    // 15. Seed Active Competition (§27)
    this.competitions.push({
      id: 'comp-shd-01',
      name: 'Shahdol CardioFix-50 Sprint',
      start_date: '2026-09-01',
      end_date: '2026-10-31',
      hq_id: hqShahdol.id,
      hq_name: 'Shahdol',
      medicine_id: med1.id,
      medicine_name: 'CardioFix-50 (Telmisartan 40mg)',
      target_quantity: 100,
      reward_amount: 2000,
      description: 'Sell 100 units of CardioFix-50 in Shahdol territory during September & October 2026 to earn an instant ₹2,000 cash incentive.',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    });

    // 16. Seed a sample submitted Monthly Tour Plan (§5-8)
    this.monthlyTourPlans.push({
      id: 'mtp-01',
      mr_id: mr.id,
      mr_name: mr.name,
      month: '2026-09',
      status: 'APPROVED',
      submitted_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      entries: [
        {
          id: 'tp-item-1',
          date: '02-09-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Shahdol',
          work_type: 'Doctor Visit',
          planned_kol_drs: 'Dr. Rajesh Sharma',
          planned_activity: 'CardioFix-50 Detailing and Scheme Presentation',
        },
        {
          id: 'tp-item-2',
          date: '04-09-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Burhar',
          work_type: 'Order Collection',
          planned_kol_drs: 'Dr. Priya Verma',
          planned_activity: 'Antibiotic syrup follow-up and stockist order booking',
        },
        {
          id: 'tp-item-3',
          date: '08-09-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Kotma',
          work_type: 'Follow-up',
          planned_kol_drs: 'Dr. Anita Desai',
          planned_activity: 'DermaSoothe sample trials evaluation',
        },
      ],
    });

    this.monthlyTourPlans.push({
      id: 'mtp-02',
      mr_id: mr.id,
      mr_name: mr.name,
      month: '2026-10',
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      entries: [
        {
          id: 'tp-item-4',
          date: '04-10-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Gohparu',
          work_type: 'Doctor Visit',
          planned_kol_drs: 'Dr. Alok Nath',
          planned_activity: 'Doctor Detailing & Product Sample Handover',
        },
        {
          id: 'tp-item-5',
          date: '05-10-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Burhar',
          work_type: 'Doctor Visit',
          planned_kol_drs: 'Dr. Sandeep Gupta',
          planned_activity: 'Chemist Order Booking & Detailing',
        },
      ],
    });
  }
}
