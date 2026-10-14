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
  sub_area?: string;

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
  sub_area?: string;

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
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  packing?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  base_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pts_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pts?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ptr?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ptr_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mrp?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  low_stock_threshold?: number;

  @IsOptional()
  packaging_variants?: any[];
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

  @IsString()
  @IsOptional()
  packing?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  base_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pts_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pts?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ptr?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ptr_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mrp?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  low_stock_threshold?: number;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  packaging_variants?: any[];
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

export class CreatePackagingVariantDto {
  @IsString()
  @IsNotEmpty()
  medicine_id: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  package_size?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  package_unit?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  variant_name?: string;

  @IsString()
  @IsOptional()
  display_label?: string;

  @IsString()
  @IsOptional()
  display_name?: string;

  @IsString()
  @IsOptional()
  packing?: string;

  @IsNumber()
  @Min(0)
  pts_rate: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ptr_rate?: number;

  @IsNumber()
  @Min(0)
  mrp: number;

  @IsOptional()
  is_active?: boolean;
}

export class UpdatePackagingVariantDto {
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  package_size?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  package_unit?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  variant_name?: string;

  @IsString()
  @IsOptional()
  display_label?: string;

  @IsString()
  @IsOptional()
  display_name?: string;

  @IsString()
  @IsOptional()
  packing?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pts_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ptr_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mrp?: number;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  is_active?: boolean;
}

export class GrantStockagePermissionDto {
  @IsNotEmpty()
  mr_ids: string[]; // Can select one or multiple MRs

  @IsNumber()
  @IsOptional()
  month?: number; // 1-12

  @IsNumber()
  @IsOptional()
  year?: number; // e.g. 2026

  @IsString()
  @IsOptional()
  month_year?: string; // e.g. '2026-11'

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsString()
  @IsOptional()
  stocker_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RevokeStockagePermissionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class StockageSubmissionItemDto {
  @IsString()
  @IsNotEmpty()
  medicine_id: string;

  @IsString()
  @IsOptional()
  variant_id?: string;

  @IsString()
  @IsOptional()
  packaging_id?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  submitted_quantity?: number;

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

export class SubmitStockageRequestDto {
  @IsString()
  @IsNotEmpty()
  permission_id: string;

  @IsString()
  @IsOptional()
  month_year?: string;

  @IsString()
  @IsOptional()
  stocker_id?: string;

  @IsString()
  @IsOptional()
  hq_id?: string;

  @IsNotEmpty()
  items: StockageSubmissionItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReviewStockageRequestDto {
  @IsEnum(['APPROVE', 'REJECT'])
  @IsOptional()
  action?: 'APPROVE' | 'REJECT';

  @IsEnum(['APPROVED', 'REJECTED'])
  @IsOptional()
  status?: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  admin_notes?: string;

  @IsOptional()
  item_adjustments?: Array<{
    item_id?: string;
    medicine_id?: string;
    approved_quantity: number;
    reason?: string;
  }>;
}
