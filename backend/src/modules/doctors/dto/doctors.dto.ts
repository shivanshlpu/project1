import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsEnum(['A', 'B', 'C'])
  @IsOptional()
  class?: 'A' | 'B' | 'C';

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  potential_score?: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  clinic?: string;

  @IsString()
  @IsOptional()
  category?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY' | 'OFFICE' | 'OTHER';

  @IsString()
  @IsOptional()
  hospital?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsString()
  @IsOptional()
  area_id?: string;
}

export class UpdateDoctorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsEnum(['A', 'B', 'C'])
  @IsOptional()
  class?: 'A' | 'B' | 'C';

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  potential_score?: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  clinic?: string;

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
  area_id?: string;

  @IsString()
  @IsOptional()
  assigned_mr_id?: string;

  @IsString()
  @IsOptional()
  assigned_mr_name?: string;
}

export class DoctorFilterDto {
  @IsString()
  @IsOptional()
  area_id?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  assigned_mr_id?: string;
}
