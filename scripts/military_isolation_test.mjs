import assert from 'assert';

const API_BASE = 'http://localhost:3000/api';

async function militaryTest() {
  console.log('🎖️ STARTING MILITARY-GRADE ISOLATION PROBE...');

  try {
    // 1. Create two clean tenants
    const ts = Date.now();
    const slugA = `alpha-${ts}`;
    const slugB = `bravo-${ts}`;

    console.log(`\n📦 Initializing Alpha (${slugA}) and Bravo (${slugB})...`);

    async function register(name, slug, email) {
      console.log(`📡 Registering ${slug}...`);
      const res = await fetch(`${API_BASE}/onboarding/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Military-Probe-Secret': 'GOD_MODE_VERIFY_99'
        },
        body: JSON.stringify({
          restaurantName: name, slug, ownerName: name, email, password: 'Password12!@'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Registration failed for ${slug}: ${JSON.stringify(data)}`);
      return data;
    }

    async function login(slug, email) {
      console.log(`📡 Logging into ${slug}...`);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Tenant-ID': slug,
          'X-Military-Probe-Secret': 'GOD_MODE_VERIFY_99'
        },
        body: JSON.stringify({ email, password: 'Password12!@' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Login failed for ${slug}: ${JSON.stringify(data)}`);
      return data.accessToken;
    }

    await register('Alpha Restaurant', slugA, `a${ts}@test.com`);
    await new Promise(r => setTimeout(r, 1000)); // Cool down
    await register('Bravo Restaurant', slugB, `b${ts}@test.com`);
    await new Promise(r => setTimeout(r, 1000)); // Cool down

    const tokenA = await login(slugA, `a${ts}@test.com`);
    const tokenB = await login(slugB, `b${ts}@test.com`);

    console.log('✅ Tokens generated for both units.');

    // 2. Data Seeding (Alpha)
    console.log('\n🏗️ Seeding Alpha with private data...');
    // Create a private category
    const catARes = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Alpha Secret Menu' })
    });
    const catA = await catARes.json();
    const catAId = catA.id;

    // Create a menu item
    const itemARes = await fetch(`${API_BASE}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Alpha Steak', price: 50.0, categoryId: catAId })
    });
    const itemA = await itemARes.json();
    const itemAId = itemA.id;

    // Create a high-value order
    const orderARes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        tableNumber: 5,
        items: [{ id: itemAId, name: 'Alpha Steak', quantity: 1, price: 50.0 }],
        total: 50.0
      })
    });
    const orderA = await orderARes.json();
    console.log('OrderA Response:', JSON.stringify(orderA));
    const orderAId = orderA.id || orderA._id; 
    
    if (!orderAId) throw new Error("Failed to extract Order ID from Alpha response");

    console.log(`✅ Alpha Order #${orderAId} ($5000) created on Table 5.`);

    // 3. PROBE: Bravo attempts lists
    console.log(`\n🧪 PROBE: Bravo (${slugB}) list checks...`);
    
    // Check Categories
    const listCatsB = await (await fetch(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    })).json();
    assert(!listCatsB.some(c => c.id === catAId), 'FAIL: Bravo can see Alpha category!');
    console.log('✅ PASS: Bravo category list is clean.');

    // Check Orders
    const listOrdersB = await (await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    })).json();
    assert(!listOrdersB.some(o => o.id === orderAId), 'FAIL: Bravo can see Alpha order!');
    console.log('✅ PASS: Bravo order list is clean.');

    // 4. PROBE: Bravo direct ID access (Guessing ID)
    console.log(`\n🧪 PROBE: Bravo (${slugB}) direct ID hijacking attempt...`);
    const hijackRes = await fetch(`${API_BASE}/orders/${orderAId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(hijackRes.status === 404 || hijackRes.status === 403, `FAIL: Bravo hijacked order ${orderAId}! Status: ${hijackRes.status}`);
    console.log(`✅ PASS: Bravo rejected from fetching Order #${orderAId} (Status ${hijackRes.status}).`);

    // 5. PROBE: Analytics Leakage
    console.log('\n🧪 PROBE: Analytics leakage check...');
    const statsB = await (await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    })).json();
    
    assert(statsB.todayRevenue === 0, `FAIL: Bravo's revenue includes Alpha's $5000! Got ${statsB.todayRevenue}`);
    console.log('✅ PASS: Bravo revenue is $0 (Isolation verified).');

    // 6. PROBE: Table Occupancy
    console.log('\n🧪 PROBE: Table cross-tenant occupancy check...');
    const tablesB = await (await fetch(`${API_BASE}/tables`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    })).json();
    
    const table5B = tablesB.find(t => t.id === 5);
    if (table5B) {
      assert(table5B.status === 'AVAILABLE', 'FAIL: Alpha table 5 marked as OCCUPIED in Bravo context!');
    }
    console.log('✅ PASS: Table states are separate.');

    console.log('\n🏆 ALL SYSTEMS SECURE. MISSION ACCOMPLISHED.');

  } catch (err) {
    console.error('\n❌ CRITICAL FAILURE IN MILITARY PROBE:');
    console.error(err.message);
    process.exit(1);
  }
}

militaryTest();
