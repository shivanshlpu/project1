import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR'])
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'MR';

  @IsString()
  @IsOptional()
  zone_id?: string;

  @IsString()
  @IsOptional()
  region_id?: string;

  @IsString()
  @IsOptional()
  area_id?: string;

  @IsString()
  @IsOptional()
  manager_id?: string;

  @IsBoolean()
  @IsOptional()
  biometric_enabled?: boolean;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR'])
  @IsOptional()
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'MR';

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';

  @IsString()
  @IsOptional()
  area_id?: string;

  @IsString()
  @IsOptional()
  territory?: string;

  @IsBoolean()
  @IsOptional()
  biometric_enabled?: boolean;
}

export class AssignManagerDto {
  @IsString()
  @IsNotEmpty()
  manager_id: string;
}

export class AssignTerritoryDto {
  @IsString()
  @IsOptional()
  zone_id?: string;

  @IsString()
  @IsOptional()
  region_id?: string;

  @IsString()
  @IsNotEmpty()
  area_id: string;
}

export class UserFilterDto {
  zone_id?: string;
  region_id?: string;
  area_id?: string;
  role?: string;
  status?: string;
}
