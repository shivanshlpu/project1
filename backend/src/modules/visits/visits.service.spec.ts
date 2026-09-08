import { Test, TestingModule } from '@nestjs/testing';
import { VisitsService } from './visits.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { ConflictException } from '@nestjs/common';

describe('Doctor Visits & Signature (Node 7 DoD Verification)', () => {
  let service: VisitsService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [VisitsService],
    }).compile();

    service = module.get<VisitsService>(VisitsService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should start visit, compute duration, record signature and sample products', async () => {
    const startRes = await service.startVisit('usr-mr-01', {
      doctor_id: 'doc-01',
      latitude: 28.5245,
      longitude: 77.2066,
      gps_accuracy_m: 10,
    });

    expect(startRes.visit).toBeDefined();
    expect(startRes.visit.start_time).toBeDefined();
    expect(startRes.visit.end_time).toBeUndefined();

    // Prevent starting another visit while one is active
    await expect(
      service.startVisit('usr-mr-01', {
        doctor_id: 'doc-02',
        latitude: 28.5585,
        longitude: 77.2028,
      }),
    ).rejects.toThrow(ConflictException);

    // End the visit with samples, remarks, and signature key
    const endRes = await service.endVisit(startRes.visit.id, 'usr-mr-01', {
      remarks: 'Doctor agreed to prescribe CardioFix-50 for hypertension patients.',
      signature_file_key: 'signatures/2026/09/doc-01-sig.png',
      follow_up_date: '2026-09-20',
      products: [
        {
          product_id: 'prod-01',
          product_name: 'CardioFix-50',
          samples_given: 5,
          notes: '5 blister strips handed over',
        },
      ],
    });

    expect(endRes.visit.end_time).toBeDefined();
    expect(endRes.visit.duration_seconds).toBeGreaterThanOrEqual(1);
    expect(endRes.visit.signature_file_key).toBe('signatures/2026/09/doc-01-sig.png');
    expect(endRes.details.length).toBe(1);
    expect(endRes.details[0].samples_given).toBe(5);
  });
});
