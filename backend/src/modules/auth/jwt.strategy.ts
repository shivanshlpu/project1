import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../database/database.service';

export const JWT_SECRET = process.env.JWT_SECRET || 'ahtri_jwt_super_secret_key_development_only';

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
      zone_id: user.zone_id,
      region_id: user.region_id,
      area_id: user.area_id,
      manager_id: user.manager_id,
    };
  }
}
