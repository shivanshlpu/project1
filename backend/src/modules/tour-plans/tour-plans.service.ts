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

import { calculateHqCenterToDestinationDistance } from '../territories/distance-calculator.service';

@Injectable()
export class TourPlansService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private enrichTpItem(
    e: MonthlyTpItemDto,
    user: any,
    effectiveHqId: string,
    effectiveHqName: string,
  ): MonthlyTpItem {
    const policyRate = this.db.attendanceSettings?.reimbursement_rate_per_km ?? 2.5;

    // 1. Check if route batch is explicitly specified or if we can match one
    let batch = null;
    if (e.route_batch_id) {
      batch = this.db.routeBatches.find(
        (b) => b.id === e.route_batch_id || b.batch_code === e.route_batch_id,
      );
    } else if (e.route_batch_code && e.route_batch_code !== 'DIRECT_AREA') {
      batch = this.db.routeBatches.find(
        (b) =>
          b.batch_code.toLowerCase() === e.route_batch_code?.toLowerCase() &&
          (b.mr_id === user.id || b.hq_id === effectiveHqId),
      );
    }

    // 2. Compute route, stops, distance (Two-way round trip calculation)
    let routeBatchId = batch?.id || e.route_batch_id;
    let routeBatchCode = batch?.batch_code || e.route_batch_code;
    let routeBatchName = batch?.name || e.route_batch_name;
    let routeStops =
      e.route_stops && e.route_stops.length > 0
        ? e.route_stops
        : batch?.route_stops || batch?.areas || [];

    let routeStr =
      e.route ||
      (routeStops.length > 0 ? routeStops.join(' → ') : (batch?.name || ''));

    let oneWayDistanceKm: number | undefined = undefined;
    let roundTripDistanceKm: number | undefined = undefined;
    let calculationBasis: 'ROUND_TRIP_BATCH' | 'ROUND_TRIP_CENTER_TO_BOUNDARY' | 'MANUAL' = 'ROUND_TRIP_BATCH';

    if (batch) {
      // PREDEFINED ROUTE BATCH:
      oneWayDistanceKm = e.one_way_distance_km ?? batch.distance_km;
      roundTripDistanceKm = oneWayDistanceKm * 2;
      calculationBasis = 'ROUND_TRIP_BATCH';
      if (!routeStr) {
        routeStr = `${batch.name} (Round Trip)`;
      }
    } else if (e.planned_area) {
      // NON-BATCH DESTINATION: Calculate average distance from HQ Center (e.g. Shahdol Center) to location boundary / center
      const calcResult = calculateHqCenterToDestinationDistance(effectiveHqId, e.planned_area);
      oneWayDistanceKm = e.one_way_distance_km ?? calcResult.one_way_km;
      roundTripDistanceKm = oneWayDistanceKm * 2;
      calculationBasis = 'ROUND_TRIP_CENTER_TO_BOUNDARY';
      routeBatchCode = 'DIRECT_AREA';
      routeBatchName = `${calcResult.destination} (Center to Boundary Direct)`;
      routeStr = `${calcResult.hq_name} Center ⇄ ${calcResult.destination} (Round Trip)`;
      if (routeStops.length === 0) {
        routeStops = [calcResult.hq_name, calcResult.destination];
      }
    } else if (e.distance_km !== undefined) {
      oneWayDistanceKm = e.one_way_distance_km ?? Math.round(e.distance_km / 2);
      roundTripDistanceKm = e.round_trip_distance_km ?? (oneWayDistanceKm * 2);
      calculationBasis = 'MANUAL';
    }

    // Billable distance is round trip (two-way travel)
    const billableDistanceKm = roundTripDistanceKm !== undefined ? roundTripDistanceKm : e.distance_km;

    // 3. Compute reimbursement rate and two-way round trip amount
    const rate =
      e.reimbursement_rate !== undefined && e.reimbursement_rate !== null
        ? e.reimbursement_rate
        : batch?.standard_reimbursement_rate !== undefined
        ? batch.standard_reimbursement_rate
        : billableDistanceKm !== undefined
        ? policyRate
        : undefined;

    const amount =
      e.reimbursement_amount !== undefined && e.reimbursement_amount !== null
        ? e.reimbursement_amount
        : billableDistanceKm !== undefined && rate !== undefined
        ? Math.round(billableDistanceKm * rate * 100) / 100
        : undefined;

    const reimbursementStatus =
      e.reimbursement_status || (amount !== undefined ? 'PENDING' : undefined);

    return {
      id: e.id || `tp-item-${uuidv4().substring(0, 8)}`,
      date: e.date,
      hq_id: effectiveHqId,
      hq_name: effectiveHqName,
      planned_area: e.planned_area,
      work_type: e.work_type,
      planned_kol_drs: e.planned_kol_drs?.trim() || 'General Field Coverage',
      planned_activity: e.planned_activity?.trim() || 'Doctor & Chemist Detailing',
      route_batch_id: routeBatchId,
      route_batch_code: routeBatchCode,
      route_batch_name: routeBatchName,
      route: routeStr || undefined,
      route_stops: routeStops.length > 0 ? routeStops : undefined,
      is_round_trip: true,
      one_way_distance_km: oneWayDistanceKm,
      round_trip_distance_km: roundTripDistanceKm,
      distance_km: billableDistanceKm,
      reimbursement_rate: rate,
      reimbursement_amount: amount,
      reimbursement_status: reimbursementStatus,
      calculation_basis: calculationBasis,
    };
  }

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

    const items: MonthlyTpItem[] = dto.entries.map((e) => {
      let effectiveHqId = user.hq_id || e.hq_id;
      let effectiveHqName = user.hq_name || e.hq_name;
      if (effectiveHqId) {
        const foundHq = this.db.findHeadquarter(effectiveHqId);
        if (foundHq) {
          effectiveHqId = foundHq.hq_id;
          effectiveHqName = foundHq.name;
        }
      }
      return this.enrichTpItem(e, user, effectiveHqId, effectiveHqName);
    });

    if (existing) {
      existing.entries = items;
      existing.status = 'SUBMITTED';
      existing.submitted_at = new Date().toISOString();
      existing.remarks = dto.remarks || existing.remarks;

      this.db.persistToDisk();
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
    this.db.persistToDisk();
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

    let effectiveHqId = user.hq_id || dto.hq_id;
    let effectiveHqName = user.hq_name || dto.hq_name;
    if (effectiveHqId) {
      const foundHq = this.db.findHeadquarter(effectiveHqId);
      if (foundHq) {
        effectiveHqId = foundHq.hq_id;
        effectiveHqName = foundHq.name;
      }
    }

    const newItem: MonthlyTpItem = this.enrichTpItem(dto, user, effectiveHqId, effectiveHqName);

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

    this.db.persistToDisk();
    this.notifyAdminsOfTpSubmission(user.name, month, plan.entries.length);
    return plan;
  }

  /**
   * Edit Tour Plan with strict 24-hour window enforcement (§24h)
   */
  async editTourPlan(userId: string, planId: string, dto: SubmitMonthlyTpDto): Promise<MonthlyTourPlan> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === planId);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    const user = this.db.users.find((u) => u.id === userId);
    if (plan.mr_id !== userId) {
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
      plan.entries = dto.entries.map((e) => {
        let effectiveHqId = user?.hq_id || e.hq_id;
        let effectiveHqName = user?.hq_name || e.hq_name;
        if (effectiveHqId) {
          const foundHq = this.db.findHeadquarter(effectiveHqId);
          if (foundHq) {
            effectiveHqId = foundHq.hq_id;
            effectiveHqName = foundHq.name;
          }
        }
        return this.enrichTpItem(e, user || { id: plan.mr_id }, effectiveHqId, effectiveHqName);
      });
    }

    if (dto.remarks !== undefined) plan.remarks = dto.remarks;
    this.db.persistToDisk();
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
    this.db.persistToDisk();
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

  async getTourPlanById(id: string): Promise<MonthlyTourPlan> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === id);
    if (!plan) throw new NotFoundException('Tour Plan not found');
    return plan;
  }

  /**
   * Admin view: Flatten all entries into a consolidated table per §8
   */
  async getAdminMonthlyTp(filter: FilterMonthlyTpDto): Promise<any[]> {
    let flattenedRows: any[] = [];

    for (const plan of this.db.monthlyTourPlans) {
      if (filter.mr_id && filter.mr_id !== 'ALL' && plan.mr_id !== filter.mr_id) continue;
      if (filter.month && filter.month !== 'ALL' && plan.month !== filter.month) continue;
      if (filter.status && filter.status !== 'ALL' && plan.status !== filter.status) continue;

      for (const entry of plan.entries) {
        if (filter.hq_id && filter.hq_id !== 'ALL' && entry.hq_id !== filter.hq_id) continue;
        if (filter.date && entry.date !== filter.date) continue;
        if (
          filter.planned_area &&
          !entry.planned_area.toLowerCase().includes(filter.planned_area.toLowerCase())
        ) {
          continue;
        }
        if (
          filter.work_type &&
          filter.work_type !== 'ALL' &&
          entry.work_type.toLowerCase() !== filter.work_type.toLowerCase()
        ) {
          continue;
        }

        if (filter.search && filter.search.trim()) {
          const q = filter.search.toLowerCase().trim();
          const match =
            (plan.mr_name && plan.mr_name.toLowerCase().includes(q)) ||
            (entry.hq_name && entry.hq_name.toLowerCase().includes(q)) ||
            (entry.planned_area && entry.planned_area.toLowerCase().includes(q)) ||
            (entry.planned_kol_drs && entry.planned_kol_drs.toLowerCase().includes(q)) ||
            (entry.planned_activity && entry.planned_activity.toLowerCase().includes(q)) ||
            (entry.route_batch_code && entry.route_batch_code.toLowerCase().includes(q)) ||
            (entry.route && entry.route.toLowerCase().includes(q)) ||
            (entry.date && entry.date.includes(q));
          if (!match) continue;
        }

        const isRoundTrip = entry.is_round_trip !== undefined ? entry.is_round_trip : true;
        const oneWayKm =
          entry.one_way_distance_km !== undefined
            ? entry.one_way_distance_km
            : entry.distance_km !== undefined
            ? Math.round((entry.distance_km / 2) * 10) / 10
            : undefined;
        const roundTripKm =
          entry.round_trip_distance_km !== undefined
            ? entry.round_trip_distance_km
            : entry.distance_km !== undefined
            ? entry.distance_km
            : undefined;

        flattenedRows.push({
          id: entry.id,
          tp_id: plan.id,
          plan_id: plan.id,
          entry_id: entry.id,
          mr_id: plan.mr_id,
          mr_name: plan.mr_name,
          month: plan.month,
          status: plan.status,
          plan_status: plan.status,
          date: entry.date,
          hq_id: entry.hq_id,
          hq_name: entry.hq_name,
          planned_area: entry.planned_area,
          destination: entry.planned_area,
          work_type: entry.work_type,
          planned_kol_drs: entry.planned_kol_drs || 'General Field Coverage',
          planned_activity: entry.planned_activity || 'Doctor & Chemist Detailing',
          route_batch_id: entry.route_batch_id,
          route_batch_code: entry.route_batch_code,
          route_batch_name: entry.route_batch_name,
          route: entry.route,
          route_stops: entry.route_stops,
          is_round_trip: isRoundTrip,
          one_way_distance_km: oneWayKm,
          round_trip_distance_km: roundTripKm,
          distance_km: entry.distance_km,
          reimbursement_rate: entry.reimbursement_rate,
          reimbursement_amount: entry.reimbursement_amount,
          reimbursement_status: entry.reimbursement_status || (entry.reimbursement_amount !== undefined ? 'PENDING' : undefined),
          calculation_basis: entry.calculation_basis || (entry.route_batch_code === 'DIRECT_AREA' ? 'ROUND_TRIP_CENTER_TO_BOUNDARY' : 'ROUND_TRIP_BATCH'),
          remarks: plan.remarks || '',
          created_at: plan.submitted_at,
          submitted_at: plan.submitted_at,
          approved_at: plan.approved_at,
          approved_by: plan.approved_by,
        });
      }
    }

    return flattenedRows.sort((a, b) => {
      // Sort newest submissions and upcoming dates first
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
  }

  async updateTpStatus(id: string, dto: UpdateTpStatusDto, adminId: string): Promise<MonthlyTourPlan> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === id);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    plan.status = dto.status;
    plan.approved_by = adminId;
    plan.approved_at = new Date().toISOString();
    if (dto.remarks) plan.remarks = dto.remarks;

    // Also update all pending item reimbursement statuses to match if plan is approved/rejected
    plan.entries.forEach((entry) => {
      if (entry.reimbursement_amount !== undefined && (!entry.reimbursement_status || entry.reimbursement_status === 'PENDING')) {
        entry.reimbursement_status = dto.status;
      }
    });

    this.db.persistToDisk();

    // Send push notification to MR
    this.notificationsService.sendPushNotification(
      plan.mr_id,
      dto.status === 'APPROVED' ? '✅ Tour Plan Approved' : '❌ Tour Plan Correction Requested',
      `Your Monthly Tour Plan for ${plan.month} has been ${dto.status.toLowerCase()}.${dto.remarks ? ` Note: "${dto.remarks}"` : ''}`,
      { planId: plan.id, month: plan.month, status: plan.status, type: 'TP_STATUS' },
    );

    return plan;
  }

  async decideReimbursement(
    planId: string,
    entryId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId: string,
    remarks?: string,
  ): Promise<MonthlyTourPlan> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === planId);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    const entry = plan.entries.find((e) => e.id === entryId);
    if (!entry) throw new NotFoundException('Tour Plan entry not found');

    entry.reimbursement_status = status;
    if (remarks) {
      plan.remarks = plan.remarks ? `${plan.remarks} | ${remarks}` : remarks;
    }

    this.db.persistToDisk();

    // Send push notification to MR
    this.notificationsService.sendPushNotification(
      plan.mr_id,
      status === 'APPROVED' ? '💰 Reimbursement Approved' : '❌ Reimbursement Rejected',
      `Reimbursement for visit on ${entry.date} (${entry.planned_area || entry.route_batch_name || 'Travel'}) has been ${status.toLowerCase()}.${remarks ? ` Note: "${remarks}"` : ''}`,
      { planId: plan.id, entryId: entry.id, status, type: 'TP_REIMBURSEMENT_STATUS' },
    );

    return plan;
  }
}
