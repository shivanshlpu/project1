import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MonthlyTpItemDto {
  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsNotEmpty()
  hq_name: string;

  @IsString()
  @IsNotEmpty()
  planned_area: string;

  @IsString()
  @IsNotEmpty()
  work_type: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  planned_kol_drs?: string;

  @IsString()
  @IsOptional()
  planned_activity?: string;

  // Predefined Route Batch & Reimbursement Integration
  @IsString()
  @IsOptional()
  route_batch_id?: string;

  @IsString()
  @IsOptional()
  route_batch_code?: string;

  @IsString()
  @IsOptional()
  route_batch_name?: string;

  @IsString()
  @IsOptional()
  route?: string;

  @IsArray()
  @IsOptional()
  route_stops?: string[];

  @IsOptional()
  distance_km?: number;

  @IsOptional()
  is_round_trip?: boolean;

  @IsOptional()
  one_way_distance_km?: number;

  @IsOptional()
  round_trip_distance_km?: number;

  @IsOptional()
  reimbursement_rate?: number;

  @IsOptional()
  reimbursement_amount?: number;

  @IsString()
  @IsOptional()
  reimbursement_status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  calculation_basis?: string;
}

export class SubmitMonthlyTpDto {
  @IsString()
  @IsNotEmpty()
  month: string; // YYYY-MM

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MonthlyTpItemDto)
  entries: MonthlyTpItemDto[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateTpStatusDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class DecideTpReimbursementDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class FilterMonthlyTpDto {
  @IsString()
  @IsOptional()
  mr_id?: string;

  @IsString()
  @IsOptional()
  month?: string;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  planned_area?: string;

  @IsString()
  @IsOptional()
  work_type?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
