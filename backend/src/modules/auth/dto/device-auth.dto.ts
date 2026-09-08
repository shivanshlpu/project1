import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class VerifyDeviceOtpDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  deviceModel?: string;
}

export class ApproveDeviceDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;
}
