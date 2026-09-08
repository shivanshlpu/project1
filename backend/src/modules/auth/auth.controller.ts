import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, ForgotPasswordDto } from './dto/login.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { VerifyDeviceOtpDto } from './dto/device-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('device-otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyDeviceOtp(@Body() dto: VerifyDeviceOtpDto) {
    return this.authService.verifyDeviceOtp(dto);
  }

  @Get('device-authorizations')
  async getDeviceAuthorizations() {
    return {
      pending: this.authService.getPendingDeviceAuthorizations(),
      history: this.authService.getAllDeviceAuthorizations(),
    };
  }

  @Post('device-authorizations/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveDevice(@Param('id') id: string) {
    return this.authService.approveDeviceByOwner(id);
  }

  @Post('device-authorizations/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectDevice(@Param('id') id: string) {
    return this.authService.rejectDeviceByOwner(id);
  }

  @Post('device-binding/reset/:userId')
  @HttpCode(HttpStatus.OK)
  async resetDeviceBinding(@Param('userId') userId: string) {
    return this.authService.resetDeviceBinding(userId);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: Partial<RefreshTokenDto>) {
    return this.authService.logout(dto?.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }
}

