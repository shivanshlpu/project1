import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsEnum(['TA_DA', 'FOOD', 'ACCOMMODATION', 'CONVEYANCE', 'ENTERTAINMENT'])
  category: 'TA_DA' | 'FOOD' | 'ACCOMMODATION' | 'CONVEYANCE' | 'ENTERTAINMENT';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  receipt_file_key?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class DecideExpenseDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
