import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../database/database.service';

const DEFAULT_DEV_SECRET = 'ahtri_jwt_super_secret_key_development_only';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_SECRET)) {
  console.error('[SECURITY CRITICAL] JWT_SECRET must be explicitly set to a strong secret in production! Using fallback key is insecure.');
}
export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; role: string; email: string }) {
    const user = this.db.users.find((u) => u.id === payload.sub && !u.deleted_at);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is deactivated or session is invalid.');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hq_id: (user as any).hq_id || (user as any).area_id,
      hq_name: (user as any).hq_name,
      zone_id: user.zone_id,
      region_id: user.region_id,
      area_id: user.area_id,
      manager_id: user.manager_id,
    };
  }
}
