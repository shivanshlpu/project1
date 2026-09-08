import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { TerritoriesService } from '../territories/territories.service';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';

describe('Users & Territories (Node 3 DoD Verification)', () => {
  let usersService: UsersService;
  let territoriesService: TerritoriesService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [UsersService, TerritoriesService],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    territoriesService = module.get<TerritoriesService>(TerritoriesService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  it('should create zone, region, and area hierarchy', async () => {
    const zone = await territoriesService.createZone({ name: 'West Zone' });
    expect(zone.id).toBeDefined();

    const region = await territoriesService.createRegion({
      zone_id: zone.id,
      name: 'Mumbai Metro',
    });
    expect(region.zone_id).toBe(zone.id);

    const area = await territoriesService.createArea({
      region_id: region.id,
      name: 'South Mumbai',
    });
    expect(area.region_id).toBe(region.id);
  });

  it('should create user, list with territory filter, and assign territory', async () => {
    const newUser = await usersService.createUser({
      name: 'Vikram Singh',
      phone: '9988776655',
      email: 'vikram@ahtri.com',
      password: 'Password@123',
      role: 'MR',
      area_id: 'area-sdelhi-1',
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.name).toBe('Vikram Singh');

    const filtered = await usersService.getUsers({ area_id: 'area-sdelhi-1', role: 'MR' });
    expect(filtered.some((u) => u.id === newUser.id)).toBe(true);
  });

  it('should soft-delete user on deactivation', async () => {
    const user = await usersService.createUser({
      name: 'Test Deactivate',
      phone: '9123456780',
      email: 'deactivate@ahtri.com',
      password: 'Password@123',
      role: 'MR',
    });

    await usersService.deactivateUser(user.id);

    // Verify soft-deleted user is excluded from active users list
    const activeList = await usersService.getUsers({});
    expect(activeList.find((u) => u.id === user.id)).toBeUndefined();

    // Verify row still retained in DB with deleted_at timestamp
    const dbRecord = db.users.find((u) => u.id === user.id);
    expect(dbRecord?.status).toBe('INACTIVE');
    expect(dbRecord?.deleted_at).toBeDefined();
  });
});
