import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalsService } from './approvals.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';

describe('Polymorphic Approvals Engine (Node 10 DoD Verification)', () => {
  let service: ApprovalsService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [ApprovalsService],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should create leave, link to generic approval, and sync status upon decision', async () => {
    // 1. Submit leave
    const leaveRes = await service.createLeave('usr-mr-01', {
      start_date: '2026-09-15',
      end_date: '2026-09-17',
      reason: 'Medical leave',
    });

    expect(leaveRes.leave).toBeDefined();
    expect(leaveRes.leave.status).toBe('PENDING');

    // 2. Query pending approvals as Area Manager
    const managerUser = { id: 'usr-mgr-01', role: 'MANAGER', area_id: 'area-sdelhi-1', name: 'Anil Kumar' };
    const pendingList = await service.getPendingApprovals(managerUser);
    const leaveApproval = pendingList.find((a) => a.entity_id === leaveRes.leave.id);
    expect(leaveApproval).toBeDefined();
    expect(leaveApproval?.entity_type).toBe('LEAVE');

    // 3. Manager decides approval
    const decisionRes = await service.decideApproval(leaveApproval!.id, managerUser, {
      status: 'APPROVED',
      comment: 'Leave approved. Take care.',
    });

    expect(decisionRes.approval.status).toBe('APPROVED');

    // 4. Verify underlying entity (leave_requests) synced to APPROVED
    const updatedLeave = db.leaveRequests.find((l) => l.id === leaveRes.leave.id);
    expect(updatedLeave?.status).toBe('APPROVED');
    expect(updatedLeave?.approved_by).toBe('usr-mgr-01');

    // 5. Verify notification generated for MR
    const notif = db.notifications.find((n) => n.user_id === 'usr-mr-01');
    expect(notif).toBeDefined();
    expect(notif?.title).toContain('LEAVE APPROVED');
  });
});
