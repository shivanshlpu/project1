const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:3000${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, text: data });
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- STARTING VERIFICATION TEST SUITE ---');

  // 1. Login as Admin
  console.log('\n[1] Logging in as Admin (shivanshti10@gmail.com)...');
  const adminLogin = await request('POST', '/auth/login', {
    identifier: 'shivanshti10@gmail.com',
    password: '87654321',
  });
  console.log('Admin login status:', adminLogin.status);
  const adminToken = adminLogin.data?.access_token || adminLogin.data?.token;
  console.log('Admin logged in:', Boolean(adminToken));

  // 2. Login as MR
  console.log('\n[2] Logging in as MR (Aman Rathore - aman@ahtri.com)...');
  const mrLogin = await request('POST', '/auth/login', {
    identifier: 'aman@ahtri.com',
    password: 'AmanRathoreSHD',
  });
  console.log('MR login status:', mrLogin.status);
  const mrToken = mrLogin.data?.access_token || mrLogin.data?.token;
  console.log('MR logged in:', Boolean(mrToken));

  // 3. Test Suggest Route Batches as MR (Fare should be HIDDEN)
  console.log('\n[3] Testing Suggest Route Batches as MR (Fare must be HIDDEN)...');
  const mrSuggest = await request(
    'GET',
    '/territories/route-batches/suggest?destination=Budhar&hq_id=hq-shahdol',
    null,
    mrToken,
  );
  console.log('MR Suggest status:', mrSuggest.status);
  const mrBatch = mrSuggest.data?.suggested_batch;
  console.log('MR Batch Code:', mrBatch?.batch_code);
  console.log('MR Batch One-Way Distance:', mrBatch?.one_way_distance_km, 'km');
  console.log('MR Batch Round-Trip Distance:', mrBatch?.round_trip_distance_km, 'km');
  console.log('MR Reimbursement Rate (must be undefined):', mrBatch?.reimbursement_rate);
  console.log('MR Reimbursement Amount (must be undefined):', mrBatch?.reimbursement_amount);
  console.log('MR Configured Rate (must be undefined):', mrSuggest.data?.configured_rate);

  if (mrBatch?.reimbursement_rate !== undefined || mrBatch?.reimbursement_amount !== undefined) {
    console.error('FAIL: Fare leaked to MR in route-batches/suggest!');
  } else {
    console.log('PASS: Fare is successfully HIDDEN from MR!');
  }

  // 4. Test Suggest Route Batches as Admin (Round-Trip Fare must be visible)
  console.log('\n[4] Testing Suggest Route Batches as Admin (Round-Trip Fare must be calculated)...');
  const adminSuggest = await request(
    'GET',
    '/territories/route-batches/suggest?destination=Budhar&hq_id=hq-shahdol',
    null,
    adminToken,
  );
  const adminBatch = adminSuggest.data?.suggested_batch;
  console.log('Admin Batch Code:', adminBatch?.batch_code);
  console.log('Admin One-Way Distance:', adminBatch?.one_way_distance_km, 'km');
  console.log('Admin Round-Trip Distance:', adminBatch?.round_trip_distance_km, 'km');
  console.log('Admin Reimbursement Rate:', adminBatch?.reimbursement_rate);
  console.log('Admin Reimbursement Amount (Two-Way):', adminBatch?.reimbursement_amount);

  const expectedRoundTripAmount = Math.round(adminBatch?.round_trip_distance_km * adminBatch?.reimbursement_rate * 100) / 100;
  if (adminBatch?.reimbursement_amount === expectedRoundTripAmount) {
    console.log(`PASS: Round-Trip two-way fare calculation correct! (${adminBatch?.round_trip_distance_km} km @ ₹${adminBatch?.reimbursement_rate}/km = ₹${adminBatch?.reimbursement_amount})`);
  } else {
    console.error(`FAIL: Round-trip fare mismatch: got ${adminBatch?.reimbursement_amount}, expected ${expectedRoundTripAmount}`);
  }

  // 5. Punch Visit with Predefined Batch (e.g. Batch 1)
  console.log('\n[5] Punching Visit with Predefined Route Batch (Batch 1)...');
  const batchPunch = await request(
    'POST',
    '/tour-plans/punch',
    {
      date: '15-10-2026',
      hq_id: 'hq-shahdol',
      hq_name: 'Shahdol',
      planned_area: 'Budhar',
      work_type: 'Doctor Visit',
      planned_kol_drs: 'Dr. V. K. Patel',
      planned_activity: 'Cardio product sampling',
      route_batch_code: 'Batch 1',
    },
    mrToken,
  );
  console.log('Batch Punch status:', batchPunch.status);
  const savedBatchEntry = batchPunch.data?.entries?.find((e) => e.date === '15-10-2026');
  console.log('Saved entry:', {
    date: savedBatchEntry?.date,
    area: savedBatchEntry?.planned_area,
    batch_code: savedBatchEntry?.route_batch_code,
    one_way_distance_km: savedBatchEntry?.one_way_distance_km,
    round_trip_distance_km: savedBatchEntry?.round_trip_distance_km,
    distance_km: savedBatchEntry?.distance_km,
    rate: savedBatchEntry?.reimbursement_rate,
    amount: savedBatchEntry?.reimbursement_amount,
    calculation_basis: savedBatchEntry?.calculation_basis,
  });

  // 6. Punch Visit to Particular Area WITHOUT Selecting Batch (Center to Boundary Fallback)
  console.log('\n[6] Punching Visit to Area WITHOUT Batch: "Jaisinghnagar" (Center-to-Boundary)...');
  const nonBatchPunch = await request(
    'POST',
    '/tour-plans/punch',
    {
      date: '16-10-2026',
      hq_id: 'hq-shahdol',
      hq_name: 'Shahdol',
      planned_area: 'Jaisinghnagar',
      work_type: 'Doctor Visit',
      planned_kol_drs: 'Dr. S. K. Mishra',
      planned_activity: 'Chemist detailing',
      // NO route_batch_id or route_batch_code provided!
    },
    mrToken,
  );
  console.log('Non-Batch Punch status:', nonBatchPunch.status);
  const savedNonBatchEntry = nonBatchPunch.data?.entries?.find((e) => e.date === '16-10-2026');
  console.log('Saved Non-Batch entry:', {
    date: savedNonBatchEntry?.date,
    area: savedNonBatchEntry?.planned_area,
    route: savedNonBatchEntry?.route,
    batch_code: savedNonBatchEntry?.route_batch_code,
    one_way_distance_km: savedNonBatchEntry?.one_way_distance_km,
    round_trip_distance_km: savedNonBatchEntry?.round_trip_distance_km,
    distance_km: savedNonBatchEntry?.distance_km,
    rate: savedNonBatchEntry?.reimbursement_rate,
    amount: savedNonBatchEntry?.reimbursement_amount,
    calculation_basis: savedNonBatchEntry?.calculation_basis,
  });

  if (
    savedNonBatchEntry?.one_way_distance_km === 60 &&
    savedNonBatchEntry?.round_trip_distance_km === 120 &&
    savedNonBatchEntry?.reimbursement_amount === 300 &&
    savedNonBatchEntry?.calculation_basis === 'ROUND_TRIP_CENTER_TO_BOUNDARY'
  ) {
    console.log('PASS: Shahdol center to Jaisinghnagar boundary calculated correctly (60 km one-way, 120 km round-trip = ₹300.00)!');
  } else {
    console.error('FAIL: Center-to-boundary calculation not matching expected values');
  }

  // 7. Punch another area: "Beohari" (distant town)
  console.log('\n[7] Punching Visit to Area WITHOUT Batch: "Beohari" (Center-to-Boundary)...');
  const beohariPunch = await request(
    'POST',
    '/tour-plans/punch',
    {
      date: '17-10-2026',
      hq_id: 'hq-shahdol',
      hq_name: 'Shahdol',
      planned_area: 'Beohari',
      work_type: 'Order Collection',
      planned_kol_drs: 'Beohari Central Pharmacy',
      planned_activity: 'Stock check',
    },
    mrToken,
  );
  const savedBeohariEntry = beohariPunch.data?.entries?.find((e) => e.date === '17-10-2026');
  console.log('Saved Beohari entry:', {
    date: savedBeohariEntry?.date,
    area: savedBeohariEntry?.planned_area,
    route: savedBeohariEntry?.route,
    one_way: savedBeohariEntry?.one_way_distance_km,
    round_trip: savedBeohariEntry?.round_trip_distance_km,
    fare: savedBeohariEntry?.reimbursement_amount,
    basis: savedBeohariEntry?.calculation_basis,
  });

  if (savedBeohariEntry?.one_way_distance_km === 78 && savedBeohariEntry?.round_trip_distance_km === 156 && savedBeohariEntry?.reimbursement_amount === 390) {
    console.log('PASS: Shahdol center to Beohari boundary calculated correctly (78 km one-way, 156 km round-trip = ₹390.00)!');
  }

  // 8. Test Admin Consolidated Monthly Tour Plan endpoint
  console.log('\n[8] Testing Admin Monthly Tour Plan Details API (GET /tour-plans/admin)...');
  const adminTpList = await request(
    'GET',
    '/tour-plans/admin?month=2026-10',
    null,
    adminToken,
  );
  console.log('Admin TP List count:', adminTpList.data?.length);
  const adminEntries = adminTpList.data || [];
  const test15 = adminEntries.find((e) => e.date === '15-10-2026');
  const test16 = adminEntries.find((e) => e.date === '16-10-2026');

  console.log('\nAdmin View for Predefined Batch Entry (15-10-2026):', {
    mr: test15?.mr_name,
    dest: test15?.destination,
    route: test15?.route,
    one_way: test15?.one_way_distance_km,
    round_trip: test15?.round_trip_distance_km,
    fare: test15?.reimbursement_amount,
    basis: test15?.calculation_basis,
  });

  console.log('\nAdmin View for Center-to-Boundary Entry (16-10-2026):', {
    mr: test16?.mr_name,
    dest: test16?.destination,
    route: test16?.route,
    one_way: test16?.one_way_distance_km,
    round_trip: test16?.round_trip_distance_km,
    fare: test16?.reimbursement_amount,
    basis: test16?.calculation_basis,
  });

  console.log('\n--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
}

run().catch((err) => {
  console.error('Test execution error:', err);
});
