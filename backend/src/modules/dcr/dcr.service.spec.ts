import { Test, TestingModule } from '@nestjs/testing';
import { DcrService } from './dcr.service';
import { VisitsService } from '../visits/visits.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';

describe('DCR Auto-Population (Node 8 DoD Verification)', () => {
  let dcrService: DcrService;
  let visitsService: VisitsService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [DcrService, VisitsService],
    }).compile();

    dcrService = module.get<DcrService>(DcrService);
    visitsService = module.get<VisitsService>(VisitsService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should auto-populate today DCR draft from doctor visits and allow MR submission', async () => {
    // 1. Simulate MR conducting a doctor visit today
    const visitRes = await visitsService.startVisit('usr-mr-01', {
      doctor_id: 'doc-01',
      latitude: 28.5245,
      longitude: 77.2066,
      gps_accuracy_m: 8,
    });

    await visitsService.endVisit(visitRes.visit.id, 'usr-mr-01', {
      remarks: 'Product sample detailing completed',
      signature_file_key: 'sig-01.png',
    });

    // 2. Fetch today's DCR draft (PRD §16 auto-population)
    const draft = await dcrService.getTodayDcrDraft('usr-mr-01');
    expect(draft.visit_count).toBeGreaterThanOrEqual(1);
    expect(draft.dcr.status).toBe('DRAFT');

    const draftItem = draft.items.find((i) => i.visit_id === visitRes.visit.id);
    expect(draftItem).toBeDefined();
    expect(draftItem?.doctor_name).toBe('Dr. Rajesh Sharma');

    // 3. MR submits subjective fields
    const submitRes = await dcrService.submitDcr(draft.dcr.id, 'usr-mr-01', {
      items: [
        {
          visit_id: visitRes.visit.id,
          products_discussed: ['CardioFix-50', 'AmloVas-10'],
          samples: 5,
          order_taken: true,
          remarks: 'Order booked for 50 strips',
        },
      ],
    });

    expect(submitRes.dcr.status).toBe('SUBMITTED');
    expect(submitRes.items[0].order_taken).toBe(true);
    expect(submitRes.items[0].samples).toBe(5);

    // 4. Manager reviews and approves
    const approveRes = await dcrService.approveDcr(draft.dcr.id, 'usr-mgr-01', {
      comment: 'Excellent field coverage today.',
    });
    expect(approveRes.dcr.status).toBe('APPROVED');
    expect(approveRes.dcr.approved_by).toBe('usr-mgr-01');
  });
});
