/**
 * Testing utilities and mock factories
 * Foundation for unit, integration, and component tests
 */

import { Session } from 'next-auth';
import { AuthUser } from '@/types/domain';

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides: Partial<AuthUser> = {}): Session {
  const defaultUser: AuthUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['USER'],
    permissions: ['user.view'],
    organizationId: 'test-org-id',
    branchId: 'test-branch-id',
    departmentId: 'test-dept-id',
    stations: ['test-station-id'],
  };

  return {
    user: { ...defaultUser, ...overrides },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a mock admin session
 */
export function createMockAdminSession(overrides: Partial<AuthUser> = {}): Session {
  return createMockSession({
    roles: ['ADMIN'],
    permissions: [
      'user.view',
      'user.create',
      'user.update',
      'user.delete',
      'role.manage',
      'permission.manage',
    ],
    ...overrides,
  });
}

/**
 * Create a mock super admin session
 */
export function createMockSuperAdminSession(overrides: Partial<AuthUser> = {}): Session {
  return createMockSession({
    roles: ['SUPER_ADMIN'],
    permissions: ['*'],
    ...overrides,
  });
}

/**
 * Mock Prisma client for testing
 * Note: Use with @vitest/globals or jest setup
 */
export function createMockPrismaClient() {
  const mockFn = (name: string) => {
    const fn = () => Promise.resolve(null);
    fn.mockResolvedValue = (value: any) => fn;
    fn.mockRejectedValue = (error: any) => fn;
    return fn;
  };

  return {
    user: {
      findUnique: mockFn('findUnique'),
      findMany: mockFn('findMany'),
      create: mockFn('create'),
      update: mockFn('update'),
      delete: mockFn('delete'),
      count: mockFn('count'),
    },
    role: {
      findUnique: mockFn('findUnique'),
      findMany: mockFn('findMany'),
      create: mockFn('create'),
      update: mockFn('update'),
      delete: mockFn('delete'),
    },
    permission: {
      findUnique: mockFn('findUnique'),
      findMany: mockFn('findMany'),
      create: mockFn('create'),
      update: mockFn('update'),
      delete: mockFn('delete'),
    },
    auditLog: {
      create: mockFn('create'),
      findMany: mockFn('findMany'),
    },
    $transaction: <T>(fn: (tx: any) => T): Promise<T> => Promise.resolve(fn({})),
  };
}

/**
 * Mock Next.js router for testing
 */
export function createMockRouter() {
  return {
    push: () => Promise.resolve(true),
    replace: () => Promise.resolve(true),
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => Promise.resolve(),
    pathname: '/',
    query: {},
    asPath: '/',
  };
}

/**
 * Mock Next.js request
 */
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    headers: new Headers({
      'content-type': 'application/json',
    }),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ...overrides,
  } as any;
}

/**
 * Mock Next.js response
 */
export function createMockResponse() {
  const self: Record<string, any> = {};
  self.status = () => self;
  self.json = () => self;
  self.text = () => self;
  self.send = () => self;
  self.setHeader = () => self;
  return self;
}

/**
 * Test data factories
 */
export const testDataFactories = {
  user: (overrides = {}) => ({
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed-password',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }),

  role: (overrides = {}) => ({
    id: 'role-1',
    code: 'USER',
    name: 'User',
    description: 'Standard user role',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  permission: (overrides = {}) => ({
    id: 'perm-1',
    code: 'user.view',
    name: 'View Users',
    description: 'Can view user list',
    module: 'user',
    action: 'view',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  auditLog: (overrides = {}) => ({
    id: 'audit-1',
    userId: 'user-1',
    action: 'CREATE',
    entity: 'User',
    entityId: 'user-2',
    metadata: {},
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    ...overrides,
  }),
};

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert that a function throws a specific error
   */
  throwsError: async (fn: () => Promise<any>, errorCode: string) => {
    try {
      await fn();
      throw new Error(`Expected error with code ${errorCode}, but no error was thrown`);
    } catch (error: any) {
      if (error.code !== errorCode) {
        throw new Error(
          `Expected error code ${errorCode}, but got ${error.code}`
        );
      }
    }
  },

  /**
   * Assert that a function does not throw
   */
  doesNotThrow: async (fn: () => Promise<any>) => {
    try {
      await fn();
    } catch (error) {
      throw new Error(`Expected no error, but got: ${error}`);
    }
  },

  /**
   * Assert that a mock was called with specific arguments
   */
  calledWith: (mock: any, ...args: any[]) => {
    if (!mock.mock || !mock.mock.calls) {
      throw new Error('Not a mock function');
    }
    const called = mock.mock.calls.some((call: any[]) =>
      JSON.stringify(call) === JSON.stringify(args)
    );
    if (!called) {
      throw new Error(`Mock was not called with expected arguments`);
    }
  },
};
