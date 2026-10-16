import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthRateLimiterGuard implements CanActivate {
  private readonly attempts = new Map<string, RateLimitRecord>();
  private readonly windowMs = 60 * 1000; 
  private readonly maxAttempts = 15; 

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') {
      return true; 
    }

    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const path = req.route?.path || req.url || '';
    const key = `${ip}:${path}`;
    const now = Date.now();

    const record = this.attempts.get(key);

    if (!record || now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many login attempts. Please wait ${retryAfterSec} seconds before trying again.`,
          retryAfter: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
    return true;
  }
}
