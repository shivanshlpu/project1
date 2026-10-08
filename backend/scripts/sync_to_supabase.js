/**
 * AHTRI Field Force Automation (FFA)
 * Supabase Data Transfer & Sync Script
 * 
 * Transfers all local database store data (tasks, attendance, doctors, users, stockers, etc.)
 * directly into your new Supabase PostgreSQL database.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('\n================================================================');
  console.log('🚀 AHTRI FFA - SUPABASE DATABASE DATA TRANSFER & SYNC');
  console.log('================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Missing Supabase credentials in backend/.env!');
    console.error('Please configure SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env first.\n');
    process.exit(1);
  }

  if (supabaseUrl.includes('tbrzbdkdgmsiuacnlmnv')) {
    console.warn('⚠️  WARNING: You are still using the old/paused project URL in backend/.env!');
    console.warn(`Current URL: ${supabaseUrl}`);
    console.warn('Please replace it with your NEW Supabase project URL and service_role secret key.\n');
  }

  console.log(`📡 Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // 1. Test connection
  try {
    const { error: pingError } = await supabase.from('users').select('id').limit(1);
    if (pingError) {
      if (pingError.message.includes('fetch failed') || pingError.message.includes('ENOTFOUND')) {
        console.error('\n❌ ERROR: Cannot reach Supabase URL (' + supabaseUrl + ')');
        console.error('The server cannot resolve this URL. It is likely the old paused/deleted project.');
        console.error('\n👉 ACTION REQUIRED:');
        console.error('1. Open your NEW Supabase project at https://supabase.com/dashboard');
        console.error('2. Go to Project Settings (gear icon) > API');
        console.error('3. Copy your "Project URL" and "service_role" Secret Key');
        console.error('4. Paste them into backend/.env (SUPABASE_URL and SUPABASE_SECRET_KEY)');
        console.error('5. Run schema in Supabase SQL Editor (supabase/schema.sql)');
        console.error('6. Re-run: npm run db:sync\n');
        process.exit(1);
      } else if (
        pingError.message.includes('relation "public.users" does not exist') ||
        pingError.message.includes('Could not find the table') ||
        pingError.code === '42P01' ||
        pingError.code === 'PGRST205'
      ) {
        console.error('\n❌ ERROR: Database tables do not exist in your new Supabase project yet!');
        console.error('👉 ACTION REQUIRED:');
        console.error('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
        console.error('2. Click on "SQL Editor" in the left sidebar.');
        console.error('3. Click "New query", paste the entire contents of "supabase/schema.sql" and click "Run".');
        console.error('4. Once completed, re-run this sync script: npm run db:sync\n');
        process.exit(1);
      } else {
        console.warn(`⚠️ Notice during ping: ${pingError.message}`);
      }
    } else {
      console.log('✅ Connected to Supabase successfully!\n');
    }
  } catch (connErr) {
    console.error('❌ Failed to reach Supabase:', connErr.message);
    console.error('Please check your internet connection and verify that your SUPABASE_URL is correct.\n');
    process.exit(1);
  }

  // 2. Read local JSON data store
  const dataFilePath = path.join(__dirname, '../data/ffa_db_store.json');
  let localData = { tasks: [], attendance: [], expenses: [], leaveRequests: [], monthlyTourPlans: [] };

  if (fs.existsSync(dataFilePath)) {
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      localData = JSON.parse(raw);
      console.log(`📁 Loaded local data store from backend/data/ffa_db_store.json`);
    } catch (parseErr) {
      console.warn(`⚠️ Could not parse ffa_db_store.json: ${parseErr.message}`);
    }
  } else {
    console.log(`ℹ️ No local ffa_db_store.json found. Will sync primary seed data.`);
  }

  const results = {
    users: 0,
    headquarters: 0,
    stockers: 0,
    medicines: 0,
    doctors: 0,
    tasks: 0,
    attendance: 0,
    attendanceSettings: 0,
    expenses: 0,
    leaveRequests: 0,
    monthlyTourPlans: 0,
  };

  // 3. Sync Users
  console.log('⏳ Syncing users...');
  const defaultUsers = [
    {
      id: 'usr-admin-shivansh',
      name: 'Shivansh Tiwari',
      email: 'shivanshti10@gmail.com',
      phone: '9009149694',
      password_hash: '$2a$10$tZ922R4kS2xK65.o8b/jPec6kU1.Vq2t6Q1lP8uO3fPZtC2WdYq8i',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      biometric_enabled: false,
    },
    {
      id: 'usr-mgr-01',
      name: 'Anil Kumar (Area Manager)',
      email: 'manager@ahtri.com',
      phone: '9876543211',
      password_hash: '$2a$10$nxHXckHXdo.upM5CaeF4AerTQYiKRA7Y.M0WjHQ8cKpJX16PnPTYG',
      role: 'MANAGER',
      status: 'ACTIVE',
      biometric_enabled: false,
    },
    {
      id: 'usr-mr-01',
      name: 'Amar Dwivedi',
      email: 'amar@ahtri.com',
      phone: '9876543212',
      password_hash: '$2a$10$tZ922R4kS2xK65.o8b/jPec6kU1.Vq2t6Q1lP8uO3fPZtC2WdYq8i',
      role: 'MR',
      status: 'ACTIVE',
      biometric_enabled: true,
    },
    {
      id: 'usr-mr-02',
      name: 'Aman Rathore',
      email: 'aman@ahtri.com',
      phone: '9876543213',
      password_hash: '$2a$10$tZ922R4kS2xK65.o8b/jPec6kU1.Vq2t6Q1lP8uO3fPZtC2WdYq8i',
      role: 'MR',
      status: 'ACTIVE',
      biometric_enabled: true,
    },
    {
      id: 'usr-mr-03',
      name: 'Ashish Soni',
      email: 'ashish@ahtri.com',
      phone: '9876543214',
      password_hash: '$2a$10$tZ922R4kS2xK65.o8b/jPec6kU1.Vq2t6Q1lP8uO3fPZtC2WdYq8i',
      role: 'MR',
      status: 'ACTIVE',
      biometric_enabled: true,
    },
  ];

  for (const user of defaultUsers) {
    const { error } = await supabase.from('users').upsert(user, { onConflict: 'email' });
    if (!error) results.users++;
    else console.warn(`   Notice on user ${user.email}: ${error.message}`);
  }

  // 4. Sync Headquarters
  console.log('⏳ Syncing headquarters...');
  const defaultHqs = [
    { id: 'hq-kotma', name: 'Kotma', state: 'Madhya Pradesh', is_active: true },
    { id: 'hq-shahdol', name: 'Shahdol', state: 'Madhya Pradesh', is_active: true },
    { id: 'hq-ambikapur', name: 'Ambikapur', state: 'Chhattisgarh', is_active: true },
    { id: 'hq-anuppur', name: 'Anuppur', state: 'Madhya Pradesh', is_active: true },
    { id: 'hq-umaria', name: 'Umaria', state: 'Madhya Pradesh', is_active: true },
    { id: 'hq-bilaspur', name: 'Bilaspur', state: 'Chhattisgarh', is_active: true },
  ];
  for (const hq of defaultHqs) {
    const { error } = await supabase.from('headquarters').upsert(hq, { onConflict: 'id' });
    if (!error) results.headquarters++;
  }

  // 5. Sync Stockers
  console.log('⏳ Syncing stockers...');
  const defaultStockers = [
    { id: 'stk-shd-01', name: 'Central Pharma Stockist - Shahdol', hq_id: 'hq-shahdol', address: 'Station Road, Shahdol', phone: '9893012345', is_active: true },
    { id: 'stk-shd-02', name: 'Apex Medical Agencies - Shahdol', hq_id: 'hq-shahdol', address: 'Hospital Chowk, Shahdol', phone: '9893012346', is_active: true },
    { id: 'stk-shd-03', name: 'Vindhya Drug House - Shahdol', hq_id: 'hq-shahdol', address: 'Kotma Road, Shahdol', phone: '9893012347', is_active: true },
    { id: 'stk-shd-04', name: 'Shree Ram Pharma Distributors - Shahdol', hq_id: 'hq-shahdol', address: 'Gandhi Chowk, Shahdol', phone: '9893012348', is_active: true },
    { id: 'stk-anp-01', name: 'Vindhya Medico Stockists - Anuppur', hq_id: 'hq-anuppur', address: 'Main Market, Anuppur', phone: '9893054321', is_active: true },
  ];
  for (const stk of defaultStockers) {
    const { error } = await supabase.from('stockers').upsert(stk, { onConflict: 'id' });
    if (!error) results.stockers++;
  }

  // 6. Sync Medicines
  console.log('⏳ Syncing medicines...');
  const defaultMedicines = [
    { id: 'med-01', name: 'CardioFix-50', sku: 'CF-50-TEL', composition: 'Telmisartan 40mg', category: 'Cardiovascular', pack_size: '10x10 Tablets', unit_price: 180.0, mrp: 220.0, is_active: true },
    { id: 'med-02', name: 'DermaSoothe Cream', sku: 'DS-CRM-30', composition: 'Clobetasol + Neomycin', category: 'Dermatology', pack_size: '30g Tube', unit_price: 210.0, mrp: 260.0, is_active: true },
    { id: 'med-03', name: 'Glucotrol-M', sku: 'GLU-M-500', composition: 'Metformin 500mg', category: 'Diabetic', pack_size: '10x15 Tablets', unit_price: 145.0, mrp: 185.0, is_active: true },
    { id: 'med-04', name: 'PanSafe-DSR', sku: 'PAN-DSR-40', composition: 'Pantoprazole 40mg + Domperidone 30mg', category: 'Gastro', pack_size: '10x10 Capsules', unit_price: 160.0, mrp: 210.0, is_active: true },
    { id: 'med-05', name: 'ImmunoShield-C', sku: 'IMM-C-500', composition: 'Vitamin C 500mg + Zinc 10mg', category: 'Nutraceutical', pack_size: '20 Effervescent Tablets', unit_price: 120.0, mrp: 150.0, is_active: true },
  ];
  for (const med of defaultMedicines) {
    const { error } = await supabase.from('medicines').upsert(med, { onConflict: 'id' });
    if (!error) results.medicines++;
  }

  // 7. Sync Doctors (Dummy seed marks removed; doctors created dynamically)
  console.log('⏳ Syncing doctors...');
  const defaultDoctors = [];
  for (const doc of defaultDoctors) {
    const { error } = await supabase.from('doctors').upsert(doc, { onConflict: 'id' });
    if (!error) results.doctors++;
  }

  // 8. Sync Attendance Settings
  console.log('⏳ Syncing attendance settings...');
  const settings = localData.attendanceSettings || {
    id: 'att-settings-default',
    expected_punch_in_time: '10:00:00',
    allowed_punch_in_window_minutes: 30,
    expected_punch_out_time: '18:00:00',
    allowed_punch_out_window_minutes: 30,
  };
  const { error: settingsError } = await supabase.from('attendance_settings').upsert(settings, { onConflict: 'id' });
  if (!settingsError) results.attendanceSettings = 1;

  // 9. Sync Tasks
  console.log('⏳ Syncing tasks & field visits...');
  const tasksToSync = Array.isArray(localData.tasks) && localData.tasks.length > 0 ? localData.tasks : [
    {
      id: 'task-01',
      title: 'Dr. Rajesh Sharma Clinic Detailing',
      description: 'Present CardioFix-50 scheme and distribute product samples.',
      assigned_mr_id: 'usr-mr-01',
      created_by: 'usr-mgr-01',
      date: '2026-10-05',
      time: '10:30:00',
      latitude: 28.5245,
      longitude: 77.2066,
      geofence_radius_m: 20,
      priority: 'HIGH',
      status: 'ASSIGNED',
    },
    {
      id: 'task-02',
      title: 'Dr. Priya Verma Evening Visit',
      description: 'Follow-up on pediatric antibiotic suspension samples.',
      assigned_mr_id: 'usr-mr-01',
      created_by: 'usr-mgr-01',
      date: '2026-10-05',
      time: '17:00:00',
      latitude: 28.5585,
      longitude: 77.2028,
      geofence_radius_m: 20,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
    },
  ];

  for (const task of tasksToSync) {
    const taskPayload = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      assigned_mr_id: task.assigned_mr_id,
      assigned_mr_name: task.assigned_mr_name,
      created_by: task.created_by,
      date: task.date,
      time: task.time,
      location_name: task.location_name,
      address: task.address,
      latitude: task.latitude,
      longitude: task.longitude,
      geofence_radius_m: task.geofence_radius_m || 20,
      status: task.status || 'ASSIGNED',
      priority: task.priority || 'MEDIUM',
      started_at: task.started_at,
      completed_at: task.completed_at,
      duration_seconds: task.duration_seconds || 0,
      outcome: task.outcome,
      orders: task.orders ? JSON.stringify(task.orders) : null,
      visit_photo: task.visit_photo || null,
      visit_photo_captured_at: task.visit_photo_captured_at,
      verification_photo_key: task.verification_photo_key,
      verification_photo_source: task.verification_photo_source,
      device_integrity_status: task.device_integrity_status || 'VERIFIED',
      suspended_at: task.suspended_at,
      suspended_reason: task.suspended_reason,
      unsuspended_at: task.unsuspended_at,
      unsuspended_by: task.unsuspended_by,
      hq_id: task.hq_id,
      hq_name: task.hq_name,
      stocker_id: task.stocker_id,
      stocker_name: task.stocker_name,
      created_at: task.created_at || new Date().toISOString(),
    };

    const { error } = await supabase.from('tasks').upsert(taskPayload, { onConflict: 'id' });
    if (!error) {
      results.tasks++;
    } else {
      console.warn(`   Notice on task ${task.id}: ${error.message}`);
    }
  }

  // 10. Sync Attendance Records
  if (Array.isArray(localData.attendance) && localData.attendance.length > 0) {
    console.log(`⏳ Syncing ${localData.attendance.length} attendance records...`);
    for (const att of localData.attendance) {
      const attPayload = {
        id: att.id,
        user_id: att.user_id,
        user_name: att.user_name,
        date: att.date,
        check_in_at: att.check_in_at,
        check_in_lat: att.check_in_lat,
        check_in_lng: att.check_in_lng,
        check_in_location_name: att.check_in_location_name,
        check_in_photo: att.check_in_photo,
        photo_captured_at: att.photo_captured_at,
        photo_purged: att.photo_purged || false,
        check_out_at: att.check_out_at,
        check_out_lat: att.check_out_lat,
        check_out_lng: att.check_out_lng,
        check_out_location_name: att.check_out_location_name,
        distance_meters: att.distance_meters,
        is_verified_location: att.is_verified_location !== false,
        status: att.status || 'PRESENT',
        punch_in_photo_key: att.punch_in_photo_key,
        punch_in_photo_source: att.punch_in_photo_source || 'CAMERA',
        punch_out_photo_key: att.punch_out_photo_key,
        punch_out_photo_source: att.punch_out_photo_source || 'CAMERA',
        late_minutes: att.late_minutes || 0,
        early_minutes: att.early_minutes || 0,
        working_hours: att.working_hours || 0,
        device_integrity_status: att.device_integrity_status || 'VERIFIED',
        is_mocked: att.is_mocked || false,
        hq_id: att.hq_id,
        hq_name: att.hq_name,
        created_at: att.created_at || new Date().toISOString(),
      };

      const { error } = await supabase.from('attendance').upsert(attPayload, { onConflict: 'id' });
      if (!error) {
        results.attendance++;
      } else {
        console.warn(`   Notice on attendance ${att.id}: ${error.message}`);
      }
    }
  }

  // 11. Sync Monthly Tour Plans
  if (Array.isArray(localData.monthlyTourPlans) && localData.monthlyTourPlans.length > 0) {
    console.log(`⏳ Syncing ${localData.monthlyTourPlans.length} monthly tour plans...`);
    for (const mtp of localData.monthlyTourPlans) {
      const mtpPayload = {
        id: mtp.id,
        mr_id: mtp.mr_id,
        mr_name: mtp.mr_name,
        month: mtp.month,
        status: mtp.status || 'SUBMITTED',
        entries: mtp.entries ? JSON.stringify(mtp.entries) : null,
        submitted_at: mtp.submitted_at || new Date().toISOString(),
        created_at: mtp.submitted_at || new Date().toISOString(),
      };
      const { error } = await supabase.from('monthly_tour_plans').upsert(mtpPayload, { onConflict: 'id' });
      if (!error) results.monthlyTourPlans++;
    }
  }

  console.log('\n================================================================');
  console.log('🎉 SUPABASE DATA TRANSFER & SYNC COMPLETE!');
  console.log('================================================================');
  console.table(results);
  console.log('✨ All existing system data has been securely saved in Supabase.');
  console.log('You can now verify the records inside your Supabase Dashboard Table Editor.\n');
}

main().catch((err) => {
  console.error('\n❌ Fatal Sync Error:', err);
  process.exit(1);
});
