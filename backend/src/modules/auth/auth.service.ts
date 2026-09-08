import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { LoginDto, ForgotPasswordDto } from './dto/login.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { DeviceAuthorizationRequest } from '../../database/database.types';
import { VerifyDeviceOtpDto } from './dto/device-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    let user = this.db.users.find(
      (u) =>
        (u.email.toLowerCase() === identifier || u.phone === identifier) &&
        !u.deleted_at,
    );

    if (!user && this.db.supabase?.isConnected) {
      const sbUser = await this.db.supabase.findUserByIdentifier(identifier);
      if (sbUser) {
        user = sbUser as any;
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive. Please contact your manager.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Bank-style Device Binding Verification for Field MRs
    if (user.role === 'MR') {
      // 1. Phone number match if provided
      if (dto.phone && dto.phone.trim() !== user.phone.trim()) {
        throw new ForbiddenException(
          `Phone verification mismatch: Device phone (${dto.phone}) does not match your registered number (${user.phone}).`,
        );
      }

      // 2. Device ID hardware lock
      const targetDeviceId = dto.device_id;
      if (targetDeviceId) {
        // If already bound to this specific phone, allow seamless instant login!
        if (user.device_id && user.device_id === targetDeviceId) {
          // Device authorized and bound!
        } else {
          // New device or device mismatch! Generate a 6-digit OTP on the Owner Dashboard
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const requestId = `req-dev-${uuidv4().slice(0, 8)}`;
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

          // Invalidate any older pending requests for this user
          this.db.deviceAuthorizations = this.db.deviceAuthorizations.filter(
            (r) => !(r.user_id === user.id && r.status === 'PENDING'),
          );

          const authReq: DeviceAuthorizationRequest = {
            id: requestId,
            user_id: user.id,
            user_name: user.name,
            user_phone: user.phone,
            user_email: user.email,
            device_id: targetDeviceId,
            device_model: dto.device_model || 'Android Mobile Device',
            otp,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
          };

          this.db.deviceAuthorizations.unshift(authReq);

          return {
            requires_device_otp: true,
            request_id: requestId,
            device_id: targetDeviceId,
            device_model: authReq.device_model,
            user_name: user.name,
            message:
              'New device detected. A 6-digit device activation code has been generated on the Owner Dashboard (Shivansh Tiwari). Please ask the Owner for the code to activate this phone.',
            debug_otp: process.env.NODE_ENV === 'development' ? otp : undefined,
          };
        }
      }
    }

    user.last_login_at = new Date().toISOString();
    return this.generateAuthPayload(user);
  }

  getPendingDeviceAuthorizations() {
    return this.db.deviceAuthorizations.filter(
      (r) => r.status === 'PENDING' && new Date(r.expires_at) > new Date(),
    );
  }

  getAllDeviceAuthorizations() {
    return this.db.deviceAuthorizations.slice(0, 50);
  }

  async verifyDeviceOtp(dto: VerifyDeviceOtpDto) {
    const cleanOtp = dto.otp.trim();
    const req = this.db.deviceAuthorizations.find(
      (r) => r.id === dto.requestId && r.status === 'PENDING',
    );

    if (!req) {
      throw new BadRequestException('Device authorization request not found or expired.');
    }

    if (new Date(req.expires_at) < new Date()) {
      req.status = 'EXPIRED';
      throw new BadRequestException('Authorization code has expired. Please log in again to generate a new code.');
    }

    if (req.otp !== cleanOtp) {
      throw new BadRequestException('Invalid 6-digit OTP. Please check the code shown on the Owner Dashboard.');
    }

    // OTP matches! Bind device permanently to this user
    const user = this.db.users.find((u) => u.id === req.user_id && !u.deleted_at);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    user.device_id = dto.deviceId || req.device_id;
    user.device_model = dto.deviceModel || req.device_model;
    user.device_bound_at = new Date().toISOString();
    user.last_login_at = new Date().toISOString();

    req.status = 'APPROVED';
    req.approved_at = new Date().toISOString();
    req.approved_by = 'Shivansh Tiwari (Owner)';

    if (this.db.supabase?.isConnected) {
      await this.db.supabase.upsertUser({
        id: user.id,
        device_id: user.device_id,
        device_model: user.device_model,
        device_bound_at: user.device_bound_at,
      });
    }

    return this.generateAuthPayload(user);
  }

  async approveDeviceByOwner(requestId: string, ownerName: string = 'Shivansh Tiwari') {
    const req = this.db.deviceAuthorizations.find(
      (r) => r.id === requestId && r.status === 'PENDING',
    );

    if (!req) {
      throw new NotFoundException('Pending device request not found.');
    }

    const user = this.db.users.find((u) => u.id === req.user_id && !u.deleted_at);
    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    user.device_id = req.device_id;
    user.device_model = req.device_model;
    user.device_bound_at = new Date().toISOString();

    req.status = 'APPROVED';
    req.approved_at = new Date().toISOString();
    req.approved_by = ownerName;

    if (this.db.supabase?.isConnected) {
      await this.db.supabase.upsertUser({
        id: user.id,
        device_id: user.device_id,
        device_model: user.device_model,
        device_bound_at: user.device_bound_at,
      });
    }

    return {
      success: true,
      message: `Device (${req.device_model}) approved for ${user.name}.`,
      user_id: user.id,
      device_id: user.device_id,
    };
  }

  async rejectDeviceByOwner(requestId: string) {
    const req = this.db.deviceAuthorizations.find(
      (r) => r.id === requestId && r.status === 'PENDING',
    );

    if (!req) {
      throw new NotFoundException('Pending request not found.');
    }

    req.status = 'REJECTED';
    return {
      success: true,
      message: `Device login request for ${req.user_name} rejected.`,
    };
  }

  async resetDeviceBinding(userId: string) {
    const user = this.db.users.find((u) => u.id === userId && !u.deleted_at);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    user.device_id = undefined;
    user.device_model = undefined;
    user.device_bound_at = undefined;

    if (this.db.supabase?.isConnected) {
      await this.db.supabase.upsertUser({
        id: user.id,
        device_id: null,
        device_model: null,
        device_bound_at: null,
      });
    }

    return {
      success: true,
      message: `Device lock for ${user.name} has been reset. They can now pair their new phone on next login.`,
    };
  }

  async requestOtp(dto: RequestOtpDto) {
    const phone = dto.phone.trim();
    const user = this.db.users.find((u) => u.phone === phone && !u.deleted_at);
    if (!user) {
      throw new NotFoundException(`User with phone ${phone} not found.`);
    }

    // Generate 6-digit OTP (e.g. 123456 or random)
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    this.db.otpStore.set(phone, { otp, expiresAt });

    return {
      message: 'OTP sent successfully',
      phone,
      debug_otp: otp, // helpful for dev and testing
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = dto.phone.trim();
    const stored = this.db.otpStore.get(phone);

    if (!stored || stored.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired or not requested.');
    }

    if (stored.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP.');
    }

    this.db.otpStore.delete(phone);
    const user = this.db.users.find((u) => u.phone === phone && !u.deleted_at);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    user.last_login_at = new Date().toISOString();
    return this.generateAuthPayload(user);
  }

  async refresh(dto: RefreshTokenDto) {
    const token = dto.refreshToken;
    const session = this.db.refreshTokens.get(token);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (session.expiresAt < new Date()) {
      this.db.refreshTokens.delete(token);
      throw new UnauthorizedException('Refresh token has expired.');
    }

    const user = this.db.users.find((u) => u.id === session.userId && !u.deleted_at);
    if (!user || user.status !== 'ACTIVE') {
      this.db.refreshTokens.delete(token);
      throw new UnauthorizedException('User account no longer active.');
    }

    // Security requirement: Refresh token rotation MUST invalidate previous token!
    this.db.refreshTokens.delete(token);

    return this.generateAuthPayload(user);
  }

  async logout(refreshToken?: string) {
    if (refreshToken && this.db.refreshTokens.has(refreshToken)) {
      this.db.refreshTokens.delete(refreshToken);
    }
    return { message: 'Logged out successfully.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = this.db.users.find(
      (u) =>
        (u.email.toLowerCase() === identifier || u.phone === identifier) &&
        !u.deleted_at,
    );

    return {
      message: user
        ? 'Password reset instructions sent.'
        : 'If an account exists, instructions were dispatched.',
    };
  }

  private generateAuthPayload(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      zone_id: user.zone_id,
      region_id: user.region_id,
      area_id: user.area_id,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    this.db.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: refreshExpiresAt,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        zone_id: user.zone_id,
        region_id: user.region_id,
        area_id: user.area_id,
        manager_id: user.manager_id,
        status: user.status,
        device_id: user.device_id,
        device_model: user.device_model,
        device_bound_at: user.device_bound_at,
      },
    };
  }
}
