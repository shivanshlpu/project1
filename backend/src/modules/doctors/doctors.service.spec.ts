import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';

describe('Doctors Master (Node 6 DoD Verification)', () => {
  let service: DoctorsService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [DoctorsService],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should create doctor with class, potential score, and coordinates', async () => {
    const doc = await service.createDoctor(
      {
        name: 'Dr. Anita Desai',
        qualification: 'MBBS, MD',
        specialization: 'Dermatologist',
        class: 'A',
        potential_score: 91,
        phone: '9877766554',
        clinic: 'Skin Care Centre',
        address: 'Gandhi Chowk, Shahdol, MP',
        latitude: 23.2962,
        longitude: 81.3537,
        area_id: 'area-shd-07',
      },
      'usr-mgr-01',
    );

    expect(doc.id).toBeDefined();
    expect(doc.class).toBe('A');
    expect(doc.potential_score).toBe(91);
    expect(doc.latitude).toBe(23.2962);
  });

  it('should filter doctors by territory area and class', async () => {
    const classADocs = await service.getDoctors({
      area_id: 'area-shd-07',
      class: 'A',
    });

    expect(classADocs.length).toBeGreaterThan(0);
    expect(classADocs.every((d) => d.class === 'A')).toBe(true);
  });
});
