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
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDeliveryDto } from './orders.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getOrders(
    @CurrentUser() user: any,
    @Query('hq_id') hqId?: string,
    @Query('mr_id') mrId?: string,
    @Query('delivery_status') deliveryStatus?: string,
    @Query('hq_accepted') hqAccepted?: string,
    @Query('task_id') taskId?: string,
  ) {
    return this.ordersService.getOrders(user, {
      hq_id: hqId,
      mr_id: mrId,
      delivery_status: deliveryStatus,
      hq_accepted: hqAccepted,
      task_id: taskId,
    });
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.getOrderById(id, user);
  }

  @Post()
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.createOrder(dto, user);
  }

  @Patch(':id/delivery')
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDeliveryDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateDeliveryStatus(id, dto, user);
  }

  @Patch(':id/accept')
  async acceptOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.acceptOrder(id, user);
  }
}
