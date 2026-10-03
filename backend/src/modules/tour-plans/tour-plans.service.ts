import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  SubmitMonthlyTpDto,
  MonthlyTpItemDto,
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
      id: e.id || `tp-item-${uuidv4().substring(0, 8)}`,
      date: e.date,
      hq_id: e.hq_id,
      hq_name: e.hq_name,
      planned_area: e.planned_area,
      work_type: e.work_type,
      planned_kol_drs: e.planned_kol_drs?.trim() || 'General Field Coverage',
      planned_activity: e.planned_activity?.trim() || 'Doctor & Chemist Detailing',
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

  /**
   * Punch a single planned visit date immediately
   */
  async punchVisit(userId: string, dto: MonthlyTpItemDto): Promise<MonthlyTourPlan> {
    const user = this.db.users.find((u) => u.id === userId);
    if (!user) throw new NotFoundException('User not found');

    let month = '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(dto.date)) {
      const [d, m, y] = dto.date.split('-');
      month = `${y}-${m}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) {
      const [y, m, d] = dto.date.split('-');
      month = `${y}-${m}`;
    } else {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    let plan = this.db.monthlyTourPlans.find(
      (tp) => tp.mr_id === userId && tp.month === month,
    );

    const newItem: MonthlyTpItem = {
      id: dto.id || `tp-item-${uuidv4().substring(0, 8)}`,
      date: dto.date,
      hq_id: dto.hq_id,
      hq_name: dto.hq_name,
      planned_area: dto.planned_area,
      work_type: dto.work_type,
      planned_kol_drs: dto.planned_kol_drs?.trim() || 'General Field Coverage',
      planned_activity: dto.planned_activity?.trim() || 'Doctor & Chemist Detailing',
    };

    if (plan) {
      const existingIdx = plan.entries.findIndex((e) => e.date === dto.date);
      if (existingIdx >= 0) {
        const submissionTime = new Date(plan.submitted_at || Date.now()).getTime();
        const elapsedHours = (Date.now() - submissionTime) / (1000 * 60 * 60);
        if (elapsedHours > 24) {
          throw new BadRequestException(
            'The 24-Hour Edit Window has expired. This Tour Plan was submitted over 24 hours ago and cannot be modified.',
          );
        }
        plan.entries[existingIdx] = newItem;
      } else {
        plan.entries.push(newItem);
        plan.submitted_at = new Date().toISOString();
      }
    } else {
      plan = {
        id: `mtp-${uuidv4().substring(0, 8)}`,
        mr_id: userId,
        mr_name: user.name,
        month,
        status: 'SUBMITTED',
        entries: [newItem],
        submitted_at: new Date().toISOString(),
        remarks: 'Punched from Mobile App',
      };
      this.db.monthlyTourPlans.push(plan);
    }

    this.notifyAdminsOfTpSubmission(user.name, month, plan.entries.length);
    return plan;
  }

  /**
   * Edit Tour Plan with strict 24-hour window enforcement (§24h)
   */
  async editTourPlan(userId: string, planId: string, dto: SubmitMonthlyTpDto): Promise<MonthlyTourPlan> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === planId);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    if (plan.mr_id !== userId) {
      const user = this.db.users.find((u) => u.id === userId);
      const isManager = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
      if (!isManager) {
        throw new BadRequestException('You can only edit your own tour plan');
      }
    }

    // 24-Hour Edit Window Check
    const submissionTime = new Date(plan.submitted_at || Date.now()).getTime();
    const elapsedHours = (Date.now() - submissionTime) / (1000 * 60 * 60);

    if (elapsedHours > 24) {
      throw new BadRequestException(
        `The 24-Hour Edit Window has expired (${Math.floor(elapsedHours)} hours since submission). Tour Plans cannot be modified after 1 day.`,
      );
    }

    if (dto.entries && dto.entries.length > 0) {
      plan.entries = dto.entries.map((e) => ({
        id: e.id || `tp-item-${uuidv4().substring(0, 8)}`,
        date: e.date,
        hq_id: e.hq_id,
        hq_name: e.hq_name,
        planned_area: e.planned_area,
        work_type: e.work_type,
        planned_kol_drs: e.planned_kol_drs?.trim() || 'General Field Coverage',
        planned_activity: e.planned_activity?.trim() || 'Doctor & Chemist Detailing',
      }));
    }

    if (dto.remarks !== undefined) plan.remarks = dto.remarks;
    return plan;
  }

  /**
   * Delete an entry from a Tour Plan with strict 24-hour window enforcement
   */
  async deleteTourPlanEntry(userId: string, planId: string, entryId: string): Promise<MonthlyTourPlan> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === planId);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    const submissionTime = new Date(plan.submitted_at || Date.now()).getTime();
    const elapsedHours = (Date.now() - submissionTime) / (1000 * 60 * 60);

    if (elapsedHours > 24) {
      throw new BadRequestException(
        'The 24-Hour Edit Window has expired. This Tour Plan cannot be modified after 1 day.',
      );
    }

    plan.entries = plan.entries.filter((e) => e.id !== entryId);
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
