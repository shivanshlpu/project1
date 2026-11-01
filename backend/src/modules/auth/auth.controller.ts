import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, UseGuards, Request as Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, ForgotPasswordDto } from './dto/login.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { VerifyDeviceOtpDto } from './dto/device-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { AuthRateLimiterGuard } from '../../common/rate-limiter.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('device-otp/verify')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async verifyDeviceOtp(@Body() dto: VerifyDeviceOtpDto) {
    return this.authService.verifyDeviceOtp(dto);
  }

  @Get('device-authorizations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getDeviceAuthorizations() {
    return {
      pending: this.authService.getPendingDeviceAuthorizations(),
      history: this.authService.getAllDeviceAuthorizations(),
    };
  }

  @Post('device-authorizations/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async approveDevice(@Param('id') id: string) {
    return this.authService.approveDeviceByOwner(id);
  }

  @Post('device-authorizations/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async rejectDevice(@Param('id') id: string) {
    return this.authService.rejectDeviceByOwner(id);
  }

  @Post('device-binding/reset/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async resetDeviceBinding(@Param('userId') userId: string) {
    return this.authService.resetDeviceBinding(userId);
  }

  @Post('otp/request')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Body() dto: Partial<RefreshTokenDto> & { userId?: string; identifier?: string; deviceId?: string },
  ) {
    const callerUser = req.user;
    const isPrivileged = callerUser?.role && ['SUPER_ADMIN', 'ADMIN'].includes(callerUser.role);
    // Non-privileged users can only log out their own user ID
    const targetUserId = isPrivileged && dto?.userId ? dto.userId : callerUser?.id;
    return this.authService.logout(dto?.refreshToken, targetUserId, undefined, dto?.deviceId);
  }

  @Post('device-otp/request')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async requestDeviceOtp(
    @Body() dto: { identifier: string; deviceId?: string; deviceModel?: string },
  ) {
    return this.authService.requestDeviceOtpForEmployee(dto.identifier, dto.deviceId, dto.deviceModel);
  }

  @Get('device-otp/status/:requestId')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async checkDeviceAuthStatus(@Param('requestId') requestId: string) {
    return this.authService.checkDeviceAuthStatus(requestId);
  }

  @Post('device-otp/claim')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async claimApprovedDeviceAuth(@Body() dto: { requestId: string; deviceId?: string }) {
    return this.authService.claimApprovedDeviceAuth(dto.requestId, dto.deviceId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('forgot-password')
  @UseGuards(AuthRateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }
}

