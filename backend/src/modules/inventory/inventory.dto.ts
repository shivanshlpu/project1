import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateHqDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  state?: string;
}

export class CreateHqAreaDto {
  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateStockerDto {
  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  contact_person?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateStockerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contact_person?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  base_price: number;
}

export class UpdateMedicineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  base_price?: number;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty()
  medicine_id: string;

  @IsNumber()
  quantity: number; // positive to add, negative to deduct

  @IsEnum(['INITIAL', 'RESTOCK', 'ORDER_DEDUCTION', 'ADJUSTMENT', 'RETURN'])
  transaction_type: 'INITIAL' | 'RESTOCK' | 'ORDER_DEDUCTION' | 'ADJUSTMENT' | 'RETURN';

  @IsString()
  @IsOptional()
  reason?: string;
}
