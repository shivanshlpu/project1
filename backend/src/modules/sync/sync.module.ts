import {
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Module,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { IsArray, IsOptional } from 'class-validator';

export class SyncPushDto {
  @IsArray()
  @IsOptional()
  task_drafts?: any[];

  @IsArray()
  @IsOptional()
  visit_drafts?: any[];

  @IsArray()
  @IsOptional()
  dcr_drafts?: any[];

  @IsArray()
  @IsOptional()
  expense_drafts?: any[];
}

@Injectable()
export class SyncService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Section 4.4: Idempotent push of offline write drafts
   */
  async pushDrafts(userId: string, dto: SyncPushDto) {
    const syncedIds: { [key: string]: string[] } = {
      visits: [],
      dcrs: [],
      expenses: [],
    };

    // 1. Process visits
    if (dto.visit_drafts && dto.visit_drafts.length > 0) {
      for (const draft of dto.visit_drafts) {
        // Idempotent check: skip if draft id already processed
        const exists = this.db.doctorVisits.find((v) => v.id === draft.id);
        if (!exists) {
          this.db.doctorVisits.push({
            id: draft.id,
            doctor_id: draft.doctor_id,
            mr_id: userId,
            start_time: draft.start_time,
            end_time: draft.end_time,
            start_lat: draft.start_lat,
            start_lng: draft.start_lng,
            end_lat: draft.end_lat,
            end_lng: draft.end_lng,
            duration_seconds: draft.duration_seconds || 0,
            gps_accuracy_m: draft.gps_accuracy_m || 10,
            signature_file_key: draft.signature_file_key,
            remarks: draft.remarks,
            created_at: draft.created_at || new Date().toISOString(),
          });
        }
        syncedIds.visits.push(draft.id);
      }
    }

    // 2. Process expenses
    if (dto.expense_drafts && dto.expense_drafts.length > 0) {
      for (const draft of dto.expense_drafts) {
        const exists = this.db.expenses.find((e) => e.id === draft.id);
        if (!exists) {
          this.db.expenses.push({
            id: draft.id,
            mr_id: userId,
            category: draft.category,
            amount: draft.amount,
            receipt_file_key: draft.receipt_file_key,
            status: 'PENDING',
            created_at: draft.created_at || new Date().toISOString(),
          });
        }
        syncedIds.expenses.push(draft.id);
      }
    }

    return {
      message: 'Offline sync pushed successfully',
      synced_ids: syncedIds,
      server_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Section 4.4: Pull latest read caches (tasks, doctors) since timestamp
   */
  async pullData(userId: string, since?: string) {
    const user = this.db.users.find((u) => u.id === userId);
    const userAreaId = user?.area_id;

    // Filter tasks for this MR
    let tasks = this.db.tasks.filter((t) => t.assigned_mr_id === userId && !t.deleted_at);
    if (since) {
      tasks = tasks.filter((t) => t.created_at >= since);
    }

    // Filter doctors in MR's area
    let doctors = this.db.doctors.filter((d) => !d.deleted_at);
    if (userAreaId) {
      doctors = doctors.filter((d) => d.area_id === userAreaId);
    }
    if (since) {
      doctors = doctors.filter((d) => d.created_at >= since);
    }

    return {
      server_timestamp: new Date().toISOString(),
      tasks,
      doctors,
    };
  }
}

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async pushDrafts(@CurrentUser() user: any, @Body() dto: SyncPushDto) {
    return this.syncService.pushDrafts(user.id, dto);
  }

  @Get('pull')
  async pullData(@CurrentUser() user: any, @Query('since') since?: string) {
    return this.syncService.pullData(user.id, since);
  }
}

@Module({
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
