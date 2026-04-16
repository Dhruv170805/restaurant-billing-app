import assert from 'assert';

const API_BASE = 'http://localhost:3000/api';

async function verifyIsolation() {
  console.log('🛡️ Starting Multi-Tenant Isolation Verification...');

  try {
    const slugA = `test-a-${Date.now()}`;
    console.log(`\nCreating ${slugA}...`);
    const regARes = await fetch(`${API_BASE}/onboarding/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantName: 'Restaurant A',
        slug: slugA,
        ownerName: 'Owner A',
        email: `${slugA}@example.com`,
        password: 'Password123!'
      })
    });
    
    const regAData = await regARes.json();
    if (!regARes.ok) {
        throw new Error(`Failed to create Tenant A: ${JSON.stringify(regAData)}`);
    }

    // 2. Login as Tenant A
    const loginARes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': slugA
      },
      body: JSON.stringify({ email: `${slugA}@example.com`, password: 'Password123!' })
    });
    const loginAData = await loginARes.json();
    if (!loginARes.ok) {
        throw new Error(`Login A failed: ${JSON.stringify(loginAData)}`);
    }
    const tokenA = loginAData.accessToken;

    // 3. Create a private Category for Tenant A
    console.log(`Creating private category for ${slugA}...`);
    const catRes = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ name: 'SECRET CATEGORY A' })
    });
    const categoryA = await catRes.json();
    console.log('CategoryA Response:', JSON.stringify(categoryA));
    const categoryAId = categoryA.id;
    console.log(`✅ Created Category ID: ${categoryAId}`);

    // 4. Create Tenant B
    const slugB = `test-b-${Date.now()}`;
    console.log(`\nCreating ${slugB}...`);
    const regBRes = await fetch(`${API_BASE}/onboarding/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantName: 'Restaurant B',
        slug: slugB,
        ownerName: 'Owner B',
        email: `${slugB}@example.com`,
        password: 'Password123!'
      })
    });
    
    if (!regBRes.ok) {
        throw new Error('Failed to create Tenant B');
    }

    // 5. Login as Tenant B
    const loginBRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': slugB
      },
      body: JSON.stringify({ email: `${slugB}@example.com`, password: 'Password123!' })
    });
    const loginBData = await loginBRes.json();
    if (!loginBRes.ok) {
        throw new Error(`Login B failed: ${JSON.stringify(loginBData)}`);
    }
    const tokenB = loginBData.accessToken;

    // 6. ISOLATION TEST: Tenant B tries to see Tenant A's Categories
    console.log(`\n🧪 TEST: ${slugB} listing categories...`);
    const listRes = await fetch(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const categoriesB = await listRes.json();
    console.log('CategoriesB Response:', JSON.stringify(categoriesB));
    
    if (!Array.isArray(categoriesB)) {
        throw new Error(`Expected array for categoriesB, got: ${typeof categoriesB}`);
    }

    const foundA = categoriesB.find(c => c.id === categoryAId);
    assert(!foundA, 'CRITICAL FAILURE: Tenant B can see Tenant A\'s category in list!');
    console.log('✅ PASS: Tenant B list is empty/clean of Tenant A data');

    // 7. DEEP ISOLATION TEST: Tenant B tries to DELETE Tenant A's Category by ID
    console.log(`🧪 TEST: ${slugB} attempting to delete ${slugA}'s category...`);
    const delRes = await fetch(`${API_BASE}/categories?id=${categoryAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    
    console.log('Delete Response Status:', delRes.status);
    const delData = await delRes.json();
    console.log('Delete Response Data:', JSON.stringify(delData));

    assert(!delRes.ok, 'CRITICAL FAILURE: Tenant B was allowed to attempt deletion on Tenant A data!');
    console.log('✅ PASS: Tenant B rejected from deleting Tenant A data');

    console.log('\n🏆 GOD-LEVEL ISOLATION VERIFIED!');

  } catch (err) {
    console.error('\n❌ Isolation Check Failed:');
    console.error(err.message);
    process.exit(1);
  }
}

verifyIsolation();
