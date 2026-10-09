import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
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
  RouteBatch,
  Order,
} from './database.types';
import { SupabaseService } from './supabase.service';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
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
  public orders: Order[] = [];
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
  public routeBatches: RouteBatch[] = [];
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
    reimbursement_rate_per_km: 2.5,
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

  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving = false;

  public async flushToDisk(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const filePath = this.getStorageFilePath();
      const payload = {
        tasks: this.tasks,
        orders: this.orders,
        attendance: this.attendance,
        attendanceSettings: this.attendanceSettings,
        doctorVisits: this.doctorVisits,
        visitDetails: this.visitDetails,
        dcrList: this.dcrList,
        dcrItems: this.dcrItems,
        expenses: this.expenses,
        leaveRequests: this.leaveRequests,
        leaveQuotas: this.leaveQuotas,
        tourPlans: this.tourPlans,
        monthlyTourPlans: this.monthlyTourPlans,
        stockerInventory: this.stockerInventory,
        verificationPhotos: this.verificationPhotos,
        deviceAuthorizations: this.deviceAuthorizations,
        routeBatches: this.routeBatches,
        userCredentials: this.users.map((u) => ({
          id: u.id,
          email: u.email,
          password_hash: u.password_hash,
        })),
        userDeviceStates: this.users.map((u) => ({
          id: u.id,
          device_id: u.device_id,
          device_model: u.device_model,
          device_bound_at: u.device_bound_at,
          logged_out: u.logged_out,
          requires_device_otp_on_login: u.requires_device_otp_on_login,
        })),
        saved_at: new Date().toISOString(),
      };
      await fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[DatabaseService] Failed to flush data to disk:', err);
    }
  }

  public async onApplicationShutdown(signal?: string) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.flushToDisk();
  }

  public persistToDisk() {
    if (process.env.NODE_ENV === 'test') return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(async () => {
      if (this.isSaving) return;
      this.isSaving = true;
      try {
        await this.flushToDisk();
      } finally {
        this.isSaving = false;
      }
    }, 250);
  }

  /**
   * Authoritative task persistence: updates in-memory cache, triggers debounced
   * disk store write, and asynchronously synchronizes directly to PostgreSQL/Supabase.
   */
  public async persistTask(task: Task): Promise<void> {
    const idx = this.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.tasks[idx] = task;
    } else {
      this.tasks.push(task);
    }
    this.persistToDisk();
    if (this.supabase && this.supabase.isConnected) {
      this.syncTaskToSupabase(task).catch((err) =>
        console.warn(`[DatabaseService] Async Supabase task sync notice: ${err?.message}`),
      );
    }
  }

  /**
   * Authoritative attendance persistence: updates in-memory cache, triggers debounced
   * disk store write, and asynchronously synchronizes directly to PostgreSQL/Supabase.
   */
  public async persistAttendance(att: Attendance): Promise<void> {
    const idx = this.attendance.findIndex((a) => a.id === att.id);
    if (idx >= 0) {
      this.attendance[idx] = att;
    } else {
      this.attendance.push(att);
    }
    this.persistToDisk();
    if (this.supabase && this.supabase.isConnected) {
      this.syncAttendanceToSupabase(att).catch((err) =>
        console.warn(`[DatabaseService] Async Supabase attendance sync notice: ${err?.message}`),
      );
    }
  }

  public loadFromDisk(): boolean {
    if (process.env.NODE_ENV === 'test') return false;
    try {
      const filePath = this.getStorageFilePath();
      if (!fs.existsSync(filePath)) return false;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.tasks)) {
        this.tasks = data.tasks;
        if (Array.isArray(data.orders)) this.orders = data.orders;
        if (Array.isArray(data.attendance)) this.attendance = data.attendance;
        if (data.attendanceSettings) {
          this.attendanceSettings = {
            ...this.attendanceSettings,
            ...data.attendanceSettings,
            reimbursement_rate_per_km: data.attendanceSettings.reimbursement_rate_per_km ?? 2.5,
          };
        }
        if (Array.isArray(data.doctorVisits)) this.doctorVisits = data.doctorVisits;
        if (Array.isArray(data.visitDetails)) this.visitDetails = data.visitDetails;
        if (Array.isArray(data.dcrList)) this.dcrList = data.dcrList;
        if (Array.isArray(data.dcrItems)) this.dcrItems = data.dcrItems;
        if (Array.isArray(data.expenses)) this.expenses = data.expenses;
        if (Array.isArray(data.leaveRequests)) this.leaveRequests = data.leaveRequests;
        if (Array.isArray(data.leaveQuotas) && data.leaveQuotas.length > 0) {
          const quotaMap = new Map(this.leaveQuotas.map((q) => [q.mr_id, q]));
          for (const q of data.leaveQuotas) {
            quotaMap.set(q.mr_id, q);
          }
          this.leaveQuotas = Array.from(quotaMap.values());
        }
        if (Array.isArray(data.tourPlans)) this.tourPlans = data.tourPlans;
        if (Array.isArray(data.monthlyTourPlans)) this.monthlyTourPlans = data.monthlyTourPlans;
        if (Array.isArray(data.stockerInventory)) this.stockerInventory = data.stockerInventory;
        if (Array.isArray(data.verificationPhotos)) this.verificationPhotos = data.verificationPhotos;
        if (Array.isArray(data.deviceAuthorizations)) {
          this.deviceAuthorizations = data.deviceAuthorizations;
        }
        if (Array.isArray(data.routeBatches) && data.routeBatches.length > 0) {
          const batchMap = new Map(this.routeBatches.map((b) => [b.id, b]));
          for (const b of data.routeBatches) {
            batchMap.set(b.id, b);
          }
          this.routeBatches = Array.from(batchMap.values());
        }
        if (Array.isArray(data.userCredentials)) {
          data.userCredentials.forEach((cred: any) => {
            const user = this.users.find((u) => u.id === cred.id || u.email.toLowerCase() === cred.email?.toLowerCase());
            if (user && cred.password_hash) {
              user.password_hash = cred.password_hash;
            }
          });
        }
        if (Array.isArray(data.userDeviceStates)) {
          data.userDeviceStates.forEach((state: any) => {
            const user = this.users.find((u) => u.id === state.id);
            if (user) {
              user.device_id = state.device_id;
              user.device_model = state.device_model;
              user.device_bound_at = state.device_bound_at;
              user.logged_out = state.logged_out;
              user.requires_device_otp_on_login = state.requires_device_otp_on_login;
            }
          });
        }
        console.log(
          `[DatabaseService] Successfully restored ${this.tasks.length} tasks, ${this.attendance.length} attendance records, ${this.leaveQuotas.length} leave quotas, and ${this.deviceAuthorizations.length} device authorizations from persistent disk store.`,
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
            const DUMMY_IDS = new Set(['task-01', 'task-02', 'task-03', 'task-04', 'task-05']);
            for (const rt of remoteTasks) {
              if (DUMMY_IDS.has(rt.id)) {
                try {
                  await client.from('tasks').delete().eq('id', rt.id);
                } catch {}
                continue;
              }
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

          // Sync users credentials from Supabase
          const { data: remoteUsers, error: usersErr } = await client.from('users').select('*');
          if (!usersErr && remoteUsers && remoteUsers.length > 0) {
            for (const ru of remoteUsers) {
              const u = this.users.find((usr) => usr.id === ru.id || usr.email.toLowerCase() === ru.email?.toLowerCase());
              if (u && ru.password_hash) {
                u.password_hash = ru.password_hash;
              }
            }
          }

          // Purge legacy dummy clinics & legacy dummy MR IDs from Supabase if present
          try {
            await client.from('doctors').delete().in('id', ['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05']);
            await client.from('tasks').delete().in('assigned_mr_id', ['usr-mr-rahul', 'usr-mr-vikram', 'usr-mr-pooja']);
            await client.from('attendance').delete().in('user_id', ['usr-mr-rahul', 'usr-mr-vikram', 'usr-mr-pooja']);
          } catch {}
        }
      } catch (err: any) {
        console.warn('[DatabaseService] Supabase onModuleInit notice:', err?.message);
      }
    }

    // Purge any legacy dummy records loaded from old disk stores in non-test mode
    if (process.env.NODE_ENV !== 'test') {
      const LEGACY_DUMMY_IDS = new Set(['usr-mr-rahul', 'usr-mr-vikram', 'usr-mr-pooja']);
      const DUMMY_DOC_IDS = new Set(['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05']);
      this.tasks = this.tasks.filter((t) => !LEGACY_DUMMY_IDS.has(t.assigned_mr_id) && !DUMMY_DOC_IDS.has(t.id));
      this.attendance = this.attendance.filter((a) => !LEGACY_DUMMY_IDS.has(a.user_id));
      this.doctors = this.doctors.filter((d) => !DUMMY_DOC_IDS.has(d.id));
    }

    // Employee Zone & HQ Data Normalization
    // Normalize any legacy employee records to 'Shahdol & Central Division' and stable HQ IDs
    for (const u of this.users) {
      if (
        u.zone_id === 'zone-north-1' ||
        u.zone_id === 'zone-delhi' ||
        u.zone_id === 'zone-hq-1' ||
        (u as any).zone === 'Delhi Zone' ||
        (u as any).zone_name === 'Delhi Zone'
      ) {
        u.zone_id = 'zone-hq-shahdol';
        (u as any).zone = 'Shahdol & Central Division';
        (u as any).zone_name = 'Shahdol & Central Division';
      }
      // Populate HQ codes/IDs if missing
      if (u.hq_id === 'hq-kotma' || (u.hq_name === 'Kotma' && !u.hq_id)) {
        u.hq_id = 'HQ-KOT-001';
        u.hq_code = 'KOT';
        u.hq_name = 'Kotma';
      } else if (u.hq_id === 'hq-shahdol' || (u.hq_name === 'Shahdol' && !u.hq_id)) {
        u.hq_id = 'HQ-SHD-001';
        u.hq_code = 'SHD';
        u.hq_name = 'Shahdol';
      } else if (u.hq_id === 'hq-ambikapur' || (u.hq_name === 'Ambikapur' && !u.hq_id)) {
        u.hq_id = 'HQ-AMB-001';
        u.hq_code = 'AMB';
        u.hq_name = 'Ambikapur';
      }
    }

    // Normalize stored tasks and attendance HQ IDs to stable HQ IDs
    for (const t of this.tasks) {
      if (t.hq_id === 'hq-shahdol') t.hq_id = 'HQ-SHD-001';
      else if (t.hq_id === 'hq-kotma' || t.hq_id === 'HQ-KTM') t.hq_id = 'HQ-KOT-001';
      else if (t.hq_id === 'hq-ambikapur') t.hq_id = 'HQ-AMB-001';
      else if (t.hq_id === 'hq-bilaspur') t.hq_id = 'HQ-BSP-001';
    }
    for (const a of this.attendance) {
      if (a.hq_id === 'hq-shahdol') a.hq_id = 'HQ-SHD-001';
      else if (a.hq_id === 'hq-kotma' || a.hq_id === 'HQ-KTM') a.hq_id = 'HQ-KOT-001';
      else if (a.hq_id === 'hq-ambikapur') a.hq_id = 'HQ-AMB-001';
      else if (a.hq_id === 'hq-bilaspur') a.hq_id = 'HQ-BSP-001';
    }
  }

  public findHeadquarter(identifier: string): Headquarter | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim().toLowerCase();
    return this.headquarters.find(
      (h) =>
        h.id.toLowerCase() === clean ||
        h.hq_id.toLowerCase() === clean ||
        h.code.toLowerCase() === clean ||
        (h.hq_code && h.hq_code.toLowerCase() === clean) ||
        (h.legacy_id && h.legacy_id.toLowerCase() === clean) ||
        h.name.toLowerCase() === clean,
    );
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

  public async deleteTaskFromSupabase(id: string) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('tasks').delete().eq('id', id);
      await client.from('task_assignments').delete().eq('task_id', id);
      await client.from('location_verifications').delete().eq('task_id', id);
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to delete task ${id} from Supabase:`, err?.message);
    }
  }

  public async purgeSuspendedTasksFromSupabase(ids: string[]) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      if (ids && ids.length > 0) {
        await client.from('tasks').delete().in('id', ids);
      }
      await client.from('tasks').delete().eq('status', 'SUSPENDED');
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to purge suspended tasks from Supabase:`, err?.message);
    }
  }

  public async clearAllTasksFromSupabase() {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('tasks').delete().neq('id', '_____never_____');
      await client.from('task_assignments').delete().neq('id', '_____never_____');
      await client.from('location_verifications').delete().neq('id', '_____never_____');
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to clear all tasks from Supabase:`, err?.message);
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
    const zoneId = 'zone-hq-shahdol';
    this.zones.push({ id: zoneId, name: 'Shahdol & Central Division' });

    const regionId = 'reg-shd-1';
    this.regions.push({ id: regionId, zone_id: zoneId, name: 'Shahdol Operational Region' });

    const areaKotmaId = 'area-ktm-1';
    const areaShahdolId = 'area-shd-1';
    const areaAmbikapurId = 'area-amb-1';
    this.areas.push(
      { id: areaKotmaId, region_id: regionId, name: 'Kotma HQ Territory' },
      { id: areaShahdolId, region_id: regionId, name: 'Shahdol HQ Territory' },
      { id: areaAmbikapurId, region_id: regionId, name: 'Ambikapur HQ Territory' },
    );

    // 3. Seed Users (precomputed bcrypt cost-10 hashes to avoid event-loop CPU stall)
    const defaultPasswordHash = '$2a$10$6d2aXuuact9gZ6HAfKWt5uAxoH4ZHnGG0B245RjiEp1NUWq.nnNZa';
    const shivanshPasswordHash = '$2a$10$ZrD1AsjjK9Osz2nd3xUNcemu23NAPztKmcLokvufV65J52tQkO1XG';
    const amarPasswordHash = '$2a$10$b4FwNYmP2E/JsHB3wQrcAeOXe39WLr68IUIOQdQGXgyUm0iI9ETmC';
    const amanPasswordHash = '$2a$10$GxSnC0d70j7BW/HI5KwwUu.jE/AASG4BAbIjV/8fBRZZpELmVIEV2';
    const ashishPasswordHash = '$2a$10$ElYv/1rGCurbbZsjgZh8lOcDLSY9ZNMfieLB0PwrIFfn8Gn008hwa';

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
      area_id: areaShahdolId,
      status: 'ACTIVE',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    // 1. MR: Amar Dwivedi | HQ: Kotma | HQ Code: KOT | HQ ID: HQ-KOT-001 | Default Pwd: AmarDwivediKOT
    const mr1: User = {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      phone: '9876543212',
      email: 'amar@ahtri.com',
      password_hash: amarPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaKotmaId,
      hq_id: 'HQ-KOT-001',
      hq_code: 'KOT',
      hq_name: 'Kotma',
      territory: 'Kotma HQ Territory',
      assigned_territory: 'Kotma HQ Territory',
      route_batches: ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5', 'Batch 6', 'Batch 7', 'Batch 8', 'Batch 9'],
      assigned_route_batches: ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5', 'Batch 6', 'Batch 7', 'Batch 8', 'Batch 9'],
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    // 2. MR: Aman Rathore | HQ: Shahdol | HQ Code: SHD | HQ ID: HQ-SHD-001 | Default Pwd: AmanRathoreSHD
    const mr2: User = {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      phone: '9876543213',
      email: 'aman@ahtri.com',
      password_hash: amanPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaShahdolId,
      hq_id: 'HQ-SHD-001',
      hq_code: 'SHD',
      hq_name: 'Shahdol',
      territory: 'Shahdol HQ Territory',
      assigned_territory: 'Shahdol HQ Territory',
      route_batches: ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'],
      assigned_route_batches: ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'],
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    // 3. MR: Ashish Soni | HQ: Ambikapur | HQ Code: AMB | HQ ID: HQ-AMB-001 | Default Pwd: AshishSoniAMB
    const mr3: User = {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      phone: '9876543214',
      email: 'ashish@ahtri.com',
      password_hash: ashishPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaAmbikapurId,
      hq_id: 'HQ-AMB-001',
      hq_code: 'AMB',
      hq_name: 'Ambikapur',
      territory: 'Ambikapur HQ Territory',
      assigned_territory: 'Ambikapur HQ Territory',
      route_batches: ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'],
      assigned_route_batches: ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'],
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    this.users.push(shivanshAdmin, superAdmin, manager, mr1, mr2, mr3);

    // Territory links
    this.territories.push(
      { id: 'terr-01', area_id: areaKotmaId, mr_user_id: mr1.id },
      { id: 'terr-02', area_id: areaShahdolId, mr_user_id: mr2.id },
      { id: 'terr-03', area_id: areaAmbikapurId, mr_user_id: mr3.id },
    );

    // 4. Doctors / Healthcare Points of Care
    if (process.env.NODE_ENV === 'test') {
      const today = new Date().toISOString().split('T')[0];
      this.doctors = [
        {
          id: 'doc-01',
          name: 'Dr. Rajesh Sharma',
          qualification: 'MBBS, MD',
          specialization: 'Cardiologist',
          class: 'A',
          potential_score: 95,
          phone: '9811122233',
          clinic: 'City Heart Clinic',
          address: 'Station Road, Kotma',
          latitude: 28.5245,
          longitude: 77.2066,
          area_id: 'area-ktm-1',
          created_by: 'usr-mgr-01',
          assigned_mr_id: 'usr-mr-01',
          assigned_mr_name: 'Amar Dwivedi',
          created_at: new Date().toISOString(),
        },
        {
          id: 'doc-02',
          name: 'Dr. Priya Nair',
          qualification: 'MBBS, MD',
          specialization: 'Dermatologist',
          class: 'A',
          potential_score: 88,
          phone: '9822233344',
          clinic: 'Skin Care Centre',
          address: 'Hauz Khas, New Delhi',
          latitude: 28.5585,
          longitude: 77.2028,
          area_id: 'area-sdelhi-1',
          created_by: 'usr-mgr-01',
          assigned_mr_id: 'usr-mr-01',
          assigned_mr_name: 'Amar Dwivedi',
          created_at: new Date().toISOString(),
        },
      ];
      this.tasks = [
        {
          id: 'task-01',
          title: 'Cardio Clinic Detailing',
          description: 'Product sampling and order booking',
          assigned_mr_id: 'usr-mr-01',
          assigned_mr_name: 'Amar Dwivedi',
          created_by: 'usr-mgr-01',
          date: today,
          time: '10:00:00',
          location_name: 'City Heart Clinic',
          latitude: 28.5245,
          longitude: 77.2066,
          geofence_radius_m: 20,
          status: 'ASSIGNED',
          priority: 'HIGH',
          created_at: new Date().toISOString(),
        },
      ];
    } else {
      this.doctors = [];
      this.tasks = [];
    }
    this.taskAssignments = [];
    this.locationVerifications = [];

    // Real approvals and claims initialized empty
    this.leaveRequests = [];
    this.expenses = [];
    this.approvals = [];

    // 8. Seed Initial Leave Quotas
    this.leaveQuotas.push(
      {
        mr_id: mr1.id,
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

    // 10. Seed Headquarters Master Data (§6 & §10)
    // 1. Kotma (HQ ID: HQ-KOT-001, HQ Code: KOT)
    const hqKotma: Headquarter = {
      id: 'HQ-KOT-001',
      hq_id: 'HQ-KOT-001',
      name: 'Kotma',
      code: 'KOT',
      hq_code: 'KOT',
      legacy_id: 'hq-kotma',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    // 2. Shahdol (HQ ID: HQ-SHD-001, HQ Code: SHD)
    const hqShahdol: Headquarter = {
      id: 'HQ-SHD-001',
      hq_id: 'HQ-SHD-001',
      name: 'Shahdol',
      code: 'SHD',
      hq_code: 'SHD',
      legacy_id: 'hq-shahdol',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    // 3. Ambikapur (HQ ID: HQ-AMB-001, HQ Code: AMB)
    const hqAmbikapur: Headquarter = {
      id: 'HQ-AMB-001',
      hq_id: 'HQ-AMB-001',
      name: 'Ambikapur',
      code: 'AMB',
      hq_code: 'AMB',
      legacy_id: 'hq-ambikapur',
      state: 'Chhattisgarh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    // 4. Bilaspur (HQ ID: HQ-BSP-001, HQ Code: BSP)
    const hqBilaspur: Headquarter = {
      id: 'HQ-BSP-001',
      hq_id: 'HQ-BSP-001',
      name: 'Bilaspur',
      code: 'BSP',
      hq_code: 'BSP',
      legacy_id: 'hq-bilaspur',
      state: 'Chhattisgarh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.headquarters.push(
      hqKotma,
      hqShahdol,
      hqAmbikapur,
      hqBilaspur,
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

    // 11.1 Seed Default Route Batches (§Master Route Planning)
    const seedRouteBatches: RouteBatch[] = [
      // Kotma Batches (Batch 1 - 9)
      { id: 'rb-kot-01', batch_code: 'Batch 1', name: 'Kotma Town & Local Market', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma Town', 'Station Road', 'Old Market'], areas: ['Kotma Town'], distance_km: 15, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-02', batch_code: 'Batch 2', name: 'Anuppur District Hospital & Market', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Anuppur', 'District Hospital', 'Civil Lines'], areas: ['Anuppur'], distance_km: 35, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-03', batch_code: 'Batch 3', name: 'Jaithari PHC & Thermal Power Belt', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Jaithari', 'Chachai Road', 'PHC Colony'], areas: ['Jaithari'], distance_km: 42, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-04', batch_code: 'Batch 4', name: 'Bijuri Colliery & Main Market', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Bijuri', 'Colliery Road', 'Station Road'], areas: ['Bijuri'], distance_km: 22, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-05', batch_code: 'Batch 5', name: 'Rajendragram Route & Tribal Area', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Rajendragram', 'Amarkantak Road'], areas: ['Rajendragram'], distance_km: 55, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-06', batch_code: 'Batch 6', name: 'Bhalumuda Coalmines & Clinics', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Bhalumuda', 'Mine Gate', 'Main Chowk'], areas: ['Bhalumuda'], distance_km: 28, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-07', batch_code: 'Batch 7', name: 'Kotma Outer & Rural Centers', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kevai River Belt', 'Kotma Outer'], areas: ['Kotma Town'], distance_km: 30, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-08', batch_code: 'Batch 8', name: 'Anuppur-Jaithari Connected Route', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Anuppur', 'Jaithari'], areas: ['Anuppur', 'Jaithari'], distance_km: 48, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-09', batch_code: 'Batch 9', name: 'Jaithari-Bijuri Extended Loop', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Jaithari', 'Bijuri'], areas: ['Jaithari', 'Bijuri'], distance_km: 50, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

      // Shahdol Batches (Batch 1 - 5)
      { id: 'rb-shd-01', batch_code: 'Batch 1', name: 'Shahdol Central & Medical College', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Shahdol Central', 'Gandhi Chowk', 'Medical College Road'], areas: ['Shahdol Central'], distance_km: 20, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-02', batch_code: 'Batch 2', name: 'Burhar Town & Dhanpuri Colliery', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Burhar Town', 'Dhanpuri', 'Amlai Paper Mills'], areas: ['Burhar'], distance_km: 32, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-03', batch_code: 'Batch 3', name: 'Gohparu & Sohagpur Clinics', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Gohparu', 'Sohagpur', 'Singhpur'], areas: ['Gohparu', 'Sohagpur'], distance_km: 45, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-04', batch_code: 'Batch 4', name: 'Beohari Sub-Division Route', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Beohari', 'Rewa Road Junction'], areas: ['Beohari'], distance_km: 78, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-05', batch_code: 'Batch 5', name: 'Jaisinghnagar & Amdih Route', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Jaisinghnagar Town', 'Amdih', 'Janakpur Road'], areas: ['Jaisinghnagar'], distance_km: 52, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

      // Ambikapur Batches (Batch 1 - 5)
      { id: 'rb-amb-01', batch_code: 'Batch 1', name: 'Ambikapur Central & Ring Road', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Ambikapur Central', 'Hospital Road', 'Ring Road'], areas: ['Ambikapur Central'], distance_km: 25, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-02', batch_code: 'Batch 2', name: 'Sitapur & Lundra Corridor', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Sitapur', 'Lundra'], areas: ['Sitapur', 'Lundra'], distance_km: 45, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-03', batch_code: 'Batch 3', name: 'Batoli & Mainpat Route', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Batoli', 'Mainpat Plateau'], areas: ['Batoli', 'Mainpat'], distance_km: 60, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-04', batch_code: 'Batch 4', name: 'Udaipur & Lakhanpur Belt', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Udaipur', 'Lakhanpur'], areas: ['Udaipur', 'Lakhanpur'], distance_km: 40, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-05', batch_code: 'Batch 5', name: 'Ramanujganj & Surguja Border', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Ramanujganj', 'Surguja Border'], areas: ['Ramanujganj', 'Surguja'], distance_km: 80, standard_reimbursement_rate: 2.5, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    this.routeBatches.push(...seedRouteBatches);

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
    this.stockers.push(stocker1, stocker2, stocker3, stocker4, stocker5, stocker6, stocker7);

    // 13. Seed Route Batches (19 Configured Master Batches across Kotma, Shahdol & Ambikapur)
    this.routeBatches = [
      // MR: Amar Dwivedi | HQ: Kotma (9 Batches)
      {
        id: 'rb-kot-01',
        batch_code: 'Batch 1',
        name: 'Kotma → Marwahi → Dhanikundi',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Marwahi', 'Dhanikundi'],
        areas: ['Kotma', 'Marwahi', 'Dhanikundi'],
        distance_km: 85,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-02',
        batch_code: 'Batch 2',
        name: 'Kotma → Kelhari → Janakpur',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Kelhari', 'Janakpur'],
        areas: ['Kotma', 'Kelhari', 'Janakpur'],
        distance_km: 95,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-03',
        batch_code: 'Batch 3',
        name: 'Kotma → Keswahi → Girva → Khamhidol',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Keswahi', 'Girva', 'Khamhidol'],
        areas: ['Kotma', 'Keswahi', 'Girva', 'Khamhidol'],
        distance_km: 110,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-04',
        batch_code: 'Batch 4',
        name: 'Kotma → Jaithari → Rajendragram',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Jaithari', 'Rajendragram'],
        areas: ['Kotma', 'Jaithari', 'Rajendragram'],
        distance_km: 70,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-05',
        batch_code: 'Batch 5',
        name: 'Kotma → Anuppur',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Anuppur'],
        areas: ['Kotma', 'Anuppur'],
        distance_km: 45,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-06',
        batch_code: 'Batch 6',
        name: 'Kotma → Manendragarh',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Manendragarh'],
        areas: ['Kotma', 'Manendragarh'],
        distance_km: 65,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-07',
        batch_code: 'Batch 7',
        name: 'Kotma → Chirmiri',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Chirmiri'],
        areas: ['Kotma', 'Chirmiri'],
        distance_km: 80,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-08',
        batch_code: 'Batch 8',
        name: 'Kotma → Baikunthpur',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Baikunthpur'],
        areas: ['Kotma', 'Baikunthpur'],
        distance_km: 90,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-kot-09',
        batch_code: 'Batch 9',
        name: 'Kotma → Gaurela',
        hq_id: hqKotma.hq_id,
        hq_code: hqKotma.code,
        hq_name: hqKotma.name,
        mr_id: mr1.id,
        mr_name: mr1.name,
        territory_name: 'Kotma HQ Territory',
        route_stops: ['Kotma', 'Gaurela'],
        areas: ['Kotma', 'Gaurela'],
        distance_km: 95,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },

      // MR: Aman Rathore | HQ: Shahdol (5 Batches)
      {
        id: 'rb-shd-01',
        batch_code: 'Batch 1',
        name: 'Shahdol → Budhar → Dhanpuri → OPM',
        hq_id: hqShahdol.hq_id,
        hq_code: hqShahdol.code,
        hq_name: hqShahdol.name,
        mr_id: mr2.id,
        mr_name: mr2.name,
        territory_name: 'Shahdol HQ Territory',
        route_stops: ['Shahdol', 'Budhar', 'Dhanpuri', 'OPM'],
        areas: ['Shahdol', 'Budhar', 'Dhanpuri', 'OPM'],
        distance_km: 55,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-shd-02',
        batch_code: 'Batch 2',
        name: 'Shahdol → Pali → Navrozabad',
        hq_id: hqShahdol.hq_id,
        hq_code: hqShahdol.code,
        hq_name: hqShahdol.name,
        mr_id: mr2.id,
        mr_name: mr2.name,
        territory_name: 'Shahdol HQ Territory',
        route_stops: ['Shahdol', 'Pali', 'Navrozabad'],
        areas: ['Shahdol', 'Pali', 'Navrozabad'],
        distance_km: 75,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-shd-03',
        batch_code: 'Batch 3',
        name: 'Shahdol → Gohparu → Jaisinghnagar',
        hq_id: hqShahdol.hq_id,
        hq_code: hqShahdol.code,
        hq_name: hqShahdol.name,
        mr_id: mr2.id,
        mr_name: mr2.name,
        territory_name: 'Shahdol HQ Territory',
        route_stops: ['Shahdol', 'Gohparu', 'Jaisinghnagar'],
        areas: ['Shahdol', 'Gohparu', 'Jaisinghnagar'],
        distance_km: 120,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-shd-04',
        batch_code: 'Batch 4',
        name: 'Shahdol → Jaitpur',
        hq_id: hqShahdol.hq_id,
        hq_code: hqShahdol.code,
        hq_name: hqShahdol.name,
        mr_id: mr2.id,
        mr_name: mr2.name,
        territory_name: 'Shahdol HQ Territory',
        route_stops: ['Shahdol', 'Jaitpur'],
        areas: ['Shahdol', 'Jaitpur'],
        distance_km: 80,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-shd-05',
        batch_code: 'Batch 5',
        name: 'Shahdol → Manpur',
        hq_id: hqShahdol.hq_id,
        hq_code: hqShahdol.code,
        hq_name: hqShahdol.name,
        mr_id: mr2.id,
        mr_name: mr2.name,
        territory_name: 'Shahdol HQ Territory',
        route_stops: ['Shahdol', 'Manpur'],
        areas: ['Shahdol', 'Manpur'],
        distance_km: 110,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },

      // MR: Ashish Soni | HQ: Ambikapur (5 Batches)
      {
        id: 'rb-amb-01',
        batch_code: 'Batch 1',
        name: 'Ambikapur → Laknapur → Udaypur → Kedma',
        hq_id: hqAmbikapur.hq_id,
        hq_code: hqAmbikapur.code,
        hq_name: hqAmbikapur.name,
        mr_id: mr3.id,
        mr_name: mr3.name,
        territory_name: 'Ambikapur HQ Territory',
        route_stops: ['Ambikapur', 'Laknapur', 'Udaypur', 'Kedma'],
        areas: ['Ambikapur', 'Laknapur', 'Udaypur', 'Kedma'],
        distance_km: 90,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-amb-02',
        batch_code: 'Batch 2',
        name: 'Ambikapur → Batuli → Sitapur → Patthalgawn',
        hq_id: hqAmbikapur.hq_id,
        hq_code: hqAmbikapur.code,
        hq_name: hqAmbikapur.name,
        mr_id: mr3.id,
        mr_name: mr3.name,
        territory_name: 'Ambikapur HQ Territory',
        route_stops: ['Ambikapur', 'Batuli', 'Sitapur', 'Patthalgawn'],
        areas: ['Ambikapur', 'Batuli', 'Sitapur', 'Patthalgawn'],
        distance_km: 130,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-amb-03',
        batch_code: 'Batch 3',
        name: 'Ambikapur → Silpili → Vishrampur → Surajpur → Devnagar → Shreenagar',
        hq_id: hqAmbikapur.hq_id,
        hq_code: hqAmbikapur.code,
        hq_name: hqAmbikapur.name,
        mr_id: mr3.id,
        mr_name: mr3.name,
        territory_name: 'Ambikapur HQ Territory',
        route_stops: ['Ambikapur', 'Silpili', 'Vishrampur', 'Surajpur', 'Devnagar', 'Shreenagar'],
        areas: ['Ambikapur', 'Silpili', 'Vishrampur', 'Surajpur', 'Devnagar', 'Shreenagar'],
        distance_km: 115,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-amb-04',
        batch_code: 'Batch 4',
        name: 'Ambikapur → Pratapur → Siluta → Vadrafnagar',
        hq_id: hqAmbikapur.hq_id,
        hq_code: hqAmbikapur.code,
        hq_name: hqAmbikapur.name,
        mr_id: mr3.id,
        mr_name: mr3.name,
        territory_name: 'Ambikapur HQ Territory',
        route_stops: ['Ambikapur', 'Pratapur', 'Siluta', 'Vadrafnagar'],
        areas: ['Ambikapur', 'Pratapur', 'Siluta', 'Vadrafnagar'],
        distance_km: 140,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rb-amb-05',
        batch_code: 'Batch 5',
        name: 'Ambikapur → Latori → Krwan → Datima → Batra → Bhatgawn',
        hq_id: hqAmbikapur.hq_id,
        hq_code: hqAmbikapur.code,
        hq_name: hqAmbikapur.name,
        mr_id: mr3.id,
        mr_name: mr3.name,
        territory_name: 'Ambikapur HQ Territory',
        route_stops: ['Ambikapur', 'Latori', 'Krwan', 'Datima', 'Batra', 'Bhatgawn'],
        areas: ['Ambikapur', 'Latori', 'Krwan', 'Datima', 'Batra', 'Bhatgawn'],
        distance_km: 125,
        standard_reimbursement_rate: 2.5,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      },
    ];

    // 14. Seed Medicines Master (§11)
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
      mr_id: mr2.id,
      mr_name: mr2.name,
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
      mr_id: mr2.id,
      mr_name: mr2.name,
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

    // 17. Seed initial orders across HQs with pending delivery & delivery statuses
    if (this.orders.length === 0) {
      this.orders.push(
        {
          id: 'ord-shd-01',
          order_number: 'ORD-2026-0001',
          task_id: 'task-01',
          mr_id: mr2.id,
          mr_name: mr2.name,
          customer_name: 'Dr. Rajesh Sharma (City Hospital)',
          location_name: 'City Hospital, Shahdol',
          hq_id: hqShahdol.id,
          hq_name: hqShahdol.name,
          stocker_id: stocker1.id,
          stocker_name: stocker1.name,
          items: [
            {
              product_id: med1.id,
              product_name: med1.name,
              quantity: 20,
              unit_price: 150,
              total_amount: 3000,
              distributor: stocker1.name,
            },
            {
              product_id: med2.id,
              product_name: med2.name,
              quantity: 15,
              unit_price: 85,
              total_amount: 1275,
              distributor: stocker1.name,
            },
          ],
          total_units: 35,
          total_amount: 4275,
          delivery_status: 'PENDING',
          hq_accepted: false,
          inventory_deducted: false,
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: 'ord-amb-01',
          order_number: 'ORD-2026-0002',
          task_id: 'task-02',
          mr_id: mr3.id,
          mr_name: mr3.name,
          customer_name: 'Ambikapur Civil Hospital Medico',
          location_name: 'Hospital Chowk, Ambikapur',
          hq_id: hqAmbikapur.id,
          hq_name: hqAmbikapur.name,
          stocker_id: stocker6.id,
          stocker_name: stocker6.name,
          items: [
            {
              product_id: med1.id,
              product_name: med1.name,
              quantity: 30,
              unit_price: 150,
              total_amount: 4500,
              distributor: stocker6.name,
            },
          ],
          total_units: 30,
          total_amount: 4500,
          delivery_status: 'DELIVERED',
          delivered_at: new Date(Date.now() - 3600000).toISOString(),
          delivered_by_user_id: mr3.id,
          hq_accepted: false,
          inventory_deducted: false,
          created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
        },
      );
    }
  }
}
