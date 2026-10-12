import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const isTest = process.env.NODE_ENV === 'test';

    // In production, strictly enforce JWT authentication
    if (process.env.NODE_ENV === 'production') {
      return super.canActivate(context);
    }

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer eyJ')) {
      return super.canActivate(context);
    }

    // In automated testing environment, support mock user context if provided
    if (isTest) {
      const xUserId = req.headers['x-user-id'] || 'usr-admin-01';
      const isPrivileged = xUserId.toLowerCase().includes('admin');
      req.user = {
        id: xUserId,
        email: `${xUserId}@ahtri.com`,
        role: isPrivileged ? 'SUPER_ADMIN' : 'MR',
        name: 'Test User',
      };
      return true;
    }

    // Standard JWT verification for non-test environments
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (process.env.NODE_ENV === 'test') {
        const req = context.switchToHttp().getRequest();
        const xUserId = req.headers['x-user-id'] || 'usr-admin-01';
        return {
          id: xUserId,
          email: `${xUserId}@ahtri.com`,
          role: xUserId.toLowerCase().includes('admin') ? 'SUPER_ADMIN' : 'MR',
          name: 'Test User',
        };
      }
      throw err || new UnauthorizedException('Authentication token required or expired.');
    }
    return user;
  }
}

