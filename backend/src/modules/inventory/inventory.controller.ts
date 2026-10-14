import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateHqDto,
  UpdateHqDto,
  CreateHqAreaDto,
  UpdateHqAreaDto,
  BatchHqAreasDto,
  CreateStockerDto,
  UpdateStockerDto,
  CreateMedicineDto,
  UpdateMedicineDto,
  AdjustStockDto,
  CreateMonthlyStockEntryDto,
  BatchMonthlyStockEntryDto,
  CreatePackagingVariantDto,
  UpdatePackagingVariantDto,
  GrantStockagePermissionDto,
  RevokeStockagePermissionDto,
  SubmitStockageRequestDto,
  ReviewStockageRequestDto,
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

  @Patch('hqs/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateHeadquarter(@Param('id') id: string, @Body() dto: UpdateHqDto) {
    return this.inventoryService.updateHeadquarter(id, dto);
  }

  @Delete('hqs/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteHeadquarter(@Param('id') id: string) {
    return this.inventoryService.deleteHeadquarter(id);
  }

  // === HQ AREAS ===
  @Get('areas')
  async getHqAreas(@Query('hq_id') hqId?: string) {
    return this.inventoryService.getHqAreas(hqId);
  }

  @Get('hq-areas')
  async getHqAreasAlias(@Query('hq_id') hqId?: string) {
    return this.inventoryService.getHqAreas(hqId);
  }

  @Post('areas')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createHqArea(@Body() dto: CreateHqAreaDto) {
    return this.inventoryService.createHqArea(dto);
  }

  @Patch('areas/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateHqArea(@Param('id') id: string, @Body() dto: UpdateHqAreaDto) {
    return this.inventoryService.updateHqArea(id, dto);
  }

  @Delete('areas/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteHqArea(@Param('id') id: string) {
    return this.inventoryService.deleteHqArea(id);
  }

  @Post('areas/sync')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async syncHqAreas(@Body() dto: BatchHqAreasDto) {
    return this.inventoryService.syncHqAreas(dto);
  }

  // === STOCKERS ===
  @Get('stockers')
  async getStockers(
    @Query('hq_id') hqId?: string,
    @Query('sub_area') subArea?: string,
  ) {
    return this.inventoryService.getStockers(hqId, subArea);
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

  @Delete('stockers/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteStocker(@Param('id') id: string) {
    return this.inventoryService.deleteStocker(id);
  }

  // === MEDICINES MASTER ===
  @Get('medicines')
  async getMedicines(
    @Query('all') all?: string,
    @Query('hq_id') hqId?: string,
  ) {
    return this.inventoryService.getMedicines(all === 'true', hqId);
  }

  @Get('hq-stock')
  async getHqStockOverview(@Query('hq_id') hqId?: string) {
    return this.inventoryService.getHqStockOverview(hqId);
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

  @Delete('medicines/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteMedicine(@Param('id') id: string) {
    return this.inventoryService.deleteMedicine(id);
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

  // === PACKAGING VARIANTS & PRICING (§4 & §5) ===
  @Get('packaging-variants')
  async getPackagingVariants(@Query('medicine_id') medicineId?: string) {
    return this.inventoryService.getPackagingVariants(medicineId);
  }

  @Post('packaging-variants')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createPackagingVariant(@Body() dto: CreatePackagingVariantDto) {
    return this.inventoryService.createPackagingVariant(dto);
  }

  @Patch('packaging-variants/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updatePackagingVariant(
    @Param('id') id: string,
    @Body() dto: UpdatePackagingVariantDto,
  ) {
    return this.inventoryService.updatePackagingVariant(id, dto);
  }

  @Delete('packaging-variants/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deletePackagingVariant(@Param('id') id: string) {
    return this.inventoryService.deletePackagingVariant(id);
  }

  // === MONTHLY MR STOCKAGE UPLOAD PERMISSIONS (§1) ===
  @Get('stockage/permissions')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getStockagePermissions(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('mr_id') mrId?: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.getStockagePermissions({
      month,
      year: year ? parseInt(year, 10) : undefined,
      mr_id: mrId,
      status,
    });
  }

  @Post('stockage/permissions')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async grantStockagePermissions(
    @Body() dto: GrantStockagePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.grantStockagePermissions(dto, user);
  }

  @Post('stockage/permissions/:id/revoke')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async revokeStockagePermission(
    @Param('id') id: string,
    @Body() dto: RevokeStockagePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.revokeStockagePermission(id, user, dto.reason);
  }

  @Get('stockage/active-permission')
  async getMrActiveStockagePermission(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('month_year') monthYear?: string,
  ) {
    const effectiveMonth = month || monthYear;
    return this.inventoryService.getMrActiveStockagePermission(user.id, effectiveMonth);
  }

  // === MR BULK STOCKAGE SUBMISSION & ADMIN APPROVAL (§2, §3, §7) ===
  @Post('stockage/submit')
  @Roles('MR', 'SUPER_ADMIN', 'ADMIN')
  async submitStockageRequest(
    @Body() dto: SubmitStockageRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.submitStockageRequest(dto, user);
  }

  @Get('stockage/requests')
  async getStockageRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('mr_id') mrId?: string,
    @Query('month') month?: string,
    @Query('hq_id') hqId?: string,
  ) {
    // If authenticated as MR, can only view own requests (§2)
    const effectiveMrId = user.role === 'MR' ? user.id : mrId;
    return this.inventoryService.getStockageRequests({
      status,
      mr_id: effectiveMrId,
      month,
      hq_id: hqId,
    });
  }

  @Get('stockage/requests/:id')
  async getStockageRequestById(@Param('id') id: string) {
    return this.inventoryService.getStockageRequestById(id);
  }

  @Post('stockage/requests/:id/review')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async reviewStockageRequest(
    @Param('id') id: string,
    @Body() dto: ReviewStockageRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.reviewStockageRequest(id, dto, user);
  }
}
