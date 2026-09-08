import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { BadRequestException } from '@nestjs/common';

describe('Tasks & 20m Geofence (Node 4 DoD Verification)', () => {
  let service: TasksService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [TasksService],
    }).compile();

    service = module.get<TasksService>(TasksService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should create task and record assignment history', async () => {
    const task = await service.createTask(
      {
        title: 'New Clinic Detailing',
        assigned_mr_id: 'usr-mr-01',
        date: '2026-09-06',
        time: '14:00:00',
        latitude: 28.5245,
        longitude: 77.2066,
        geofence_radius_m: 20,
      },
      'usr-mgr-01',
    );

    expect(task.id).toBeDefined();
    expect(task.geofence_radius_m).toBe(20);

    const assignment = db.taskAssignments.find((ta) => ta.task_id === task.id);
    expect(assignment).toBeDefined();
    expect(assignment?.mr_id).toBe('usr-mr-01');
  });

  it('should allow startTask when within 20m radius and log verification', async () => {
    // Task 1 coordinates: (28.5245, 77.2066)
    // Within ~5 meters: (28.52454, 77.20662)
    const res = await service.startTask('task-01', 'usr-mr-01', {
      latitude: 28.52454,
      longitude: 77.20662,
      gps_accuracy_m: 12,
    });

    expect(res.task.status).toBe('IN_PROGRESS');
    expect(res.verification.verified).toBe(true);
    expect(res.verification.distance_m).toBeLessThanOrEqual(20);

    // Verify audit log has the verification record
    const record = db.locationVerifications.find((lv) => lv.task_id === 'task-01');
    expect(record).toBeDefined();
    expect(record?.verified).toBe(true);
  });

  it('should reject startTask when distance > 20m and record unverified attempt', async () => {
    // Over 1km away: (28.5400, 77.2200)
    await expect(
      service.startTask('task-01', 'usr-mr-01', {
        latitude: 28.54,
        longitude: 77.22,
        gps_accuracy_m: 15,
      }),
    ).rejects.toThrow(BadRequestException);

    // Crucial PRD requirement: rejected attempt MUST be stored in location_verifications for audit!
    const failedLog = db.locationVerifications.find(
      (lv) => lv.task_id === 'task-01' && lv.verified === false,
    );
    expect(failedLog).toBeDefined();
    expect(failedLog?.distance_m).toBeGreaterThan(20);
  });

  it('should reject startTask when GPS accuracy is poor (>50m)', async () => {
    // Coordinates match exactly, but GPS accuracy is 65m (>50m threshold)
    await expect(
      service.startTask('task-01', 'usr-mr-01', {
        latitude: 28.5245,
        longitude: 77.2066,
        gps_accuracy_m: 65,
      }),
    ).rejects.toThrow(BadRequestException);

    const log = db.locationVerifications.find(
      (lv) => lv.task_id === 'task-01' && lv.gps_accuracy_m === 65,
    );
    expect(log).toBeDefined();
    expect(log?.verified).toBe(false);
  });

  it('should track secret meeting duration and capture immediate orders without signature', async () => {
    // Start task on-site
    await service.startTask('task-01', 'usr-mr-01', {
      latitude: 28.5245,
      longitude: 77.2066,
      gps_accuracy_m: 10,
    });

    const taskBefore = db.tasks.find((t) => t.id === 'task-01');
    expect(taskBefore?.started_at).toBeDefined();

    // Complete task on-site with outcome and immediate orders
    const res = await service.completeTask('task-01', 'usr-mr-01', {
      latitude: 28.5245,
      longitude: 77.2066,
      gps_accuracy_m: 10,
      outcome: 'Doctor agreed to prescribe CardioFix-50 for 20 new patients.',
      orders: [
        { product_name: 'CardioFix-50', quantity: 25, unit_price: 180, total_amount: 4500 },
      ],
    });

    expect(res.task.status).toBe('COMPLETED');
    expect(res.task.completed_at).toBeDefined();
    expect(res.task.duration_seconds).toBeGreaterThanOrEqual(1);
    expect(res.task.outcome).toContain('CardioFix-50');
    expect(res.task.orders?.length).toBe(1);

    // Verify secret duration is visible to Owner/Admin
    const adminTasks = await service.getAdminTasks({ mr_id: 'usr-mr-01' });
    const completedAdminTask = adminTasks.find((t) => t.id === 'task-01');
    expect(completedAdminTask?.duration_seconds).toBeDefined();
    expect(completedAdminTask?.orders?.[0].product_name).toBe('CardioFix-50');

    // Verify secret duration is HIDDEN from MR's personal view
    const myTasks = await service.getMyTasks('usr-mr-01');
    const myCompletedTask = myTasks.find((t) => t.id === 'task-01');
    expect((myCompletedTask as any)?.duration_seconds).toBeUndefined();
  });
});
