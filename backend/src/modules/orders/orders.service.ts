import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.module';
import { Order, OrderDeliveryStatus, Task } from '../../database/database.types';
import { CreateOrderDto, UpdateOrderDeliveryDto } from './orders.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly inventoryService: InventoryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private normalizeHq(hqId?: string): string {
    if (!hqId) return '';
    const clean = hqId.toLowerCase().trim();
    if (clean.includes('amb')) return 'hq-ambikapur';
    if (clean.includes('shd') || clean.includes('shahdol')) return 'hq-shahdol';
    if (clean.includes('bsp') || clean.includes('bilaspur')) return 'hq-bilaspur';
    if (clean.includes('ktm') || clean.includes('kotma')) return 'hq-kotma';
    return clean;
  }

  async getOrders(
    user: any,
    query?: {
      hq_id?: string;
      mr_id?: string;
      delivery_status?: string;
      hq_accepted?: string;
      task_id?: string;
    },
  ): Promise<Order[]> {
    let list = [...this.db.orders];

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);

    // Scoping Rule:
    // If not admin, the user can ONLY see orders for their assigned HQ (or their own created orders)
    // "only the HQ for which it was made can see it in their ID, not all HQs"
    if (!isAdmin) {
      const userHqNorm = this.normalizeHq(user?.hq_id);
      list = list.filter((ord) => {
        const ordHqNorm = this.normalizeHq(ord.hq_id);
        const matchesHq = userHqNorm && ordHqNorm && userHqNorm === ordHqNorm;
        const isCreator = ord.mr_id === user?.id;
        return matchesHq || isCreator;
      });
    }

    if (query?.hq_id && query.hq_id !== 'ALL') {
      const targetNorm = this.normalizeHq(query.hq_id);
      list = list.filter((o) => this.normalizeHq(o.hq_id) === targetNorm || o.hq_id === query.hq_id);
    }

    if (query?.mr_id && query.mr_id !== 'ALL') {
      list = list.filter((o) => o.mr_id === query.mr_id);
    }

    if (query?.delivery_status && query.delivery_status !== 'ALL') {
      list = list.filter((o) => o.delivery_status === query.delivery_status);
    }

    if (query?.hq_accepted !== undefined && query.hq_accepted !== 'ALL') {
      const isAccepted = query.hq_accepted === 'true';
      list = list.filter((o) => o.hq_accepted === isAccepted);
    }

    if (query?.task_id) {
      list = list.filter((o) => o.task_id === query.task_id);
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getOrderById(id: string, user: any): Promise<Order> {
    const order = this.db.orders.find((o) => o.id === id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
    if (!isAdmin) {
      const userHqNorm = this.normalizeHq(user?.hq_id);
      const ordHqNorm = this.normalizeHq(order.hq_id);
      const matchesHq = userHqNorm && ordHqNorm && userHqNorm === ordHqNorm;
      const isCreator = order.mr_id === user?.id;
      if (!matchesHq && !isCreator) {
        throw new ForbiddenException('You do not have access to view orders outside your HQ territory');
      }
    }

    return order;
  }

  async createOrder(dto: CreateOrderDto, user: any): Promise<Order> {
    const validItems = (dto.items || [])
      .filter((i) => Number(i.quantity) > 0 && i.product_name?.trim()?.length > 0)
      .map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name.trim(),
        quantity: Math.max(1, parseInt(String(i.quantity), 10) || 1),
        unit_price: parseFloat(String(i.unit_price || 0)) || 0,
        total_amount:
          (Math.max(1, parseInt(String(i.quantity), 10) || 1)) *
          (parseFloat(String(i.unit_price || 0)) || 0),
        distributor: i.distributor || 'Central Stocker',
      }));

    if (validItems.length === 0) {
      throw new BadRequestException('At least one valid item with positive quantity is required');
    }

    const effectiveHqId = dto.hq_id || user.hq_id || 'hq-shahdol';
    const hq = this.db.findHeadquarter ? this.db.findHeadquarter(effectiveHqId) : null;
    const hqName = hq?.name || 'HQ Zone';

    const stocker = dto.stocker_id
      ? this.db.stockers.find((s) => s.id === dto.stocker_id)
      : this.db.stockers.find((s) => this.normalizeHq(s.hq_id) === this.normalizeHq(effectiveHqId)) || this.db.stockers[0];

    const totalUnits = validItems.reduce((acc, i) => acc + i.quantity, 0);
    const totalAmount = validItems.reduce((acc, i) => acc + i.total_amount, 0);

    const orderNum = `ORD-${new Date().getFullYear()}-${String(this.db.orders.length + 1).padStart(4, '0')}`;

    const newOrder: Order = {
      id: `ord-${uuidv4().substring(0, 8)}`,
      order_number: orderNum,
      task_id: dto.task_id,
      mr_id: user.id,
      mr_name: user.name || 'Field Representative',
      customer_name: dto.customer_name.trim(),
      location_name: dto.location_name?.trim() || dto.customer_name.trim(),
      hq_id: effectiveHqId,
      hq_name: hqName,
      stocker_id: stocker?.id || 'stk-shd-01',
      stocker_name: stocker?.name || 'Central Stocker',
      items: validItems,
      total_units: totalUnits,
      total_amount: totalAmount,
      delivery_status: 'PENDING',
      hq_accepted: false,
      inventory_deducted: false, // Must not deduct until delivery is complete and HQ accepts
      delivery_notes: dto.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.db.orders.unshift(newOrder);

    // If linked to a task, keep task metadata in sync
    if (dto.task_id) {
      const task = this.db.tasks.find((t) => t.id === dto.task_id);
      if (task) {
        task.order_id = newOrder.id;
        task.orders = validItems;
        task.delivery_status = 'PENDING';
        task.hq_accepted = false;
        task.inventory_deducted = false;
      }
    }

    this.db.persistToDisk();

    // Notify admins of new pending order
    const admins = this.db.users.filter((u) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role) && !u.deleted_at);
    admins.forEach((admin) => {
      this.notificationsService.sendPushNotification(
        admin.id,
        '📦 New Order Created',
        `${user.name} created order #${orderNum} for ${newOrder.customer_name} (${totalUnits} units • ₹${totalAmount}). Pending delivery.`,
        { orderId: newOrder.id, type: 'NEW_ORDER' },
      );
    });

    return newOrder;
  }

  /**
   * Helper called when a visit / duty is finalized with orders
   * Replaces direct inventory deduction with an Order entry in PENDING delivery status
   */
  async createFromTask(task: Task, items: any[], userId: string): Promise<Order | null> {
    const validItems = (items || [])
      .filter((i) => Number(i.quantity) > 0 && i.product_name?.trim()?.length > 0)
      .map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name.trim(),
        quantity: Math.max(1, parseInt(String(i.quantity), 10) || 1),
        unit_price: parseFloat(String(i.unit_price || 0)) || 0,
        total_amount:
          (Math.max(1, parseInt(String(i.quantity), 10) || 1)) *
          (parseFloat(String(i.unit_price || 0)) || 0),
        distributor: i.distributor || 'Central Stocker',
      }));

    if (validItems.length === 0) return null;

    const mr = this.db.users.find((u) => u.id === task.assigned_mr_id || u.id === userId);
    const effectiveHqId = task.hq_id || mr?.hq_id || 'hq-shahdol';
    const hq = this.db.findHeadquarter ? this.db.findHeadquarter(effectiveHqId) : null;
    const hqName = task.hq_name || hq?.name || mr?.hq_name || 'HQ Zone';

    const stocker = task.stocker_id
      ? this.db.stockers.find((s) => s.id === task.stocker_id)
      : this.db.stockers.find((s) => this.normalizeHq(s.hq_id) === this.normalizeHq(effectiveHqId)) || this.db.stockers[0];

    const totalUnits = validItems.reduce((acc, i) => acc + i.quantity, 0);
    const totalAmount = validItems.reduce((acc, i) => acc + i.total_amount, 0);

    const orderNum = `ORD-${new Date().getFullYear()}-${String(this.db.orders.length + 1).padStart(4, '0')}`;

    const newOrder: Order = {
      id: `ord-${uuidv4().substring(0, 8)}`,
      order_number: orderNum,
      task_id: task.id,
      mr_id: mr?.id || userId,
      mr_name: mr?.name || 'Field Representative',
      customer_name: task.location_name || task.title || 'Client Clinic',
      location_name: task.location_name || task.title,
      hq_id: effectiveHqId,
      hq_name: hqName,
      stocker_id: stocker?.id || 'stk-shd-01',
      stocker_name: stocker?.name || 'Central Stocker',
      items: validItems,
      total_units: totalUnits,
      total_amount: totalAmount,
      delivery_status: 'PENDING',
      hq_accepted: false,
      inventory_deducted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.db.orders.unshift(newOrder);

    task.order_id = newOrder.id;
    task.delivery_status = 'PENDING';
    task.hq_accepted = false;
    task.inventory_deducted = false;

    this.db.persistToDisk();
    return newOrder;
  }

  /**
   * Employee or Admin updates whether the order has been delivered or not
   */
  async updateDeliveryStatus(id: string, dto: UpdateOrderDeliveryDto, user: any): Promise<Order> {
    const order = this.db.orders.find((o) => o.id === id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
    const isCreator = order.mr_id === user?.id;
    const isSameHq = this.normalizeHq(order.hq_id) === this.normalizeHq(user?.hq_id);

    if (!isAdmin && !isCreator && !isSameHq) {
      throw new ForbiddenException('You do not have permission to update the delivery status of this order');
    }

    order.delivery_status = dto.delivery_status;
    order.updated_at = new Date().toISOString();

    if (dto.delivery_status === 'DELIVERED') {
      order.delivered_at = new Date().toISOString();
      order.delivered_by_user_id = user.id;
    } else {
      order.delivered_at = undefined;
      order.delivered_by_user_id = undefined;
      // If delivery is reverted, reset acceptance and counting
      order.hq_accepted = false;
      order.accepted_at = undefined;
    }

    if (dto.notes !== undefined) {
      order.delivery_notes = dto.notes;
    }

    // Sync back to task if present
    if (order.task_id) {
      const task = this.db.tasks.find((t) => t.id === order.task_id);
      if (task) {
        task.delivery_status = order.delivery_status;
      }
    }

    this.db.persistToDisk();

    // Push notification to Admin / Supervisors
    const admins = this.db.users.filter((u) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role) && !u.deleted_at);
    admins.forEach((admin) => {
      this.notificationsService.sendPushNotification(
        admin.id,
        dto.delivery_status === 'DELIVERED' ? '🚚 Order Marked as Delivered' : '⏳ Order Delivery Status Updated',
        `Order #${order.order_number} for ${order.customer_name} marked as ${dto.delivery_status} by ${user.name}.`,
        { orderId: order.id, status: dto.delivery_status, type: 'ORDER_DELIVERY_UPDATE' },
      );
    });

    return order;
  }

  /**
   * HQ Acceptance & Inventory Counting
   * "They should be given the option to accept it, and only then should counting start, otherwise not.
   * It should work like this, and the count should happen only after the delivery is complete."
   */
  async acceptOrder(id: string, user: any): Promise<Order> {
    const order = this.db.orders.find((o) => o.id === id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    // 1. DELIVERY MUST BE COMPLETE FIRST
    if (order.delivery_status !== 'DELIVERED') {
      throw new BadRequestException(
        'Delivery is not complete yet. The employee must mark the order as DELIVERED before the HQ can accept and count it.',
      );
    }

    // 2. PREVENT DUPLICATE ACCEPTANCE / DEDUCTION
    if (order.hq_accepted && order.inventory_deducted) {
      throw new BadRequestException('Order has already been accepted and stock count deducted from inventory.');
    }

    // 3. HQ SCOPING: ONLY THE TARGET HQ (OR ADMIN) CAN ACCEPT
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
    const ordHqNorm = this.normalizeHq(order.hq_id);
    const userHqNorm = this.normalizeHq(user?.hq_id);

    if (!isAdmin && ordHqNorm !== userHqNorm) {
      throw new ForbiddenException(
        `Only the HQ for which this order was made (${order.hq_name}) can accept this order in their ID.`,
      );
    }

    order.hq_accepted = true;
    order.accepted_at = new Date().toISOString();
    order.accepted_by_user_id = user.id;

    // 4. NOW START COUNTING / DEDUCTING FROM INVENTORY!
    if (!order.inventory_deducted && order.items && order.items.length > 0) {
      await this.inventoryService.deductStockForOrder(
        order.hq_id,
        order.stocker_id,
        order.items,
        order.id,
        order.task_id || order.id,
        user.id,
      );
      order.inventory_deducted = true;
      order.inventory_deducted_at = new Date().toISOString();
    }

    order.updated_at = new Date().toISOString();

    if (order.task_id) {
      const task = this.db.tasks.find((t) => t.id === order.task_id);
      if (task) {
        task.hq_accepted = true;
        task.inventory_deducted = true;
      }
    }

    this.db.persistToDisk();

    // Notify MR that their order was accepted and inventory was finalized
    this.notificationsService.sendPushNotification(
      order.mr_id,
      '✅ Order Accepted & Stock Count Finalized',
      `Your delivered order #${order.order_number} for ${order.customer_name} has been officially accepted by ${order.hq_name} HQ. Stock count deducted.`,
      { orderId: order.id, type: 'ORDER_ACCEPTED' },
    );

    return order;
  }
}
