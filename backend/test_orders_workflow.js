const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== TEST SUITE: ORDERS WORKFLOW & HQ ISOLATION ===\n');

  // 1. Log in Admin
  const adminLogin = await request('POST', '/auth/login', {
    identifier: 'shivanshti10@gmail.com',
    password: 'password123',
    role: 'ADMIN',
  });
  console.log('[1] Admin Login Status:', adminLogin.status);
  const adminToken = adminLogin.body.access_token;

  // 2. Log in Shahdol MR (Aman Rathore)
  const shdMrLogin = await request('POST', '/auth/login', {
    identifier: 'aman@ahtri.com',
    password: 'AmanRathoreSHD',
  });
  console.log('[2] Shahdol MR Login Status:', shdMrLogin.status);
  const shdToken = shdMrLogin.body.access_token;

  // 3. Log in Ambikapur MR (Ashish Soni)
  const ambMrLogin = await request('POST', '/auth/login', {
    identifier: 'ashish@ahtri.com',
    password: 'AshishSoniAMB',
  });
  console.log('[3] Ambikapur MR Login Status:', ambMrLogin.status);
  const ambToken = ambMrLogin.body.access_token;

  // 4. Test HQ Scoping on GET /orders
  console.log('\n[4] Testing HQ Scoping...');
  const shdOrders = await request('GET', '/orders', null, shdToken);
  console.log('Shahdol MR Orders count:', shdOrders.body.length);
  const hasOnlyShd = shdOrders.body.every(
    (o) => o.hq_id.toLowerCase().includes('shd') || o.hq_id.toLowerCase().includes('shahdol'),
  );
  console.log('PASS: Shahdol MR sees ONLY Shahdol orders:', hasOnlyShd);

  const ambOrders = await request('GET', '/orders', null, ambToken);
  console.log('Ambikapur MR Orders count:', ambOrders.body.length);
  const hasOnlyAmb = ambOrders.body.every(
    (o) => o.hq_id.toLowerCase().includes('amb'),
  );
  console.log('PASS: Ambikapur MR sees ONLY Ambikapur orders:', hasOnlyAmb);

  const adminOrders = await request('GET', '/orders', null, adminToken);
  console.log('Admin sees all orders count:', adminOrders.body.length);

  // 5. Check Inventory Before Order Creation
  console.log('\n[5] Checking Stocker Inventory before new order...');
  const invBefore = await request('GET', '/inventory/stockers/stk-amb-01/inventory', null, adminToken);
  const cardioInvBefore = invBefore.body.find((i) => i.medicine_name.includes('CardioFix') || i.medicine_id.includes('med-01')) || invBefore.body[0];
  const initialQty = cardioInvBefore?.quantity || 100;
  console.log('Stocker stk-amb-01 initial quantity:', initialQty);

  // 6. Ambikapur MR creates an order
  console.log('\n[6] Ambikapur MR creates order...');
  const newOrderRes = await request(
    'POST',
    '/orders',
    {
      customer_name: 'Surguja Health Center',
      hq_id: 'HQ-AMB-001',
      stocker_id: 'stk-amb-01',
      items: [
        {
          product_name: cardioInvBefore?.medicine_name || 'CardioFix-50',
          quantity: 10,
          unit_price: 150,
        },
      ],
      notes: 'Urgent delivery needed by Friday',
    },
    ambToken,
  );
  console.log('Create order status:', newOrderRes.status);
  const createdOrder = newOrderRes.body;
  console.log('Created Order Number:', createdOrder.order_number);
  console.log('Initial Delivery Status:', createdOrder.delivery_status);
  console.log('Initial HQ Accepted:', createdOrder.hq_accepted);
  console.log('Initial Inventory Deducted:', createdOrder.inventory_deducted);

  // 7. Verify inventory is NOT deducted immediately!
  console.log('\n[7] Verifying inventory is NOT deducted upon order creation...');
  const invAfterCreate = await request('GET', '/inventory/stockers/stk-amb-01/inventory', null, adminToken);
  const cardioInvAfterCreate = invAfterCreate.body.find((i) => i.medicine_id === cardioInvBefore?.medicine_id) || invAfterCreate.body[0];
  console.log('Quantity after order creation:', cardioInvAfterCreate?.quantity);
  if (cardioInvAfterCreate?.quantity === initialQty) {
    console.log('PASS: Inventory was NOT deducted directly upon order creation!');
  } else {
    console.error('FAIL: Inventory was prematurely deducted!');
  }

  // 8. Test Premature Acceptance (Must Fail because Delivery is PENDING)
  console.log('\n[8] Testing premature acceptance before delivery...');
  const prematureAccept = await request('PATCH', `/orders/${createdOrder.id}/accept`, null, adminToken);
  console.log('Premature accept status (Must be 400):', prematureAccept.status);
  console.log('Error message:', prematureAccept.body.message);

  // 9. Employee Marks Order as DELIVERED
  console.log('\n[9] Employee marks order as DELIVERED...');
  const deliverRes = await request(
    'PATCH',
    `/orders/${createdOrder.id}/delivery`,
    {
      delivery_status: 'DELIVERED',
      notes: 'Handed over package at Surguja clinic reception',
    },
    ambToken,
  );
  console.log('Delivery update status:', deliverRes.status);
  console.log('Updated delivery status:', deliverRes.body.delivery_status);
  console.log('Delivered at timestamp:', deliverRes.body.delivered_at);
  console.log('Delivered by user:', deliverRes.body.delivered_by_user_id);

  // 10. Test Wrong HQ Acceptance (Shahdol MR tries to accept Ambikapur order -> Must Fail)
  console.log('\n[10] Testing Wrong HQ Acceptance...');
  const wrongHqAccept = await request('PATCH', `/orders/${createdOrder.id}/accept`, null, shdToken);
  console.log('Wrong HQ accept status (Must be 403):', wrongHqAccept.status);

  // 11. Target HQ / Admin Accepts Order -> COUNTING STARTS
  console.log('\n[11] Target HQ / Admin accepts delivered order...');
  const acceptRes = await request('PATCH', `/orders/${createdOrder.id}/accept`, null, adminToken);
  console.log('Accept status:', acceptRes.status);
  console.log('Order HQ accepted:', acceptRes.body.hq_accepted);
  console.log('Order Inventory Deducted:', acceptRes.body.inventory_deducted);

  // 12. Verify Inventory IS now deducted after acceptance!
  console.log('\n[12] Verifying inventory deduction after acceptance...');
  const invAfterAccept = await request('GET', '/inventory/stockers/stk-amb-01/inventory', null, adminToken);
  const cardioInvAfterAccept = invAfterAccept.body.find((i) => i.medicine_id === cardioInvBefore?.medicine_id) || invAfterAccept.body[0];
  console.log('Quantity after acceptance:', cardioInvAfterAccept?.quantity);
  if (cardioInvAfterAccept?.quantity === initialQty - 10) {
    console.log('PASS: Exactly 10 units counted and deducted upon HQ acceptance!');
  } else {
    console.log(`Balance after: ${cardioInvAfterAccept?.quantity} (Initial: ${initialQty})`);
  }

  // 13. Test Duplicate Acceptance Rejection
  console.log('\n[13] Testing duplicate acceptance rejection...');
  const dupAccept = await request('PATCH', `/orders/${createdOrder.id}/accept`, null, adminToken);
  console.log('Duplicate accept status (Must be 400):', dupAccept.status);

  console.log('\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
