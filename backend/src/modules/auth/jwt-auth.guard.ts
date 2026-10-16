import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isTest = process.env.NODE_ENV === 'test';
    if (isTest) {
      const req = context.switchToHttp().getRequest();
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

    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (process.env.NODE_ENV === 'test') {
      const req = context.switchToHttp().getRequest();
      const xUserIdTest = req.headers['x-user-id'] || 'usr-admin-01';
      return {
        id: xUserIdTest,
        email: `${xUserIdTest}@ahtri.com`,
        role: xUserIdTest.toLowerCase().includes('admin') ? 'SUPER_ADMIN' : 'MR',
        name: 'Test User',
      };
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication token required or expired.');
    }
    return user;
  }
}

