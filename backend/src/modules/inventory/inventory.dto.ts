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

export class UpdateHqDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateHqAreaDto {
  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateHqAreaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class BatchHqAreasDto {
  @IsString()
  @IsNotEmpty()
  hq_id: string;

  areas: string[];
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
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  product_code?: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  base_price: number;

  @IsNumber()
  @IsOptional()
  low_stock_threshold?: number;
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

export class CreateMonthlyStockEntryDto {
  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsNotEmpty()
  stocker_id: string;

  @IsString()
  @IsNotEmpty()
  month: string; // e.g. "2026-10"

  @IsString()
  @IsNotEmpty()
  entry_date: string; // e.g. "2026-10-01"

  @IsString()
  @IsNotEmpty()
  medicine_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  batch_no?: string;

  @IsString()
  @IsOptional()
  expiry_date?: string;

  @IsString()
  @IsOptional()
  invoice_no?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MonthlyStockItemDto {
  @IsString()
  @IsNotEmpty()
  medicine_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  batch_no?: string;

  @IsString()
  @IsOptional()
  expiry_date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BatchMonthlyStockEntryDto {
  @IsString()
  @IsNotEmpty()
  hq_id: string;

  @IsString()
  @IsNotEmpty()
  stocker_id: string;

  @IsString()
  @IsNotEmpty()
  month: string;

  @IsString()
  @IsNotEmpty()
  entry_date: string;

  @IsString()
  @IsOptional()
  invoice_no?: string;

  @IsOptional()
  items?: MonthlyStockItemDto[];
}
