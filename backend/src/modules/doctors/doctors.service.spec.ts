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
        address: 'Hauz Khas, New Delhi',
        latitude: 28.5494,
        longitude: 77.2001,
        area_id: 'area-sdelhi-1',
      },
      'usr-mgr-01',
    );

    expect(doc.id).toBeDefined();
    expect(doc.class).toBe('A');
    expect(doc.potential_score).toBe(91);
    expect(doc.latitude).toBe(28.5494);
  });

  it('should filter doctors by territory area and class', async () => {
    const classADocs = await service.getDoctors({
      area_id: 'area-sdelhi-1',
      class: 'A',
    });

    expect(classADocs.length).toBeGreaterThan(0);
    expect(classADocs.every((d) => d.class === 'A')).toBe(true);
  });
});
