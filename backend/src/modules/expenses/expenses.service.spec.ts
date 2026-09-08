import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';

describe('Expenses (Node 9 DoD Verification)', () => {
  let service: ExpensesService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [ExpensesService],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should submit expense and link to approvals engine', async () => {
    const res = await service.createExpense('usr-mr-01', {
      category: 'CONVEYANCE',
      amount: 450.0,
      receipt_file_key: 'receipts/fuel_sep_06.jpg',
      remarks: 'Fuel conveyance for Saket clinic visits',
    });

    expect(res.expense).toBeDefined();
    expect(res.expense.status).toBe('PENDING');
    expect(res.expense.amount).toBe(450.0);
    expect(res.approval_id).toBeDefined();

    // Verify approval record was generated in approvals table (§4.3)
    const approval = db.approvals.find((a) => a.id === res.approval_id);
    expect(approval).toBeDefined();
    expect(approval?.entity_type).toBe('EXPENSE');
  });

  it('should approve expense and update approval record', async () => {
    const res = await service.createExpense('usr-mr-01', {
      category: 'FOOD',
      amount: 250.0,
    });

    const approveRes = await service.approveExpense(res.expense.id, 'usr-mgr-01', {
      comment: 'Approved as per daily allowance',
    });

    expect(approveRes.expense.status).toBe('APPROVED');
    const approval = db.approvals.find((a) => a.entity_id === res.expense.id);
    expect(approval?.status).toBe('APPROVED');
    expect(approval?.approver_id).toBe('usr-mgr-01');
  });
});
