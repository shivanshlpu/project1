import {
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';

export class CheckInDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @IsOptional()
  gps_accuracy_m?: number;

  @IsString()
  @IsOptional()
  check_in_photo?: string;

  @IsString()
  @IsOptional()
  location_name?: string;

  @IsString()
  @IsOptional()
  photo_key?: string;

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
}

export class CheckOutDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @IsOptional()
  gps_accuracy_m?: number;

  @IsString()
  @IsOptional()
  photo_key?: string;

  @IsEnum(['CAMERA', 'GALLERY'])
  @IsOptional()
  photo_source?: 'CAMERA' | 'GALLERY';

  @IsOptional()
  is_mocked?: boolean;

  @IsOptional()
  developer_mode?: boolean;
}

export class AttendanceFilterDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  is_late?: string; // 'true' | 'false'

  @IsString()
  @IsOptional()
  is_early?: string; // 'true' | 'false'

  @IsString()
  @IsOptional()
  missing_punchout?: string; // 'true' | 'false'

  @IsString()
  @IsOptional()
  suspicious?: string; // 'true' | 'false'
}

export class UpdateAttendanceSettingsDto {
  @IsString()
  @IsOptional()
  expected_punch_in_time?: string; // e.g. "10:00:00"

  @IsNumber()
  @IsOptional()
  @Min(0)
  allowed_punch_in_window_minutes?: number; // e.g. 30

  @IsString()
  @IsOptional()
  expected_punch_out_time?: string; // e.g. "18:00:00"

  @IsNumber()
  @IsOptional()
  @Min(0)
  allowed_punch_out_window_minutes?: number; // e.g. 30
}
