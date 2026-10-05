import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  assigned_mr_id: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  time: string; // HH:mm:ss

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  location_name?: string;

  @IsNumber()
  @IsOptional()
  geofence_radius_m?: number; // default 20m

  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class VerifyLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  gps_accuracy_m: number;

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsOptional()
  orders?: any[];

  @IsString()
  @IsOptional()
  photo_key?: string;

  @IsString()
  @IsOptional()
  visit_photo?: string;

  @IsEnum(['CAMERA', 'GALLERY'])
  @IsOptional()
  photo_source?: 'CAMERA' | 'GALLERY';

  @IsOptional()
  is_mocked?: boolean;

  @IsOptional()
  developer_mode?: boolean;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  stocker_id?: string;
}

export class SkipOrderDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  gps_accuracy_m: number;

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsString()
  @IsOptional()
  photo_key?: string;

  @IsString()
  @IsOptional()
  visit_photo?: string;

  @IsEnum(['CAMERA', 'GALLERY'])
  @IsOptional()
  photo_source?: 'CAMERA' | 'GALLERY';

  @IsOptional()
  is_mocked?: boolean;

  @IsOptional()
  developer_mode?: boolean;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  stocker_id?: string;
}

export class SubmitOrderDto {
  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  stocker_id?: string;

  @IsOptional()
  orders: any[];

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsString()
  @IsOptional()
  photo_key?: string;

  @IsString()
  @IsOptional()
  visit_photo?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assigned_mr_id?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsEnum(['ASSIGNED', 'IN_PROGRESS', 'ORDER_PENDING', 'COMPLETED', 'MISSED', 'CANCELLED', 'SUSPENDED'])
  @IsOptional()
  status?: 'ASSIGNED' | 'IN_PROGRESS' | 'ORDER_PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'SUSPENDED';
}

