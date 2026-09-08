import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.module';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';

describe('Offline Sync Engine (Node 14 DoD Verification)', () => {
  let syncService: SyncService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [SyncService],
    }).compile();

    syncService = module.get<SyncService>(SyncService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should push offline visit and expense drafts idempotently', async () => {
    const draftVisitId = 'offline-vis-101';
    const draftExpId = 'offline-exp-202';

    // 1. Push drafts
    const pushRes = await syncService.pushDrafts('usr-mr-01', {
      visit_drafts: [
        {
          id: draftVisitId,
          doctor_id: 'doc-01',
          start_time: '2026-09-06T11:00:00.000Z',
          end_time: '2026-09-06T11:20:00.000Z',
          start_lat: 28.5245,
          start_lng: 77.2066,
          remarks: 'Offline recorded visit',
        },
      ],
      expense_drafts: [
        {
          id: draftExpId,
          category: 'FOOD',
          amount: 180.0,
        },
      ],
    });

    expect(pushRes.synced_ids.visits).toContain(draftVisitId);
    expect(pushRes.synced_ids.expenses).toContain(draftExpId);

    // Verify row added to doctorVisits
    const visitInDb = db.doctorVisits.find((v) => v.id === draftVisitId);
    expect(visitInDb).toBeDefined();

    // 2. Duplicate push (idempotent retry)
    await syncService.pushDrafts('usr-mr-01', {
      visit_drafts: [
        {
          id: draftVisitId,
          doctor_id: 'doc-01',
          start_time: '2026-09-06T11:00:00.000Z',
        },
      ],
    });

    // Should still only have 1 visit with this ID
    const count = db.doctorVisits.filter((v) => v.id === draftVisitId).length;
    expect(count).toBe(1);
  });

  it('should pull read cache (tasks and doctors) for MR', async () => {
    const pullData = await syncService.pullData('usr-mr-01');
    expect(pullData.tasks.length).toBeGreaterThan(0);
    expect(pullData.doctors.length).toBeGreaterThan(0);
    expect(pullData.server_timestamp).toBeDefined();
  });
});
