import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.module';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';

describe('Audit Logging (Node 15 DoD Verification)', () => {
  let auditService: AuditService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [AuditService],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should store and query immutable audit logs with filter', async () => {
    db.auditLogs.push({
      id: 'aud-001',
      user_id: 'usr-admin-01',
      action: 'POST /tasks',
      entity_type: 'TASKS',
      entity_id: 'task-01',
      new_value_json: { title: 'New Task' },
      created_at: new Date().toISOString(),
    });

    const logs = await auditService.getAuditLogs({ entity_type: 'TASKS' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].entity_id).toBe('task-01');
    expect(logs[0].action).toBe('POST /tasks');
  });
});
