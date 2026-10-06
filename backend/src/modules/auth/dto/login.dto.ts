import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // phone or email

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  device_id?: string;

  @IsString()
  @IsOptional()
  device_model?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  was_logged_out?: boolean;

  @IsOptional()
  requires_otp?: boolean;
}

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
