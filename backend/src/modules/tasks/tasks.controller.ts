import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, VerifyLocationDto, UpdateTaskDto } from './dto/tasks.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createTask(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.createTask(dto, user.id);
  }

  @Get('my')
  async getMyTasks(@CurrentUser() user: any, @Query('date') date?: string) {
    const userId = user?.id || 'usr-mr-01';
    return this.tasksService.getMyTasks(userId, date);
  }

  @Get('recent-completions')
  async getRecentCompletions(@Query('limit') limit?: string) {
    const lim = parseInt(limit || '10', 10);
    return this.tasksService.getRecentCompletions(lim);
  }

  @Get(':id')
  async getTaskById(@Param('id') id: string) {
    return this.tasksService.getTaskById(id);
  }

  @Post(':id/start')
  @Patch(':id/start')
  async startTask(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: VerifyLocationDto,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tasksService.startTask(id, userId, dto);
  }

  @Post(':id/complete')
  @Patch(':id/complete')
  async completeTask(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: VerifyLocationDto,
  ) {
    const userId = user?.id || 'usr-mr-01';
    return this.tasksService.completeTask(id, userId, dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto);
  }

  @Post(':id/unsuspend')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async unsuspendTask(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { newDate?: string },
  ) {
    return this.tasksService.unsuspendTask(id, user.id, body?.newDate);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MR')
  async getAdminTasks(
    @Query('mr_id') mrId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const effectiveMrId = user?.role === 'MR' ? user.id : mrId;
    return this.tasksService.getAdminTasks({ mr_id: effectiveMrId, status, startDate, endDate });
  }
}
