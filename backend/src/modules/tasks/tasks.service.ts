import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { distanceMeters } from '../../common/geofence.util';
import {
  CreateTaskDto,
  VerifyLocationDto,
  UpdateTaskDto,
  SkipOrderDto,
  SubmitOrderDto,
} from './dto/tasks.dto';
import {
  Task,
  TaskAssignment,
  LocationVerification,
  VerificationPhoto,
} from '../../database/database.types';
import { NotificationsService } from '../notifications/notifications.module';
import { InventoryService } from '../inventory/inventory.service';

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Auto-Suspension Rule (§Owner Requirement):
   * If a task was assigned and 1 day passes without the MR completing it (date < today in local calendar),
   * the task is automatically SUSPENDED. Only the Owner can unsuspend it.
   */
  checkAndSuspendOverdueTasks() {
    const today = getLocalDateString(new Date());
    for (const task of this.db.tasks) {
      if (!task.deleted_at && (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' || task.status === 'ORDER_PENDING')) {
        if (task.date < today) {
          task.status = 'SUSPENDED';
          task.suspended_at = task.suspended_at || new Date().toISOString();
          task.suspended_reason = '1 day expired without MR visit completion. Suspended until Owner unsuspends.';
        }
      }
    }
  }

  async createTask(dto: CreateTaskDto, createdBy: string) {
    let mr = this.db.users.find(
      (u) =>
        (u.id === dto.assigned_mr_id ||
          u.name.toLowerCase() === (dto.assigned_mr_id || '').toLowerCase()) &&
        u.role === 'MR' &&
        !u.deleted_at,
    );
    if (!mr) {
      mr = this.db.users.find((u) => u.role === 'MR' && !u.deleted_at);
    }
    if (!mr) throw new NotFoundException(`No active Field MR found in system`);

    const task: Task = {
      id: `task-${uuidv4().substring(0, 8)}`,
      title: dto.title,
      description: dto.description || '',
      assigned_mr_id: mr.id,
      created_by: createdBy,
      date: dto.date,
      time: dto.time,
      latitude: dto.latitude,
      longitude: dto.longitude,
      location_name: dto.location_name || '',
      geofence_radius_m: dto.geofence_radius_m || 20, // Default 20m per PRD §9-12
      priority: dto.priority || 'MEDIUM',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    this.db.tasks.push(task);
    this.db.taskAssignments.push({
      id: `ta-${uuidv4().substring(0, 8)}`,
      task_id: task.id,
      mr_id: mr.id,
      assigned_at: new Date().toISOString(),
    });

    // Send high-priority remote push notification to MR's phone (WhatsApp-style)
    this.notificationsService.sendPushNotification(
      mr.id,
      '📋 New Task Assigned',
      `New visit: ${task.location_name || task.title} scheduled at ${task.time || 'Today'}`,
      { taskId: task.id, type: 'TASK_ASSIGNED' },
    );

    return {
      ...task,
      assigned_mr_name: mr.name,
    };
  }

  async getMyTasks(mrId: string, date?: string) {
    this.checkAndSuspendOverdueTasks();
    return this.db.tasks
      .filter((t) => !t.deleted_at && t.assigned_mr_id === mrId)
      .filter((t) => (date ? t.date === date : true))
      .sort((a, b) => a.time.localeCompare(b.time))
      // Secret meeting duration: Strip duration_seconds from MR payload
      .map(({ duration_seconds, ...sanitizedTask }) => sanitizedTask);
  }

  async getTaskById(id: string) {
    this.checkAndSuspendOverdueTasks();
    const task = this.db.tasks.find((t) => t.id === id && !t.deleted_at);
    if (!task) throw new NotFoundException('Task not found');
    const assignments = this.db.taskAssignments.filter((ta) => ta.task_id === id);
    const verifications = this.db.locationVerifications.filter((lv) => lv.task_id === id);
    const photos = this.db.verificationPhotos.filter((vp) => vp.task_id === id);
    return { ...task, assignments, verifications, photos };
  }

  async startTask(id: string, userId: string, dto: VerifyLocationDto) {
    this.checkAndSuspendOverdueTasks();
    const task = this.db.tasks.find((t) => t.id === id && !t.deleted_at);
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'This task has been suspended because 1 day passed without a visit. Contact Owner (Shivansh Tiwari) to unsuspend this task before you can start.',
      );
    }

    // === ANTI-MOCK & DEVICE INTEGRITY VALIDATION (§4) ===
    if (dto.is_mocked) {
      throw new BadRequestException(
        'Mock / fake GPS location detected on device. Location verification rejected.',
      );
    }
    if (dto.developer_mode) {
      throw new BadRequestException(
        'Developer Mode is enabled on this device. Please disable it before using location-based task verification.',
      );
    }

    const callingUser = this.db.users.find((u) => u.id === userId);
    const isManagerOrAdmin = callingUser && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(callingUser.role);
    if (task.assigned_mr_id !== userId && !isManagerOrAdmin) {
      console.warn(`[Tasks] User ${userId} starting task assigned to ${task.assigned_mr_id}`);
    }

    // 1. Calculate distance server-side using Haversine formula
    const distance_m = distanceMeters(dto.latitude, dto.longitude, task.latitude, task.longitude);
    const baseRadius = Math.max(task.geofence_radius_m || 50, 100);
    const effectiveRadius = baseRadius + Math.min(dto.gps_accuracy_m || 10, 60);

    const isDistanceVerified = distance_m <= effectiveRadius;
    const isGpsAccurate = (dto.gps_accuracy_m || 10) <= 50;
    const verified = isDistanceVerified && isGpsAccurate;

    // 2. Log attempt into location_verifications (accepted or rejected) for manager audit
    const verificationRecord: LocationVerification = {
      id: `lv-${uuidv4().substring(0, 8)}`,
      task_id: task.id,
      type: 'START',
      user_id: userId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      distance_m,
      gps_accuracy_m: dto.gps_accuracy_m,
      verified,
      created_at: new Date().toISOString(),
    };
    this.db.locationVerifications.push(verificationRecord);

    // Record photo verification if supplied (§3)
    if (dto.photo_key) {
      const photoRecord: VerificationPhoto = {
        id: `vp-${uuidv4().substring(0, 8)}`,
        user_id: userId,
        task_id: task.id,
        hq_id: dto.hq_id || task.hq_id,
        photo_key: dto.photo_key,
        photo_source: dto.photo_source || 'CAMERA',
        latitude: dto.latitude,
        longitude: dto.longitude,
        gps_accuracy_m: dto.gps_accuracy_m,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      this.db.verificationPhotos.push(photoRecord);
      task.verification_photo_key = dto.photo_key;
      task.verification_photo_source = dto.photo_source || 'CAMERA';
    }

    // 3. Reject if outside geofence or inaccurate
    if (!isGpsAccurate) {
      throw new BadRequestException(
        `GPS accuracy insufficient (${dto.gps_accuracy_m}m). Must be <= 50m to verify on-site presence.`,
      );
    }
    if (!isDistanceVerified) {
      throw new BadRequestException(
        `Geofence verification failed. You are ${distance_m}m away from destination (allowed: <= ${Math.round(effectiveRadius)}m).`,
      );
    }

    task.status = 'IN_PROGRESS';
    task.started_at = new Date().toISOString();
    task.device_integrity_status = 'VERIFIED';
    return {
      message: 'Task started successfully within geofence',
      task,
      verification: verificationRecord,
    };
  }

  /**
   * SKIP ORDER FOR NOW FLOW (§2)
   * The MR starts/conducts the call and skips order entry for now.
   * Task enters status 'ORDER_PENDING'.
   */
  async skipOrder(id: string, userId: string, dto: SkipOrderDto) {
    this.checkAndSuspendOverdueTasks();
    const task = this.db.tasks.find((t) => t.id === id && !t.deleted_at);
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === 'SUSPENDED') {
      throw new ForbiddenException('Task is suspended. Only the Owner can unsuspend it.');
    }
    if (task.status === 'COMPLETED') {
      throw new BadRequestException('This task has already been completed.');
    }

    // Check anti-mock and developer mode (§4)
    if (dto.is_mocked) {
      throw new BadRequestException('Mock / fake GPS location detected on device.');
    }
    if (dto.developer_mode) {
      throw new BadRequestException('Developer Mode is enabled on this device.');
    }

    // Save verification photo if provided (§3)
    const photoData = dto.visit_photo || (dto.photo_key && (dto.photo_key.startsWith('data:') || dto.photo_key.startsWith('http')) ? dto.photo_key : undefined);
    if (photoData || dto.photo_key) {
      const photoRecord: VerificationPhoto = {
        id: `vp-${uuidv4().substring(0, 8)}`,
        user_id: userId,
        task_id: task.id,
        hq_id: dto.hq_id || task.hq_id,
        photo_key: dto.photo_key || 'visit_proof',
        photo_source: dto.photo_source || 'CAMERA',
        latitude: dto.latitude,
        longitude: dto.longitude,
        gps_accuracy_m: dto.gps_accuracy_m,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      this.db.verificationPhotos.push(photoRecord);
      task.verification_photo_key = dto.photo_key;
      task.verification_photo_source = dto.photo_source || 'CAMERA';
      if (photoData) {
        task.visit_photo = photoData;
        task.visit_photo_captured_at = new Date().toISOString();
      }
    }

    task.status = 'ORDER_PENDING';
    task.order_pending_at = new Date().toISOString();
    if (dto.outcome) {
      task.outcome = dto.outcome;
    }
    if (dto.hq_id) task.hq_id = dto.hq_id;
    if (dto.stocker_id) task.stocker_id = dto.stocker_id;

    // Calculate meeting duration so far
    const startTime = task.started_at ? new Date(task.started_at) : new Date(Date.now() - 20 * 60 * 1000);
    const nowTime = new Date();
    task.duration_seconds = Math.max(60, Math.round((nowTime.getTime() - startTime.getTime()) / 1000));

    // Notify managers
    const mr = this.db.users.find((u) => u.id === task.assigned_mr_id);
    const mrName = mr ? mr.name : 'Field Representative';

    const managers = this.db.users.filter(
      (u) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(u.role) && !u.deleted_at,
    );
    managers.forEach((m) => {
      this.notificationsService.sendPushNotification(
        m.id,
        '⏳ Order Pending for Visit',
        `${mrName} completed call at ${task.location_name || task.title}. Order entry skipped for now.`,
        { taskId: task.id, type: 'TASK_ORDER_PENDING' },
      );
    });

    return {
      message: 'Call activity saved with Order Pending. You can enter order details later this evening.',
      task,
    };
  }

  /**
   * LATER ORDER ENTRY / SUBMIT ORDER FOR PENDING TASK (§2)
   */
  async submitPendingOrder(id: string, userId: string, dto: SubmitOrderDto) {
    this.checkAndSuspendOverdueTasks();
    const task = this.db.tasks.find((t) => t.id === id && !t.deleted_at);
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === 'COMPLETED') {
      throw new BadRequestException('Order has already been submitted and task is completed. Duplicate submission prevented.');
    }

    if (dto.outcome) {
      task.outcome = dto.outcome;
    }
    const photoData = dto.visit_photo || (dto.photo_key && (dto.photo_key.startsWith('data:') || dto.photo_key.startsWith('http')) ? dto.photo_key : undefined);
    if (photoData) {
      task.visit_photo = photoData;
      task.visit_photo_captured_at = new Date().toISOString();
    }
    if (dto.hq_id) task.hq_id = dto.hq_id;
    if (dto.stocker_id) task.stocker_id = dto.stocker_id;

    const validOrders = (dto.orders || [])
      .filter((o) => (parseInt(o.quantity) || 0) > 0 && o.product_name?.trim()?.length > 0)
      .map((o) => ({
        product_id: o.product_id,
        product_name: o.product_name,
        quantity: parseInt(o.quantity) || 0,
        unit_price: parseFloat(o.unit_price) || 0,
        total_amount: (parseInt(o.quantity) || 0) * (parseFloat(o.unit_price) || 0),
        distributor: o.distributor || 'Central Stocker',
        stocker_id: dto.stocker_id || task.stocker_id,
      }));

    task.orders = validOrders;
    task.status = 'COMPLETED';
    task.completed_at = new Date().toISOString();

    // Deduct stock automatically from relevant stocker and HQ (§16 & §17)
    if (validOrders.length > 0) {
      const effectiveHqId = task.hq_id || dto.hq_id || 'hq-shahdol';
      const effectiveStockerId = task.stocker_id || dto.stocker_id || 'stk-shd-01';
      await this.inventoryService.deductStockForOrder(
        effectiveHqId,
        effectiveStockerId,
        validOrders,
        task.id,
        task.id,
        userId,
      );
    }

    // Notify managers
    const mr = this.db.users.find((u) => u.id === task.assigned_mr_id);
    const mrName = mr ? mr.name : 'Field Representative';

    const managers = this.db.users.filter(
      (u) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(u.role) && !u.deleted_at,
    );
    managers.forEach((m) => {
      this.notificationsService.sendPushNotification(
        m.id,
        '📦 Order Submitted & Duty Finalized',
        `${mrName} has entered orders for ${task.location_name || task.title} (${validOrders.length} items). Stock updated.`,
        { taskId: task.id, type: 'TASK_COMPLETED' },
      );
    });

    return {
      message: 'Order recorded and task completed successfully. Inventory updated.',
      task,
    };
  }

  async completeTask(id: string, userId: string, dto: VerifyLocationDto) {
    const task = this.db.tasks.find((t) => t.id === id && !t.deleted_at);
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === 'SUSPENDED') {
      throw new ForbiddenException('Task is suspended. Only the Owner can unsuspend it.');
    }
    if (task.status === 'COMPLETED') {
      throw new BadRequestException('This task has already been completed.');
    }

    // Check anti-mock and developer mode (§4)
    if (dto.is_mocked) {
      throw new BadRequestException('Mock / fake GPS location detected on device.');
    }
    if (dto.developer_mode) {
      throw new BadRequestException('Developer Mode is enabled on this device.');
    }

    // Allow completion if assigned MR or if an Admin/Manager oversees it
    const callingUser = this.db.users.find((u) => u.id === userId);
    const isManagerOrAdmin = callingUser && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(callingUser.role);
    if (task.assigned_mr_id !== userId && !isManagerOrAdmin) {
      console.warn(`[Tasks] User ${userId} completing task assigned to ${task.assigned_mr_id}`);
    }

    const lat = dto.latitude || task.latitude;
    const lng = dto.longitude || task.longitude;
    const distance_m = distanceMeters(lat, lng, task.latitude, task.longitude);
    const maxRadius = task.geofence_radius_m || 50;

    const isDistanceVerified = distance_m <= maxRadius || !!task.started_at;
    const isGpsAccurate = (dto.gps_accuracy_m || 10) <= 150;
    const verified = isDistanceVerified && isGpsAccurate;

    const verificationRecord: LocationVerification = {
      id: `lv-${uuidv4().substring(0, 8)}`,
      task_id: task.id,
      type: 'COMPLETE',
      user_id: userId,
      latitude: lat,
      longitude: lng,
      distance_m,
      gps_accuracy_m: dto.gps_accuracy_m || 10,
      verified,
      created_at: new Date().toISOString(),
    };
    this.db.locationVerifications.push(verificationRecord);

    // Save verification photo if provided (§3)
    const photoData = dto.visit_photo || (dto.photo_key && (dto.photo_key.startsWith('data:') || dto.photo_key.startsWith('http')) ? dto.photo_key : undefined);
    if (photoData || dto.photo_key) {
      const photoRecord: VerificationPhoto = {
        id: `vp-${uuidv4().substring(0, 8)}`,
        user_id: userId,
        task_id: task.id,
        hq_id: dto.hq_id || task.hq_id,
        photo_key: dto.photo_key || 'visit_proof',
        photo_source: dto.photo_source || 'CAMERA',
        latitude: lat,
        longitude: lng,
        gps_accuracy_m: dto.gps_accuracy_m || 10,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      this.db.verificationPhotos.push(photoRecord);
      task.verification_photo_key = dto.photo_key;
      task.verification_photo_source = dto.photo_source || 'CAMERA';
      if (photoData) {
        task.visit_photo = photoData;
        task.visit_photo_captured_at = new Date().toISOString();
      }
    }

    task.status = 'COMPLETED';
    task.completed_at = new Date().toISOString();

    // Calculate duration spent on-site / in meeting (in seconds)
    const startTime = task.started_at ? new Date(task.started_at) : new Date(Date.now() - 25 * 60 * 1000);
    const endTime = new Date(task.completed_at);
    task.duration_seconds = Math.max(60, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    if (dto.outcome) {
      task.outcome = dto.outcome;
    }
    if (dto.hq_id) task.hq_id = dto.hq_id;
    if (dto.stocker_id) task.stocker_id = dto.stocker_id;

    if (dto.orders && Array.isArray(dto.orders)) {
      task.orders = dto.orders;

      // Automatic Stock Deduction (§16 & §17)
      const effectiveHqId = task.hq_id || dto.hq_id || 'hq-shahdol';
      const effectiveStockerId = task.stocker_id || dto.stocker_id || 'stk-shd-01';
      await this.inventoryService.deductStockForOrder(
        effectiveHqId,
        effectiveStockerId,
        dto.orders,
        task.id,
        task.id,
        userId,
      );
    }

    // Trigger immediate manager / owner notifications
    const mr = this.db.users.find((u) => u.id === task.assigned_mr_id);
    const mrName = mr ? mr.name : 'Field Representative';

    const managers = this.db.users.filter(
      (u) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(u.role) && !u.deleted_at,
    );
    const targetManagers = managers.length > 0 ? managers : [{ id: 'usr-admin-01' }];

    targetManagers.forEach((m) => {
      this.db.notifications.unshift({
        id: `notif-${uuidv4().substring(0, 8)}`,
        user_id: m.id,
        title: `Duty Completed: ${task.location_name || task.title}`,
        body: `${mrName} has completed the call at ${task.location_name || 'Designated Location'}.${dto.outcome ? ` Feedback: "${dto.outcome.slice(0, 70)}"` : ''}`,
        type: 'TASK_COMPLETED' as any,
        data_json: {
          task_id: task.id,
          task_title: task.title,
          mr_name: mrName,
          location_name: task.location_name,
          outcome: dto.outcome || '',
          orders_count: dto.orders?.length || 0,
          completed_at: task.completed_at,
        },
        created_at: task.completed_at,
      });
    });

    return {
      message: 'Task completed successfully',
      task,
      verification: verificationRecord,
    };
  }


  async getRecentCompletions(limit = 10) {
    return this.db.tasks
      .filter((t) => !t.deleted_at && t.status === 'COMPLETED')
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
      .slice(0, limit)
      .map((t) => {
        const mr = this.db.users.find((u) => u.id === t.assigned_mr_id);
        return {
          ...t,
          assigned_mr_name: mr ? mr.name : 'Representative',
        };
      });
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = this.db.tasks.find((t) => t.id === id && !t.deleted_at);
    if (!task) throw new NotFoundException('Task not found');

    if (dto.title) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.date) task.date = dto.date;
    if (dto.time) task.time = dto.time;
    if (dto.status) task.status = dto.status;

    if (dto.assigned_mr_id && dto.assigned_mr_id !== task.assigned_mr_id) {
      task.assigned_mr_id = dto.assigned_mr_id;
      this.db.taskAssignments.push({
        id: `ta-${uuidv4().substring(0, 8)}`,
        task_id: task.id,
        mr_id: dto.assigned_mr_id,
        assigned_at: new Date().toISOString(),
      });
    }

    return task;
  }

  async unsuspendTask(id: string, userId: string, newDate?: string) {
    const task = this.db.tasks.find((t) => t.id === id && !t.deleted_at);
    if (!task) throw new NotFoundException('Task not found');

    if (task.status !== 'SUSPENDED') {
      throw new BadRequestException('Task is not currently suspended');
    }

    const today = getLocalDateString(new Date());
    task.status = 'ASSIGNED';
    task.date = newDate || today;
    task.unsuspended_at = new Date().toISOString();
    task.unsuspended_by = userId;

    const mr = this.db.users.find((u) => u.id === task.assigned_mr_id);

    return {
      message: 'Task successfully unsuspended by Owner. Representative can now execute the call.',
      task: {
        ...task,
        assigned_mr_name: mr ? mr.name : 'Representative',
      },
    };
  }

  async getAdminTasks(filter: { mr_id?: string; status?: string; startDate?: string; endDate?: string }) {
    this.checkAndSuspendOverdueTasks();
    return this.db.tasks
      .filter((t) => !t.deleted_at)
      .filter((t) => (filter.mr_id ? t.assigned_mr_id === filter.mr_id : true))
      .filter((t) => (filter.status ? t.status === filter.status : true))
      .filter((t) => (filter.startDate ? t.date >= filter.startDate : true))
      .filter((t) => (filter.endDate ? t.date <= filter.endDate : true))
      .map((t) => {
        const mr = this.db.users.find((u) => u.id === t.assigned_mr_id);
        return { ...t, assigned_mr_name: mr ? mr.name : 'Unknown' };
      });
  }
}
