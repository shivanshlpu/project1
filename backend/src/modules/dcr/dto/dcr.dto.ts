import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DcrItemSubmissionDto {
  @IsString()
  @IsNotEmpty()
  visit_id: string;

  @IsArray()
  @IsString({ each: true })
  products_discussed: string[];

  @IsNumber()
  samples: number;

  @IsBoolean()
  order_taken: boolean;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SubmitDcrDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DcrItemSubmissionDto)
  items: DcrItemSubmissionDto[];

  @IsString()
  @IsOptional()
  general_remarks?: string;
}

export class ManagerCorrectionDcrDto {
  @IsString()
  @IsNotEmpty()
  manager_comment: string;
}

export class ApproveDcrDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
