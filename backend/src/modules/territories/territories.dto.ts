import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateRegionDto {
  @IsString()
  @IsNotEmpty()
  zone_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  region_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  manager_id?: string;
}

export class AssignAreaManagerDto {
  @IsString()
  @IsNotEmpty()
  manager_id: string;
}

export class AssignAreaMrDto {
  @IsString()
  @IsNotEmpty()
  mr_user_id: string;
}

export class CreateRouteBatchDto {
  @IsString()
  @IsNotEmpty()
  batch_code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsOptional()
  hq_code?: string;

  @IsString()
  @IsOptional()
  mr_id?: string;

  @IsString()
  @IsOptional()
  territory_name?: string;

  @IsOptional()
  route_stops?: string[];

  @IsOptional()
  areas?: string[];

  @IsOptional()
  distance_km?: number;

  @IsOptional()
  standard_reimbursement_rate?: number;

  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateRouteBatchDto {
  @IsString()
  @IsOptional()
  batch_code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  hq_code?: string;

  @IsString()
  @IsOptional()
  mr_id?: string;

  @IsString()
  @IsOptional()
  territory_name?: string;

  @IsOptional()
  route_stops?: string[];

  @IsOptional()
  areas?: string[];

  @IsOptional()
  distance_km?: number;

  @IsOptional()
  standard_reimbursement_rate?: number;

  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class SuggestRouteBatchDto {
  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsOptional()
  hq_id?: string;
}
