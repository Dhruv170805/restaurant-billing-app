import request from 'supertest';
import { signAccessToken } from '@/lib/auth';
import { signSuperToken } from '@/lib/super_auth';

// --- Mocks ---
// We mock the DB query to avoid requiring a real Postgres instance for this level of integration test.
jest.mock('@/lib/db/postgres', () => ({
  query: jest.fn(),
}));

const { query } = require('@/lib/db/postgres');

describe('Security Integrity: SuperAdmin Boundaries', () => {
  const mockTenantId = '00000000-0000-0000-0000-000000000001';
  const mockSuperId = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TEST 1: Tenant Admin should NEVER be able to access SuperAdmin endpoints.
   * This verifies the Middleware and Route-level isolation.
   */
  it('should block a Tenant Admin from accessing the Analytics API', async () => {
    const tenantToken = await signAccessToken({
      sub: 'user-1',
      tenantId: mockTenantId,
      roles: ['admin'],
      email: 'admin@tenant.com',
      name: 'Tenant Admin'
    });

    // In a real scenario, this would be blocked by Middleware before reaching the route.
    // If the middleware is bypassed, the route check for super_token still protects it.
    const res = await request('http://localhost:3000')
      .get('/hq/api/superadmin/analytics')
      .set('Cookie', [`access_token=${tenantToken}`]);

    expect(res.status).toBe(401);
  });

  /**
   * TEST 2: SuperAdmin with 2FA should successfully initiate impersonation.
   */
  it('should allow a verified SuperAdmin to impersonate a tenant user', async () => {
    const superToken = await signSuperToken({
      sub: mockSuperId,
      email: 'owner@platform.com',
      role: 'OWNER',
      is2faVerified: true
    });

    // Mock the user lookup for impersonation
    query.mockResolvedValue([{ id: 'target-user-id' }]);

    const res = await request('http://localhost:3000')
      .post('/hq/api/superadmin/impersonate')
      .set('Cookie', [`super_token=${superToken}`])
      .send({
        tenantId: mockTenantId,
        targetEmail: 'cashier@restaurant.com'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    
    // Check for audit log insert
    expect(query).toHaveBeenCalledWith(
      'SYSTEM',
      expect.stringContaining('INSERT INTO platform_audit_logs'),
      expect.anything()
    );
  });
});
