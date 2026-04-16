// ── Jest Setup ───────────────────────────────────────────────────────────────
// Environment variables for tests
process.env.JWT_SECRET = 'test-secret-32-characters-long-!!!!';
process.env.SUPER_JWT_SECRET = 'super-test-secret-32-chars-!!!!';

// Extend expect matchers or global mocks here if needed.
// For now, we keep it standard for Next.js unit/integration testing.
