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
