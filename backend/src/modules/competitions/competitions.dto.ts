import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateCompetitionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  start_date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  end_date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsNotEmpty()
  medicine_id: string;

  @IsNumber()
  @Min(1)
  target_quantity: number;

  @IsNumber()
  @Min(1)
  reward_amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'UPCOMING', 'CANCELLED'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'UPCOMING' | 'CANCELLED';
}

export class UpdateCompetitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  start_date?: string;

  @IsString()
  @IsOptional()
  end_date?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  target_quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  reward_amount?: number;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  medicine_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'UPCOMING', 'CANCELLED'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'UPCOMING' | 'CANCELLED';
}

export class DecideRewardClaimDto {
  @IsEnum(['APPROVED', 'REJECTED', 'PAID'])
  status: 'APPROVED' | 'REJECTED' | 'PAID';

  @IsString()
  @IsOptional()
  comment?: string;
}
