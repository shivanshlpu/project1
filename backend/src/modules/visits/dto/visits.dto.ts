import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartVisitDto {
  @IsString()
  @IsNotEmpty()
  doctor_id: string;

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
}

export class VisitProductDetailDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  product_name: string;

  @IsNumber()
  @Min(0)
  samples_given: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class EndVisitDto {
  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  signature_file_key?: string;

  @IsString()
  @IsOptional()
  follow_up_date?: string;

  @IsNumber()
  @IsOptional()
  end_lat?: number;

  @IsNumber()
  @IsOptional()
  end_lng?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitProductDetailDto)
  @IsOptional()
  products?: VisitProductDetailDto[];
}
