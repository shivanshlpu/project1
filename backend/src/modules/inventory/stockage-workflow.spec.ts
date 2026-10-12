import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { OrdersService } from '../orders/orders.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.module';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { StockerInventory } from '../../database/database.types';

describe('Stockage Management & PTS/MRP Pricing Workflow (DoD Verification)', () => {
  let inventoryService: InventoryService;
  let ordersService: OrdersService;
  let db: DatabaseService;

  const adminUser = {
    id: 'usr-admin-01',
    name: 'Chief Admin',
    role: 'ADMIN',
  };

  const mrUser = {
    id: 'usr-mr-02',
    name: 'Aman Rathore',
    role: 'MR',
    hq_id: 'hq-shahdol',
  };

  const unauthorizedMr = {
    id: 'usr-mr-99',
    name: 'Ravi Verma',
    role: 'MR',
    hq_id: 'hq-kotma',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [InventoryService, OrdersService, NotificationsService],
    }).compile();

    inventoryService = module.get<InventoryService>(InventoryService);
    ordersService = module.get<OrdersService>(OrdersService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: An authorized MR can submit one Stockage request
  // --------------------------------------------------------------------------
  it('1. should allow an authorized MR to submit one Stockage request and reserve permission', async () => {
    const month = '2026-11';

    // Admin grants permission
    const grantRes = await inventoryService.grantStockagePermissions(
      {
        mr_ids: [mrUser.id],
        month_year: month,
        stocker_id: 'stk-shd-01',
        hq_id: 'hq-shahdol',
        notes: 'Monthly allocation alignment',
      },
      adminUser,
    );

    const perm = grantRes.granted[0];
    expect(perm).toBeDefined();
    expect(perm.status).toBe('AVAILABLE');

    // MR submits bulk Stockage request
    const med1 = db.medicines[0];
    const med2 = db.medicines[1];

    const submissionRes = await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: 'stk-shd-01',
        hq_id: 'hq-shahdol',
        items: [
          { medicine_id: med1.id, submitted_quantity: 25 },
          { medicine_id: med2.id, submitted_quantity: 15 },
        ],
        notes: 'Initial November stock replenishment',
      },
      mrUser,
    );

    const submission = submissionRes.request;
    expect(submission).toBeDefined();
    expect(submission.status).toBe('PENDING');
    expect(submission.total_items).toBe(2);
    expect(submission.total_quantity).toBe(40);

    // Permission status should transition to RESERVED
    const updatedPerm = db.monthlyStockagePermissions.find((p) => p.id === perm.id);
    expect(updatedPerm?.status).toBe('RESERVED');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: An unauthorized MR cannot submit
  // --------------------------------------------------------------------------
  it('2. should reject Stockage submission if MR does not have an active permission for the month', async () => {
    const month = '2026-12';

    await expect(
      inventoryService.submitStockageRequest(
        {
          permission_id: 'non-existent-perm-id',
          month_year: month,
          stocker_id: 'stk-shd-01',
          hq_id: 'hq-shahdol',
          items: [{ medicine_id: db.medicines[0].id, submitted_quantity: 10 }],
        },
        unauthorizedMr,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: An MR cannot reuse the same permission for a second submission
  // --------------------------------------------------------------------------
  it('3. should reject reuse of the same permission for a second submission', async () => {
    const month = '2026-11';

    const grantRes = await inventoryService.grantStockagePermissions(
      {
        mr_ids: [mrUser.id],
        month_year: month,
        stocker_id: 'stk-shd-01',
      },
      adminUser,
    );
    const perm = grantRes.granted[0];

    // First submission succeeds
    await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: 'stk-shd-01',
        hq_id: 'hq-shahdol',
        items: [{ medicine_id: db.medicines[0].id, submitted_quantity: 20 }],
      },
      mrUser,
    );

    // Second submission attempt with same permission must fail
    await expect(
      inventoryService.submitStockageRequest(
        {
          permission_id: perm.id,
          month_year: month,
          stocker_id: 'stk-shd-01',
          hq_id: 'hq-shahdol',
          items: [{ medicine_id: db.medicines[1].id, submitted_quantity: 10 }],
        },
        mrUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: A pending request cannot be submitted again through retries
  // --------------------------------------------------------------------------
  it('4. should prevent duplicate submissions while a request is already pending review', async () => {
    const month = '2026-11';

    // Grant one permission
    const grantRes = await inventoryService.grantStockagePermissions(
      {
        mr_ids: [mrUser.id],
        month_year: month,
        stocker_id: 'stk-shd-01',
      },
      adminUser,
    );
    const perm = grantRes.granted[0];

    await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: 'stk-shd-01',
        hq_id: 'hq-shahdol',
        items: [{ medicine_id: db.medicines[0].id, submitted_quantity: 15 }],
      },
      mrUser,
    );

    // Attempting another submission for same month with same permission
    await expect(
      inventoryService.submitStockageRequest(
        {
          permission_id: perm.id,
          month_year: month,
          stocker_id: 'stk-shd-01',
          hq_id: 'hq-shahdol',
          items: [{ medicine_id: db.medicines[0].id, submitted_quantity: 15 }],
        },
        mrUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // Scenario 5 & 6: Approval ADDS quantity to existing stock (NEVER replaces!)
  // --------------------------------------------------------------------------
  it('5 & 6. should strictly ADD approved quantity to existing stock (New = Existing + Approved, never replace)', async () => {
    const month = '2026-11';
    const med = db.medicines[0];
    const stockerId = 'stk-shd-01';

    // Set known initial stock
    let invItem = db.stockerInventory.find((i) => i.stocker_id === stockerId && i.medicine_id === med.id);
    if (!invItem) {
      invItem = {
        id: 'inv-test-01',
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        medicine_id: med.id,
        quantity: 100, // Existing stock = 100 units
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      };
      db.stockerInventory.push(invItem);
    } else {
      invItem.quantity = 100; // Reset to 100 units
    }

    const previousStock = invItem.quantity;
    expect(previousStock).toBe(100);

    // Grant permission & submit 25 units
    const grantRes = await inventoryService.grantStockagePermissions(
      { mr_ids: [mrUser.id], month_year: month, stocker_id: stockerId },
      adminUser,
    );
    const perm = grantRes.granted[0];

    const submissionRes = await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        items: [{ medicine_id: med.id, submitted_quantity: 25 }],
      },
      mrUser,
    );
    const submission = submissionRes.request;

    // Admin approves submission
    const reviewResult = await inventoryService.reviewStockageRequest(
      submission.id,
      {
        status: 'APPROVED',
        admin_notes: 'Approved without adjustments',
      },
      adminUser,
    );

    expect(reviewResult.request.status).toBe('APPLIED');

    // Official Stockage verification:
    // MUST BE: 100 + 25 = 125 units (NEVER 25!)
    const updatedInv = db.stockerInventory.find((i) => i.stocker_id === stockerId && i.medicine_id === med.id);
    expect(updatedInv?.quantity).toBe(125);
    expect(updatedInv?.quantity).not.toBe(25);

    // Line item record audit verification
    const itemAudit = reviewResult.request.items[0];
    expect(itemAudit.previous_stock).toBe(100);
    expect(itemAudit.approved_quantity).toBe(25);
    expect(itemAudit.final_stock).toBe(125);

    // Permission consumed verification
    const consumedPerm = db.monthlyStockagePermissions.find((p) => p.id === perm.id);
    expect(consumedPerm?.status).toBe('CONSUMED');
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Repeated approval does not add quantity twice (Idempotency)
  // --------------------------------------------------------------------------
  it('7. should prevent duplicate quantity additions on repeated approval clicks', async () => {
    const month = '2026-11';
    const med = db.medicines[1];
    const stockerId = 'stk-shd-01';

    let inv = db.stockerInventory.find((i) => i.stocker_id === stockerId && i.medicine_id === med.id);
    if (!inv) {
      inv = {
        id: 'inv-test-02',
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        medicine_id: med.id,
        quantity: 50,
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      };
      db.stockerInventory.push(inv);
    } else {
      inv.quantity = 50;
    }

    const grantRes = await inventoryService.grantStockagePermissions(
      { mr_ids: [mrUser.id], month_year: month, stocker_id: stockerId },
      adminUser,
    );
    const perm = grantRes.granted[0];

    const submissionRes = await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        items: [{ medicine_id: med.id, submitted_quantity: 30 }],
      },
      mrUser,
    );
    const submission = submissionRes.request;

    // First approval succeeds: 50 + 30 = 80
    await inventoryService.reviewStockageRequest(
      submission.id,
      { status: 'APPROVED' },
      adminUser,
    );

    expect(inv.quantity).toBe(80);

    // Second approval click must be rejected with BadRequestException
    await expect(
      inventoryService.reviewStockageRequest(
        submission.id,
        { status: 'APPROVED' },
        adminUser,
      ),
    ).rejects.toThrow(BadRequestException);

    // Stock must remain 80, never 110
    expect(inv.quantity).toBe(80);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Rejected requests do not change official Stockage
  // --------------------------------------------------------------------------
  it('8. should NOT change official Stockage when a request is rejected', async () => {
    const month = '2026-11';
    const med = db.medicines[2];
    const stockerId = 'stk-shd-01';

    let inv = db.stockerInventory.find((i) => i.stocker_id === stockerId && i.medicine_id === med.id);
    if (!inv) {
      inv = {
        id: 'inv-test-03',
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        medicine_id: med.id,
        quantity: 70,
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      };
      db.stockerInventory.push(inv);
    } else {
      inv.quantity = 70;
    }

    const grantRes = await inventoryService.grantStockagePermissions(
      { mr_ids: [mrUser.id], month_year: month, stocker_id: stockerId },
      adminUser,
    );
    const perm = grantRes.granted[0];

    const submissionRes = await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        items: [{ medicine_id: med.id, submitted_quantity: 40 }],
      },
      mrUser,
    );
    const submission = submissionRes.request;

    // Admin rejects submission
    const reviewResult = await inventoryService.reviewStockageRequest(
      submission.id,
      { status: 'REJECTED', admin_notes: 'Missing depot delivery stamp' },
      adminUser,
    );

    expect(reviewResult.request.status).toBe('REJECTED');
    // Stock remains unchanged at 70
    expect(inv.quantity).toBe(70);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Failed validation does not consume permission prematurely
  // --------------------------------------------------------------------------
  it('9. should not consume or reserve permission prematurely if submission fails validation', async () => {
    const month = '2026-11';

    const grantRes = await inventoryService.grantStockagePermissions(
      { mr_ids: [mrUser.id], month_year: month },
      adminUser,
    );
    const perm = grantRes.granted[0];

    // Submit invalid negative quantity
    await expect(
      inventoryService.submitStockageRequest(
        {
          permission_id: perm.id,
          month_year: month,
          stocker_id: 'stk-shd-01',
          hq_id: 'hq-shahdol',
          items: [{ medicine_id: db.medicines[0].id, submitted_quantity: -10 }],
        },
        mrUser,
      ),
    ).rejects.toThrow(BadRequestException);

    // Permission remains AVAILABLE
    const checkPerm = db.monthlyStockagePermissions.find((p) => p.id === perm.id);
    expect(checkPerm?.status).toBe('AVAILABLE');
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Permission is consumed only after successful application
  // --------------------------------------------------------------------------
  it('10. should mark permission CONSUMED strictly upon successful application', async () => {
    const month = '2026-11';

    const grantRes = await inventoryService.grantStockagePermissions(
      { mr_ids: [mrUser.id], month_year: month },
      adminUser,
    );
    const perm = grantRes.granted[0];

    const submissionRes = await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: 'stk-shd-01',
        hq_id: 'hq-shahdol',
        items: [{ medicine_id: db.medicines[0].id, submitted_quantity: 10 }],
      },
      mrUser,
    );
    const submission = submissionRes.request;

    // While in PENDING state, permission is RESERVED, not CONSUMED
    let checkPerm = db.monthlyStockagePermissions.find((p) => p.id === perm.id);
    expect(checkPerm?.status).toBe('RESERVED');

    // Review & approve
    await inventoryService.reviewStockageRequest(
      submission.id,
      { status: 'APPROVED' },
      adminUser,
    );

    // Now permission is CONSUMED
    checkPerm = db.monthlyStockagePermissions.find((p) => p.id === perm.id);
    expect(checkPerm?.status).toBe('CONSUMED');
  });

  // --------------------------------------------------------------------------
  // Scenario 11 & 12: MR can view PTS/MRP, backend rejects manipulated price
  // --------------------------------------------------------------------------
  it('11 & 12. should allow MR to view PTS/MRP but reject manipulated price supplied in order API', async () => {
    const med = db.medicines.find((m) => m.name.includes('AHTRI-S')) || db.medicines[0];
    const authoritativePts = med.pts_rate || med.base_price || 38.40;

    // 1. MR views medicines with PTS & MRP
    const meds = await inventoryService.getMedicines();
    const foundMed = meds.find((m) => m.id === med.id);
    expect(foundMed?.pts_rate).toBeDefined();
    expect(foundMed?.mrp).toBeDefined();

    // 2. MR attempts price tampering in order submission (supplying unit_price: 1.00 instead of authoritative PTS)
    await expect(
      ordersService.createOrder(
        {
          customer_name: 'Dr. Tamper Attempt',
          hq_id: 'hq-shahdol',
          items: [
            {
              product_id: med.id,
              product_name: med.name,
              quantity: 10,
              unit_price: 1.00, // Tampered price
            },
          ],
        },
        mrUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Order amount is strictly calculated using PTS, NOT MRP
  // --------------------------------------------------------------------------
  it('13. should calculate order total amount using PTS rate, never MRP', async () => {
    const med = db.medicines.find((m) => m.name.includes('AHTRI-S')) || db.medicines[0];
    const pts = med.pts_rate || med.base_price || 38.40;
    const mrp = med.mrp || 60.00;

    expect(pts).toBeLessThan(mrp); // Verify PTS is lower than MRP

    const order = await ordersService.createOrder(
      {
        customer_name: 'Dr. Satish Sharma',
        location_name: 'Shahdol Clinic',
        hq_id: 'hq-shahdol',
        items: [
          {
            product_id: med.id,
            product_name: med.name,
            quantity: 10,
            // unit_price omitted; calculated authoritatively from server PTS
          },
        ],
      },
      mrUser,
    );

    expect(order).toBeDefined();
    expect(order.items[0].unit_price).toBe(pts);
    expect(order.items[0].total_amount).toBe(Math.round(10 * pts * 100) / 100);
    expect(order.total_amount).toBe(Math.round(10 * pts * 100) / 100);
    // Total amount must NOT equal 10 * MRP
    expect(order.total_amount).not.toBe(10 * mrp);
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Packaging variants use correct rates
  // --------------------------------------------------------------------------
  it('14. should resolve prices and packaging correctly for variant items', async () => {
    const med = db.medicines[0];
    const variants = await inventoryService.getPackagingVariants(med.id);

    if (variants.length > 0) {
      const v = variants[0];
      expect(v.pts_rate).toBeGreaterThan(0);
      expect(v.mrp).toBeGreaterThanOrEqual(v.pts_rate);

      const order = await ordersService.createOrder(
        {
          customer_name: 'Apex Pharmacy',
          hq_id: 'hq-shahdol',
          items: [
            {
              product_id: med.id,
              product_name: med.name,
              packaging_id: v.id,
              quantity: 5,
            },
          ],
        },
        mrUser,
      );

      expect(order.items[0].unit_price).toBe(v.pts_rate);
      expect(order.items[0].total_amount).toBe(Math.round(5 * v.pts_rate * 100) / 100);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Concurrent approvals safeguard
  // --------------------------------------------------------------------------
  it('15. should prevent duplicate updates under concurrent approval attempts', async () => {
    const month = '2026-11';
    const med = db.medicines[3];
    const stockerId = 'stk-shd-01';

    let inv = db.stockerInventory.find((i) => i.stocker_id === stockerId && i.medicine_id === med.id);
    if (!inv) {
      inv = {
        id: 'inv-test-04',
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        medicine_id: med.id,
        quantity: 100,
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      };
      db.stockerInventory.push(inv);
    } else {
      inv.quantity = 100;
    }

    const grantRes = await inventoryService.grantStockagePermissions(
      { mr_ids: [mrUser.id], month_year: month, stocker_id: stockerId },
      adminUser,
    );
    const perm = grantRes.granted[0];

    const submissionRes = await inventoryService.submitStockageRequest(
      {
        permission_id: perm.id,
        month_year: month,
        stocker_id: stockerId,
        hq_id: 'hq-shahdol',
        items: [{ medicine_id: med.id, submitted_quantity: 20 }],
      },
      mrUser,
    );
    const submission = submissionRes.request;

    // Run two concurrent reviews
    const results = await Promise.allSettled([
      inventoryService.reviewStockageRequest(submission.id, { status: 'APPROVED' }, adminUser),
      inventoryService.reviewStockageRequest(submission.id, { status: 'APPROVED' }, adminUser),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one must succeed and one must be rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Quantity must strictly be 100 + 20 = 120, not 140
    expect(inv.quantity).toBe(120);
  });

  // --------------------------------------------------------------------------
  // Scenario 16: Existing application features continue to work
  // --------------------------------------------------------------------------
  it('16. should preserve existing catalog, stockers, and order workflows without regression', async () => {
    const stockers = await inventoryService.getStockers('hq-shahdol');
    expect(stockers.length).toBeGreaterThan(0);

    const orders = await ordersService.getOrders(adminUser);
    expect(Array.isArray(orders)).toBe(true);

    const hqs = await inventoryService.getHeadquarters();
    expect(hqs.length).toBeGreaterThan(0);
  });
});
