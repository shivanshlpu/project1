import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  User,
  Role,
  Permission,
  Zone,
  Region,
  Area,
  Territory,
  Task,
  TaskAssignment,
  LocationVerification,
  Doctor,
  DoctorVisit,
  VisitDetail,
  Attendance,
  DCR,
  DCRItem,
  Expense,
  LeaveRequest,
  LeaveQuota,
  TourPlan,
  Approval,
  Notification,
  AuditLog,
  DeviceAuthorizationRequest,
  Headquarter,
  HqArea,
  Stocker,
  Medicine,
  StockerInventory,
  InventoryTransaction,
  VerificationPhoto,
  MonthlyTourPlan,
  MonthlyTpItem,
  AttendanceSettings,
  Competition,
  RewardClaim,
} from './database.types';
import { SupabaseService } from './supabase.service';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public roles: Role[] = [];
  public permissions: Permission[] = [];
  public zones: Zone[] = [];
  public regions: Region[] = [];
  public areas: Area[] = [];
  public territories: Territory[] = [];
  public users: User[] = [];
  public refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  public otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  public fcmTokens: Map<string, string> = new Map(); // userId -> fcmToken

  public tasks: Task[] = [];
  public taskAssignments: TaskAssignment[] = [];
  public locationVerifications: LocationVerification[] = [];

  public doctors: Doctor[] = [];
  public doctorVisits: DoctorVisit[] = [];
  public visitDetails: VisitDetail[] = [];

  public attendance: Attendance[] = [];
  public dcrList: DCR[] = [];
  public dcrItems: DCRItem[] = [];

  public expenses: Expense[] = [];
  public leaveRequests: LeaveRequest[] = [];
  public leaveQuotas: LeaveQuota[] = [];
  public tourPlans: TourPlan[] = [];
  public approvals: Approval[] = [];

  public notifications: Notification[] = [];
  public announcements: any[] = [];
  public auditLogs: AuditLog[] = [];
  public deviceAuthorizations: DeviceAuthorizationRequest[] = [];

  // Enhancement collections
  public headquarters: Headquarter[] = [];
  public hqAreas: HqArea[] = [];
  public stockers: Stocker[] = [];
  public medicines: Medicine[] = [];
  public stockerInventory: StockerInventory[] = [];
  public inventoryTransactions: InventoryTransaction[] = [];
  public verificationPhotos: VerificationPhoto[] = [];
  public monthlyTourPlans: MonthlyTourPlan[] = [];
  public attendanceSettings: AttendanceSettings = {
    id: 'att-settings-default',
    expected_punch_in_time: '10:00:00',
    allowed_punch_in_window_minutes: 30,
    expected_punch_out_time: '18:00:00',
    allowed_punch_out_window_minutes: 30,
    updated_at: new Date().toISOString(),
  };
  public competitions: Competition[] = [];
  public rewardClaims: RewardClaim[] = [];

  constructor(public readonly supabase: SupabaseService) {}

  async onModuleInit() {
    await this.seedInitialData();
    if (this.supabase && this.supabase.isConnected) {
      try {
        const adminUser = this.users.find((u) => u.email === 'shivanshti10@gmail.com');
        if (adminUser) {
          await this.supabase.upsertUser({
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            phone: adminUser.phone,
            password_hash: adminUser.password_hash,
            role: adminUser.role,
            status: adminUser.status,
            biometric_enabled: adminUser.biometric_enabled,
          });
        }
      } catch {
        // Resilient fallback
      }
    }
  }

  private async seedInitialData() {
    // 1. Roles
    this.roles = [
      { id: 'role-1', name: 'SUPER_ADMIN', description: 'Complete system access' },
      { id: 'role-2', name: 'ADMIN', description: 'Administrative operations' },
      { id: 'role-3', name: 'MANAGER', description: 'Territory and MR team manager' },
      { id: 'role-4', name: 'MR', description: 'Field Medical Representative' },
    ];

    // 2. Hierarchy: Zone -> Region -> Area
    const zoneId = 'zone-north-1';
    this.zones.push({ id: zoneId, name: 'North Zone' });

    const regionId = 'reg-delhi-1';
    this.regions.push({ id: regionId, zone_id: zoneId, name: 'Delhi NCR' });

    const areaId = 'area-sdelhi-1';
    this.areas.push({ id: areaId, region_id: regionId, name: 'South Delhi' });

    // 3. Seed Users
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
    const shivanshPasswordHash = await bcrypt.hash('87654321', 10);

    // Primary Super Admin: Shivansh Tiwari (Requested ID: shivanshti10@gmail.com, Mobile: 9009149694)
    const shivanshAdmin: User = {
      id: 'usr-admin-shivansh',
      name: 'Shivansh Tiwari',
      phone: '9009149694',
      email: 'shivanshti10@gmail.com',
      password_hash: shivanshPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    const superAdmin: User = {
      id: 'usr-admin-01',
      name: 'System Admin',
      phone: '9876543210',
      email: 'admin@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    const manager: User = {
      id: 'usr-mgr-01',
      name: 'Anil Kumar (Area Manager)',
      phone: '9876543211',
      email: 'manager@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MANAGER',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      status: 'ACTIVE',
      biometric_enabled: false,
      created_at: new Date().toISOString(),
    };

    const mr: User = {
      id: 'usr-mr-01',
      name: 'Rahul Sharma (Field MR)',
      phone: '9876543212',
      email: 'mr@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    const mr2: User = {
      id: 'usr-mr-02',
      name: 'Vikram Malhotra',
      phone: '9876543213',
      email: 'vikram@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    const mr3: User = {
      id: 'usr-mr-03',
      name: 'Pooja Verma',
      phone: '9876543214',
      email: 'pooja@ahtri.com',
      password_hash: defaultPasswordHash,
      role: 'MR',
      zone_id: zoneId,
      region_id: regionId,
      area_id: areaId,
      manager_id: manager.id,
      status: 'ACTIVE',
      biometric_enabled: true,
      created_at: new Date().toISOString(),
    };

    this.users.push(shivanshAdmin, superAdmin, manager, mr, mr2, mr3);

    // Territory link
    this.territories.push({
      id: 'terr-01',
      area_id: areaId,
      mr_user_id: mr.id,
    });

    // 4. Doctors
    const doc1: Doctor = {
      id: 'doc-01',
      name: 'Dr. Rajesh Sharma',
      qualification: 'MD, DM (Cardiology)',
      specialization: 'Cardiologist',
      class: 'A',
      potential_score: 95,
      phone: '9811122233',
      clinic: 'Apex Heart Centre',
      hospital: 'Max Super Specialty Hospital',
      address: 'Ring Road, Saket, New Delhi',
      latitude: 28.5245,
      longitude: 77.2066,
      area_id: areaId,
      assigned_mr_id: mr.id,
      assigned_mr_name: mr.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    const doc2: Doctor = {
      id: 'doc-02',
      name: 'Dr. Priya Verma',
      qualification: 'MBBS, DNB (Paediatrics)',
      specialization: 'Paediatrician',
      class: 'B',
      potential_score: 82,
      phone: '9811144455',
      clinic: 'Little Care Clinic',
      address: 'Green Park Extension, New Delhi',
      latitude: 28.5585,
      longitude: 77.2028,
      area_id: areaId,
      assigned_mr_id: mr.id,
      assigned_mr_name: mr.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    this.doctors.push(doc1, doc2);

    // 5. Seed Tasks for today
    const nowD = new Date();
    const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
    const task1: Task = {
      id: 'task-01',
      title: 'Dr. Rajesh Sharma Clinic Detailing',
      description: 'Present CardioFix-50 scheme and distribute product samples.',
      assigned_mr_id: mr.id,
      created_by: manager.id,
      date: todayStr,
      time: '10:30:00',
      latitude: doc1.latitude,
      longitude: doc1.longitude,
      geofence_radius_m: 20,
      priority: 'HIGH',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    const task2: Task = {
      id: 'task-02',
      title: 'Dr. Priya Verma Evening Visit',
      description: 'Follow-up on pediatric antibiotic suspension samples.',
      assigned_mr_id: mr.id,
      created_by: manager.id,
      date: todayStr,
      time: '17:00:00',
      latitude: doc2.latitude,
      longitude: doc2.longitude,
      geofence_radius_m: 20,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    this.tasks.push(task1, task2);
    this.taskAssignments.push(
      { id: 'ta-01', task_id: task1.id, mr_id: mr.id, assigned_at: new Date().toISOString() },
      { id: 'ta-02', task_id: task2.id, mr_id: mr.id, assigned_at: new Date().toISOString() },
    );

    // 6. Seed Initial Leave Request and Approval (Rahul Sharma)
    const seedLeave: LeaveRequest = {
      id: 'leave-101',
      mr_id: mr.id,
      start_date: '2026-09-12',
      end_date: '2026-09-13',
      reason: 'Casual Leave: Family occasion',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    this.leaveRequests.push(seedLeave);
    this.approvals.push({
      id: 'appr-01',
      entity_type: 'LEAVE',
      entity_id: seedLeave.id,
      requested_by: mr.id,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });

    // 7. Seed Initial Expense (Rahul Sharma)
    const seedExpense: Expense = {
      id: 'exp-102',
      mr_id: mr.id,
      category: 'CONVEYANCE',
      amount: 450,
      receipt_file_key: 'receipt_capture_01.jpg',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    this.expenses.push(seedExpense);
    this.approvals.push({
      id: 'appr-02',
      entity_type: 'EXPENSE',
      entity_id: seedExpense.id,
      requested_by: mr.id,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });

    // 8. Seed Initial Leave Quotas
    this.leaveQuotas.push(
      {
        mr_id: mr.id,
        casual_total: 12,
        sick_total: 10,
        earned_total: 15,
        updated_at: new Date().toISOString(),
      },
      {
        mr_id: mr2.id,
        casual_total: 12,
        sick_total: 10,
        earned_total: 15,
        updated_at: new Date().toISOString(),
      },
      {
        mr_id: mr3.id,
        casual_total: 12,
        sick_total: 10,
        earned_total: 15,
        updated_at: new Date().toISOString(),
      },
    );

    // 9. Seed Today's Initial Attendance for Field MR
    this.attendance.push({
      id: 'att-01',
      user_id: mr.id,
      date: todayStr,
      check_in_at: `${todayStr}T09:15:22.000Z`,
      check_in_lat: 28.5245,
      check_in_lng: 77.2066,
      distance_meters: 8.4,
      is_verified_location: true,
      status: 'PRESENT',
      late_minutes: 0,
      early_minutes: 0,
      working_hours: 0,
      device_integrity_status: 'VERIFIED',
      hq_id: 'hq-shahdol',
      hq_name: 'Shahdol',
      created_at: new Date().toISOString(),
    });

    // 10. Seed Headquarters (§6 & §10)
    const hqShahdol: Headquarter = {
      id: 'hq-shahdol',
      name: 'Shahdol',
      code: 'HQ-SHD',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqJaisinghnagar: Headquarter = {
      id: 'hq-jaisinghnagar',
      name: 'Jaisinghnagar',
      code: 'HQ-JSN',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqBurhar: Headquarter = {
      id: 'hq-burhar',
      name: 'Burhar/Bauhari',
      code: 'HQ-BRH',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqAmbikapur: Headquarter = {
      id: 'hq-ambikapur',
      name: 'Ambikapur',
      code: 'HQ-AMB',
      state: 'Chhattisgarh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqBilaspur: Headquarter = {
      id: 'hq-bilaspur',
      name: 'Bilaspur',
      code: 'HQ-BSP',
      state: 'Chhattisgarh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const hqKotma: Headquarter = {
      id: 'hq-kotma',
      name: 'Kotma',
      code: 'HQ-KTM',
      state: 'Madhya Pradesh',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.headquarters.push(
      hqShahdol,
      hqJaisinghnagar,
      hqBurhar,
      hqAmbikapur,
      hqBilaspur,
      hqKotma,
    );

    // 11. Seed HQ Areas (§6)
    const areas = [
      { id: 'area-shd-01', hq_id: hqShahdol.id, name: 'Shahdol' },
      { id: 'area-shd-02', hq_id: hqShahdol.id, name: 'Burhar' },
      { id: 'area-shd-03', hq_id: hqShahdol.id, name: 'Goparu' },
      { id: 'area-shd-04', hq_id: hqShahdol.id, name: 'Kotma' },
      { id: 'area-shd-05', hq_id: hqShahdol.id, name: 'Ambikapur' },
      { id: 'area-shd-06', hq_id: hqShahdol.id, name: 'Jaisinghnagar' },
      { id: 'area-shd-07', hq_id: hqShahdol.id, name: 'Bauhari' },
    ];
    for (const a of areas) {
      this.hqAreas.push({
        id: a.id,
        hq_id: a.hq_id,
        name: a.name,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });
    }

    // 12. Seed Stockers (§9 & §10)
    const stocker1: Stocker = {
      id: 'stk-shd-01',
      hq_id: hqShahdol.id,
      name: 'Shahdol Stocker 1 (Central Depot)',
      contact_person: 'Ramesh Patel',
      phone: '9826112233',
      address: 'Main Market Road, Shahdol, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker2: Stocker = {
      id: 'stk-shd-02',
      hq_id: hqShahdol.id,
      name: 'Shahdol Stocker 2 (Station Road)',
      contact_person: 'Sanjay Gupta',
      phone: '9826144556',
      address: 'Station Road, Near Bus Stand, Shahdol, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker3: Stocker = {
      id: 'stk-bsp-01',
      hq_id: hqBilaspur.id,
      name: 'Bilaspur Pharma Depot',
      contact_person: 'Vijay Agrawal',
      phone: '9827155667',
      address: 'Vyapar Vihar, Bilaspur, CG',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    this.stockers.push(stocker1, stocker2, stocker3);

    // 13. Seed Medicines Master (§11)
    const med1: Medicine = {
      id: 'med-01',
      name: 'CardioFix-50 (Telmisartan 40mg)',
      code: 'CF-50',
      unit: 'Box of 10x10',
      base_price: 180,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med2: Medicine = {
      id: 'med-02',
      name: 'CardioFix-AM (Telmisartan + Amlodipine)',
      code: 'CF-AM',
      unit: 'Box of 10x10',
      base_price: 220,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med3: Medicine = {
      id: 'med-03',
      name: 'DermaSoothe Cream 30g',
      code: 'DS-30',
      unit: 'Tube',
      base_price: 210,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med4: Medicine = {
      id: 'med-04',
      name: 'Glucotrol-M (Metformin 500mg)',
      code: 'GM-500',
      unit: 'Box of 10x10',
      base_price: 145,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const med5: Medicine = {
      id: 'med-05',
      name: 'AhtriCef-O 200mg (Cefixime)',
      code: 'ACO-200',
      unit: 'Strip of 10',
      base_price: 165,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    this.medicines.push(med1, med2, med3, med4, med5);

    // 14. Seed Stocker Inventory (§12 & §13)
    this.stockerInventory.push(
      {
        id: 'inv-shd-01-m1',
        hq_id: hqShahdol.id,
        stocker_id: stocker1.id,
        medicine_id: med1.id,
        quantity: 50, // Available
        low_stock_threshold: 15,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-shd-01-m2',
        hq_id: hqShahdol.id,
        stocker_id: stocker1.id,
        medicine_id: med2.id,
        quantity: 10, // Low stock
        low_stock_threshold: 15,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-shd-01-m3',
        hq_id: hqShahdol.id,
        stocker_id: stocker1.id,
        medicine_id: med3.id,
        quantity: 0, // Out of stock (demonstrates shortage / negative stock per §17)
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-shd-01-m4',
        hq_id: hqShahdol.id,
        stocker_id: stocker1.id,
        medicine_id: med4.id,
        quantity: 85,
        low_stock_threshold: 20,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-shd-02-m1',
        hq_id: hqShahdol.id,
        stocker_id: stocker2.id,
        medicine_id: med1.id,
        quantity: 30,
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-bsp-01-m1',
        hq_id: hqBilaspur.id,
        stocker_id: stocker3.id,
        medicine_id: med1.id,
        quantity: 120,
        low_stock_threshold: 25,
        updated_at: new Date().toISOString(),
      },
    );

    // Initial Audit Logs for stock seed
    this.inventoryTransactions.push({
      id: 'tx-init-01',
      hq_id: hqShahdol.id,
      stocker_id: stocker1.id,
      medicine_id: med1.id,
      quantity: 50,
      balance_after: 50,
      transaction_type: 'INITIAL',
      user_id: 'usr-admin-shivansh',
      reason: 'Initial stock intake on system commissioning',
      timestamp: new Date().toISOString(),
    });

    // 15. Seed Active Competition (§27)
    this.competitions.push({
      id: 'comp-shd-01',
      name: 'Shahdol CardioFix-50 Sprint',
      start_date: '2026-09-01',
      end_date: '2026-10-31',
      hq_id: hqShahdol.id,
      hq_name: 'Shahdol',
      medicine_id: med1.id,
      medicine_name: 'CardioFix-50 (Telmisartan 40mg)',
      target_quantity: 100,
      reward_amount: 2000,
      description: 'Sell 100 units of CardioFix-50 in Shahdol territory during September & October 2026 to earn an instant ₹2,000 cash incentive.',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    });

    // 16. Seed a sample submitted Monthly Tour Plan (§5-8)
    this.monthlyTourPlans.push({
      id: 'mtp-01',
      mr_id: mr.id,
      mr_name: mr.name,
      month: '2026-09',
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      entries: [
        {
          id: 'tp-item-1',
          date: '2026-09-02',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Shahdol',
          work_type: 'Doctor Visit',
          planned_kol_drs: 'Dr. Rajesh Sharma',
          planned_activity: 'CardioFix-50 Detailing and Scheme Presentation',
        },
        {
          id: 'tp-item-2',
          date: '2026-09-04',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Burhar',
          work_type: 'Order Collection',
          planned_kol_drs: 'Dr. Priya Verma',
          planned_activity: 'Antibiotic syrup follow-up and stockist order booking',
        },
        {
          id: 'tp-item-3',
          date: '2026-09-08',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Kotma',
          work_type: 'Follow-up',
          planned_kol_drs: 'Dr. Anita Desai',
          planned_activity: 'DermaSoothe sample trials evaluation',
        },
      ],
    });
  }
}
