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
  SavedLocation,
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
  RouteChangeRequest,
  Order,
  MonthlyStockagePermission,
  StockageSubmissionRequest,
  StockageSubmissionItem,
  MedicinePackagingVariant,
} from './database.types';
import { SupabaseService } from './supabase.service';
import { computeAttendanceDeviations } from '../modules/attendance/attendance.utils';
import { decodeBatchFromAddress, encodeBatchInAddress } from './location-batch.utils';

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
  public fcmTokens: Map<string, string> = new Map(); 

  public tasks: Task[] = [];
  public orders: Order[] = [];
  public deletedOrderIds: Set<string> = new Set();
  public taskAssignments: TaskAssignment[] = [];
  public locationVerifications: LocationVerification[] = [];

  public doctors: Doctor[] = [];
  public savedLocations: SavedLocation[] = [];
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

  
  public headquarters: Headquarter[] = [];
  public routeBatches: RouteBatch[] = [];
  public hqAreas: HqArea[] = [];
  public stockers: Stocker[] = [];
  public medicines: Medicine[] = [];
  public stockerInventory: StockerInventory[] = [];
  public inventoryTransactions: InventoryTransaction[] = [];
  public verificationPhotos: VerificationPhoto[] = [];
  public monthlyTourPlans: MonthlyTourPlan[] = [];
  public routeChangeRequests: RouteChangeRequest[] = [];
  public attendanceSettings: AttendanceSettings = {
    id: 'att-settings-default',
    expected_punch_in_time: '10:00:00',
    allowed_punch_in_window_minutes: 30,
    expected_punch_out_time: '18:00:00',
    allowed_punch_out_window_minutes: 30,
    reimbursement_rate_per_km: 2.25,
    updated_at: new Date().toISOString(),
  };
  public competitions: Competition[] = [];
  public rewardClaims: RewardClaim[] = [];
  public monthlyStockEntries: MonthlyStockEntry[] = [];
  public monthlyStockagePermissions: MonthlyStockagePermission[] = [];
  public stockageSubmissionRequests: StockageSubmissionRequest[] = [];
  public medicinePackagingVariants: MedicinePackagingVariant[] = [];

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
        taskAssignments: this.taskAssignments,
        locationVerifications: this.locationVerifications,
        doctors: this.doctors,
        savedLocations: this.savedLocations,
        approvals: this.approvals,
        orders: this.orders,
        deletedOrderIds: Array.from(this.deletedOrderIds),
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
        routeChangeRequests: this.routeChangeRequests,
        stockerInventory: this.stockerInventory,
        monthlyStockEntries: this.monthlyStockEntries,
        inventoryTransactions: this.inventoryTransactions,
        verificationPhotos: this.verificationPhotos,
        deviceAuthorizations: this.deviceAuthorizations,
        routeBatches: this.routeBatches,
        headquarters: this.headquarters,
        stockers: this.stockers,
        hqAreas: this.hqAreas,
        medicines: this.medicines,
        monthlyStockagePermissions: this.monthlyStockagePermissions,
        stockageSubmissionRequests: this.stockageSubmissionRequests,
        medicinePackagingVariants: this.medicinePackagingVariants,
        competitions: this.competitions,
        rewardClaims: this.rewardClaims,
        notifications: this.notifications,
        fcmTokens: Array.from(this.fcmTokens.entries()),
        users: this.users.map((u) => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          role: u.role,
          password_hash: u.password_hash,
          status: u.status,
          zone_id: u.zone_id,
          region_id: u.region_id,
          area_id: u.area_id,
          hq_id: u.hq_id,
          hq_code: u.hq_code,
          hq_name: u.hq_name,
          territory: u.territory,
          assigned_territory: u.assigned_territory,
          assigned_route_batches: u.assigned_route_batches,
          route_batches: u.route_batches,
          manager_id: u.manager_id,
          biometric_enabled: u.biometric_enabled,
          device_id: u.device_id,
          device_model: u.device_model,
          device_bound_at: u.device_bound_at,
          logged_out: u.logged_out,
          requires_device_otp_on_login: u.requires_device_otp_on_login,
          created_at: u.created_at,
          updated_at: u.updated_at,
        })),
        userCredentials: this.users.map((u) => ({
          id: u.id,
          email: u.email,
          phone: u.phone,
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
   * Authoritative order persistence: updates in-memory cache, triggers debounced
   * disk store write, and asynchronously synchronizes directly to cloud database.
   */
  public async persistOrder(order: Order): Promise<void> {
    if (order.id) this.deletedOrderIds.delete(order.id);
    if (order.order_number) this.deletedOrderIds.delete(order.order_number);
    const idx = this.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      this.orders[idx] = order;
    } else {
      this.orders.unshift(order);
    }
    this.persistToDisk();
    if (this.supabase && this.supabase.isConnected) {
      this.syncOrderToSupabase(order).catch((err) =>
        console.warn(`[DatabaseService] Async Supabase order sync notice: ${err?.message}`),
      );
    }
  }

  /**
   * Delete an order completely from in-memory cache, task references, persistent disk store, seed data, and cloud database.
   */
  public async deleteOrder(orderId: string): Promise<boolean> {
    const order = this.orders.find((o) => o.id === orderId || o.order_number === orderId);
    const idToDelete = order ? order.id : orderId;
    const numToDelete = order ? order.order_number : undefined;

    this.deletedOrderIds.add(idToDelete);
    if (numToDelete) this.deletedOrderIds.add(numToDelete);

    this.orders = this.orders.filter(
      (o) => o.id !== idToDelete && (!numToDelete || o.order_number !== numToDelete),
    );

    // Purge task references so the order cannot be reconstructed upon disk reload or cloud sync
    for (const t of this.tasks) {
      if (
        t.order_id === idToDelete ||
        (numToDelete && t.order_id === numToDelete) ||
        (order && t.id === order.task_id)
      ) {
        t.order_id = undefined;
        t.orders = undefined;
      }
    }

    await this.flushToDisk();

    // Also purge from seed file if present so fresh git deployments never resurrect it
    try {
      const seedPath = path.join(path.dirname(this.getStorageFilePath()), 'ffa_db_store.seed.json');
      if (fs.existsSync(seedPath)) {
        const seedRaw = fs.readFileSync(seedPath, 'utf8');
        const seedData = JSON.parse(seedRaw);
        let modified = false;
        if (Array.isArray(seedData.orders)) {
          const prevLen = seedData.orders.length;
          seedData.orders = seedData.orders.filter(
            (o: any) => o.id !== idToDelete && (!numToDelete || o.order_number !== numToDelete),
          );
          if (seedData.orders.length !== prevLen) modified = true;
        }
        if (Array.isArray(seedData.tasks)) {
          seedData.tasks.forEach((t: any) => {
            if (
              t.order_id === idToDelete ||
              (numToDelete && t.order_id === numToDelete) ||
              (order && t.id === order.task_id)
            ) {
              delete t.order_id;
              delete t.orders;
              modified = true;
            }
          });
        }
        const existingDeleted = Array.isArray(seedData.deletedOrderIds) ? seedData.deletedOrderIds : [];
        if (!existingDeleted.includes(idToDelete)) {
          existingDeleted.push(idToDelete);
          if (numToDelete) existingDeleted.push(numToDelete);
          seedData.deletedOrderIds = existingDeleted;
          modified = true;
        }
        if (modified) {
          fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
        }
      }
    } catch (err: any) {
      console.warn('[DatabaseService] Notice updating seed file upon order deletion:', err?.message);
    }

    if (this.supabase && this.supabase.isConnected) {
      try {
        const client = this.supabase.getClient();
        if (client) {
          await client.from('orders').delete().eq('id', idToDelete);
          if (numToDelete) {
            await client.from('orders').delete().eq('order_number', numToDelete);
          }
          await client.from('tasks').update({ order_id: null, orders: null }).eq('order_id', idToDelete);
          if (numToDelete) {
            await client.from('tasks').update({ order_id: null, orders: null }).eq('order_id', numToDelete);
          }
        }
      } catch (err: any) {
        console.warn(`[DatabaseService] Notice deleting order ${idToDelete} from cloud database:`, err?.message);
      }
    }
    return true;
  }

  /**
   * Dynamically re-evaluates and synchronizes stock levels, stock warning flags,
   * and per-item stock statuses for all pending (unaccepted) orders against the current
   * live Stocker Inventory.
   */
  public refreshPendingOrdersStock(): void {
    if (!this.orders || !Array.isArray(this.orders)) return;

    for (const order of this.orders) {
      if (!order || order.hq_accepted) continue;

      const effectiveHqId = order.hq_id || 'HQ-SHD-001';
      const cleanHqId = effectiveHqId.trim().toLowerCase();
      const hq = this.findHeadquarter(effectiveHqId);
      const hqName = order.hq_name || hq?.name || 'HQ';

      const stockers = this.stockers.filter((s) => {
        if (s.status === 'INACTIVE') return false;
        if (hq && (s.hq_id === hq.id || s.hq_id === hq.hq_id || (hq.code && s.hq_id === hq.code))) {
          return true;
        }
        const sHq = (s.hq_id || '').toLowerCase();
        if (sHq === cleanHqId) return true;
        if (cleanHqId.includes('shd') || cleanHqId.includes('shahdol')) return sHq.includes('shd') || sHq.includes('shahdol');
        if (cleanHqId.includes('amb') || cleanHqId.includes('ambikapur')) return sHq.includes('amb');
        if (cleanHqId.includes('bsp') || cleanHqId.includes('bilaspur')) return sHq.includes('bsp');
        if (cleanHqId.includes('ktm') || cleanHqId.includes('kotma')) return sHq.includes('ktm') || sHq.includes('kot');
        return false;
      });

      const specificStockerId = order.stocker_id;
      const outNames: string[] = [];
      const lowNames: string[] = [];
      let hasOutOfStock = false;
      let hasLowStock = false;

      // Group requested qty by matched med
      const reqByMed = new Map<string, number>();
      for (const item of (order.items || [])) {
        const cleanName = (item.product_name || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
        const med = this.medicines.find(
          (m) =>
            (item.product_id && m.id === item.product_id) ||
            m.code.toLowerCase() === (item.product_id || '').toLowerCase() ||
            m.name.toLowerCase().trim() === cleanName ||
            m.name.toLowerCase().trim() === (item.product_name || '').toLowerCase().trim(),
        );
        if (med) {
          reqByMed.set(med.id, (reqByMed.get(med.id) || 0) + (Number(item.quantity) || 0));
        }
      }

      order.items = (order.items || []).map((item) => {
        const cleanName = (item.product_name || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
        const med = this.medicines.find(
          (m) =>
            (item.product_id && m.id === item.product_id) ||
            m.code.toLowerCase() === (item.product_id || '').toLowerCase() ||
            m.name.toLowerCase().trim() === cleanName ||
            m.name.toLowerCase().trim() === (item.product_name || '').toLowerCase().trim(),
        );

        let availableStock = 0;
        let threshold = med?.low_stock_threshold || 10;

        if (med) {
          const invList = this.stockerInventory.filter((inv) => {
            if (inv.medicine_id !== med.id) return false;
            if (specificStockerId && (inv.stocker_id === specificStockerId || inv.hq_id === effectiveHqId)) {
              return inv.stocker_id === specificStockerId;
            }
            return stockers.some((s) => s.id === inv.stocker_id);
          });
          availableStock = invList.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
        }

        const totalReq = med ? (reqByMed.get(med.id) || Number(item.quantity) || 0) : (Number(item.quantity) || 0);

        let itemStatus: 'IN_STOCK' | 'LOW_STOCK' | 'INSUFFICIENT_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
        if (availableStock <= 0) {
          itemStatus = 'OUT_OF_STOCK';
          hasOutOfStock = true;
          if (!outNames.includes(item.product_name)) outNames.push(item.product_name);
        } else if (availableStock < totalReq) {
          itemStatus = 'INSUFFICIENT_STOCK';
          hasOutOfStock = true;
          if (!outNames.includes(item.product_name)) outNames.push(item.product_name);
        } else if (availableStock <= threshold || (availableStock - totalReq) <= threshold) {
          itemStatus = 'LOW_STOCK';
          hasLowStock = true;
          if (!lowNames.includes(item.product_name)) lowNames.push(item.product_name);
        }

        return {
          ...item,
          available_stock: availableStock,
          stock_status: itemStatus,
        };
      });

      order.has_stock_warning = hasOutOfStock || hasLowStock;
      order.stock_warning_type = hasOutOfStock ? 'OUT_OF_STOCK' : hasLowStock ? 'LOW_STOCK' : null;
      order.stock_warning_summary = hasOutOfStock
        ? `${outNames.join(', ')} out of stock at ${hqName}`
        : hasLowStock
        ? `${lowNames.join(', ')} low in stock at ${hqName}`
        : undefined;

      // Sync with linked task if present
      if (order.task_id) {
        const task = this.tasks.find((t) => t.id === order.task_id);
        if (task) {
          task.orders = order.items;
        }
      }
    }
  }

  /**
   * Authoritative monthly tour plan persistence: updates in-memory cache, triggers debounced
   * disk store write, and asynchronously synchronizes directly to PostgreSQL/Supabase.
   */
  public async persistMonthlyTourPlan(plan: MonthlyTourPlan): Promise<void> {
    const idx = this.monthlyTourPlans.findIndex(
      (p) => p.id === plan.id || (p.mr_id === plan.mr_id && p.month === plan.month),
    );
    if (idx >= 0) {
      this.monthlyTourPlans[idx] = plan;
    } else {
      this.monthlyTourPlans.unshift(plan);
    }
    this.persistToDisk();
    if (this.supabase && this.supabase.isConnected) {
      this.syncMonthlyTourPlanToSupabase(plan).catch((err) =>
        console.warn(`[DatabaseService] Async Supabase monthly TP sync notice: ${err?.message}`),
      );
    }
  }

  /**
   * Delete a monthly tour plan from in-memory cache, disk store, and Supabase
   */
  public async deleteMonthlyTourPlan(planId: string): Promise<void> {
    const idx = this.monthlyTourPlans.findIndex((p) => p.id === planId);
    if (idx >= 0) {
      this.monthlyTourPlans.splice(idx, 1);
    }
    this.persistToDisk();
    if (this.supabase && this.supabase.isConnected) {
      try {
        const client = this.supabase.getClient();
        if (client) {
          await client.from('monthly_tour_plans').delete().eq('id', planId);
        }
      } catch (err: any) {
        console.warn(`[DatabaseService] Notice deleting monthly tour plan ${planId}:`, err?.message);
      }
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
      const seedPath = path.join(path.dirname(filePath), 'ffa_db_store.seed.json');
      let targetPath = filePath;

      if (!fs.existsSync(filePath)) {
        if (fs.existsSync(seedPath)) {
          targetPath = seedPath;
          try {
            fs.copyFileSync(seedPath, filePath);
          } catch {}
        } else {
          return false;
        }
      }

      const raw = fs.readFileSync(targetPath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.tasks)) {
        this.tasks = data.tasks;
        if (Array.isArray(data.deletedOrderIds)) {
          data.deletedOrderIds
            .filter((id: string) => !id.startsWith('ORD-2026-000') && id !== 'ORD-2026-0001' && id !== 'ORD-2026-0002')
            .forEach((id: string) => this.deletedOrderIds.add(id));
        }
        for (const t of this.tasks) {
          if (this.deletedOrderIds.has(t.order_id || '') || this.deletedOrderIds.has(t.id)) {
            t.order_id = undefined;
            t.orders = undefined;
          }
        }
        if (Array.isArray(data.orders)) {
          this.orders = data.orders.filter(
            (o: any) => !this.deletedOrderIds.has(o.id) && !this.deletedOrderIds.has(o.order_number)
          );
        }
        if (Array.isArray(data.attendance)) this.attendance = data.attendance;
        if (data.attendanceSettings) {
          this.attendanceSettings = {
            ...this.attendanceSettings,
            ...data.attendanceSettings,
            reimbursement_rate_per_km:
              data.attendanceSettings.reimbursement_rate_per_km !== undefined
                ? Number(data.attendanceSettings.reimbursement_rate_per_km)
                : this.attendanceSettings.reimbursement_rate_per_km,
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
        if (Array.isArray(data.savedLocations) && data.savedLocations.length > 0) {
          this.savedLocations = data.savedLocations;
        }
        if (Array.isArray(data.routeChangeRequests)) this.routeChangeRequests = data.routeChangeRequests;
        if (Array.isArray(data.verificationPhotos)) this.verificationPhotos = data.verificationPhotos;
        if (Array.isArray(data.deviceAuthorizations)) {
          this.deviceAuthorizations = data.deviceAuthorizations;
        }
        if (Array.isArray(data.routeBatches) && data.routeBatches.length > 0) {
          const batchMap = new Map(this.routeBatches.map((b) => [b.id, b]));
          for (const b of data.routeBatches) {
            const existing = batchMap.get(b.id);
            batchMap.set(b.id, {
              ...existing,
              ...b,
              location_ids: b.location_ids || existing?.location_ids || [],
            });
          }
          this.routeBatches = Array.from(batchMap.values());
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          data.users.forEach((savedU: any) => {
            if (savedU.id === 'usr-mgr-01' || savedU.id === 'usr-admin-owner' || savedU.name?.includes('Area Manager')) {
              return;
            }
            const idx = this.users.findIndex((u) => u.id === savedU.id);
            if (idx >= 0) {
              this.users[idx] = { ...this.users[idx], ...savedU };
            } else {
              this.users.push(savedU);
            }
          });
          this.users = this.users.filter(
            (u) => u.id !== 'usr-mgr-01' && u.id !== 'usr-admin-owner' && !u.name?.includes('Area Manager')
          );
        }
        if (Array.isArray(data.userCredentials)) {
          data.userCredentials.forEach((cred: any) => {
            const user = this.users.find((u) => u.id === cred.id || u.email.toLowerCase() === cred.email?.toLowerCase());
            if (user) {
              if (cred.password_hash) user.password_hash = cred.password_hash;
              if (cred.email) user.email = cred.email;
              if (cred.phone) user.phone = cred.phone;
            }
          });
        }
        if (Array.isArray(data.userDeviceStates)) {
          data.userDeviceStates.forEach((state: any) => {
            const user = this.users.find((u) => u.id === state.id);
            if (user) {
              if (state.device_id) user.device_id = state.device_id;
              if (state.device_model) user.device_model = state.device_model;
              if (state.device_bound_at) user.device_bound_at = state.device_bound_at;
              if (state.logged_out !== undefined) user.logged_out = state.logged_out;
              if (state.requires_device_otp_on_login !== undefined) user.requires_device_otp_on_login = state.requires_device_otp_on_login;
            }
          });
        }
        if (Array.isArray(data.monthlyStockagePermissions) && data.monthlyStockagePermissions.length > 0) {
          this.monthlyStockagePermissions = data.monthlyStockagePermissions;
        }
        if (Array.isArray(data.stockageSubmissionRequests) && data.stockageSubmissionRequests.length > 0) {
          this.stockageSubmissionRequests = data.stockageSubmissionRequests;
        }
        if (Array.isArray(data.headquarters) && data.headquarters.length > 0) {
          this.headquarters = data.headquarters.filter(
            (h: any) =>
              !h.name?.toLowerCase().includes('delhi') &&
              !h.id?.toLowerCase().includes('delhi') &&
              !h.hq_id?.toLowerCase().includes('delhi')
          );
        }
        if (Array.isArray(data.stockers) && data.stockers.length > 0) {
          const stkMap = new Map(this.stockers.map((s) => [s.id, s]));
          for (const s of data.stockers) {
            stkMap.set(s.id, s);
          }
          this.stockers = Array.from(stkMap.values());
        }
        if (Array.isArray(data.hqAreas)) {
          this.hqAreas = data.hqAreas;
        }
        if (Array.isArray(data.medicines) && data.medicines.length > 0) {
          // Filter out dummy/test medicines from disk
          const validDiskMeds = data.medicines.filter(
            (dm: any) => dm.id && dm.name && dm.name.trim().toLowerCase() !== 'dd' && dm.name.trim().toLowerCase() !== 'ss'
          );
          const mergedMedicines = [...validDiskMeds];
          for (const sm of this.medicines) {
            const diskMed = mergedMedicines.find((dm: any) => dm.id === sm.id);
            if (!diskMed) {
              mergedMedicines.push(sm);
            } else {
              // Only backfill missing fields from seed if not present on disk
              if (!diskMed.product_code && sm.product_code) diskMed.product_code = sm.product_code;
              if (!diskMed.sku && sm.sku) diskMed.sku = sm.sku;
            }
          }
          this.medicines = mergedMedicines;
        }
        if (Array.isArray(data.stockerInventory)) {
          this.stockerInventory = data.stockerInventory;
          for (const stk of this.stockers) {
            for (const med of this.medicines) {
              const exists = this.stockerInventory.find(
                (inv) => inv.stocker_id === stk.id && inv.medicine_id === med.id,
              );
              if (!exists) {
                const variant = med.packaging_variants?.[0];
                this.stockerInventory.push({
                  id: `inv-${stk.id}-${med.id}`,
                  hq_id: stk.hq_id,
                  stocker_id: stk.id,
                  medicine_id: med.id,
                  variant_id: variant?.id,
                  packaging_display: med.packing || med.unit,
                  quantity: 0,
                  low_stock_threshold: 15,
                  updated_at: new Date().toISOString(),
                });
              }
            }
          }
        }
        if (Array.isArray(data.medicinePackagingVariants) && data.medicinePackagingVariants.length > 0) {
          this.medicinePackagingVariants = data.medicinePackagingVariants.map((v: any) => ({
            ...v,
            size: v.size ?? v.package_size,
            package_size: v.package_size ?? v.size,
            unit: v.unit ?? v.package_unit,
            package_unit: v.package_unit ?? v.unit,
            display_name: v.display_name ?? v.display_label ?? v.variant_name,
            display_label: v.display_label ?? v.display_name ?? v.variant_name,
            variant_name: v.variant_name ?? v.display_label ?? v.display_name,
            status: v.status || (v.is_active !== false ? 'ACTIVE' : 'INACTIVE'),
            is_active: v.is_active !== undefined ? v.is_active : v.status === 'ACTIVE',
          }));
        }
        if (Array.isArray(data.competitions)) {
          this.competitions = data.competitions;
        }
        if (Array.isArray(data.rewardClaims)) {
          this.rewardClaims = data.rewardClaims;
        }
        if (Array.isArray(data.monthlyStockEntries)) {
          this.monthlyStockEntries = data.monthlyStockEntries;
        }
        if (Array.isArray(data.inventoryTransactions)) {
          this.inventoryTransactions = data.inventoryTransactions;
        }
        if (Array.isArray(data.notifications)) {
          this.notifications = data.notifications;
        }
        if (Array.isArray(data.doctors)) {
          this.doctors = data.doctors.map((d: any) => {
            const creator = this.users.find((u) => u.id === d.created_by);
            let assignedMrId = d.assigned_mr_id || (creator?.role === 'MR' ? creator.id : undefined);
            let assignedMrName = d.assigned_mr_name || (creator?.role === 'MR' ? creator.name : undefined);

            if (!assignedMrId) {
              if (d.name === 'Marked Facility' || d.clinic === 'Marked Facility' || d.id === 'loc-85cc2c5d') {
                assignedMrId = 'usr-mr-01'; // Amar Dwivedi (Kotma)
                assignedMrName = 'Amar Dwivedi';
              } else if (d.name === 'Shree Ram Pharmacy' || d.clinic === 'Shree Ram Pharmacy' || d.id === 'loc-02') {
                assignedMrId = 'usr-mr-01'; // Amar Dwivedi (Kotma)
                assignedMrName = 'Amar Dwivedi';
              } else if (d.name === 'Adarash clinic' || d.clinic === 'Adarash clinic' || d.id === 'loc-1c0a011c') {
                assignedMrId = 'usr-mr-02'; // Aman Rathore (Shahdol)
                assignedMrName = 'Aman Rathore';
              } else if (d.name === 'Xyz' || d.clinic === 'Xyz' || d.id === 'loc-eb137685') {
                assignedMrId = 'usr-mr-02'; // Aman Rathore (Shahdol)
                assignedMrName = 'Aman Rathore';
              } else if (d.id === 'loc-01') {
                assignedMrId = 'usr-mr-02';
                assignedMrName = 'Aman Rathore';
              } else if (d.created_by === 'usr-mr-01') {
                assignedMrId = 'usr-mr-01';
                assignedMrName = 'Amar Dwivedi';
              } else if (d.created_by === 'usr-mr-02') {
                assignedMrId = 'usr-mr-02';
                assignedMrName = 'Aman Rathore';
              }
            }

            const batchId = d.batch_id;
            const batchCode = d.batch_code;
            const batchName = d.batch_name;

            let createdBy = d.created_by;
            let createdByRole = d.created_by_role;
            let createdByName = d.created_by_name;
            if (d.id === 'loc-85cc2c5d' || d.id === 'loc-02' || d.name === 'Marked Facility' || d.name === 'Shree Ram Pharmacy') {
              createdBy = 'usr-mr-01';
              createdByRole = 'MR';
              createdByName = 'Amar Dwivedi (usr-mr-01)';
            } else if (creator) {
              createdByRole = creator.role;
              createdByName = `${creator.name} (${creator.id})`;
            }

            return {
              ...d,
              created_by: createdBy,
              created_by_role: createdByRole,
              created_by_name: createdByName,
              assigned_mr_id: assignedMrId,
              assigned_mr_name: assignedMrName,
              batch_id: batchId,
              batch_code: batchCode,
              batch_name: batchName,
            };
          });
        }
        if (Array.isArray(data.taskAssignments)) this.taskAssignments = data.taskAssignments;
        if (Array.isArray(data.locationVerifications)) this.locationVerifications = data.locationVerifications;
        if (Array.isArray(data.approvals)) this.approvals = data.approvals;
        if (Array.isArray(data.fcmTokens)) {
          this.fcmTokens = new Map(data.fcmTokens);
        }

        // Reconcile saved locations, doctors, and route batches bidirectional links
        for (const loc of this.savedLocations) {
          if (loc.batch_id) {
            const b = this.routeBatches.find((rb) => rb.id === loc.batch_id || rb.batch_code === loc.batch_id);
            if (b) {
              if (!b.location_ids) b.location_ids = [];
              if (!b.location_ids.includes(loc.id)) b.location_ids.push(loc.id);
              loc.batch_code = loc.batch_code || b.batch_code;
              loc.batch_name = loc.batch_name || b.name;
            }
          }
        }
        for (const doc of this.doctors) {
          if (doc.batch_id) {
            const b = this.routeBatches.find((rb) => rb.id === doc.batch_id || rb.batch_code === doc.batch_id);
            if (b) {
              if (!b.location_ids) b.location_ids = [];
              if (!b.location_ids.includes(doc.id)) b.location_ids.push(doc.id);
              doc.batch_code = doc.batch_code || b.batch_code;
              doc.batch_name = doc.batch_name || b.name;
            }
          }
        }
        for (const b of this.routeBatches) {
          if (Array.isArray(b.location_ids)) {
            for (const lid of b.location_ids) {
              const loc = this.savedLocations.find((l) => l.id === lid);
              if (loc && !loc.batch_id) {
                loc.batch_id = b.id;
                loc.batch_code = b.batch_code;
                loc.batch_name = b.name;
              }
              const doc = this.doctors.find((d) => d.id === lid);
              if (doc && !doc.batch_id) {
                doc.batch_id = b.id;
                doc.batch_code = b.batch_code;
                doc.batch_name = b.name;
              }
            }
          }
        }

        console.log(
          `[DatabaseService] Successfully restored ${this.tasks.length} tasks, ${this.attendance.length} attendance records, ${this.savedLocations.length} locations, and ${this.routeBatches.length} route batches from persistent disk store.`,
        );
        this.refreshPendingOrdersStock();
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

    if (this.supabase) {
      if (!this.supabase.isConnected) {
        await this.supabase.initializeClient();
      }

      if (this.supabase.isConnected) {
        try {
          const client = this.supabase.getClient();
          if (client) {
            // Authoritative sync: load existing users from Supabase so edits persist across server redeploys
            const { data: remoteUsers, error: uErr } = await client.from('users').select('*');
            if (!uErr && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteUsers.length} users from Supabase.`);

              // Supabase is authoritative: remove any users not in Supabase (e.g. deleted Area Manager or duplicate admin)
              const remoteUserIds = new Set(remoteUsers.map((u) => u.id));
              // Retain only users that exist in Supabase (or our primary super admin)
              this.users = this.users.filter((u) => remoteUserIds.has(u.id) || u.id === 'usr-admin-01');

              for (const ru of remoteUsers) {
                const idx = this.users.findIndex((u) => u.id === ru.id);
                if (idx >= 0) {
                  this.users[idx] = {
                    ...this.users[idx],
                    name: ru.name || this.users[idx].name,
                    phone: ru.phone || this.users[idx].phone,
                    email: ru.email || this.users[idx].email,
                    password_hash: ru.password_hash || this.users[idx].password_hash,
                    role: ru.role || this.users[idx].role,
                    status: ru.status || this.users[idx].status,
                    biometric_enabled: ru.biometric_enabled ?? this.users[idx].biometric_enabled,
                    device_id: ru.device_id ?? this.users[idx].device_id,
                    device_model: ru.device_model ?? this.users[idx].device_model,
                    device_bound_at: ru.device_bound_at ?? this.users[idx].device_bound_at,
                    zone_id: ru.zone_id || this.users[idx].zone_id,
                    region_id: ru.region_id || this.users[idx].region_id,
                    area_id: ru.area_id || this.users[idx].area_id,
                    manager_id: ru.manager_id !== undefined ? ru.manager_id : this.users[idx].manager_id,
                    hq_id: ru.hq_id || this.users[idx].hq_id,
                    hq_code: ru.hq_code || this.users[idx].hq_code,
                    hq_name: ru.hq_name || this.users[idx].hq_name,
                    territory: ru.territory || this.users[idx].territory,
                    assigned_territory: ru.assigned_territory || this.users[idx].assigned_territory,
                  };
                } else {
                  this.users.push(ru as any);
                }
              }

              // Ensure super admin is in Supabase
              const adminUser = this.users.find((u) => u.id === 'usr-admin-01' || u.role === 'SUPER_ADMIN');
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

              this.persistToDisk();
            }

            // Authoritative sync: load leave requests and quotas from Supabase
          const { data: remoteLeaves, error: lErr } = await client.from('leave_requests').select('*');
          if (!lErr && Array.isArray(remoteLeaves) && remoteLeaves.length > 0) {
            console.log(`[DatabaseService] Synced ${remoteLeaves.length} leave records from Supabase.`);
            for (const rl of remoteLeaves) {
              if (rl.leave_type === 'QUOTA_CONFIG') {
                try {
                  const quotaConfig = JSON.parse(rl.reason || '{}');
                  const mrId = rl.user_id;
                  const idx = this.leaveQuotas.findIndex((q) => q.mr_id === mrId);
                  const newQuota: LeaveQuota = {
                    mr_id: mrId,
                    casual_total: Number(quotaConfig.casual_total ?? 12),
                    sick_total: Number(quotaConfig.sick_total ?? 10),
                    earned_total: Number(quotaConfig.earned_total ?? 15),
                    updated_at: rl.created_at || new Date().toISOString(),
                  };
                  if (idx >= 0) {
                    this.leaveQuotas[idx] = newQuota;
                  } else {
                    this.leaveQuotas.push(newQuota);
                  }
                } catch {}
              } else {
                const leaveReq: LeaveRequest = {
                  id: rl.id,
                  mr_id: rl.user_id,
                  category: rl.leave_type as any,
                  start_date: rl.from_date,
                  end_date: rl.to_date,
                  reason: rl.reason || '',
                  status: rl.status || 'PENDING',
                  approved_by: rl.approved_by,
                  created_at: rl.created_at || new Date().toISOString(),
                };
                const idx = this.leaveRequests.findIndex((l) => l.id === rl.id);
                if (idx >= 0) {
                  this.leaveRequests[idx] = leaveReq;
                } else {
                  this.leaveRequests.push(leaveReq);
                }
              }
            }
          }

          // Authoritative sync: load headquarters from Supabase
          const { data: remoteHqs, error: hqErr } = await client.from('headquarters').select('*');
          if (!hqErr && Array.isArray(remoteHqs) && remoteHqs.length > 0) {
            console.log(`[DatabaseService] Synced ${remoteHqs.length} headquarters from Supabase.`);
            const remoteHqIds = new Set(remoteHqs.map((h) => h.id));
            this.headquarters = this.headquarters.filter((h) => remoteHqIds.has(h.id));
            for (const rh of remoteHqs) {
              const idx = this.headquarters.findIndex((h) => h.id === rh.id || h.name.toLowerCase() === rh.name.toLowerCase());
              const cleanHq: Headquarter = {
                id: rh.id,
                hq_id: rh.id,
                name: rh.name,
                code: rh.id.replace('HQ-', '').replace('-001', ''),
                hq_code: rh.id.replace('HQ-', '').replace('-001', ''),
                state: rh.state || '',
                status: rh.is_active ? 'ACTIVE' : 'INACTIVE',
                created_at: rh.created_at || new Date().toISOString(),
              };
              if (idx >= 0) {
                this.headquarters[idx] = { ...this.headquarters[idx], ...cleanHq };
              } else {
                this.headquarters.push(cleanHq);
              }
            }
          }

          // Sync tasks with Supabase (Authoritative: prune tasks deleted in Supabase)
          const { data: remoteTasks, error: taskErr } = await client.from('tasks').select('*');
          if (!taskErr && remoteTasks && remoteTasks.length > 0) {
            console.log(`[DatabaseService] Synced ${remoteTasks.length} tasks from Supabase.`);
            const DUMMY_IDS = new Set(['task-01', 'task-02', 'task-03', 'task-04', 'task-05']);
            const cleanRemoteTasks = remoteTasks.filter((rt) => !DUMMY_IDS.has(rt.id));
            const remoteTaskIds = new Set(cleanRemoteTasks.map((t) => t.id));
            this.tasks = this.tasks.filter((t) => remoteTaskIds.has(t.id));
            for (const rt of cleanRemoteTasks) {
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

          // Authoritative sync: load doctors / marked locations from Supabase
          try {
            const { data: remoteLocations, error: locErr } = await client
              .from('saved_locations')
              .select('*')
              .order('created_at', { ascending: false });
            if (!locErr && Array.isArray(remoteLocations) && remoteLocations.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteLocations.length} locations/doctors from Supabase.`);
              for (const loc of remoteLocations) {
                const creator = this.users.find((u) => u.id === loc.created_by);
                let assignedMrId = loc.assigned_mr_id || (creator?.role === 'MR' ? creator.id : (loc.created_by && String(loc.created_by).includes('mr') ? loc.created_by : undefined));
                let assignedMrName = loc.assigned_mr_name || (creator ? creator.name : (assignedMrId ? `Field MR (${assignedMrId})` : undefined));

                if (!assignedMrId) {
                  if (loc.name === 'Marked Facility' || loc.id === 'loc-85cc2c5d' || loc.name === 'Shree Ram Pharmacy' || loc.id === 'loc-02') {
                    assignedMrId = 'usr-mr-01';
                    assignedMrName = 'Amar Dwivedi';
                  } else if (loc.name === 'Adarash clinic' || loc.id === 'loc-1c0a011c' || loc.name === 'Xyz' || loc.id === 'loc-eb137685' || loc.id === 'loc-01') {
                    assignedMrId = 'usr-mr-02';
                    assignedMrName = 'Aman Rathore';
                  }
                }

                const { cleanAddress, batchId: parsedBatchId, batchCode: parsedBatchCode, batchName: parsedBatchName } = decodeBatchFromAddress(loc.address);
                const existingDoc = this.doctors.find((d) => d.id === loc.id);
                const existingLoc = this.savedLocations.find((l) => l.id === loc.id);
                const matchedBatch = this.routeBatches.find((b) => b.location_ids?.includes(loc.id));

                const batchId = loc.batch_id || parsedBatchId || existingDoc?.batch_id || existingLoc?.batch_id || matchedBatch?.id;
                let batchCode = loc.batch_code || parsedBatchCode || existingDoc?.batch_code || existingLoc?.batch_code || matchedBatch?.batch_code;
                let batchName = loc.batch_name || parsedBatchName || existingDoc?.batch_name || existingLoc?.batch_name || matchedBatch?.name;

                if (batchId && (!batchCode || !batchName)) {
                  const foundB = this.routeBatches.find((b) => b.id === batchId || b.batch_code === batchId);
                  if (foundB) {
                    batchCode = foundB.batch_code;
                    batchName = foundB.name;
                  }
                }

                if (batchId) {
                  const foundB = this.routeBatches.find((b) => b.id === batchId || b.batch_code === batchId);
                  if (foundB) {
                    if (!foundB.location_ids) foundB.location_ids = [];
                    if (!foundB.location_ids.includes(loc.id)) foundB.location_ids.push(loc.id);
                  }
                }

                let createdBy = loc.created_by;
                let createdByRole: 'ADMIN' | 'MR' = creator?.role === 'MR' ? 'MR' : 'ADMIN';
                let createdByName = creator ? `${creator.name} (${creator.id})` : 'System Admin';

                if (loc.id === 'loc-85cc2c5d' || loc.id === 'loc-02' || loc.name === 'Marked Facility' || loc.name === 'Shree Ram Pharmacy') {
                  createdBy = 'usr-mr-01';
                  createdByRole = 'MR';
                  createdByName = 'Amar Dwivedi (usr-mr-01)';
                }

                const doc: Doctor = {
                  id: loc.id,
                  name: loc.name,
                  qualification: loc.category === 'HOSPITAL' ? 'Hospital Facility' : loc.category === 'PHARMACY' ? 'Chemist / Pharmacy' : 'Registered Practice',
                  specialization: loc.category === 'PHARMACY' ? 'Pharmacy Depot' : 'General Practice',
                  class: 'A',
                  potential_score: 85,
                  phone: loc.contact_phone || '',
                  whatsapp: '',
                  clinic: loc.name,
                  category: loc.category || 'CLINIC',
                  address: cleanAddress || loc.address || '',
                  latitude: Number(loc.latitude),
                  longitude: Number(loc.longitude),
                  area_id: 'area-shd-07',
                  created_by: createdBy || 'usr-admin-01',
                  created_by_role: createdByRole,
                  created_by_name: createdByName,
                  assigned_mr_id: assignedMrId,
                  assigned_mr_name: assignedMrName,
                  batch_id: batchId,
                  batch_code: batchCode,
                  batch_name: batchName,
                  created_at: loc.created_at || new Date().toISOString(),
                };
                const idx = this.doctors.findIndex((d) => d.id === doc.id);
                if (idx >= 0) {
                  this.doctors[idx] = { ...this.doctors[idx], ...doc };
                } else {
                  this.doctors.push(doc);
                }

                const savedL: SavedLocation = {
                  id: loc.id,
                  name: loc.name,
                  clinic: loc.name,
                  doctor_name: loc.contact_person || '',
                  qualification: doc.qualification,
                  specialization: doc.specialization,
                  class: 'A',
                  potential_score: 85,
                  phone: loc.contact_phone || 'N/A',
                  address: cleanAddress || loc.address || '',
                  latitude: Number(loc.latitude),
                  longitude: Number(loc.longitude),
                  category: loc.category || 'CLINIC',
                  created_by: createdBy || 'usr-admin-01',
                  created_by_role: createdByRole,
                  created_by_name: createdByName,
                  area_name: 'Territory',
                  visit_count: 0,
                  is_new: false,
                  batch_id: batchId,
                  batch_code: batchCode,
                  batch_name: batchName,
                  assigned_mr_id: assignedMrId,
                  assigned_mr_name: assignedMrName,
                  created_at: loc.created_at || new Date().toISOString(),
                };
                const sIdx = this.savedLocations.findIndex((s) => s.id === savedL.id);
                if (sIdx >= 0) {
                  this.savedLocations[sIdx] = { ...this.savedLocations[sIdx], ...savedL };
                } else {
                  this.savedLocations.push(savedL);
                }

                if (!parsedBatchId && batchId) {
                  const encoded = encodeBatchInAddress(cleanAddress || loc.address, batchId, batchCode, batchName);
                  client.from('saved_locations').update({ address: encoded }).eq('id', loc.id).then(() => {}, () => {});
                }
              }
            }
          } catch (docNotice: any) {
            console.warn('[DatabaseService] Notice syncing doctors from Supabase:', docNotice?.message);
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

          // Normalize deviations for all attendance records using active settings in IST
          for (const a of this.attendance) {
            const dev = computeAttendanceDeviations(a.check_in_at, a.check_out_at, this.attendanceSettings);
            a.late_minutes = dev.lateMinutes;
            a.early_minutes = dev.earlyMinutes;
            if (a.status !== 'INCOMPLETE' && (!a.check_in_at || a.check_out_at)) {
              a.status = dev.isLate ? 'LATE' : 'PRESENT';
            }
          }

          // Authoritative sync: load stockers (pharmacies) from Supabase
          try {
            const { data: remoteStockers, error: stkErr } = await client.from('stockers').select('*');
            if (!stkErr && Array.isArray(remoteStockers) && remoteStockers.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteStockers.length} stockers from Supabase.`);
              const remoteStkIds = new Set(remoteStockers.map((s) => s.id));
              this.stockers = this.stockers.filter((s) => remoteStkIds.has(s.id));
              for (const rs of remoteStockers) {
                const cleanStk: Stocker = {
                  id: rs.id,
                  name: rs.name,
                  hq_id: rs.hq_id,
                  sub_area: rs.sub_area || rs.address || '',
                  address: rs.address || '',
                  phone: rs.phone || '',
                  status: rs.is_active === false ? 'INACTIVE' : 'ACTIVE',
                  created_at: rs.created_at || new Date().toISOString(),
                };
                const idx = this.stockers.findIndex((s) => s.id === cleanStk.id);
                if (idx >= 0) {
                  this.stockers[idx] = { ...this.stockers[idx], ...cleanStk };
                } else {
                  this.stockers.push(cleanStk);
                }
              }
            }
          } catch (stkNotice: any) {
            console.warn('[DatabaseService] Notice syncing stockers from Supabase:', stkNotice?.message);
          }

          // Authoritative sync: load medicines and packaging variants from Supabase
          try {
            const { data: remoteMeds, error: medsErr } = await client
              .from('medicines')
              .select('*')
              .order('id', { ascending: true });
            if (!medsErr && remoteMeds && remoteMeds.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteMeds.length} medicines from Supabase.`);
              const remoteMedIds = new Set(remoteMeds.map((m) => m.id));

              // Supabase is authoritative: remove deleted medicines not present in Supabase
              this.medicines = this.medicines.filter((m) => remoteMedIds.has(m.id));
              this.stockerInventory = this.stockerInventory.filter((inv) => remoteMedIds.has(inv.medicine_id));
              this.medicinePackagingVariants = this.medicinePackagingVariants.filter((v) => remoteMedIds.has(v.medicine_id));

              for (const rm of remoteMeds) {
                const existing = this.medicines.find((m) => m.id === rm.id);
                const price =
                  rm.pts_rate !== undefined && rm.pts_rate !== null
                    ? Number(rm.pts_rate)
                    : rm.unit_price !== undefined && rm.unit_price !== null
                    ? Number(rm.unit_price)
                    : undefined;

                if (existing) {
                  if (rm.name) existing.name = rm.name;
                  if (rm.sku) {
                    existing.code = rm.sku;
                    existing.product_code = rm.sku;
                    existing.sku = rm.sku;
                  }
                  if (rm.pack_size) {
                    existing.packing = rm.pack_size;
                    existing.unit = rm.pack_size;
                  }
                  if (rm.category) existing.category = rm.category;
                  if (price !== undefined) {
                    existing.base_price = price;
                    (existing as any).pts = price;
                    (existing as any).pts_rate = price;
                  }
                  if (rm.mrp !== undefined && rm.mrp !== null) {
                    existing.mrp = Number(rm.mrp);
                  }
                  if (rm.is_active === false) {
                    existing.status = 'INACTIVE';
                    existing.is_active = false;
                  } else {
                    existing.status = 'ACTIVE';
                    existing.is_active = true;
                  }
                } else if (rm.is_active !== false) {
                  const resolvedPrice = price !== undefined ? price : 0;
                  const newMed: Medicine = {
                    id: rm.id,
                    name: rm.name,
                    code: rm.sku || rm.id,
                    product_code: rm.sku || rm.id,
                    sku: rm.sku || rm.id,
                    category: rm.category || 'General',
                    unit: rm.pack_size || 'Units',
                    packing: rm.pack_size || 'Units',
                    base_price: resolvedPrice,
                    pts: resolvedPrice,
                    pts_rate: resolvedPrice,
                    mrp: rm.mrp !== undefined && rm.mrp !== null ? Number(rm.mrp) : 0,
                    low_stock_threshold: 15,
                    status: 'ACTIVE',
                    is_active: true,
                    created_at: rm.created_at || new Date().toISOString(),
                  };
                  this.medicines.push(newMed);
                }
              }
              this.persistToDisk();
            }

            const { data: remoteVariants, error: varErr } = await client
              .from('medicine_packaging_variants')
              .select('*');
            if (!varErr && Array.isArray(remoteVariants) && remoteVariants.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteVariants.length} packaging variants from Supabase.`);
              const remoteVarIds = new Set(remoteVariants.map((v) => v.id));
              this.medicinePackagingVariants = this.medicinePackagingVariants.filter((v) => remoteVarIds.has(v.id));
              for (const med of this.medicines) {
                med.packaging_variants = [];
              }
              for (const rv of remoteVariants) {
                const variant: MedicinePackagingVariant = {
                  id: rv.id,
                  medicine_id: rv.medicine_id,
                  variant_name: rv.display_name || `${rv.size} ${rv.unit}`,
                  package_size: rv.size,
                  package_unit: rv.unit,
                  size: rv.size,
                  unit: rv.unit,
                  display_label: rv.display_name || `${rv.size} ${rv.unit}`,
                  display_name: rv.display_name || `${rv.size} ${rv.unit}`,
                  packing: rv.display_name || `${rv.size} ${rv.unit}`,
                  pts_rate: Number(rv.pts_rate || 0),
                  mrp: Number(rv.mrp || 0),
                  status: rv.is_active === false ? 'INACTIVE' : 'ACTIVE',
                  is_active: rv.is_active !== false,
                  created_at: rv.created_at || new Date().toISOString(),
                };
                const vIdx = this.medicinePackagingVariants.findIndex((v) => v.id === variant.id);
                if (vIdx >= 0) {
                  this.medicinePackagingVariants[vIdx] = variant;
                } else {
                  this.medicinePackagingVariants.push(variant);
                }

                const targetMed = this.medicines.find((m) => m.id === variant.medicine_id);
                if (targetMed) {
                  if (!targetMed.packaging_variants) targetMed.packaging_variants = [];
                  const existingVarIdx = targetMed.packaging_variants.findIndex((v) => v.id === variant.id);
                  if (existingVarIdx >= 0) {
                    targetMed.packaging_variants[existingVarIdx] = variant;
                  } else {
                    targetMed.packaging_variants.push(variant);
                  }
                }
              }
            }
          } catch (medNotice: any) {
            console.warn('[DatabaseService] Notice syncing medicines/variants from Supabase:', medNotice?.message);
          }

          // Authoritative sync: load stocker inventory (storage data) from Supabase
          try {
            const { data: remoteInv, error: invErr } = await client.from('stocker_inventory').select('*');
            if (!invErr && Array.isArray(remoteInv) && remoteInv.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteInv.length} stocker inventory records from Supabase.`);
              for (const ri of remoteInv) {
                const invItem: StockerInventory = {
                  id: ri.id,
                  hq_id: ri.hq_id,
                  stocker_id: ri.stocker_id,
                  medicine_id: ri.medicine_id,
                  variant_id: ri.variant_id || undefined,
                  packaging_display: ri.packaging_display || undefined,
                  quantity: Number(ri.quantity ?? 0),
                  low_stock_threshold: Number(ri.low_stock_threshold ?? 15),
                  updated_at: ri.updated_at || new Date().toISOString(),
                };
                const idx = this.stockerInventory.findIndex(
                  (i) => i.id === invItem.id || (i.stocker_id === invItem.stocker_id && i.medicine_id === invItem.medicine_id),
                );
                if (idx >= 0) {
                  this.stockerInventory[idx] = { ...this.stockerInventory[idx], ...invItem };
                } else {
                  this.stockerInventory.push(invItem);
                }
              }
            }
          } catch (invNotice: any) {
            console.warn('[DatabaseService] Notice syncing stocker inventory from Supabase:', invNotice?.message);
          }

          // Authoritative sync: load monthly tour plans from Supabase
          try {
            const { data: remoteTp, error: tpErr } = await client.from('monthly_tour_plans').select('*');
            if (!tpErr && Array.isArray(remoteTp) && remoteTp.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteTp.length} monthly tour plans from Supabase.`);
              for (const rtp of remoteTp) {
                const plan: MonthlyTourPlan = {
                  id: rtp.id,
                  mr_id: rtp.mr_id,
                  mr_name: rtp.mr_name,
                  month: rtp.month,
                  status: rtp.status || 'SUBMITTED',
                  entries: Array.isArray(rtp.entries)
                    ? rtp.entries
                    : typeof rtp.entries === 'string'
                    ? JSON.parse(rtp.entries)
                    : [],
                  submitted_at: rtp.submitted_at || new Date().toISOString(),
                  created_at: rtp.created_at || new Date().toISOString(),
                };
                const idx = this.monthlyTourPlans.findIndex(
                  (p) => p.id === plan.id || (p.mr_id === plan.mr_id && p.month === plan.month),
                );
                if (idx >= 0) {
                  this.monthlyTourPlans[idx] = { ...this.monthlyTourPlans[idx], ...plan };
                } else {
                  this.monthlyTourPlans.push(plan);
                }
              }
            } else if (this.monthlyTourPlans.length > 0) {
              for (const plan of this.monthlyTourPlans) {
                await this.syncMonthlyTourPlanToSupabase(plan);
              }
            }
          } catch (tpNotice: any) {
            console.warn('[DatabaseService] Notice syncing monthly tour plans from Supabase:', tpNotice?.message);
          }

          // Authoritative sync: load orders from Supabase
          try {
            const { data: remoteOrders, error: ordErr } = await client.from('orders').select('*');
            if (!ordErr && Array.isArray(remoteOrders)) {
              console.log(`[DatabaseService] Synced ${remoteOrders.length} orders from Supabase.`);
              const remoteOrderIds = new Set(remoteOrders.map((ro) => ro.id));
              // Supabase is authoritative: purge orders that were deleted in Supabase
              this.orders = this.orders.filter((o) => remoteOrderIds.has(o.id));

              for (const ro of remoteOrders) {
                if (this.deletedOrderIds.has(ro.id) || this.deletedOrderIds.has(ro.order_number)) {
                  // Purge from cloud database as it was deleted by administrator
                  client
                    .from('orders')
                    .delete()
                    .eq('id', ro.id)
                    .then(null, () => {});
                  continue;
                }
                const ord: Order = {
                  id: ro.id,
                  order_number: ro.order_number,
                  task_id: ro.task_id,
                  mr_id: ro.mr_id,
                  mr_name: ro.mr_name,
                  customer_name: ro.customer_name,
                  location_name: ro.location_name,
                  hq_id: ro.hq_id,
                  hq_name: ro.hq_name,
                  stocker_id: ro.stocker_id,
                  stocker_name: ro.stocker_name,
                  items: Array.isArray(ro.items)
                    ? ro.items
                    : typeof ro.items === 'string'
                    ? JSON.parse(ro.items)
                    : [],
                  total_units: Number(ro.total_units || 0),
                  total_amount: Number(ro.total_amount || 0),
                  delivery_status: ro.delivery_status || 'PENDING',
                  delivered_at: ro.delivered_at,
                  delivered_by_user_id: ro.delivered_by_user_id,
                  delivery_notes: ro.delivery_notes,
                  hq_accepted: !!ro.hq_accepted,
                  accepted_at: ro.accepted_at,
                  accepted_by_user_id: ro.accepted_by_user_id,
                  inventory_deducted: !!ro.inventory_deducted,
                  inventory_deducted_at: ro.inventory_deducted_at,
                  created_at: ro.created_at || new Date().toISOString(),
                  updated_at: ro.updated_at || new Date().toISOString(),
                };
                const idx = this.orders.findIndex((o) => o.id === ord.id);
                if (idx >= 0) {
                  this.orders[idx] = { ...this.orders[idx], ...ord };
                } else {
                  this.orders.push(ord);
                }
              }
            } else if (this.orders.length > 0) {
              for (const ord of this.orders) {
                await this.syncOrderToSupabase(ord);
              }
            }
          } catch (ordSyncErr: any) {
            console.warn('[DatabaseService] Supabase orders table sync notice:', ordSyncErr?.message);
          }

          // Reconstruct orders from tasks if any task has orders but not yet in orders collection
          for (const t of this.tasks) {
            let taskOrders: any[] = [];
            if (Array.isArray(t.orders)) {
              taskOrders = t.orders;
            } else if (typeof t.orders === 'string') {
              try {
                taskOrders = JSON.parse(t.orders);
              } catch {}
            }

            const validTaskItems = (taskOrders || []).filter(
              (it: any) =>
                (parseInt(String(it.quantity), 10) || 0) > 0 &&
                (it.product_name?.trim()?.length > 0 || it.product_id?.trim()?.length > 0),
            );

            if (validTaskItems.length === 0) continue;

            const orderId = t.order_id || `ord-${t.id.replace(/^task-/, '')}`;
            t.order_id = orderId;

            if (this.deletedOrderIds.has(orderId) || this.deletedOrderIds.has(t.id)) {
              continue;
            }

            const existing = this.orders.find(
              (o) => (t.order_id && o.id === t.order_id) || o.task_id === t.id,
            );

            const mrUser = this.users.find((u) => u.id === t.assigned_mr_id);
            const effectiveHqId = t.hq_id || mrUser?.hq_id || 'HQ-SHD-001';
            const hq = this.findHeadquarter ? this.findHeadquarter(effectiveHqId) : null;
            const hqName = t.hq_name || hq?.name || mrUser?.hq_name || 'Shahdol';

            const taskDate =
              t.date ||
              (t.created_at ? t.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
            const dateCompact = taskDate.replace(/-/g, '');
            const orderNumber = `ORD-${dateCompact}-${t.id.slice(-4)}`;

            if (this.deletedOrderIds.has(orderNumber)) {
              continue;
            }

            const hasOut = validTaskItems.some(
              (it: any) => it.stock_status === 'OUT_OF_STOCK' || Number(it.available_stock) === 0,
            );
            const hasLow = validTaskItems.some((it: any) => it.stock_status === 'LOW_STOCK');
            const outNames = validTaskItems
              .filter((it: any) => it.stock_status === 'OUT_OF_STOCK' || Number(it.available_stock) === 0)
              .map((it: any) => it.product_name)
              .filter(Boolean);

            const totalUnits = validTaskItems.reduce(
              (sum, it) => sum + (parseInt(String(it.quantity), 10) || 0),
              0,
            );
            const totalAmount = validTaskItems.reduce(
              (sum, it) =>
                sum +
                (Number(it.total_amount) ||
                  (parseInt(String(it.quantity), 10) || 0) * (parseFloat(String(it.unit_price)) || 0) ||
                  0),
              0,
            );

            if (!existing) {
              const reconstructed: Order = {
                id: orderId,
                order_number: orderNumber,
                task_id: t.id,
                mr_id: t.assigned_mr_id || mrUser?.id || 'usr-mr-02',
                mr_name: mrUser?.name || t.assigned_mr_name || 'Field Representative',
                customer_name: t.location_name || t.title || 'Clinic Order',
                location_name: t.location_name,
                hq_id: effectiveHqId,
                hq_name: hqName,
                stocker_id: t.stocker_id || 'stk-shd-01',
                stocker_name: t.stocker_name || (effectiveHqId.toLowerCase().includes('kot') ? 'Triyash Medical Agency' : 'Tara Pharmacy'),
                items: validTaskItems,
                total_units: totalUnits,
                total_amount: Math.round(totalAmount * 100) / 100,
                delivery_status:
                  t.delivery_status || (t.status === 'COMPLETED' ? 'DELIVERED' : 'PENDING'),
                delivered_at: t.completed_at || t.started_at,
                delivered_by_user_id: t.assigned_mr_id,
                hq_accepted: !!t.hq_accepted,
                inventory_deducted: !!t.inventory_deducted,
                has_stock_warning: hasOut || hasLow,
                stock_warning_type: hasOut ? 'OUT_OF_STOCK' : hasLow ? 'LOW_STOCK' : undefined,
                stock_warning_summary:
                  hasOut && outNames.length > 0
                    ? `${outNames.join(', ')} out of stock at ${hqName}`
                    : undefined,
                created_at: t.created_at || new Date().toISOString(),
                updated_at: t.completed_at || t.created_at || new Date().toISOString(),
              };
              this.orders.push(reconstructed);
            } else {
              existing.items = validTaskItems;
              existing.total_units = totalUnits;
              existing.total_amount = Math.round(totalAmount * 100) / 100;
              existing.has_stock_warning = hasOut || hasLow;
              existing.stock_warning_type = hasOut ? 'OUT_OF_STOCK' : hasLow ? 'LOW_STOCK' : undefined;
            }
          }
          this.persistToDisk();

          // Authoritative sync: load route batches from Supabase
          try {
            const { data: remoteBatches, error: rbErr } = await client.from('route_batches').select('*');
            if (!rbErr && Array.isArray(remoteBatches) && remoteBatches.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteBatches.length} route batches from Supabase.`);
              const remoteBatchIds = new Set(remoteBatches.map((b) => b.id));
              this.routeBatches = this.routeBatches.filter((b) => remoteBatchIds.has(b.id));
              for (const rb of remoteBatches) {
                const batch: RouteBatch = {
                  id: rb.id,
                  batch_code: rb.batch_code,
                  name: rb.name,
                  hq_id: rb.hq_id,
                  hq_code: rb.hq_code || '',
                  hq_name: rb.hq_name || '',
                  mr_id: rb.mr_id || undefined,
                  mr_name: rb.mr_name || undefined,
                  territory_name: rb.territory_name || '',
                  route_stops: Array.isArray(rb.route_stops)
                    ? rb.route_stops
                    : typeof rb.route_stops === 'string'
                    ? JSON.parse(rb.route_stops)
                    : [],
                  areas: Array.isArray(rb.areas)
                    ? rb.areas
                    : typeof rb.areas === 'string'
                    ? JSON.parse(rb.areas)
                    : [],
                  distance_km: Number(rb.distance_km || 0),
                  standard_reimbursement_rate: Number(rb.standard_reimbursement_rate ?? this.attendanceSettings?.reimbursement_rate_per_km ?? 2.5),
                  status: rb.status || 'ACTIVE',
                  created_at: rb.created_at || new Date().toISOString(),
                  updated_at: rb.updated_at || new Date().toISOString(),
                };
                const idx = this.routeBatches.findIndex((b) => b.id === batch.id || b.batch_code === batch.batch_code);
                if (idx >= 0) {
                  const existingLocIds = this.routeBatches[idx].location_ids || [];
                  this.routeBatches[idx] = { ...this.routeBatches[idx], ...batch, location_ids: existingLocIds };
                } else {
                  batch.location_ids = [];
                  this.routeBatches.push(batch);
                }
              }

              // Reconcile route batch location_ids with loaded savedLocations and doctors
              for (const loc of this.savedLocations) {
                if (loc.batch_id) {
                  const b = this.routeBatches.find((rb) => rb.id === loc.batch_id || rb.batch_code === loc.batch_id);
                  if (b) {
                    if (!b.location_ids) b.location_ids = [];
                    if (!b.location_ids.includes(loc.id)) b.location_ids.push(loc.id);
                  }
                }
              }
              for (const doc of this.doctors) {
                if (doc.batch_id) {
                  const b = this.routeBatches.find((rb) => rb.id === doc.batch_id || rb.batch_code === doc.batch_id);
                  if (b) {
                    if (!b.location_ids) b.location_ids = [];
                    if (!b.location_ids.includes(doc.id)) b.location_ids.push(doc.id);
                  }
                }
              }

              if (this.routeBatches.length > 0 && this.routeBatches[0].standard_reimbursement_rate !== undefined) {
                this.attendanceSettings.reimbursement_rate_per_km = this.routeBatches[0].standard_reimbursement_rate;
              }
            }
          } catch (rbNotice: any) {
            console.warn('[DatabaseService] Notice syncing route batches from Supabase:', rbNotice?.message);
          }

          // Authoritative sync: load attendance settings from Supabase
          try {
            const { data: remoteAttSettings, error: asErr } = await client.from('attendance_settings').select('*').limit(1);
            if (!asErr && Array.isArray(remoteAttSettings) && remoteAttSettings.length > 0) {
              const remote = remoteAttSettings[0];
              console.log(`[DatabaseService] Synced attendance settings from Supabase: punch_in=${remote.expected_punch_in_time}, punch_out=${remote.expected_punch_out_time}`);
              this.attendanceSettings = {
                ...this.attendanceSettings,
                id: remote.id,
                expected_punch_in_time: remote.expected_punch_in_time || this.attendanceSettings.expected_punch_in_time,
                allowed_punch_in_window_minutes: Number(remote.allowed_punch_in_window_minutes ?? this.attendanceSettings.allowed_punch_in_window_minutes),
                expected_punch_out_time: remote.expected_punch_out_time || this.attendanceSettings.expected_punch_out_time,
                allowed_punch_out_window_minutes: Number(remote.allowed_punch_out_window_minutes ?? this.attendanceSettings.allowed_punch_out_window_minutes),
                updated_at: remote.updated_at || new Date().toISOString(),
              };
              // Re-normalize all attendance records against the authoritative Supabase shift settings
              for (const a of this.attendance) {
                const dev = computeAttendanceDeviations(a.check_in_at, a.check_out_at, this.attendanceSettings);
                a.late_minutes = dev.lateMinutes;
                a.early_minutes = dev.earlyMinutes;
                if (a.status !== 'INCOMPLETE' && (!a.check_in_at || a.check_out_at)) {
                  a.status = dev.isLate ? 'LATE' : 'PRESENT';
                }
              }
            } else if (this.attendanceSettings) {
              await this.syncAttendanceSettingsToSupabase(this.attendanceSettings);
            }
          } catch (asNotice: any) {
            console.warn('[DatabaseService] Notice syncing attendance settings from Supabase:', asNotice?.message);
          }

          // Authoritative sync: load competitions and reward claims from Supabase
          try {
            const { data: remoteComps, error: compErr } = await client.from('competitions').select('*');
            if (!compErr && Array.isArray(remoteComps) && remoteComps.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteComps.length} competitions from Supabase.`);
              for (const rc of remoteComps) {
                const comp: Competition = {
                  id: rc.id,
                  name: rc.title || rc.name,
                  description: rc.description || '',
                  hq_id: rc.target_hq_id || rc.hq_id,
                  hq_name: rc.target_hq_name || rc.hq_name,
                  medicine_id: rc.target_product_id || rc.medicine_id,
                  medicine_name: rc.target_product_name || rc.medicine_name,
                  target_quantity: Number(rc.target_units ?? rc.target_quantity ?? 0),
                  reward_amount: Number(rc.reward_amount || 0),
                  start_date: rc.start_date,
                  end_date: rc.end_date,
                  status: rc.status || 'ACTIVE',
                  created_at: rc.created_at || new Date().toISOString(),
                };
                const idx = this.competitions.findIndex((c) => c.id === comp.id);
                if (idx >= 0) {
                  this.competitions[idx] = { ...this.competitions[idx], ...comp };
                } else {
                  this.competitions.push(comp);
                }
              }
            }

            const { data: remoteClaims, error: claimErr } = await client.from('reward_claims').select('*');
            if (!claimErr && Array.isArray(remoteClaims) && remoteClaims.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteClaims.length} reward claims from Supabase.`);
              for (const rcl of remoteClaims) {
                const targetComp = this.competitions.find((c) => c.id === rcl.competition_id);
                const claim: RewardClaim = {
                  id: rcl.id,
                  competition_id: rcl.competition_id,
                  competition_name: targetComp?.name || 'Sales Incentive',
                  mr_id: rcl.mr_id,
                  mr_name: rcl.mr_name || 'Field MR',
                  achieved_quantity: Number(rcl.units_sold || 0),
                  target_quantity: targetComp?.target_quantity || 0,
                  reward_amount: Number(rcl.reward_amount || 0),
                  eligible_at: rcl.claimed_at || new Date().toISOString(),
                  claimed_at: rcl.claimed_at || new Date().toISOString(),
                  status: (rcl.status || 'APPLIED') as any,
                  order_ids: [],
                  reviewed_at: rcl.decided_at,
                  reviewed_by: rcl.decided_by,
                };
                const idx = this.rewardClaims.findIndex((c) => c.id === claim.id);
                if (idx >= 0) {
                  this.rewardClaims[idx] = { ...this.rewardClaims[idx], ...claim };
                } else {
                  this.rewardClaims.push(claim);
                }
              }
            }
          } catch (compNotice: any) {
            console.warn('[DatabaseService] Notice syncing competitions/claims from Supabase:', compNotice?.message);
          }

          // Authoritative sync: load monthly stockage permissions from Supabase
          try {
            const { data: remotePerms, error: permErr } = await client
              .from('monthly_stockage_permissions')
              .select('*');
            if (!permErr && Array.isArray(remotePerms) && remotePerms.length > 0) {
              console.log(`[DatabaseService] Synced ${remotePerms.length} monthly stockage permissions from Supabase.`);
              for (const rp of remotePerms) {
                const parts = (rp.month_year || '').split('-');
                const y = parseInt(parts[0], 10) || new Date().getFullYear();
                const m = parseInt(parts[1], 10) || new Date().getMonth() + 1;
                const hq = this.headquarters.find((h) => h.id === rp.hq_id);
                const stocker = this.stockers.find((s) => s.id === rp.stocker_id);

                const perm: MonthlyStockagePermission = {
                  id: rp.id,
                  mr_id: rp.mr_id,
                  mr_name: rp.mr_name,
                  hq_id: rp.hq_id || undefined,
                  hq_name: hq?.name,
                  stocker_id: rp.stocker_id || undefined,
                  stocker_name: stocker?.name,
                  year: y,
                  month: m,
                  month_str: rp.month_year,
                  status: rp.status as any,
                  granted_by_id: rp.granted_by_admin_id,
                  granted_by_name: rp.granted_by_admin_name,
                  granted_at: rp.created_at || new Date().toISOString(),
                  revoked_by_id: rp.revoked_by_admin_id,
                  revoked_at: rp.revoked_at,
                  consumed_at: rp.consumed_at,
                  notes: rp.notes,
                  created_at: rp.created_at || new Date().toISOString(),
                  updated_at: rp.updated_at || new Date().toISOString(),
                };

                const idx = this.monthlyStockagePermissions.findIndex((p) => p.id === perm.id);
                if (idx >= 0) {
                  this.monthlyStockagePermissions[idx] = { ...this.monthlyStockagePermissions[idx], ...perm };
                } else {
                  this.monthlyStockagePermissions.push(perm);
                }
              }
            } else if (this.monthlyStockagePermissions.length > 0) {
              // Bidirectional initial sync: push local permissions to Supabase
              for (const perm of this.monthlyStockagePermissions) {
                await this.syncStockagePermissionToSupabase(perm);
              }
            }
          } catch (pNotice: any) {
            console.warn('[DatabaseService] Notice syncing monthly stockage permissions from Supabase:', pNotice?.message);
          }

          // Authoritative sync: load stockage submission requests and line items from Supabase
          try {
            const { data: remoteReqs, error: reqErr } = await client
              .from('stockage_submission_requests')
              .select('*')
              .order('submitted_at', { ascending: false });
            if (!reqErr && Array.isArray(remoteReqs) && remoteReqs.length > 0) {
              console.log(`[DatabaseService] Synced ${remoteReqs.length} stockage requests from Supabase.`);

              // Fetch line items for these requests
              const reqIds = remoteReqs.map((r) => r.id);
              const { data: remoteItems, error: itemsErr } = await client
                .from('stockage_submission_items')
                .select('*')
                .in('request_id', reqIds);

              const itemsByReq = new Map<string, StockageSubmissionItem[]>();
              if (!itemsErr && Array.isArray(remoteItems)) {
                for (const it of remoteItems) {
                  const arr = itemsByReq.get(it.request_id) || [];
                  arr.push({
                    id: it.id,
                    medicine_id: it.medicine_id,
                    medicine_name: it.medicine_name,
                    medicine_code: '',
                    variant_id: it.packaging_id || undefined,
                    package_size: it.packaging_size ? parseFloat(it.packaging_size) : undefined,
                    package_unit: it.packaging_unit || undefined,
                    packaging_display: it.packaging_size ? `${it.packaging_size} ${it.packaging_unit || ''}`.trim() : 'Units',
                    pts_rate: it.pts_rate !== null ? Number(it.pts_rate) : undefined,
                    mrp: it.mrp !== null ? Number(it.mrp) : undefined,
                    submitted_quantity: Number(it.submitted_quantity || 0),
                    approved_quantity: it.approved_quantity !== null ? Number(it.approved_quantity) : undefined,
                    previous_stock: it.previous_stock !== null ? Number(it.previous_stock) : undefined,
                    final_stock: it.final_stock !== null ? Number(it.final_stock) : undefined,
                    notes: it.notes || '',
                  });
                  itemsByReq.set(it.request_id, arr);
                }
              }

              for (const rr of remoteReqs) {
                const parts = (rr.month_year || '').split('-');
                const y = parseInt(parts[0], 10) || new Date().getFullYear();
                const m = parseInt(parts[1], 10) || new Date().getMonth() + 1;
                const hq = this.headquarters.find((h) => h.id === rr.hq_id);
                const stocker = this.stockers.find((s) => s.id === rr.stocker_id);

                const requestObj: StockageSubmissionRequest = {
                  id: rr.id,
                  permission_id: rr.permission_id,
                  mr_id: rr.mr_id,
                  mr_name: rr.mr_name,
                  hq_id: rr.hq_id,
                  hq_name: hq?.name || 'Shahdol',
                  stocker_id: rr.stocker_id,
                  stocker_name: stocker?.name || 'Central Pharma Stockist',
                  month: rr.month_year,
                  month_year: rr.month_year,
                  year: y,
                  month_num: m,
                  status: (rr.status === 'SUBMITTED' ? 'PENDING' : rr.status) as any,
                  items: itemsByReq.get(rr.id) || [],
                  total_items: Number(rr.total_items || (itemsByReq.get(rr.id)?.length ?? 0)),
                  total_quantity: Number(rr.total_quantity || 0),
                  submitted_at: rr.submitted_at || new Date().toISOString(),
                  reviewed_at: rr.reviewed_at || undefined,
                  reviewed_by_id: rr.reviewed_by_admin_id || undefined,
                  reviewed_by_name: rr.reviewed_by_admin_name || undefined,
                  admin_comment: rr.admin_notes || undefined,
                  admin_notes: rr.admin_notes || undefined,
                  applied_at: rr.applied_at || undefined,
                  created_at: rr.created_at || new Date().toISOString(),
                  updated_at: rr.updated_at || new Date().toISOString(),
                };

                const idx = this.stockageSubmissionRequests.findIndex((r) => r.id === requestObj.id);
                if (idx >= 0) {
                  this.stockageSubmissionRequests[idx] = { ...this.stockageSubmissionRequests[idx], ...requestObj };
                } else {
                  this.stockageSubmissionRequests.push(requestObj);
                }
              }
            } else if (this.stockageSubmissionRequests.length > 0) {
              // Bidirectional initial sync: push local requests to Supabase
              for (const req of this.stockageSubmissionRequests) {
                await this.syncStockageRequestToSupabase(req);
              }
            }
          } catch (rNotice: any) {
            console.warn('[DatabaseService] Notice syncing stockage requests from Supabase:', rNotice?.message);
          }

          // Flush synchronized state to disk store immediately
          await this.flushToDisk();

          // Purge stale HQs, stockers, dummy clinics & dummy MRs from Supabase permanently
          try {
            await client.from('headquarters').delete().in('id', ['hq-delhi', 'hq-anuppur', 'hq-umaria']);
            await client.from('stockers').delete().in('id', ['stk-anp-01', 'stk-shd-03', 'stk-shd-04']);
            await client.from('doctors').delete().in('id', ['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05']);
            await client.from('tasks').delete().in('assigned_mr_id', ['usr-mr-rahul', 'usr-mr-vikram', 'usr-mr-pooja']);
            await client.from('attendance').delete().in('user_id', ['usr-mr-rahul', 'usr-mr-vikram', 'usr-mr-pooja']);
          } catch {}
        }
      } catch (err: any) {
        console.warn('[DatabaseService] Supabase onModuleInit notice:', err?.message);
      }
    }
  }

    // Purge any legacy dummy records loaded from old disk stores in non-test mode
    if (process.env.NODE_ENV !== 'test') {
      const LEGACY_DUMMY_IDS = new Set(['usr-mr-rahul', 'usr-mr-vikram', 'usr-mr-pooja']);
      const DUMMY_DOC_IDS = new Set(['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05']);
      const LEGACY_MED_NAMES = new Set([
        'CardioFix-50 (Telmisartan 40mg)',
        'CardioFix-AM (Telmisartan + Amlodipine)',
        'DermaSoothe Cream 30g',
        'Glucotrol-M (Metformin 500mg)',
        'AhtriCef-O 200mg (Cefixime)',
        'CardioFix 50mg',
      ]);
      this.tasks = this.tasks.filter((t) => !LEGACY_DUMMY_IDS.has(t.assigned_mr_id) && !DUMMY_DOC_IDS.has(t.id));
      this.attendance = this.attendance.filter((a) => !LEGACY_DUMMY_IDS.has(a.user_id));
      this.doctors = this.doctors.filter((d) => !DUMMY_DOC_IDS.has(d.id));
      this.medicines = this.medicines.filter((m) => !LEGACY_MED_NAMES.has(m.name));
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

    // Synchronize pending orders stock levels against live inventory
    this.refreshPendingOrdersStock();
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

  public async syncOrderToSupabase(order: Order) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const { error } = await client.from('orders').upsert({
        id: order.id,
        order_number: order.order_number,
        task_id: order.task_id || null,
        mr_id: order.mr_id,
        mr_name: order.mr_name,
        customer_name: order.customer_name,
        location_name: order.location_name || null,
        hq_id: order.hq_id,
        hq_name: order.hq_name,
        stocker_id: order.stocker_id || null,
        stocker_name: order.stocker_name || null,
        items: order.items || [],
        total_units: order.total_units || 0,
        total_amount: order.total_amount || 0,
        delivery_status: order.delivery_status || 'PENDING',
        delivered_at: order.delivered_at || null,
        delivered_by_user_id: order.delivered_by_user_id || null,
        delivery_notes: order.delivery_notes || null,
        hq_accepted: !!order.hq_accepted,
        accepted_at: order.accepted_at || null,
        accepted_by_user_id: order.accepted_by_user_id || null,
        inventory_deducted: !!order.inventory_deducted,
        inventory_deducted_at: order.inventory_deducted_at || null,
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || new Date().toISOString(),
      }, { onConflict: 'id' });

      if (error && order.task_id) {
        // Fallback: update linked task in Supabase
        const task = this.tasks.find((t) => t.id === order.task_id);
        if (task) {
          task.orders = order.items;
          task.order_id = order.id;
          task.delivery_status = order.delivery_status;
          task.hq_accepted = order.hq_accepted;
          task.inventory_deducted = order.inventory_deducted;
          await this.syncTaskToSupabase(task);
        }
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Notice syncing order ${order.id}:`, err?.message);
    }
  }

  public async syncMonthlyTourPlanToSupabase(plan: MonthlyTourPlan) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;

      let effectiveMrId = plan.mr_id;
      if (effectiveMrId === 'usr-admin-shivansh' || (this.users.length > 0 && !this.users.some((u) => u.id === effectiveMrId))) {
        const found = this.users.find((u) => u.id === 'usr-admin-01' || u.name?.toLowerCase().includes('shivansh'));
        if (found) effectiveMrId = found.id;
      }

      await client.from('monthly_tour_plans').upsert({
        id: plan.id,
        mr_id: effectiveMrId,
        mr_name: plan.mr_name,
        month: plan.month,
        status: plan.status || 'SUBMITTED',
        entries: plan.entries || [],
        submitted_at: plan.submitted_at || new Date().toISOString(),
        created_at: plan.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Notice syncing monthly tour plan ${plan.id}:`, err?.message);
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

  public async syncHeadquarterToSupabase(hq: Headquarter) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('headquarters').upsert({
        id: hq.id,
        name: hq.name,
        state: hq.state || 'Madhya Pradesh',
        is_active: hq.status !== 'INACTIVE',
        created_at: hq.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
      if (hq.legacy_id && hq.legacy_id !== hq.id) {
        await client.from('headquarters').upsert({
          id: hq.legacy_id,
          name: hq.name,
          state: hq.state || 'Madhya Pradesh',
          is_active: hq.status !== 'INACTIVE',
          created_at: hq.created_at || new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync HQ ${hq.id}:`, err?.message);
    }
  }

  public async deleteHeadquarterFromSupabase(id: string, legacyId?: string) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const ids = [id];
      if (legacyId && legacyId !== id) ids.push(legacyId);
      await client.from('stockers').delete().in('hq_id', ids);
      await client.from('headquarters').delete().in('id', ids);
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to delete HQ ${id} from Supabase:`, err?.message);
    }
  }

  public async syncStockerToSupabase(stocker: Stocker) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('stockers').upsert({
        id: stocker.id,
        name: stocker.name,
        hq_id: stocker.hq_id,
        address: stocker.address || '',
        phone: stocker.phone || '',
        is_active: stocker.status !== 'INACTIVE',
        created_at: stocker.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync stocker ${stocker.id}:`, err?.message);
    }
  }

  public async deleteStockerFromSupabase(id: string) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('stocker_inventory').delete().eq('stocker_id', id);
      await client.from('stockers').delete().eq('id', id);
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to delete stocker ${id} from Supabase:`, err?.message);
    }
  }

  public async syncMedicineToSupabase(med: Medicine) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const ptsVal = med.pts_rate ?? med.pts ?? med.base_price ?? null;
      const { error } = await client.from('medicines').upsert(
        {
          id: med.id,
          name: med.name,
          sku: med.code || med.sku || med.id,
          composition: med.composition || null,
          category: med.category || null,
          pack_size: med.packing || med.unit || 'Units',
          unit_price: ptsVal,
          pts_rate: ptsVal,
          mrp: med.mrp ?? null,
          is_active: med.status !== 'INACTIVE',
          created_at: med.created_at || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.error(`[SupabaseSync] Error syncing medicine ${med.id}:`, error.message);
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync medicine ${med.id}:`, err?.message);
      throw err;
    }
  }

  public async deleteMedicineFromSupabase(id: string) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('stocker_inventory').delete().eq('medicine_id', id);
      await client.from('medicine_packaging_variants').delete().eq('medicine_id', id);
      const { error } = await client.from('medicines').delete().eq('id', id);
      if (error) {
        // If hard delete is restricted due to order items or historical records, soft-delete
        console.warn(`[SupabaseSync] Hard delete failed on medicines for ${id}, soft-deleting:`, error.message);
        await client.from('medicines').update({ is_active: false }).eq('id', id);
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to delete medicine ${id} from Supabase:`, err?.message);
    }
  }

  public async syncStockerInventoryToSupabase(inv: StockerInventory) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const { error } = await client.from('stocker_inventory').upsert(
        {
          id: inv.id,
          hq_id: inv.hq_id,
          stocker_id: inv.stocker_id,
          medicine_id: inv.medicine_id,
          variant_id: inv.variant_id || null,
          packaging_display: inv.packaging_display || null,
          quantity: inv.quantity || 0,
          low_stock_threshold: inv.low_stock_threshold || 15,
          updated_at: inv.updated_at || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.error(`[SupabaseSync] Error syncing stocker inventory ${inv.id}:`, error.message);
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync stocker inventory ${inv.id}:`, err?.message);
      throw err;
    }
  }

  public async syncBatchStockerInventoryToSupabase(invList: StockerInventory[]) {
    if (!this.supabase || !this.supabase.isConnected || !invList || invList.length === 0) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const records = invList.map((inv) => ({
        id: inv.id,
        hq_id: inv.hq_id,
        stocker_id: inv.stocker_id,
        medicine_id: inv.medicine_id,
        variant_id: inv.variant_id || null,
        packaging_display: inv.packaging_display || null,
        quantity: inv.quantity || 0,
        low_stock_threshold: inv.low_stock_threshold || 15,
        updated_at: inv.updated_at || new Date().toISOString(),
      }));
      await client.from('stocker_inventory').upsert(records, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync batch inventory (${invList.length} items):`, err?.message);
    }
  }

  public async syncPackagingVariantToSupabase(v: MedicinePackagingVariant) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const sizeVal = v.package_size ?? v.size ?? 1;
      const unitVal = v.package_unit ?? v.unit ?? 'units';
      const dispVal = v.display_name ?? v.display_label ?? `${sizeVal} ${unitVal}`;
      await client.from('medicine_packaging_variants').upsert({
        id: v.id,
        medicine_id: v.medicine_id,
        size: sizeVal,
        unit: unitVal,
        display_name: dispVal,
        pts_rate: v.pts_rate ?? null,
        mrp: v.mrp ?? null,
        is_active: v.is_active !== undefined ? v.is_active : v.status !== 'INACTIVE',
        created_at: v.created_at || new Date().toISOString(),
        updated_at: v.updated_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync packaging variant ${v.id}:`, err?.message);
    }
  }

  public async deletePackagingVariantFromSupabase(id: string) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('medicine_packaging_variants').delete().eq('id', id);
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to delete packaging variant ${id}:`, err?.message);
    }
  }

  public async syncRouteBatchToSupabase(batch: RouteBatch) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('route_batches').upsert({
        id: batch.id,
        batch_code: batch.batch_code,
        name: batch.name,
        hq_id: batch.hq_id,
        hq_code: batch.hq_code || null,
        hq_name: batch.hq_name || null,
        mr_id: batch.mr_id || null,
        mr_name: batch.mr_name || null,
        territory_name: batch.territory_name || null,
        route_stops: batch.route_stops || [],
        areas: batch.areas || [],
        distance_km: batch.distance_km || 0,
        standard_reimbursement_rate: batch.standard_reimbursement_rate ?? 2.5,
        status: batch.status || 'ACTIVE',
        created_at: batch.created_at || new Date().toISOString(),
        updated_at: batch.updated_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync route batch ${batch.id}:`, err?.message);
    }
  }

  public async deleteRouteBatchFromSupabase(id: string) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('route_batches').delete().or(`id.eq.${id},batch_code.eq.${id}`);
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to delete route batch ${id}:`, err?.message);
    }
  }

  public async syncAllRouteBatchesToSupabase(batches: RouteBatch[]) {
    if (!this.supabase || !this.supabase.isConnected || !batches || batches.length === 0) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const records = batches.map((b) => ({
        id: b.id,
        batch_code: b.batch_code,
        name: b.name,
        hq_id: b.hq_id,
        hq_code: b.hq_code || null,
        hq_name: b.hq_name || null,
        mr_id: b.mr_id || null,
        mr_name: b.mr_name || null,
        territory_name: b.territory_name || null,
        route_stops: b.route_stops || [],
        areas: b.areas || [],
        distance_km: b.distance_km || 0,
        standard_reimbursement_rate: b.standard_reimbursement_rate,
        status: b.status || 'ACTIVE',
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      }));
      await client.from('route_batches').upsert(records, { onConflict: 'id' });
      console.log(`[DatabaseService] Successfully synced ${records.length} route batches to Supabase with rate policy.`);
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to bulk sync route batches:`, err?.message);
    }
  }

  public async syncAttendanceSettingsToSupabase(settings: AttendanceSettings) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('attendance_settings').upsert({
        id: settings.id || 'att-settings-default',
        expected_punch_in_time: settings.expected_punch_in_time || '10:00:00',
        allowed_punch_in_window_minutes: Number(settings.allowed_punch_in_window_minutes ?? 30),
        expected_punch_out_time: settings.expected_punch_out_time || '18:00:00',
        allowed_punch_out_window_minutes: Number(settings.allowed_punch_out_window_minutes ?? 30),
        updated_at: settings.updated_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync attendance settings:`, err?.message);
    }
  }

  public async syncCompetitionToSupabase(comp: Competition) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('competitions').upsert({
        id: comp.id,
        title: comp.name,
        description: comp.description || '',
        target_hq_id: comp.hq_id,
        target_hq_name: comp.hq_name,
        target_product_id: comp.medicine_id,
        target_product_name: comp.medicine_name,
        target_units: comp.target_quantity || 0,
        reward_amount: comp.reward_amount || 0,
        start_date: comp.start_date,
        end_date: comp.end_date,
        status: comp.status || 'ACTIVE',
        created_at: comp.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Notice syncing competition ${comp.id}:`, err?.message);
    }
  }

  public async deleteCompetitionFromSupabase(id: string) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('reward_claims').delete().eq('competition_id', id);
      await client.from('competitions').delete().eq('id', id);
    } catch (err: any) {
      console.warn(`[SupabaseSync] Notice deleting competition ${id}:`, err?.message);
    }
  }

  public async syncRewardClaimToSupabase(claim: RewardClaim) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('reward_claims').upsert({
        id: claim.id,
        competition_id: claim.competition_id,
        mr_id: claim.mr_id,
        mr_name: claim.mr_name,
        status: claim.status || 'PENDING',
        units_sold: claim.achieved_quantity || 0,
        reward_amount: claim.reward_amount || 0,
        claimed_at: claim.claimed_at || new Date().toISOString(),
        decided_at: claim.reviewed_at || null,
        decided_by: claim.reviewed_by || null,
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync reward claim ${claim.id}:`, err?.message);
    }
  }

  public async syncStockagePermissionToSupabase(perm: MonthlyStockagePermission) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      await client.from('monthly_stockage_permissions').upsert({
        id: perm.id,
        mr_id: perm.mr_id,
        mr_name: perm.mr_name,
        month_year: perm.month_str || `${perm.year}-${String(perm.month).padStart(2, '0')}`,
        stocker_id: perm.stocker_id || null,
        hq_id: perm.hq_id || null,
        status: perm.status || 'AVAILABLE',
        granted_by_admin_id: perm.granted_by_id || 'usr-admin-01',
        granted_by_admin_name: perm.granted_by_name || 'System Admin',
        notes: perm.notes || null,
        revoked_at: perm.revoked_at || null,
        revoked_by_admin_id: perm.revoked_by_id || null,
        consumed_at: perm.consumed_at || null,
        reserved_at: perm.status === 'RESERVED' ? new Date().toISOString() : null,
        created_at: perm.created_at || new Date().toISOString(),
        updated_at: perm.updated_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync monthly stockage permission ${perm.id}:`, err?.message);
    }
  }

  public async syncStockageRequestToSupabase(req: StockageSubmissionRequest) {
    if (!this.supabase || !this.supabase.isConnected) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;

      // Note: In Supabase, the check constraint accepts: 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED'
      // If status is 'PENDING', map to 'SUBMITTED' so it never violates the database constraint
      const dbStatus = req.status === 'PENDING' ? 'SUBMITTED' : req.status;

      await client.from('stockage_submission_requests').upsert({
        id: req.id,
        permission_id: req.permission_id,
        mr_id: req.mr_id,
        mr_name: req.mr_name,
        month_year: req.month || req.month_year || `${req.year}-${String(req.month_num).padStart(2, '0')}`,
        stocker_id: req.stocker_id,
        hq_id: req.hq_id,
        status: dbStatus,
        total_items: req.total_items || req.items?.length || 0,
        total_quantity: req.total_quantity || 0,
        notes: (req as any).notes || null,
        submitted_at: req.submitted_at || new Date().toISOString(),
        reviewed_at: req.reviewed_at || null,
        reviewed_by_admin_id: req.reviewed_by_id || null,
        reviewed_by_admin_name: req.reviewed_by_name || null,
        admin_notes: req.admin_comment || req.admin_notes || null,
        applied_at: req.applied_at || null,
        created_at: req.created_at || new Date().toISOString(),
        updated_at: req.updated_at || new Date().toISOString(),
      }, { onConflict: 'id' });

      // Upsert line items individually for resilience
      if (req.items && Array.isArray(req.items) && req.items.length > 0) {
        for (const item of req.items) {
          try {
            await client.from('stockage_submission_items').upsert({
              id: item.id,
              request_id: req.id,
              medicine_id: item.medicine_id,
              medicine_name: item.medicine_name,
              packaging_id: item.variant_id || null,
              packaging_size: item.package_size ? String(item.package_size) : null,
              packaging_unit: item.package_unit || null,
              submitted_quantity: item.submitted_quantity || 0,
              approved_quantity: item.approved_quantity !== undefined ? item.approved_quantity : null,
              previous_stock: item.previous_stock !== undefined ? item.previous_stock : null,
              final_stock: item.final_stock !== undefined ? item.final_stock : null,
              pts_rate: item.pts_rate !== undefined ? item.pts_rate : null,
              mrp: item.mrp !== undefined ? item.mrp : null,
              notes: item.notes || null,
            }, { onConflict: 'id' });
          } catch (itemErr: any) {
            console.warn(`[SupabaseSync] Notice syncing item ${item.id}:`, itemErr?.message);
          }
        }
      }
    } catch (err: any) {
      console.warn(`[SupabaseSync] Failed to sync stockage request ${req.id}:`, err?.message);
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
    const defaultPasswordHash = '$2a$10$x4quOhBAtj/c8IRuA7S.DuBeT/8p2rilsaVim9RCBQQW6cKVqbuFC'; // Hash of Password@123
    const adminPasswordHash = '$2a$10$MW1mfmr2.I1UgSsYuHI6qO3c8blaOrCcPownKQatdrgz8.7HyPhNG'; // Hash of 12345678
    const amarPasswordHash = '$2a$10$b4FwNYmP2E/JsHB3wQrcAeOXe39WLr68IUIOQdQGXgyUm0iI9ETmC';
    const amanPasswordHash = '$2a$10$GxSnC0d70j7BW/HI5KwwUu.jE/AASG4BAbIjV/8fBRZZpELmVIEV2';
    const ashishPasswordHash = '$2a$10$ElYv/1rGCurbbZsjgZh8lOcDLSY9ZNMfieLB0PwrIFfn8Gn008hwa';

    // Single Super Admin: Configurable via ADMIN_EMAIL/ADMIN_PHONE environment variables or database updates
    const superAdmin: User = {
      id: 'usr-admin-01',
      name: process.env.ADMIN_NAME || 'Shivansh',
      phone: process.env.ADMIN_PHONE || '9009149694',
      email: process.env.ADMIN_EMAIL || 'shivanshti10@gmail.com',
      password_hash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      hq_id: 'HQ-SHD-001',
      hq_code: 'SHD',
      hq_name: 'Shahdol',
      territory: 'Shahdol HQ Territory',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    // 1. MR: Amar Dwivedi | HQ: Kotma | HQ Code: KOT | HQ ID: HQ-KOT-001
    const mr1: User = {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      phone: '9399604625',
      email: 'amarkotma478@gmail.com',
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
      route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      assigned_route_batches: ['KOT-B01', 'KOT-B02', 'KOT-B03', 'KOT-B04', 'KOT-B05', 'KOT-B06', 'KOT-B07', 'KOT-B08', 'KOT-B09'],
      manager_id: undefined,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    // 2. MR: Aman Rathore | HQ: Shahdol | HQ Code: SHD | HQ ID: HQ-SHD-001
    const mr2: User = {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      phone: '6261654453',
      email: 'amanrathour4453@gmail.com',
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
      route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      assigned_route_batches: ['SHD-B01', 'SHD-B02', 'SHD-B03', 'SHD-B04', 'SHD-B05'],
      manager_id: undefined,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    // 3. MR: Ashish Soni | HQ: Ambikapur | HQ Code: AMB | HQ ID: HQ-AMB-001
    const mr3: User = {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      phone: '9343052283',
      email: 'ashish103020@gmail.com',
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
      route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
      assigned_route_batches: ['AMB-B01', 'AMB-B02', 'AMB-B03', 'AMB-B04', 'AMB-B05'],
      manager_id: undefined,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    this.users.push(superAdmin, mr1, mr2, mr3);

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
          created_by: 'usr-admin-01',
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
          address: 'Gandhi Chowk, Shahdol, MP',
          latitude: 23.2962,
          longitude: 81.3537,
          area_id: 'area-shd-07',
          created_by: 'usr-admin-01',
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
          created_by: 'usr-admin-01',
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

    if (this.headquarters.length === 0) {
      this.headquarters.push(
        hqKotma,
        hqShahdol,
        hqAmbikapur,
        hqBilaspur,
      );
    }

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
    if (this.hqAreas.length === 0) {
      for (const a of areas) {
        this.hqAreas.push({
          id: a.id,
          hq_id: a.hq_id,
          name: a.name,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        });
      }
    }

    // 11.1 Seed Master Route Batches (19 Authentic Batches per Field Operations)
    const seedRouteBatches: RouteBatch[] = [
      // Kotma Batches (Amar Dwivedi: KOT-B01 to KOT-B09)
      { id: 'rb-kot-b01', batch_code: 'KOT-B01', name: 'Kotma - Marwahi - Dhanikundi', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Marwahi', 'Dhanikundi'], areas: ['Kotma', 'Marwahi', 'Dhanikundi'], distance_km: 85, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b02', batch_code: 'KOT-B02', name: 'Kotma - Kelhari - Janakpur', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Kelhari', 'Janakpur'], areas: ['Kotma', 'Kelhari', 'Janakpur'], distance_km: 95, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b03', batch_code: 'KOT-B03', name: 'Kotma - Keswahi - Girva - Khamhidol', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Keswahi', 'Girva', 'Khamhidol'], areas: ['Kotma', 'Keswahi', 'Girva', 'Khamhidol'], distance_km: 110, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b04', batch_code: 'KOT-B04', name: 'Kotma - Jaithari - Rajendragram', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Jaithari', 'Rajendragram'], areas: ['Kotma', 'Jaithari', 'Rajendragram'], distance_km: 70, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b05', batch_code: 'KOT-B05', name: 'Kotma - Anuppur', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Anuppur'], areas: ['Kotma', 'Anuppur'], distance_km: 45, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b06', batch_code: 'KOT-B06', name: 'Kotma - Manendragarh', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Manendragarh'], areas: ['Kotma', 'Manendragarh'], distance_km: 65, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b07', batch_code: 'KOT-B07', name: 'Kotma - Chirmiri', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Chirmiri'], areas: ['Kotma', 'Chirmiri'], distance_km: 80, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b08', batch_code: 'KOT-B08', name: 'Kotma - Baikunthpur', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Baikunthpur'], areas: ['Kotma', 'Baikunthpur'], distance_km: 90, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-kot-b09', batch_code: 'KOT-B09', name: 'Kotma - Gaurela', hq_id: hqKotma.id, hq_code: 'KOT', hq_name: 'Kotma', mr_id: mr1.id, mr_name: mr1.name, territory_name: 'Kotma HQ Territory', route_stops: ['Kotma', 'Gaurela'], areas: ['Kotma', 'Gaurela'], distance_km: 95, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

      // Shahdol Batches (Aman Rathore: SHD-B01 to SHD-B05)
      { id: 'rb-shd-b01', batch_code: 'SHD-B01', name: 'Shahdol - Budhar - Dhanpuri - OPM', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Shahdol', 'Budhar', 'Dhanpuri', 'OPM'], areas: ['Shahdol', 'Budhar', 'Dhanpuri', 'OPM'], distance_km: 55, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-b02', batch_code: 'SHD-B02', name: 'Shahdol - Pali - Navrozabad', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Shahdol', 'Pali', 'Navrozabad'], areas: ['Shahdol', 'Pali', 'Navrozabad'], distance_km: 75, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-b03', batch_code: 'SHD-B03', name: 'Shahdol - Gohparu - Jaisinghnagar', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Shahdol', 'Gohparu', 'Jaisinghnagar'], areas: ['Shahdol', 'Gohparu', 'Jaisinghnagar'], distance_km: 120, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-b04', batch_code: 'SHD-B04', name: 'Shahdol - Jaitpur', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Shahdol', 'Jaitpur'], areas: ['Shahdol', 'Jaitpur'], distance_km: 80, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-shd-b05', batch_code: 'SHD-B05', name: 'Shahdol - Manpur', hq_id: hqShahdol.id, hq_code: 'SHD', hq_name: 'Shahdol', mr_id: mr2.id, mr_name: mr2.name, territory_name: 'Shahdol HQ Territory', route_stops: ['Shahdol', 'Manpur'], areas: ['Shahdol', 'Manpur'], distance_km: 110, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

      // Ambikapur Batches (Ashish Soni: AMB-B01 to AMB-B05)
      { id: 'rb-amb-b01', batch_code: 'AMB-B01', name: 'Ambikapur - Laknapur - Udaypur - Kedma', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Ambikapur', 'Laknapur', 'Udaypur', 'Kedma'], areas: ['Ambikapur', 'Laknapur', 'Udaypur', 'Kedma'], distance_km: 90, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-b02', batch_code: 'AMB-B02', name: 'Ambikapur - Batuli - Sitapur - Patthalgawn', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Ambikapur', 'Batuli', 'Sitapur', 'Patthalgawn'], areas: ['Ambikapur', 'Batuli', 'Sitapur', 'Patthalgawn'], distance_km: 130, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-b03', batch_code: 'AMB-B03', name: 'Ambikapur - Silpili - Vishrampur - Surajpur - Devnagar - Shreenagar', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Ambikapur', 'Silpili', 'Vishrampur', 'Surajpur', 'Devnagar', 'Shreenagar'], areas: ['Ambikapur', 'Silpili', 'Vishrampur', 'Surajpur', 'Devnagar', 'Shreenagar'], distance_km: 115, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-b04', batch_code: 'AMB-B04', name: 'Ambikapur - Pratapur - Siluta - Vadrafnagar', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Ambikapur', 'Pratapur', 'Siluta', 'Vadrafnagar'], areas: ['Ambikapur', 'Pratapur', 'Siluta', 'Vadrafnagar'], distance_km: 140, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rb-amb-b05', batch_code: 'AMB-B05', name: 'Ambikapur - Latori - Krwan - Datima - Batra - Bhatgawn', hq_id: hqAmbikapur.id, hq_code: 'AMB', hq_name: 'Ambikapur', mr_id: mr3.id, mr_name: mr3.name, territory_name: 'Ambikapur HQ Territory', route_stops: ['Ambikapur', 'Latori', 'Krwan', 'Datima', 'Batra', 'Bhatgawn'], areas: ['Ambikapur', 'Latori', 'Krwan', 'Datima', 'Batra', 'Bhatgawn'], distance_km: 125, standard_reimbursement_rate: 2.25, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    this.routeBatches.push(...seedRouteBatches);

    // 12. Seed Stockers (§9 & §10) with sub_area assigned
    // 12. Seed Real Pharmacy Stockers (§9 & §10)
    // Shahdol:
    //   1. Tara Pharmacy
    //   2. Parth Medical Agency
    // Kotma:
    //   1. Triyash Medical Agency
    // Ambikapur:
    //   1. Kismira Medical Agency
    // Bilaspur / Other unlisted HQs: Left empty (no seed/hardcoded stockers)
    const stocker1: Stocker = {
      id: 'stk-shd-01',
      hq_id: hqShahdol.id,
      name: 'Tara Pharmacy',
      sub_area: 'Shahdol Central',
      contact_person: '',
      phone: '',
      address: 'Shahdol, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker2: Stocker = {
      id: 'stk-shd-02',
      hq_id: hqShahdol.id,
      name: 'Parth Medical Agency',
      sub_area: 'Shahdol Central',
      contact_person: '',
      phone: '',
      address: 'Shahdol, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker3: Stocker = {
      id: 'stk-ktm-01',
      hq_id: hqKotma.id,
      name: 'Triyash Medical Agency',
      sub_area: 'Kotma Town',
      contact_person: '',
      phone: '',
      address: 'Kotma, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker4: Stocker = {
      id: 'stk-amb-01',
      hq_id: hqAmbikapur.id,
      name: 'Kismira Medical Agency',
      sub_area: 'Ambikapur Central',
      contact_person: '',
      phone: '',
      address: 'Ambikapur, CG',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    if (this.stockers.length === 0) {
      this.stockers.push(stocker1, stocker2, stocker3, stocker4);
    }

    // 13. Route Batches seeded in Section 11.1 above (19 authentic batches)

    // 14. Seed Medicines Master (§11) - Authoritative 17 AHTRI Medicine Catalog with Structured Packaging & PTS/PTR/MRP Rates
    const seedMedicinesList: Medicine[] = [
      {
        id: 'med-01',
        name: 'AHTRI-S',
        code: 'AHT-001',
        product_code: 'AHT-001',
        sku: 'AHT-001',
        category: 'Liquid / Syrup',
        composition: 'Ayurvedic Digestive Tonic & Alkalizer 200ml',
        unit: '200 ML',
        packing: '200 ML',
        base_price: 38.40,
        pts: 38.40,
        pts_rate: 38.40,
        ptr: 48.00,
        ptr_rate: 48.00,
        mrp: 195.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-01-200ml',
            medicine_id: 'med-01',
            variant_name: '200 ML Bottle',
            package_size: 200,
            package_unit: 'ML',
            display_label: '200 ML',
            packing: '200 ML',
            pts_rate: 38.40,
            ptr_rate: 48.00,
            mrp: 195.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-02',
        name: 'AHTRI-A2Z',
        code: 'AHT-002',
        product_code: 'AHT-002',
        sku: 'AHT-002',
        category: 'Liquid / Syrup',
        composition: 'Multivitamin, Multimineral & Antioxidant Syrup 200ml',
        unit: '200 ML',
        packing: '200 ML',
        base_price: 36.80,
        pts: 36.80,
        pts_rate: 36.80,
        ptr: 46.00,
        ptr_rate: 46.00,
        mrp: 185.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-02-200ml',
            medicine_id: 'med-02',
            variant_name: '200 ML Bottle',
            package_size: 200,
            package_unit: 'ML',
            display_label: '200 ML',
            packing: '200 ML',
            pts_rate: 36.80,
            ptr_rate: 46.00,
            mrp: 185.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-03',
        name: 'AHTYME',
        code: 'AHT-003',
        product_code: 'AHT-003',
        sku: 'AHT-003',
        category: 'Liquid / Syrup',
        composition: 'Fungal Diastase & Pepsin Digestive Enzyme Syrup 200ml',
        unit: '200 ML',
        packing: '200 ML',
        base_price: 36.80,
        pts: 36.80,
        pts_rate: 36.80,
        ptr: 46.00,
        ptr_rate: 46.00,
        mrp: 184.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-03-200ml',
            medicine_id: 'med-03',
            variant_name: '200 ML Bottle',
            package_size: 200,
            package_unit: 'ML',
            display_label: '200 ML',
            packing: '200 ML',
            pts_rate: 36.80,
            ptr_rate: 46.00,
            mrp: 184.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-04',
        name: 'ATHRIMOX CV 625',
        code: 'AHT-004',
        product_code: 'AHT-004',
        sku: 'AHT-004',
        category: 'Tablet / Antibiotic',
        composition: 'Amoxicillin 500mg + Potassium Clavulanate 125mg Tablets',
        unit: '10*1*10',
        packing: '10*1*10',
        base_price: 68.00,
        pts: 68.00,
        pts_rate: 68.00,
        ptr: 85.00,
        ptr_rate: 85.00,
        mrp: 182.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-04-10x1x10',
            medicine_id: 'med-04',
            variant_name: '10*1*10 Strip Box',
            package_size: 10,
            package_unit: 'strips',
            display_label: '10*1*10',
            packing: '10*1*10',
            pts_rate: 68.00,
            ptr_rate: 85.00,
            mrp: 182.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-05',
        name: 'AHTRI-P',
        code: 'AHT-005',
        product_code: 'AHT-005',
        sku: 'AHT-005',
        category: 'Tablet / Analgesic',
        composition: 'Aceclofenac 100mg + Paracetamol 325mg Tablets',
        unit: '20*10',
        packing: '20*10',
        base_price: 12.00,
        pts: 12.00,
        pts_rate: 12.00,
        ptr: 15.00,
        ptr_rate: 15.00,
        mrp: 84.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-05-20x10',
            medicine_id: 'med-05',
            variant_name: '20*10 Tablets',
            package_size: 20,
            package_unit: 'strips',
            display_label: '20*10',
            packing: '20*10',
            pts_rate: 12.00,
            ptr_rate: 15.00,
            mrp: 84.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-06',
        name: 'TRIPAN DSR',
        code: 'AHT-006',
        product_code: 'AHT-006',
        sku: 'AHT-006',
        category: 'Capsule / Gastro',
        composition: 'Pantoprazole Sodium 40mg + Domperidone 30mg SR Capsules',
        unit: '10*10',
        packing: '10*10',
        base_price: 20.80,
        pts: 20.80,
        pts_rate: 20.80,
        ptr: 26.00,
        ptr_rate: 26.00,
        mrp: 138.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-06-10x10',
            medicine_id: 'med-06',
            variant_name: '10*10 Capsule Strip Box',
            package_size: 10,
            package_unit: 'strips',
            display_label: '10*10',
            packing: '10*10',
            pts_rate: 20.80,
            ptr_rate: 26.00,
            mrp: 138.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-07',
        name: 'AHTRI SP',
        code: 'AHT-007',
        product_code: 'AHT-007',
        sku: 'AHT-007',
        category: 'Tablet / NSAID',
        composition: 'Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg Tablets',
        unit: '10*10',
        packing: '10*10',
        base_price: 19.80,
        pts: 19.80,
        pts_rate: 19.80,
        ptr: 25.00,
        ptr_rate: 25.00,
        mrp: 120.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-07-10x10',
            medicine_id: 'med-07',
            variant_name: '10*10 Strip Box',
            package_size: 10,
            package_unit: 'strips',
            display_label: '10*10',
            packing: '10*10',
            pts_rate: 19.80,
            ptr_rate: 25.00,
            mrp: 120.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-08',
        name: 'TRIZOLE OC',
        code: 'AHT-008',
        product_code: 'AHT-008',
        sku: 'AHT-008',
        category: 'Ointment / Topical',
        composition: 'Ofloxacin, Ornidazole, Itraconazole & Clobetasol Propionate Cream 30g',
        unit: '30 GM',
        packing: '30 GM',
        base_price: 37.80,
        pts: 37.80,
        pts_rate: 37.80,
        ptr: 46.00,
        ptr_rate: 46.00,
        mrp: 95.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-08-30gm',
            medicine_id: 'med-08',
            variant_name: '30 GM Tube',
            package_size: 30,
            package_unit: 'GM',
            display_label: '30 GM',
            packing: '30 GM',
            pts_rate: 37.80,
            ptr_rate: 46.00,
            mrp: 95.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-09',
        name: 'TRIZOLE 200',
        code: 'AHT-009',
        product_code: 'AHT-009',
        sku: 'AHT-009',
        category: 'Capsule / Antifungal',
        composition: 'Itraconazole 200mg Capsules',
        unit: '10*10',
        packing: '10*10',
        base_price: 64.20,
        pts: 64.20,
        pts_rate: 64.20,
        ptr: 77.00,
        ptr_rate: 77.00,
        mrp: 245.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-09-10x10',
            medicine_id: 'med-09',
            variant_name: '10*10 Strip Box',
            package_size: 10,
            package_unit: 'strips',
            display_label: '10*10',
            packing: '10*10',
            pts_rate: 64.20,
            ptr_rate: 77.00,
            mrp: 245.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-10',
        name: 'AHTRI K27',
        code: 'AHT-010',
        product_code: 'AHT-010',
        sku: 'AHT-010',
        category: 'Tablet / Supplement',
        composition: 'Calcium Carbonate, Calcitriol & Vitamin K2-7 Softgel Tablets',
        unit: '10*1*10',
        packing: '10*1*10',
        base_price: 38.20,
        pts: 38.20,
        pts_rate: 38.20,
        ptr: 46.00,
        ptr_rate: 46.00,
        mrp: 285.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-10-10x1x10',
            medicine_id: 'med-10',
            variant_name: '10*1*10 Strip Box',
            package_size: 10,
            package_unit: 'strips',
            display_label: '10*1*10',
            packing: '10*1*10',
            pts_rate: 38.20,
            ptr_rate: 46.00,
            mrp: 285.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-11',
        name: 'TRIDIC GEL',
        code: 'AHT-011',
        product_code: 'AHT-011',
        sku: 'AHT-011',
        category: 'Gel / Topical',
        composition: 'Diclofenac Diethylamine, Virgin Linseed Oil, Methyl Salicylate & Menthol Gel 30g',
        unit: '30 GM',
        packing: '30 GM',
        base_price: 55.20,
        pts: 55.20,
        pts_rate: 55.20,
        ptr: 62.00,
        ptr_rate: 62.00,
        mrp: 110.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-11-30gm',
            medicine_id: 'med-11',
            variant_name: '30 GM Tube',
            package_size: 30,
            package_unit: 'GM',
            display_label: '30 GM',
            packing: '30 GM',
            pts_rate: 55.20,
            ptr_rate: 62.00,
            mrp: 110.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-12',
        name: 'AHTRI STRETCH MARK CREAM',
        code: 'AHT-012',
        product_code: 'AHT-012',
        sku: 'AHT-012',
        category: 'Cream / Skincare',
        composition: 'Advanced Anti-Stretch Mark & Skin Repair Cream 50g',
        unit: '50 GM',
        packing: '50 GM',
        base_price: 357.37,
        pts: 357.37,
        pts_rate: 357.37,
        ptr: 400.00,
        ptr_rate: 400.00,
        mrp: 599.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-12-50gm',
            medicine_id: 'med-12',
            variant_name: '50 GM Tube',
            package_size: 50,
            package_unit: 'GM',
            display_label: '50 GM',
            packing: '50 GM',
            pts_rate: 357.37,
            ptr_rate: 400.00,
            mrp: 599.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-13',
        name: 'AHTRI 5G SYP',
        code: 'AHT-013',
        product_code: 'AHT-013',
        sku: 'AHT-013',
        category: 'Syrup / Tonic',
        composition: 'Ginseng, Ginkgo Biloba, Green Tea, Grape Seed & Ginger Extract Syrup 200ml',
        unit: '200 ML',
        packing: '200 ML',
        base_price: 157.00,
        pts: 157.00,
        pts_rate: 157.00,
        ptr: 175.84,
        ptr_rate: 175.84,
        mrp: 235.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-13-200ml',
            medicine_id: 'med-13',
            variant_name: '200 ML Bottle',
            package_size: 200,
            package_unit: 'ML',
            display_label: '200 ML',
            packing: '200 ML',
            pts_rate: 157.00,
            ptr_rate: 175.84,
            mrp: 235.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-14',
        name: 'TRIRAB DSR',
        code: 'AHT-014',
        product_code: 'AHT-014',
        sku: 'AHT-014',
        category: 'Capsule / Gastro',
        composition: 'Rabeprazole Sodium 20mg + Domperidone 30mg SR Capsules',
        unit: '10*10',
        packing: '10*10',
        base_price: 80.46,
        pts: 80.46,
        pts_rate: 80.46,
        ptr: 89.60,
        ptr_rate: 89.60,
        mrp: 120.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-14-10x10',
            medicine_id: 'med-14',
            variant_name: '10*10 Capsule Strip Box',
            package_size: 10,
            package_unit: 'strips',
            display_label: '10*10',
            packing: '10*10',
            pts_rate: 80.46,
            ptr_rate: 89.60,
            mrp: 120.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-15',
        name: 'AHTRIMOX CV SUSPENSION',
        code: 'AHT-015',
        product_code: 'AHT-015',
        sku: 'AHT-015',
        category: 'Suspension / Paediatric',
        composition: 'Amoxicillin 200mg + Potassium Clavulanate 28.5mg Oral Suspension with Sterile Water 30ml',
        unit: '30 ML',
        packing: '30 ML',
        base_price: 42.00,
        pts: 42.00,
        pts_rate: 42.00,
        ptr: 47.00,
        ptr_rate: 47.00,
        mrp: 65.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-15-30ml',
            medicine_id: 'med-15',
            variant_name: '30 ML Bottle',
            package_size: 30,
            package_unit: 'ML',
            display_label: '30 ML',
            packing: '30 ML',
            pts_rate: 42.00,
            ptr_rate: 47.00,
            mrp: 65.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-16',
        name: 'MAFTRI P',
        code: 'AHT-016',
        product_code: 'AHT-016',
        sku: 'AHT-016',
        category: 'Suspension / Paediatric',
        composition: 'Mefenamic Acid 50mg + Paracetamol 125mg Suspension 60ml',
        unit: '60 ML',
        packing: '60 ML',
        base_price: 63.70,
        pts: 63.70,
        pts_rate: 63.70,
        ptr: 72.00,
        ptr_rate: 72.00,
        mrp: 95.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-16-60ml',
            medicine_id: 'med-16',
            variant_name: '60 ML Bottle',
            package_size: 60,
            package_unit: 'ML',
            display_label: '60 ML',
            packing: '60 ML',
            pts_rate: 63.70,
            ptr_rate: 72.00,
            mrp: 95.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'med-17',
        name: 'AHTRI 9G',
        code: 'AHT-017',
        product_code: 'AHT-017',
        sku: 'AHT-017',
        category: 'Syrup / Tonic',
        composition: 'Advanced 9G Herbal Vitality & Immunity Booster Syrup 200ml',
        unit: '200 ML',
        packing: '200 ML',
        base_price: 147.50,
        pts: 147.50,
        pts_rate: 147.50,
        ptr: 164.00,
        ptr_rate: 164.00,
        mrp: 220.00,
        status: 'ACTIVE',
        is_active: true,
        low_stock_threshold: 15,
        created_at: new Date().toISOString(),
        packaging_variants: [
          {
            id: 'var-med-17-200ml',
            medicine_id: 'med-17',
            variant_name: '200 ML Bottle',
            package_size: 200,
            package_unit: 'ML',
            display_label: '200 ML',
            packing: '200 ML',
            pts_rate: 147.50,
            ptr_rate: 164.00,
            mrp: 220.00,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];

    this.medicines = seedMedicinesList;
    this.medicinePackagingVariants = seedMedicinesList.flatMap((m) => m.packaging_variants || []).map((v: any) => ({
      ...v,
      size: v.size ?? v.package_size,
      package_size: v.package_size ?? v.size,
      unit: v.unit ?? v.package_unit,
      package_unit: v.package_unit ?? v.unit,
      display_name: v.display_name ?? v.display_label ?? v.variant_name,
      display_label: v.display_label ?? v.display_name ?? v.variant_name,
      variant_name: v.variant_name ?? v.display_label ?? v.display_name,
      status: v.status || (v.is_active !== false ? 'ACTIVE' : 'INACTIVE'),
      is_active: v.is_active !== undefined ? v.is_active : v.status === 'ACTIVE',
    }));

    // 14. Stocker Inventory - Baseline Inventory Records for every Stocker & Listed Medicine (Always defaults to 0)
    if (this.stockerInventory.length === 0) {
      for (const stk of this.stockers) {
        for (const med of this.medicines) {
          const variant = med.packaging_variants?.[0];
          this.stockerInventory.push({
            id: `inv-${stk.id}-${med.id}`,
            hq_id: stk.hq_id,
            stocker_id: stk.id,
            medicine_id: med.id,
            variant_id: variant?.id,
            packaging_display: med.packing || med.unit,
            quantity: 0,
            low_stock_threshold: 15,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }
}
