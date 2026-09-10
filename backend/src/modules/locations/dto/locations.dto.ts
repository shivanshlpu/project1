import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  doctor_name?: string;

  @IsString()
  @IsOptional()
  clinic?: string;

  @IsString()
  @IsOptional()
  @IsIn(['CLINIC', 'HOSPITAL', 'PHARMACY', 'OFFICE', 'OTHER'])
  category?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  mr_id?: string;

  @IsString()
  @IsOptional()
  mr_name?: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  area_id?: string;
}

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  doctor_name?: string;

  @IsString()
  @IsOptional()
  clinic?: string;

  @IsString()
  @IsOptional()
  category?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  phone?: string;
}
