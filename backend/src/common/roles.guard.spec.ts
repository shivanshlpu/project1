import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard (Node 2 DoD Verification)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: any, requiredRoles?: string[]): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if route has no required roles', () => {
    const ctx = createMockContext({ role: 'MR' }, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access if user has required role', () => {
    const ctx = createMockContext({ role: 'MANAGER' }, ['MANAGER', 'ADMIN']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject out-of-role user with ForbiddenException (403)', () => {
    const ctx = createMockContext({ role: 'MR' }, ['MANAGER', 'ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow SUPER_ADMIN access on any protected route', () => {
    const ctx = createMockContext({ role: 'SUPER_ADMIN' }, ['MR']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject if user object is missing on a protected route', () => {
    const ctx = createMockContext(undefined, ['ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
