import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('Attendance (Node 5 DoD Verification)', () => {
  let service: AttendanceService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [AttendanceService],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should record check-in with coordinates', async () => {
    const res = await service.checkIn('usr-mr-01', {
      latitude: 28.5245,
      longitude: 77.2066,
    });

    expect(res.attendance).toBeDefined();
    expect(res.attendance.check_in_lat).toBe(28.5245);
    expect(res.attendance.check_in_lng).toBe(77.2066);
    expect(res.attendance.status).toBeDefined();
  });

  it('should prevent duplicate check-in on the same day', async () => {
    await service.checkIn('usr-mr-01', {
      latitude: 28.5245,
      longitude: 77.2066,
    });

    await expect(
      service.checkIn('usr-mr-01', {
        latitude: 28.5245,
        longitude: 77.2066,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should record check-out with coordinates', async () => {
    await service.checkIn('usr-mr-01', {
      latitude: 28.5245,
      longitude: 77.2066,
    });

    const res = await service.checkOut('usr-mr-01', {
      latitude: 28.5300,
      longitude: 77.2100,
    });

    expect(res.attendance.check_out_at).toBeDefined();
    expect(res.attendance.check_out_lat).toBe(28.5300);
  });

  it('should reject check-out if user has not checked in today', async () => {
    await expect(
      service.checkOut('usr-mr-01', {
        latitude: 28.53,
        longitude: 77.21,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
