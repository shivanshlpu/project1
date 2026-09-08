import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, DecideExpenseDto } from './dto/expenses.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles('MR', 'SUPER_ADMIN')
  async createExpense(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.createExpense(user.id, dto);
  }

  @Get('my')
  async getMyExpenses(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.expensesService.getMyExpenses(user.id, month);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAdminExpenses(
    @Query('mr_id') mrId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.expensesService.getAdminExpenses({ mr_id: mrId, status, category });
  }

  @Post(':id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async approveExpense(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: DecideExpenseDto,
  ) {
    return this.expensesService.approveExpense(id, user.id, dto);
  }

  @Post(':id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async rejectExpense(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: DecideExpenseDto,
  ) {
    return this.expensesService.rejectExpense(id, user.id, dto);
  }
}
