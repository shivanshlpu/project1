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
  @IsNotEmpty()
  planned_kol_drs: string;

  @IsString()
  @IsNotEmpty()
  planned_activity: string;
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
}
