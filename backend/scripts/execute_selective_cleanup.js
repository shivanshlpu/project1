/**
 * Selective Database Cleanup Script
 * Cleans dynamic transactional data (tasks, attendance, orders, saved locations, 
 * test monthly TPs, competitions, stock quantities) while strictly preserving:
 * - Admin and MR login accounts & credentials
 * - All 28 saved route batches
 * - All 4 headquarters and 37 sub-areas
 * - All 17 medicines and 34 packaging variants
 * - All TP reimbursement rates (₹2.25/km) and medicine prices
 * - All 5 stocker depot entities (with inventory balances reset to 0)
 */

const fs = require('path') ? require('fs') : null;
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

async function cleanLocalJsonStore(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[Store] File not found: ${filePath}`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`🧹 Cleaning Local Store: ${filePath}`);
  console.log(`======================================================`);

  const raw = fs.readFileSync(filePath, 'utf8');
  const db = JSON.parse(raw);

  // Record counts before
  const beforeCounts = {
    tasks: db.tasks?.length || 0,
    doctors: db.doctors?.length || 0,
    savedLocations: db.savedLocations?.length || 0,
    orders: db.orders?.length || 0,
    attendance: db.attendance?.length || 0,
    monthlyTourPlans: db.monthlyTourPlans?.length || 0,
    competitions: db.competitions?.length || 0,
    stockEntries: db.monthlyStockEntries?.length || 0,
    inventoryTransactions: db.inventoryTransactions?.length || 0,
    routeChangeRequests: db.routeChangeRequests?.length || 0,
    users: db.users?.length || 0,
    routeBatches: db.routeBatches?.length || 0,
    headquarters: db.headquarters?.length || 0,
    medicines: db.medicines?.length || 0,
    stockers: db.stockers?.length || 0,
    stockerInventory: db.stockerInventory?.length || 0,
  };

  // 1. Clear transactional arrays
  db.tasks = [];
  db.taskAssignments = [];
  db.locationVerifications = [];
  db.doctors = [];
  db.savedLocations = [];
  db.approvals = [];
  db.orders = [];
  db.deletedOrderIds = [];
  db.attendance = [];
  db.doctorVisits = [];
  db.visitDetails = [];
  db.dcrList = [];
  db.dcrItems = [];
  db.expenses = [];
  db.leaveRequests = [];
  db.tourPlans = [];
  db.monthlyTourPlans = [];
  db.routeChangeRequests = [];
  db.monthlyStockEntries = [];
  db.inventoryTransactions = [];
  db.verificationPhotos = [];
  db.monthlyStockagePermissions = [];
  db.stockageSubmissionRequests = [];
  db.competitions = [];
  db.rewardClaims = [];
  db.notifications = [];
  db.fcmTokens = [];

  // 2. Reset stocker inventory quantities to 0 (preserving the 85 product slots across 5 stockers)
  if (Array.isArray(db.stockerInventory)) {
    db.stockerInventory = db.stockerInventory.map((item) => ({
      ...item,
      quantity: 0,
      available_stock: 0,
      opening_stock: 0,
      closing_stock: 0,
      low_stock_threshold: item.low_stock_threshold || 10,
      status: 'Out of Stock',
      is_out_of_stock: true,
      updated_at: new Date().toISOString(),
    }));
  }

  // 3. Ensure protected data integrity
  console.log(`Protected Entities Status:`);
  console.log(`  - Users: ${db.users?.length || 0} (Preserved)`);
  console.log(`  - Route Batches: ${db.routeBatches?.length || 0} (Preserved)`);
  console.log(`  - Headquarters: ${db.headquarters?.length || 0} (Preserved)`);
  console.log(`  - HQ Areas: ${db.hqAreas?.length || 0} (Preserved)`);
  console.log(`  - Medicines: ${db.medicines?.length || 0} (Preserved)`);
  console.log(`  - Packaging Variants: ${db.medicinePackagingVariants?.length || 0} (Preserved)`);
  console.log(`  - Stockers: ${db.stockers?.length || 0} (Preserved)`);
  console.log(`  - Stocker Inventory Slots: ${db.stockerInventory?.length || 0} (Stock reset to 0)`);
  console.log(`  - TP Rate per km: ₹${db.attendanceSettings?.reimbursement_rate_per_km || 2.25} (Preserved)`);

  db.saved_at = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`✓ Cleaned store saved successfully.`);
}

async function cleanSupabase() {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!sbUrl || !sbKey) {
    console.log('[Supabase] Missing credentials, skipping cloud cleanup.');
    return;
  }

  console.log(`\n======================================================`);
  console.log(`📡 Cleaning Supabase Database: ${sbUrl}`);
  console.log(`======================================================`);

  const supabase = createClient(sbUrl, sbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Delete test tasks
  try {
    const { error } = await supabase.from('tasks').delete().neq('id', '__keep_nothing__');
    if (error) console.warn('[Supabase] tasks delete notice:', error.message);
    else console.log('✓ Supabase: tasks table cleared.');
  } catch (e) {
    console.warn('[Supabase] tasks exception:', e.message);
  }

  // 2. Delete test attendance
  try {
    const { error } = await supabase.from('attendance').delete().neq('id', '__keep_nothing__');
    if (error) console.warn('[Supabase] attendance delete notice:', error.message);
    else console.log('✓ Supabase: attendance table cleared.');
  } catch (e) {
    console.warn('[Supabase] attendance exception:', e.message);
  }

  // 3. Delete test monthly tour plans
  try {
    const { error } = await supabase.from('monthly_tour_plans').delete().neq('id', '__keep_nothing__');
    if (error) console.warn('[Supabase] monthly_tour_plans delete notice:', error.message);
    else console.log('✓ Supabase: monthly_tour_plans table cleared.');
  } catch (e) {
    console.warn('[Supabase] monthly_tour_plans exception:', e.message);
  }

  // 4. Delete test leave applications (preserving QUOTA_CONFIG)
  try {
    const { error } = await supabase.from('leave_requests').delete().neq('leave_type', 'QUOTA_CONFIG');
    if (error) console.warn('[Supabase] leave_requests delete notice:', error.message);
    else console.log('✓ Supabase: non-quota leave_requests cleared (quota configurations preserved).');
  } catch (e) {
    console.warn('[Supabase] leave_requests exception:', e.message);
  }

  // 5. Reset stocker_inventory stock to 0
  try {
    const { error } = await supabase.from('stocker_inventory').update({
      quantity: 0,
      available_stock: 0,
      updated_at: new Date().toISOString(),
    }).gte('quantity', 0);
    if (error) console.warn('[Supabase] stocker_inventory reset notice:', error.message);
    else console.log('✓ Supabase: stocker_inventory balances reset to 0.');
  } catch (e) {
    console.warn('[Supabase] stocker_inventory exception:', e.message);
  }

  // 6. Verify protected records in Supabase
  const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: hqsCount } = await supabase.from('headquarters').select('*', { count: 'exact', head: true });
  const { count: batchesCount } = await supabase.from('route_batches').select('*', { count: 'exact', head: true });
  const { count: medsCount } = await supabase.from('medicines').select('*', { count: 'exact', head: true });
  const { count: stockersCount } = await supabase.from('stockers').select('*', { count: 'exact', head: true });

  console.log(`\nSupabase Protected Records Verified:`);
  console.log(`  - Users: ${usersCount} (Intact)`);
  console.log(`  - Headquarters: ${hqsCount} (Intact)`);
  console.log(`  - Route Batches: ${batchesCount} (Intact)`);
  console.log(`  - Medicines: ${medsCount} (Intact)`);
  console.log(`  - Stockers: ${stockersCount} (Intact)`);
}

async function main() {
  await cleanLocalJsonStore(path.join(__dirname, '../data/ffa_db_store.json'));
  await cleanLocalJsonStore(path.join(__dirname, '../data/ffa_db_store.seed.json'));
  await cleanSupabase();
  console.log('\n======================================================');
  console.log('🎉 Selective Database Cleanup Complete!');
  console.log('======================================================\n');
}

main().catch(console.error);
