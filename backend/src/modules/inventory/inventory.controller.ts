import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateHqDto,
  CreateHqAreaDto,
  CreateStockerDto,
  UpdateStockerDto,
  CreateMedicineDto,
  UpdateMedicineDto,
  AdjustStockDto,
  CreateMonthlyStockEntryDto,
  BatchMonthlyStockEntryDto,
} from './inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // === HEADQUARTERS ===
  @Get('hqs')
  async getHeadquarters() {
    return this.inventoryService.getHeadquarters();
  }

  @Post('hqs')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createHeadquarter(@Body() dto: CreateHqDto) {
    return this.inventoryService.createHeadquarter(dto);
  }

  // === HQ AREAS ===
  @Get('areas')
  async getHqAreas(@Query('hq_id') hqId?: string) {
    return this.inventoryService.getHqAreas(hqId);
  }

  @Post('areas')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createHqArea(@Body() dto: CreateHqAreaDto) {
    return this.inventoryService.createHqArea(dto);
  }

  // === STOCKERS ===
  @Get('stockers')
  async getStockers(@Query('hq_id') hqId?: string) {
    return this.inventoryService.getStockers(hqId);
  }

  @Post('stockers')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createStocker(@Body() dto: CreateStockerDto) {
    return this.inventoryService.createStocker(dto);
  }

  @Patch('stockers/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateStocker(@Param('id') id: string, @Body() dto: UpdateStockerDto) {
    return this.inventoryService.updateStocker(id, dto);
  }

  // === MEDICINES MASTER ===
  @Get('medicines')
  async getMedicines(@Query('all') all?: string) {
    return this.inventoryService.getMedicines(all === 'true');
  }

  @Post('medicines')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createMedicine(@Body() dto: CreateMedicineDto) {
    return this.inventoryService.createMedicine(dto);
  }

  @Patch('medicines/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateMedicine(@Param('id') id: string, @Body() dto: UpdateMedicineDto) {
    return this.inventoryService.updateMedicine(id, dto);
  }

  // === STOCKER INVENTORY ===
  @Get('stockers/:stockerId/inventory')
  async getStockerInventory(@Param('stockerId') stockerId: string) {
    return this.inventoryService.getStockerInventory(stockerId);
  }

  @Post('stockers/:stockerId/adjust')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async adjustStock(
    @Param('stockerId') stockerId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.adjustStock(stockerId, dto, user.id);
  }

  // === ALERTS & TRANSACTIONS ===
  @Get('alerts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getStockAlerts(@Query('hq_id') hqId?: string) {
    return this.inventoryService.getStockAlerts(hqId);
  }

  @Get('transactions')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getTransactions(
    @Query('hq_id') hqId?: string,
    @Query('stocker_id') stockerId?: string,
    @Query('medicine_id') medicineId?: string,
  ) {
    return this.inventoryService.getTransactions({ hq_id: hqId, stocker_id: stockerId, medicine_id: medicineId });
  }

  // === MONTHLY STOCK INWARD ENTRIES ===
  @Get('monthly-entries')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getMonthlyStockEntries(
    @Query('hq_id') hqId?: string,
    @Query('stocker_id') stockerId?: string,
    @Query('month') month?: string,
  ) {
    return this.inventoryService.getMonthlyStockEntries({ hq_id: hqId, stocker_id: stockerId, month });
  }

  @Post('monthly-entries')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createMonthlyStockEntry(
    @Body() dto: CreateMonthlyStockEntryDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.createMonthlyStockEntry(dto, user.id);
  }

  @Post('monthly-entries/batch')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createBatchMonthlyStockEntries(
    @Body() dto: BatchMonthlyStockEntryDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.createBatchMonthlyStockEntries(dto, user.id);
  }
}
