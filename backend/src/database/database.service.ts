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
  MonthlyStockEntry,
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
  public monthlyStockEntries: MonthlyStockEntry[] = [];

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

    const doc3: Doctor = {
      id: 'doc-03',
      name: 'Dr. Anita Desai',
      qualification: 'MBBS, MD (Dermatology)',
      specialization: 'Dermatologist',
      class: 'A',
      potential_score: 91,
      phone: '9877766554',
      clinic: 'Skin Care Centre',
      hospital: 'Max Healthcare Centre',
      address: 'Hauz Khas Market, New Delhi',
      latitude: 28.5494,
      longitude: 77.2001,
      area_id: areaId,
      assigned_mr_id: mr3.id,
      assigned_mr_name: mr3.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    const doc4: Doctor = {
      id: 'doc-04',
      name: 'Dr. Sameer Kapoor',
      qualification: 'MBBS',
      specialization: 'General Physician',
      class: 'C',
      potential_score: 64,
      phone: '9899911122',
      clinic: 'Kapoor Health Clinic',
      address: 'Main Market, Malviya Nagar, New Delhi',
      latitude: 28.5300,
      longitude: 77.2150,
      area_id: areaId,
      assigned_mr_id: mr3.id,
      assigned_mr_name: mr3.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    const doc5: Doctor = {
      id: 'doc-05',
      name: 'Dr. Anil Verma',
      qualification: 'MBBS, MD',
      specialization: 'Internal Medicine',
      class: 'B',
      potential_score: 78,
      phone: '9827110022',
      clinic: 'Verma Polyclinic',
      address: 'Hospital Road, Ambikapur',
      latitude: 28.5210,
      longitude: 77.2040,
      area_id: areaId,
      assigned_mr_id: mr2.id,
      assigned_mr_name: mr2.name,
      created_by: manager.id,
      created_at: new Date().toISOString(),
    };

    this.doctors.push(doc1, doc2, doc3, doc4, doc5);

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

    const task3: Task = {
      id: 'task-03',
      title: 'Dr. Anita Desai Follow-up Call',
      description: 'Detail DermaSoothe Cream and secure order.',
      assigned_mr_id: mr3.id,
      created_by: manager.id,
      date: todayStr,
      time: '14:30:00',
      latitude: doc3.latitude,
      longitude: doc3.longitude,
      geofence_radius_m: 40,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    const task4: Task = {
      id: 'task-04',
      title: 'Dr. Sameer Kapoor Regular Visit',
      description: 'Present Glucotrol-M clinical trials and check stockist supplies.',
      assigned_mr_id: mr3.id,
      created_by: manager.id,
      date: todayStr,
      time: '16:00:00',
      latitude: doc4.latitude,
      longitude: doc4.longitude,
      geofence_radius_m: 50,
      priority: 'LOW',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    const task5: Task = {
      id: 'task-05',
      title: 'Dr. Anil Verma Polyclinic Detailing',
      description: 'Present CardioFix-AM product line.',
      assigned_mr_id: mr2.id,
      created_by: manager.id,
      date: todayStr,
      time: '11:00:00',
      latitude: doc5.latitude,
      longitude: doc5.longitude,
      geofence_radius_m: 30,
      priority: 'HIGH',
      status: 'ASSIGNED',
      created_at: new Date().toISOString(),
    };

    this.tasks.push(task1, task2, task3, task4, task5);
    this.taskAssignments.push(
      { id: 'ta-01', task_id: task1.id, mr_id: mr.id, assigned_at: new Date().toISOString() },
      { id: 'ta-02', task_id: task2.id, mr_id: mr.id, assigned_at: new Date().toISOString() },
      { id: 'ta-03', task_id: task3.id, mr_id: mr3.id, assigned_at: new Date().toISOString() },
      { id: 'ta-04', task_id: task4.id, mr_id: mr3.id, assigned_at: new Date().toISOString() },
      { id: 'ta-05', task_id: task5.id, mr_id: mr2.id, assigned_at: new Date().toISOString() },
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

    // 9. Seed Attendance for Field MRs (Today with Active Photo Proof, Yesterday with Auto-Purged Photo)
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const sampleDressIdPhotoSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 420" width="360" height="420"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e293b"/></linearGradient><linearGradient id="shirt" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23f8fafc"/><stop offset="100%" stop-color="%23cbd5e1"/></linearGradient><linearGradient id="tie" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232563eb"/><stop offset="100%" stop-color="%231d4ed8"/></linearGradient></defs><rect width="360" height="420" rx="16" fill="url(%23bg)"/><circle cx="180" cy="115" r="55" fill="%23fbcfe8"/><path d="M150 100 Q180 80 210 100 Q180 70 150 100 Z" fill="%231e293b"/><path d="M100 280 C100 200, 260 200, 260 280 L280 420 L80 420 Z" fill="url(%23shirt)"/><polygon points="172,170 188,170 194,270 180,285 166,270" fill="url(%23tie)"/><rect x="135" y="240" width="90" height="130" rx="8" fill="%23ffffff" stroke="%232563eb" stroke-width="3"/><rect x="145" y="248" width="70" height="40" rx="4" fill="%23e2e8f0"/><text x="180" y="272" font-size="12" text-anchor="middle" fill="%23475569" font-family="Arial,sans-serif" font-weight="bold">MR ID</text><rect x="150" y="295" width="60" height="4" fill="%230f172a"/><text x="180" y="315" font-size="10" text-anchor="middle" fill="%231e293b" font-family="Arial,sans-serif" font-weight="bold">RAHUL SHARMA</text><text x="180" y="330" font-size="8" text-anchor="middle" fill="%232563eb" font-family="Arial,sans-serif">OFFICIAL BADGE</text><rect x="165" y="210" width="30" height="30" fill="none" stroke="%233b82f6" stroke-width="2" stroke-dasharray="3,3"/><rect x="16" y="16" width="328" height="48" rx="8" fill="rgba(15,23,42,0.85)" stroke="rgba(59,130,246,0.5)"/><text x="28" y="36" fill="%2310b981" font-size="12" font-family="Arial,sans-serif" font-weight="bold">✓ FULL DRESS %26 ID CARD VERIFIED</text><text x="28" y="52" fill="%2394a3b8" font-size="10" font-family="Arial,sans-serif">Live GPS: 28.5245° N, 77.2066° E (±8m)</text></svg>`;

    this.attendance.push(
      {
        id: 'att-01',
        user_id: mr.id,
        date: todayStr,
        check_in_at: `${todayStr}T09:15:22.000Z`,
        check_in_lat: 28.5245,
        check_in_lng: 77.2066,
        check_in_location_name: 'Headquarter Area - Shahdol Main Market (28.5245° N, 77.2066° E)',
        check_in_photo: sampleDressIdPhotoSvg,
        photo_captured_at: `${todayStr}T09:15:22.000Z`,
        photo_purged: false,
        distance_meters: 8.4,
        is_verified_location: true,
        status: 'PRESENT',
        late_minutes: 0,
        early_minutes: 0,
        working_hours: 0,
        punch_in_photo_source: 'CAMERA',
        device_integrity_status: 'VERIFIED',
        hq_id: 'hq-shahdol',
        hq_name: 'Shahdol',
        created_at: `${todayStr}T09:15:22.000Z`,
      },
      {
        id: 'att-02',
        user_id: mr2.id,
        date: yesterdayStr,
        check_in_at: `${yesterdayStr}T09:28:10.000Z`,
        check_out_at: `${yesterdayStr}T18:15:00.000Z`,
        check_in_lat: 28.521,
        check_in_lng: 77.204,
        check_in_location_name: 'District Medical Complex, Ambikapur (28.5210° N, 77.2040° E)',
        check_in_photo: null, // Purged automatically after 24 hours to save 512MB quota
        photo_captured_at: `${yesterdayStr}T09:28:10.000Z`,
        photo_purged: true,
        distance_meters: 12.0,
        is_verified_location: true,
        status: 'PRESENT',
        late_minutes: 0,
        early_minutes: 0,
        working_hours: 8.78,
        punch_in_photo_source: 'CAMERA',
        device_integrity_status: 'VERIFIED',
        hq_id: 'hq-ambikapur',
        hq_name: 'Ambikapur',
        created_at: `${yesterdayStr}T09:28:10.000Z`,
      },
    );

    // 10. Seed Headquarters (§6 & §10)
    const hqShahdol: Headquarter = {
      id: 'hq-shahdol',
      name: 'Shahdol',
      code: 'HQ-SHD',
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
    const hqDelhi: Headquarter = {
      id: 'hq-delhi',
      name: 'Delhi NCR',
      code: 'HQ-DEL',
      state: 'Delhi',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.headquarters.push(
      hqShahdol,
      hqAmbikapur,
      hqBilaspur,
      hqKotma,
      hqDelhi,
    );

    // 11. Seed HQ Areas (Mapped strictly per HQ)
    const areas = [
      // Shahdol District Sub-Areas & Villages
      { id: 'area-shd-01', hq_id: hqShahdol.id, name: 'Burhar' },
      { id: 'area-shd-02', hq_id: hqShahdol.id, name: 'Gohparu' },
      { id: 'area-shd-03', hq_id: hqShahdol.id, name: 'Beohari' },
      { id: 'area-shd-04', hq_id: hqShahdol.id, name: 'Jaisinghnagar' },
      { id: 'area-shd-05', hq_id: hqShahdol.id, name: 'Sohagpur' },
      { id: 'area-shd-06', hq_id: hqShahdol.id, name: 'Singhpur' },
      { id: 'area-shd-07', hq_id: hqShahdol.id, name: 'Shahdol Central' },

      // Ambikapur District Sub-Areas & Villages
      { id: 'area-amb-01', hq_id: hqAmbikapur.id, name: 'Sitapur' },
      { id: 'area-amb-02', hq_id: hqAmbikapur.id, name: 'Lundra' },
      { id: 'area-amb-03', hq_id: hqAmbikapur.id, name: 'Batoli' },
      { id: 'area-amb-04', hq_id: hqAmbikapur.id, name: 'Mainpat' },
      { id: 'area-amb-05', hq_id: hqAmbikapur.id, name: 'Udaipur' },
      { id: 'area-amb-06', hq_id: hqAmbikapur.id, name: 'Lakhanpur' },
      { id: 'area-amb-07', hq_id: hqAmbikapur.id, name: 'Surguja' },
      { id: 'area-amb-08', hq_id: hqAmbikapur.id, name: 'Ramanujganj' },
      { id: 'area-amb-09', hq_id: hqAmbikapur.id, name: 'Ambikapur Central' },

      // Bilaspur District Sub-Areas & Villages
      { id: 'area-bsp-01', hq_id: hqBilaspur.id, name: 'Kota' },
      { id: 'area-bsp-02', hq_id: hqBilaspur.id, name: 'Takhatpur' },
      { id: 'area-bsp-03', hq_id: hqBilaspur.id, name: 'Masturi' },
      { id: 'area-bsp-04', hq_id: hqBilaspur.id, name: 'Bilha' },
      { id: 'area-bsp-05', hq_id: hqBilaspur.id, name: 'Ratanpur' },
      { id: 'area-bsp-06', hq_id: hqBilaspur.id, name: 'Bodri' },
      { id: 'area-bsp-07', hq_id: hqBilaspur.id, name: 'Sakri' },
      { id: 'area-bsp-08', hq_id: hqBilaspur.id, name: 'Bilaspur City' },

      // Kotma Sub-Areas & Villages
      { id: 'area-ktm-01', hq_id: hqKotma.id, name: 'Kotma Town' },
      { id: 'area-ktm-02', hq_id: hqKotma.id, name: 'Anuppur' },
      { id: 'area-ktm-03', hq_id: hqKotma.id, name: 'Jaithari' },
      { id: 'area-ktm-04', hq_id: hqKotma.id, name: 'Bijuri' },
      { id: 'area-ktm-05', hq_id: hqKotma.id, name: 'Rajendragram' },
      { id: 'area-ktm-06', hq_id: hqKotma.id, name: 'Bhalumuda' },

      // Jaisinghnagar & Burhar are Sub-Areas under Shahdol HQ
      { id: 'area-jsn-01', hq_id: hqShahdol.id, name: 'Jaisinghnagar Town' },
      { id: 'area-jsn-02', hq_id: hqShahdol.id, name: 'Amdih' },
      { id: 'area-jsn-03', hq_id: hqShahdol.id, name: 'Janakpur Road' },
      { id: 'area-bhr-01', hq_id: hqShahdol.id, name: 'Burhar Town' },
      { id: 'area-bhr-02', hq_id: hqShahdol.id, name: 'Dhanpuri' },
      { id: 'area-bhr-03', hq_id: hqShahdol.id, name: 'Amlai' },
      { id: 'area-bhr-04', hq_id: hqShahdol.id, name: 'Bakaho' },

      // Delhi District Sub-Areas
      { id: 'area-del-01', hq_id: hqDelhi.id, name: 'Saket' },
      { id: 'area-del-02', hq_id: hqDelhi.id, name: 'Hauz Khas' },
      { id: 'area-del-03', hq_id: hqDelhi.id, name: 'Green Park' },
      { id: 'area-del-04', hq_id: hqDelhi.id, name: 'South Extension' },
      { id: 'area-del-05', hq_id: hqDelhi.id, name: 'Malviya Nagar' },
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

    // 12. Seed Stockers (§9 & §10) with sub_area assigned
    const stocker1: Stocker = {
      id: 'stk-shd-01',
      hq_id: hqShahdol.id,
      name: 'Shahdol Stocker 1 (Central Depot)',
      sub_area: 'Shahdol Central',
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
      sub_area: 'Shahdol Central',
      contact_person: 'Sanjay Gupta',
      phone: '9826144556',
      address: 'Station Road, Near Bus Stand, Shahdol, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker3: Stocker = {
      id: 'stk-shd-03',
      hq_id: hqShahdol.id,
      name: 'Jaisinghnagar Medical Agency',
      sub_area: 'Jaisinghnagar',
      contact_person: 'Anil Mishra',
      phone: '9826188990',
      address: 'Block Colony, Jaisinghnagar, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker4: Stocker = {
      id: 'stk-shd-04',
      hq_id: hqShahdol.id,
      name: 'Burhar Pharma Distributors',
      sub_area: 'Burhar',
      contact_person: 'Manoj Soni',
      phone: '9826177889',
      address: 'Railway Gate Road, Burhar, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker5: Stocker = {
      id: 'stk-bsp-01',
      hq_id: hqBilaspur.id,
      name: 'Bilaspur Pharma Depot',
      sub_area: 'Vyapar Vihar',
      contact_person: 'Vijay Agrawal',
      phone: '9827155667',
      address: 'Vyapar Vihar, Bilaspur, CG',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker6: Stocker = {
      id: 'stk-amb-01',
      hq_id: hqAmbikapur.id,
      name: 'Ambikapur Medical Store',
      sub_area: 'Main Market',
      contact_person: 'Rajesh Singhal',
      phone: '9827199001',
      address: 'Hospital Road, Ambikapur, CG',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker7: Stocker = {
      id: 'stk-ktm-01',
      hq_id: hqKotma.id,
      name: 'Kotma Healthcare Depot',
      sub_area: 'Station Chowk',
      contact_person: 'Deepak Tiwari',
      phone: '9827133445',
      address: 'Colliery Road, Kotma, MP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker8: Stocker = {
      id: 'stk-del-01',
      hq_id: hqDelhi.id,
      name: 'MedPlus Saket Central Depot',
      sub_area: 'Saket',
      contact_person: 'Amitav Ghosh',
      phone: '9811100221',
      address: 'Community Centre, Saket, New Delhi',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    const stocker9: Stocker = {
      id: 'stk-del-02',
      hq_id: hqDelhi.id,
      name: 'Apollo Pharmacy Hauz Khas Hub',
      sub_area: 'Hauz Khas',
      contact_person: 'Vikas Mehra',
      phone: '9811144332',
      address: 'Aurobindo Marg, Hauz Khas, New Delhi',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    this.stockers.push(stocker1, stocker2, stocker3, stocker4, stocker5, stocker6, stocker7, stocker8, stocker9);

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

    // 14. Seed Stocker Inventory (§12 & §13) - Seed every stocker with complete medicines inventory
    for (const stk of this.stockers) {
      let mIdx = 1;
      for (const med of this.medicines) {
        const qty = mIdx === 3 ? 15 : mIdx === 2 ? 30 : 50 + (mIdx * 10);
        this.stockerInventory.push({
          id: `inv-${stk.id}-${med.id}`,
          hq_id: stk.hq_id,
          stocker_id: stk.id,
          medicine_id: med.id,
          quantity: qty,
          low_stock_threshold: 15,
          updated_at: new Date().toISOString(),
        });
        mIdx++;
      }
    }

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

    // Seed Sample Monthly Stock Inward Entries
    this.monthlyStockEntries.push(
      {
        id: 'entry-oct-01',
        hq_id: hqShahdol.id,
        hq_name: hqShahdol.name,
        stocker_id: stocker1.id,
        stocker_name: stocker1.name,
        month: '2026-10',
        entry_date: '2026-10-01',
        invoice_no: 'INV-AHTRI-2026/10-01',
        medicine_id: med1.id,
        medicine_name: med1.name,
        medicine_code: med1.code,
        quantity: 50,
        unit: med1.unit,
        batch_no: 'CF50-B2610',
        expiry_date: '2028-09-30',
        notes: 'Monthly batch delivery from central warehouse',
        user_id: 'usr-admin-shivansh',
        user_name: 'Shivansh Tripathi (Admin)',
        created_at: new Date().toISOString(),
      },
      {
        id: 'entry-oct-02',
        hq_id: hqShahdol.id,
        hq_name: hqShahdol.name,
        stocker_id: stocker1.id,
        stocker_name: stocker1.name,
        month: '2026-10',
        entry_date: '2026-10-01',
        invoice_no: 'INV-AHTRI-2026/10-01',
        medicine_id: med4.id,
        medicine_name: med4.name,
        medicine_code: med4.code,
        quantity: 85,
        unit: med4.unit,
        batch_no: 'GM500-B2610',
        expiry_date: '2028-11-30',
        notes: 'Regular monthly replenishment',
        user_id: 'usr-admin-shivansh',
        user_name: 'Shivansh Tripathi (Admin)',
        created_at: new Date().toISOString(),
      },
    );

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
      status: 'APPROVED',
      submitted_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      entries: [
        {
          id: 'tp-item-1',
          date: '02-09-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Shahdol',
          work_type: 'Doctor Visit',
          planned_kol_drs: 'Dr. Rajesh Sharma',
          planned_activity: 'CardioFix-50 Detailing and Scheme Presentation',
        },
        {
          id: 'tp-item-2',
          date: '04-09-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Burhar',
          work_type: 'Order Collection',
          planned_kol_drs: 'Dr. Priya Verma',
          planned_activity: 'Antibiotic syrup follow-up and stockist order booking',
        },
        {
          id: 'tp-item-3',
          date: '08-09-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Kotma',
          work_type: 'Follow-up',
          planned_kol_drs: 'Dr. Anita Desai',
          planned_activity: 'DermaSoothe sample trials evaluation',
        },
      ],
    });

    this.monthlyTourPlans.push({
      id: 'mtp-02',
      mr_id: mr.id,
      mr_name: mr.name,
      month: '2026-10',
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      entries: [
        {
          id: 'tp-item-4',
          date: '04-10-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Gohparu',
          work_type: 'Doctor Visit',
          planned_kol_drs: 'Dr. Alok Nath',
          planned_activity: 'Doctor Detailing & Product Sample Handover',
        },
        {
          id: 'tp-item-5',
          date: '05-10-2026',
          hq_id: hqShahdol.id,
          hq_name: 'Shahdol',
          planned_area: 'Burhar',
          work_type: 'Doctor Visit',
          planned_kol_drs: 'Dr. Sandeep Gupta',
          planned_activity: 'Chemist Order Booking & Detailing',
        },
      ],
    });
  }
}
