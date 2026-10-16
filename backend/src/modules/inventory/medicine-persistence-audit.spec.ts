import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.module';
import { OrdersService } from '../orders/orders.service';
import { TasksService } from '../tasks/tasks.service';
import { AttendanceService } from '../attendance/attendance.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Medicine Persistence, Adjust Mode & Comprehensive Audit Verification', () => {
  let inventoryService: InventoryService;
  let tasksService: TasksService;
  let attendanceService: AttendanceService;
  let db: DatabaseService;

  const adminUserId = 'usr-admin-01';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        InventoryService,
        OrdersService,
        NotificationsService,
        TasksService,
        AttendanceService,
      ],
    }).compile();

    inventoryService = module.get<InventoryService>(InventoryService);
    tasksService = module.get<TasksService>(TasksService);
    attendanceService = module.get<AttendanceService>(AttendanceService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  describe('1. Medicine Creation, Editing, and Deletion Persistence', () => {
    it('should create a new medicine and initialize inventory records across stockers', async () => {
      const uniqueCode = `TEST-MED-${Date.now().toString().slice(-4)}`;
      const created = await inventoryService.createMedicine({
        name: 'Audit Test Syringe',
        code: uniqueCode,
        packing: '100 ML',
        unit: '100 ML',
        pts_rate: 45.5,
        ptr_rate: 55.0,
        mrp: 90.0,
        low_stock_threshold: 20,
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Audit Test Syringe');
      expect(created.code).toBe(uniqueCode);
      expect(created.is_active).toBe(true);

      // Verify in-memory database store
      const found = db.medicines.find((m) => m.id === created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Audit Test Syringe');

      // Verify stock records initialized for each stocker
      const invRecords = db.stockerInventory.filter((inv) => inv.medicine_id === created.id);
      expect(invRecords.length).toBe(db.stockers.length);
      expect(invRecords.every((inv) => inv.quantity === 0)).toBe(true);
    });

    it('should update medicine fields in Adjust/Edit Mode and preserve updated values', async () => {
      const med = db.medicines[0];
      const origName = med.name;
      const origPts = med.pts_rate;

      const updated = await inventoryService.updateMedicine(med.id, {
        name: `${origName} (Adjusted Formulation)`,
        pts_rate: 99.5,
        ptr_rate: 120.0,
        mrp: 250.0,
        low_stock_threshold: 25,
      });

      expect(updated.name).toBe(`${origName} (Adjusted Formulation)`);
      expect(updated.pts_rate).toBe(99.5);
      expect(updated.base_price).toBe(99.5);
      expect(updated.mrp).toBe(250.0);
      expect(updated.low_stock_threshold).toBe(25);

      // Verify db updated state
      const refreshed = db.medicines.find((m) => m.id === med.id);
      expect(refreshed?.pts_rate).toBe(99.5);
    });

    it('should prevent duplicate SKU codes during edit to protect database integrity', async () => {
      const med1 = db.medicines[0];
      const med2 = db.medicines[1];

      await expect(
        inventoryService.updateMedicine(med2.id, {
          code: med1.code,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete a medicine and permanently remove related inventory', async () => {
      const created = await inventoryService.createMedicine({
        name: 'Medicine To Delete',
        code: `DEL-TEST-${Date.now().toString().slice(-4)}`,
        packing: '50 ML',
        pts_rate: 10,
      });

      const medId = created.id;
      expect(db.medicines.some((m) => m.id === medId)).toBe(true);

      const deleteRes = await inventoryService.deleteMedicine(medId);
      expect(deleteRes.success).toBe(true);

      // Ensure completely purged from memory and inventory
      expect(db.medicines.some((m) => m.id === medId)).toBe(false);
      expect(db.stockerInventory.some((inv) => inv.medicine_id === medId)).toBe(false);
    });

    it('should ensure deleted medicines do not reappear after reloading from disk/seed', async () => {
      // Create temporary medicine
      const uniqueCode = `GHOST-MED-${Date.now().toString().slice(-4)}`;
      const created = await inventoryService.createMedicine({
        name: 'Ghost Medicine Check',
        code: uniqueCode,
        packing: '10 ML',
      });
      const medId = created.id;

      // Delete it
      await inventoryService.deleteMedicine(medId);
      expect(db.medicines.some((m) => m.id === medId)).toBe(false);

      // Simulate container restart / reload
      db.loadFromDisk();
      expect(db.medicines.some((m) => m.id === medId)).toBe(false);

      // Ensure dummy medicines 'dd' and 'ss' do not exist
      expect(db.medicines.some((m) => m.name.toLowerCase() === 'dd')).toBe(false);
      expect(db.medicines.some((m) => m.name.toLowerCase() === 'ss')).toBe(false);
    });
  });

  describe('2. Adjust Mode Stock Adjustment & Audit Logging', () => {
    it('should set exact target stock quantity when mode is SET', async () => {
      const stocker = db.stockers[0];
      const med = db.medicines[0];

      // Set stock to 65 units
      const res = await inventoryService.adjustStock(
        stocker.id,
        {
          medicine_id: med.id,
          quantity: 65,
          new_quantity: 65,
          mode: 'SET',
          transaction_type: 'ADJUSTMENT',
          reason: 'Physical count adjustment',
        },
        adminUserId,
      );

      expect(res.current_quantity).toBe(65);
      expect(res.inventory.quantity).toBe(65);
      expect(res.transaction.balance_after).toBe(65);

      // Read back via getStockerInventory
      const inventoryList = await inventoryService.getStockerInventory(stocker.id);
      const item = inventoryList.find((i) => i.medicine_id === med.id);
      expect(item?.quantity).toBe(65);
    });

    it('should support relative delta adjustments when adding or deducting stock', async () => {
      const stocker = db.stockers[0];
      const med = db.medicines[1];

      // Step 1: Initial set
      await inventoryService.adjustStock(
        stocker.id,
        {
          medicine_id: med.id,
          quantity: 50,
          new_quantity: 50,
          mode: 'SET',
          transaction_type: 'RESTOCK',
        },
        adminUserId,
      );

      // Step 2: Inward delta (+25)
      const inwardRes = await inventoryService.adjustStock(
        stocker.id,
        {
          medicine_id: med.id,
          quantity: 25,
          mode: 'DELTA',
          transaction_type: 'RESTOCK',
          reason: 'Incoming delivery',
        },
        adminUserId,
      );
      expect(inwardRes.current_quantity).toBe(75);

      // Step 3: Deduction delta (-10)
      const deductRes = await inventoryService.adjustStock(
        stocker.id,
        {
          medicine_id: med.id,
          quantity: -10,
          mode: 'DELTA',
          transaction_type: 'ADJUSTMENT',
          reason: 'Damaged vial disposal',
        },
        adminUserId,
      );
      expect(deductRes.current_quantity).toBe(65);
    });
  });

  describe('3. Monthly TP Rate & Attendance Settings Persistence', () => {
    it('should update and preserve reimbursement rate without reverting to default', async () => {
      const updated = await attendanceService.updateSettings({
        reimbursement_rate_per_km: 3.75,
        expected_punch_in_time: '09:00:00',
        expected_punch_out_time: '18:30:00',
      });

      expect(updated.reimbursement_rate_per_km).toBe(3.75);
      expect(updated.expected_punch_in_time).toBe('09:00:00');
      expect(db.attendanceSettings.reimbursement_rate_per_km).toBe(3.75);

      // Verify retrieval returns updated configuration
      const current = await attendanceService.getSettings();
      expect(current.reimbursement_rate_per_km).toBe(3.75);
    });
  });

  describe('4. Task / Lead Creation & Assignment Flow', () => {
    it('should create and update a field task with geofencing and assigned MR', async () => {
      const task = await tasksService.createTask(
        {
          title: 'Dr. Sharma Detailing Call',
          description: 'Introduce AHTRI-S & ATHRIMOX CV 625',
          assigned_mr_id: 'usr-mr-02',
          date: '2026-10-20',
          time: '11:00:00',
          location_name: 'Sharma Clinic, Shahdol',
          latitude: 23.288,
          longitude: 81.352,
          geofence_radius_m: 100,
          priority: 'HIGH',
        },
        adminUserId,
      );

      expect(task.id).toBeDefined();
      expect(task.assigned_mr_id).toBe('usr-mr-02');
      expect(task.status).toBe('ASSIGNED');

      // Update task destination / timing
      const updatedTask = await tasksService.updateTask(task.id, {
        time: '11:30:00',
        priority: 'MEDIUM',
      });

      expect(updatedTask.time).toBe('11:30:00');
      expect(updatedTask.priority).toBe('MEDIUM');
    });
  });
});
