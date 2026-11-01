import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { AiAssistantService } from '../modules/ai-assistant/ai-assistant.service';
import { TasksService } from '../modules/tasks/tasks.service';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { OrdersModule } from '../modules/orders/orders.module';

describe('Security Audit Fixes Verification (All 7 Vulnerabilities)', () => {
  let usersService: UsersService;
  let aiAssistantService: AiAssistantService;
  let tasksService: TasksService;
  let db: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, NotificationsModule, InventoryModule, OrdersModule],
      providers: [
        UsersService,
        AiAssistantService,
        TasksService,
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    aiAssistantService = module.get<AiAssistantService>(AiAssistantService);
    tasksService = module.get<TasksService>(TasksService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.onModuleInit();
  });

  // 1. SEC-VULN-001: Vertical Privilege Escalation
  describe('SEC-VULN-001: Role Hierarchy and Privilege Escalation', () => {
    it('should reject manager attempting to change user role to SUPER_ADMIN', async () => {
      const managerUser = { id: 'usr-mgr-01', role: 'MANAGER', name: 'Manager' };
      await expect(
        usersService.updateUser('usr-mr-01', { role: 'SUPER_ADMIN' as any }, managerUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject admin attempting to modify SUPER_ADMIN user', async () => {
      const adminUser = { id: 'usr-admin-sub', role: 'ADMIN', name: 'Admin' };
      await expect(
        usersService.updateUser('usr-admin-01', { role: 'MR' as any }, adminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-admin attempting to reset another user password', async () => {
      const managerUser = { id: 'usr-mgr-01', role: 'MANAGER', name: 'Manager' };
      await expect(
        usersService.updateUser('usr-mr-01', { password: 'NewHackedPassword123!' }, managerUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should permit SUPER_ADMIN to update roles', async () => {
      const superAdminUser = { id: 'usr-admin-01', role: 'SUPER_ADMIN', name: 'Super Admin' };
      const updated = await usersService.updateUser('usr-mr-01', { name: 'Verified Name' }, superAdminUser);
      expect(updated.name).toBe('Verified Name');
    });

    // SEC-VULN-008: Role hierarchy in user creation and device reset
    it('should reject manager attempting to create SUPER_ADMIN user', async () => {
      const managerUser = { id: 'usr-mgr-01', role: 'MANAGER', name: 'Manager' };
      await expect(
        usersService.createUser(
          {
            name: 'Malicious Admin',
            email: 'malicious.admin@ahtri.com',
            phone: '9988112233',
            password: 'Password123!',
            role: 'SUPER_ADMIN',
          },
          managerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject manager attempting to create ADMIN user', async () => {
      const managerUser = { id: 'usr-mgr-01', role: 'MANAGER', name: 'Manager' };
      await expect(
        usersService.createUser(
          {
            name: 'Sub Admin',
            email: 'sub.admin@ahtri.com',
            phone: '9988112244',
            password: 'Password123!',
            role: 'ADMIN',
          },
          managerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject manager attempting to reset device binding for ADMIN user', async () => {
      const managerUser = { id: 'usr-mgr-01', role: 'MANAGER', name: 'Manager' };
      await expect(
        usersService.resetDeviceBinding('usr-admin-01', managerUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // 4. SEC-VULN-004: Stored and Reflected XSS in Executive Report HTML
  describe('SEC-VULN-004: XSS Protection in HTML Export', () => {
    it('should entity-encode HTML script tags in generated executive report table', async () => {
      // Mock processQuery breakdown
      jest.spyOn(aiAssistantService as any, 'processQuery').mockResolvedValue({
        kpis: {
          totalTasks: 10,
          completedTasks: 8,
          completionRate: '80%',
          activeMrs: 3,
          dateRangeLabel: '<script>alert(1)</script>',
        },
        breakdown: [
          {
            doctor: '<img src=x onerror=alert(document.domain)>',
            task: 'Routine Visit',
          },
        ],
      });

      const html = await aiAssistantService.generatePdfReportHtml();
      expect(html).not.toContain('<img src=x onerror=alert(document.domain)>');
      expect(html).toContain('&lt;img src=x onerror=alert(document.domain)&gt;');
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  // 7. SEC-VULN-007: Server-Side Location Integrity & Velocity
  describe('SEC-VULN-007: Location Integrity and Velocity Verification', () => {
    it('should reject invalid latitude or longitude coordinates', async () => {
      await expect(
        tasksService.startTask('task-01', 'usr-mr-01', {
          latitude: 999.0,
          longitude: 50.0,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject impossible travel velocity between rapid location check-ins', async () => {
      // Seed a recent verification in db
      db.locationVerifications.push({
        id: 'lv-recent-01',
        task_id: 'task-00',
        type: 'START',
        user_id: 'usr-mr-01',
        latitude: 23.3436,
        longitude: 81.3552,
        distance_m: 10,
        gps_accuracy_m: 10,
        verified: true,
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      });

      // Attempt to check in 500 km away within 2 minutes (15,000 km/h)
      await expect(
        tasksService.startTask('task-01', 'usr-mr-01', {
          latitude: 28.6139, // Delhi (approx 600km away from Shahdol)
          longitude: 77.2090,
          is_mocked: false,
          developer_mode: false,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
