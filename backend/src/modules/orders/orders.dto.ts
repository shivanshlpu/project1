import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsNotEmpty()
  @IsString()
  product_name: string;

  @IsOptional()
  @IsString()
  packaging_id?: string;

  @IsOptional()
  @IsString()
  packaging_size?: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  pts_rate?: number;

  @IsOptional()
  @IsNumber()
  mrp?: number;

  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @IsOptional()
  @IsString()
  distributor?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  task_id?: string;

  @IsNotEmpty()
  @IsString()
  customer_name: string;

  @IsOptional()
  @IsString()
  location_name?: string;

  @IsOptional()
  @IsString()
  hq_id?: string;

  @IsOptional()
  @IsString()
  stocker_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderDeliveryDto {
  @IsNotEmpty()
  @IsEnum(['PENDING', 'DELIVERED'])
  delivery_status: 'PENDING' | 'DELIVERED';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderItemDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsNotEmpty()
  @IsString()
  product_name: string;

  @IsOptional()
  @IsString()
  packaging_id?: string;

  @IsOptional()
  @IsString()
  packaging_size?: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  pts_rate?: number;

  @IsOptional()
  @IsNumber()
  mrp?: number;

  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @IsOptional()
  @IsString()
  distributor?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  location_name?: string;

  @IsOptional()
  @IsString()
  hq_id?: string;

  @IsOptional()
  @IsString()
  stocker_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  items?: UpdateOrderItemDto[];

  @IsOptional()
  @IsEnum(['PENDING', 'DELIVERED'])
  delivery_status?: 'PENDING' | 'DELIVERED';

  @IsOptional()
  @IsString()
  delivery_notes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

