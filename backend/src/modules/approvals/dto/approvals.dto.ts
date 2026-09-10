import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class DecideApprovalDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  comment?: string;
}

export class CreateLeaveDto {
  @IsString()
  @IsNotEmpty()
  start_date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  end_date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  category?: 'CASUAL' | 'SICK' | 'EARNED';
}

export class UpdateLeaveQuotaDto {
  @IsOptional()
  casual_total?: number;

  @IsOptional()
  sick_total?: number;

  @IsOptional()
  earned_total?: number;
}
