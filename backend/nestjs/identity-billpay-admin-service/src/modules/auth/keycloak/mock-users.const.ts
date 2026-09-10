/**
 * Fixed set of fake identities used only when AUTH_MOCK_MODE=true (see .env.example).
 * Lets `POST /auth/login` and every `@Auth()`-protected route work end-to-end without a
 * reachable Keycloak server — useful for local/offline testing of flows like bill-payment.
 * Never enable this in a real environment: it accepts these hardcoded passwords for anyone.
 */
export interface MockUser {
  username: string;
  password: string;
  sub: string;
  roles: string[];
}

export const MOCK_USERS: MockUser[] = [
  {
    username: 'mock-superadmin',
    password: 'Mock@123',
    sub: '00000000-0000-0000-0000-000000000001',
    roles: ['BANK_SUPER_ADMIN'],
  },
  {
    username: 'mock-admin',
    password: 'Mock@123',
    sub: '00000000-0000-0000-0000-000000000002',
    roles: ['BANK_ADMIN'],
  },
  {
    username: 'mock-bank-maker',
    password: 'Mock@123',
    sub: '00000000-0000-0000-0000-000000000003',
    roles: ['BANK_MAKER'],
  },
  {
    username: 'mock-bank-checker',
    password: 'Mock@123',
    sub: '00000000-0000-0000-0000-000000000004',
    roles: ['BANK_CHECKER'],
  },
  {
    username: 'mock-corporate-maker',
    password: 'Mock@123',
    sub: '00000000-0000-0000-0000-000000000005',
    roles: ['CORPORATE_MAKER'],
  },
  {
    username: 'mock-corporate-checker',
    password: 'Mock@123',
    sub: '00000000-0000-0000-0000-000000000006',
    roles: ['CORPORATE_CHECKER'],
  },
  {
    username: 'mock-customer',
    password: 'Mock@123',
    sub: '00000000-0000-0000-0000-000000000007',
    roles: ['RETAIL_CUSTOMER'],
  },
];

export function findMockUserByUsername(username: string): MockUser | undefined {
  return MOCK_USERS.find((user) => user.username === username);
}

const MOCK_TOKEN_PATTERN = /^mock-(.+)-token$/;

export function findMockUserByToken(token: string): MockUser | undefined {
  const match = MOCK_TOKEN_PATTERN.exec(token);
  if (!match) {
    return undefined;
  }
  return findMockUserByUsername(match[1]);
}
