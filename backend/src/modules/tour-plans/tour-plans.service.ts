import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  SubmitMonthlyTpDto,
  UpdateTpStatusDto,
  FilterMonthlyTpDto,
} from './tour-plans.dto';
import { MonthlyTourPlan, MonthlyTpItem } from '../../database/database.types';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class TourPlansService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Submit complete monthly Tour Plan with multiple date entries together (§7)
   */
  async submitMonthlyTourPlan(userId: string, dto: SubmitMonthlyTpDto): Promise<MonthlyTourPlan> {
    const user = this.db.users.find((u) => u.id === userId);
    if (!user) throw new NotFoundException('User not found');

    if (!dto.entries || dto.entries.length === 0) {
      throw new BadRequestException('At least one TP entry is required for submission');
    }

    // Check if a plan already exists for this MR and month
    const existing = this.db.monthlyTourPlans.find(
      (tp) => tp.mr_id === userId && tp.month === dto.month,
    );

    const items: MonthlyTpItem[] = dto.entries.map((e) => ({
      id: `tp-item-${uuidv4().substring(0, 8)}`,
      date: e.date,
      hq_id: e.hq_id,
      hq_name: e.hq_name,
      planned_area: e.planned_area,
      work_type: e.work_type,
      planned_kol_drs: e.planned_kol_drs,
      planned_activity: e.planned_activity,
    }));

    if (existing) {
      existing.entries = items;
      existing.status = 'SUBMITTED';
      existing.submitted_at = new Date().toISOString();
      existing.remarks = dto.remarks || existing.remarks;

      this.notifyAdminsOfTpSubmission(user.name, dto.month, items.length);
      return existing;
    }

    const plan: MonthlyTourPlan = {
      id: `mtp-${uuidv4().substring(0, 8)}`,
      mr_id: userId,
      mr_name: user.name,
      month: dto.month,
      status: 'SUBMITTED',
      entries: items,
      submitted_at: new Date().toISOString(),
      remarks: dto.remarks || '',
    };

    this.db.monthlyTourPlans.push(plan);
    this.notifyAdminsOfTpSubmission(user.name, dto.month, items.length);
    return plan;
  }

  private notifyAdminsOfTpSubmission(mrName: string, month: string, count: number) {
    const managers = this.db.users.filter(
      (u) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(u.role) && !u.deleted_at,
    );
    managers.forEach((m) => {
      this.notificationsService.sendPushNotification(
        m.id,
        '📅 New Monthly TP Submitted',
        `${mrName} submitted Monthly Tour Plan for ${month} (${count} scheduled visits).`,
        { month, mrName, type: 'TP_SUBMITTED' },
      );
    });
  }

  async getMyTourPlans(userId: string, month?: string): Promise<MonthlyTourPlan[]> {
    return this.db.monthlyTourPlans
      .filter((tp) => tp.mr_id === userId)
      .filter((tp) => (month ? tp.month === month : true))
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  /**
   * Admin view: Flatten all entries into a consolidated table per §8
   */
  async getAdminMonthlyTp(filter: FilterMonthlyTpDto): Promise<any[]> {
    let flattenedRows: any[] = [];

    for (const plan of this.db.monthlyTourPlans) {
      if (filter.mr_id && plan.mr_id !== filter.mr_id) continue;
      if (filter.month && plan.month !== filter.month) continue;

      for (const entry of plan.entries) {
        if (filter.hq_id && entry.hq_id !== filter.hq_id) continue;
        if (filter.date && entry.date !== filter.date) continue;
        if (
          filter.planned_area &&
          !entry.planned_area.toLowerCase().includes(filter.planned_area.toLowerCase())
        ) {
          continue;
        }
        if (
          filter.work_type &&
          entry.work_type.toLowerCase() !== filter.work_type.toLowerCase()
        ) {
          continue;
        }

        flattenedRows.push({
          tp_id: plan.id,
          entry_id: entry.id,
          mr_id: plan.mr_id,
          mr_name: plan.mr_name,
          month: plan.month,
          plan_status: plan.status,
          date: entry.date,
          hq_id: entry.hq_id,
          hq_name: entry.hq_name,
          planned_area: entry.planned_area,
          work_type: entry.work_type,
          planned_kol_drs: entry.planned_kol_drs,
          planned_activity: entry.planned_activity,
          submitted_at: plan.submitted_at,
        });
      }
    }

    return flattenedRows.sort((a, b) => a.date.localeCompare(b.date));
  }

  async updateTpStatus(id: string, dto: UpdateTpStatusDto, adminId: string): Promise<MonthlyTourPlan> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === id);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    plan.status = dto.status;
    plan.approved_by = adminId;
    plan.approved_at = new Date().toISOString();
    if (dto.remarks) plan.remarks = dto.remarks;

    // Send push notification to MR
    this.notificationsService.sendPushNotification(
      plan.mr_id,
      dto.status === 'APPROVED' ? '✅ Tour Plan Approved' : '❌ Tour Plan Correction Requested',
      `Your Monthly Tour Plan for ${plan.month} has been ${dto.status.toLowerCase()}.${dto.remarks ? ` Note: "${dto.remarks}"` : ''}`,
      { planId: plan.id, month: plan.month, status: plan.status, type: 'TP_STATUS' },
    );

    return plan;
  }
}
