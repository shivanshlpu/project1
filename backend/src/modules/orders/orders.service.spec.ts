import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Order, Task } from '../../database/database.types';

describe('OrdersService - Permanent Database Deletion & Authorization', () => {
  let service: OrdersService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, InventoryModule, NotificationsModule],
      providers: [OrdersService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    db = module.get<DatabaseService>(DatabaseService);
  });

  it('should prevent non-admin users from deleting an order', async () => {
    const testOrder: Order = {
      id: 'ord-test-del-1',
      order_number: 'ORD-TEST-001',
      mr_id: 'usr-mr-02',
      mr_name: 'Aman Rathore',
      customer_name: 'City Clinic',
      hq_id: 'hq-shahdol',
      hq_name: 'Shahdol',
      stocker_id: 'stk-shd-01',
      stocker_name: 'Tara Pharmacy',
      items: [],
      total_units: 5,
      total_amount: 500,
      delivery_status: 'DELIVERED',
      hq_accepted: false,
      inventory_deducted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.orders.push(testOrder);

    const nonAdminUser = { id: 'usr-mr-02', role: 'MR' };

    await expect(service.deleteOrder('ord-test-del-1', nonAdminUser)).rejects.toThrow(
      ForbiddenException,
    );

    // Verify order is still in db
    expect(db.orders.some((o) => o.id === 'ord-test-del-1')).toBe(true);
  });

  it('should allow Super Admin to permanently delete an order and unbind connected tasks so it cannot reappear', async () => {
    const testOrderId = 'ord-test-purge-100';
    const testTaskId = 'task-test-link-100';

    const testOrder: Order = {
      id: testOrderId,
      order_number: 'ORD-PURGE-100',
      task_id: testTaskId,
      mr_id: 'usr-mr-02',
      mr_name: 'Aman Rathore',
      customer_name: 'Apex Diagnostic',
      hq_id: 'hq-shahdol',
      hq_name: 'Shahdol',
      stocker_id: 'stk-shd-01',
      stocker_name: 'Tara Pharmacy',
      items: [{ product_id: 'med-1', product_name: 'Test Med', quantity: 2, unit_price: 100, total_amount: 200 } as any],
      total_units: 2,
      total_amount: 200,
      delivery_status: 'DELIVERED',
      hq_accepted: true,
      inventory_deducted: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const linkedTask: Task = {
      id: testTaskId,
      title: 'Order Visit',
      description: 'Clinic order detailing',
      assigned_mr_id: 'usr-mr-02',
      created_by: 'usr-admin-01',
      date: '2026-10-15',
      time: '10:00:00',
      latitude: 23.29,
      longitude: 81.35,
      geofence_radius_m: 50,
      priority: 'HIGH',
      status: 'COMPLETED',
      order_id: testOrderId,
      orders: testOrder.items,
      created_at: new Date().toISOString(),
    };

    db.orders.push(testOrder);
    db.tasks.push(linkedTask);

    const adminUser = { id: 'usr-admin-01', role: 'SUPER_ADMIN' };

    const result = await service.deleteOrder(testOrderId, adminUser);
    expect(result.success).toBe(true);
    expect(result.deleted_id).toBe(testOrderId);

    // 1. Order must be completely deleted from in-memory orders array
    expect(db.orders.some((o) => o.id === testOrderId)).toBe(false);

    // 2. Task reference must be severed so reconstruction logic cannot revive the order
    const updatedTask = db.tasks.find((t) => t.id === testTaskId);
    expect(updatedTask?.order_id).toBeUndefined();
    expect(updatedTask?.orders).toBeUndefined();
  });

  it('should throw NotFoundException if order does not exist', async () => {
    const adminUser = { id: 'usr-admin-01', role: 'ADMIN' };
    await expect(service.deleteOrder('non-existent-order-id', adminUser)).rejects.toThrow(
      NotFoundException,
    );
  });
});
