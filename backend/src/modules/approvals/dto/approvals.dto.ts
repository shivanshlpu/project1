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
}
