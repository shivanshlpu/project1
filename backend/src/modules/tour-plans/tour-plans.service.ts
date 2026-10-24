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
  CreateRouteChangeRequestDto,
  ReviewRouteChangeRequestDto,
} from './tour-plans.dto';
import { MonthlyTourPlan, MonthlyTpItem, RouteChangeRequest, Task } from '../../database/database.types';
import { NotificationsService } from '../notifications/notifications.module';

import { calculateHqCenterToDestinationDistance, HQ_CENTERS } from '../territories/distance-calculator.service';

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
    const policyRate =
      this.db.attendanceSettings?.reimbursement_rate_per_km ??
      this.db.routeBatches.find((b) => b.standard_reimbursement_rate)?.standard_reimbursement_rate ??
      2.25;

    
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
    // Batch's standard reimbursement rate takes precedence over generic/stale submitted rate
    const rate =
      batch?.standard_reimbursement_rate !== undefined && batch.standard_reimbursement_rate !== null
        ? batch.standard_reimbursement_rate
        : e.reimbursement_rate !== undefined && e.reimbursement_rate !== null
        ? e.reimbursement_rate
        : billableDistanceKm !== undefined
        ? policyRate
        : undefined;

    const amount =
      billableDistanceKm !== undefined && rate !== undefined
        ? Math.round(billableDistanceKm * rate * 100) / 100
        : e.reimbursement_amount !== undefined && e.reimbursement_amount !== null
        ? e.reimbursement_amount
        : undefined;

    const reimbursementStatus =
      e.reimbursement_status || (amount !== undefined ? 'PENDING' : undefined);

    let locationIds = e.location_ids || (batch?.location_ids && batch.location_ids.length > 0 ? batch.location_ids : undefined);
    let selectedLocations = e.selected_locations;
    if ((!selectedLocations || selectedLocations.length === 0) && locationIds && locationIds.length > 0) {
      selectedLocations = this.db.savedLocations
        .filter((l) => locationIds?.includes(l.id))
        .map((l) => ({
          id: l.id,
          name: l.name,
          category: l.category,
          address: l.address,
          latitude: l.latitude,
          longitude: l.longitude,
        }));
    }

    let kolDrs = e.planned_kol_drs?.trim();
    if (!kolDrs && selectedLocations && selectedLocations.length > 0) {
      kolDrs = selectedLocations.map((l) => l.name).slice(0, 3).join(', ') + (selectedLocations.length > 3 ? ` +${selectedLocations.length - 3} more` : '');
    }

    const destination =
      e.destination?.trim() ||
      e.planned_area?.trim() ||
      routeBatchName?.trim() ||
      (routeStops.length > 0 ? routeStops[routeStops.length - 1] : '') ||
      'Field Territory';

    return {
      id: e.id || `tp-item-${uuidv4().substring(0, 8)}`,
      date: e.date,
      hq_id: effectiveHqId,
      hq_name: effectiveHqName,
      destination: destination,
      planned_area: e.planned_area || destination,
      work_type: e.work_type,
      planned_kol_drs: kolDrs || 'General Field Coverage',
      planned_activity: e.planned_activity?.trim() || 'Doctor & Chemist Detailing',
      route_batch_id: routeBatchId,
      route_batch_code: routeBatchCode,
      route_batch_name: routeBatchName,
      route: routeStr || undefined,
      route_stops: routeStops.length > 0 ? routeStops : undefined,
      location_ids: locationIds,
      selected_locations: selectedLocations,
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

      await this.db.persistMonthlyTourPlan(existing);
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

    await this.db.persistMonthlyTourPlan(plan);
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
    }

    await this.db.persistMonthlyTourPlan(plan);
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
    await this.db.persistMonthlyTourPlan(plan);
    return plan;
  }

  /**
   * Delete an entry from a Tour Plan (for both Admin and MR)
   */
  async deleteTourPlanEntry(userId: string, planId: string, entryId: string): Promise<any> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === planId);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    const user = this.db.users.find((u) => u.id === userId);
    const isAdmin = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

    if (!isAdmin && plan.mr_id !== userId) {
      throw new BadRequestException('You can only remove entries from your own tour plan');
    }

    // 24-Hour Edit/Delete Window Check for MRs
    if (!isAdmin) {
      const submissionTime = new Date(plan.submitted_at || Date.now()).getTime();
      const elapsedHours = (Date.now() - submissionTime) / (1000 * 60 * 60);
      if (elapsedHours > 24) {
        throw new BadRequestException(
          `The 24-Hour Edit/Delete Window has expired (${Math.floor(elapsedHours)} hours since submission). Tour Plan entries cannot be deleted after 24 hours.`,
        );
      }
    }

    const initialLength = (plan.entries || []).length;
    plan.entries = (plan.entries || []).filter(
      (e) => e.id !== entryId && e.date !== entryId && String(e.id) !== String(entryId),
    );

    // If all entries in this tour plan are removed, remove the plan completely
    if (plan.entries.length === 0) {
      await this.db.deleteMonthlyTourPlan(plan.id);
      return { success: true, deleted: true, planDeleted: true, message: 'Tour plan and entry removed' };
    }

    await this.db.persistMonthlyTourPlan(plan);
    return { success: true, deleted: true, plan };
  }

  /**
   * Delete an entire Tour Plan (for both Admin and MR owner)
   */
  async deleteTourPlan(userId: string, planId: string): Promise<any> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === planId);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    const user = this.db.users.find((u) => u.id === userId);
    const isAdmin = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

    if (!isAdmin && plan.mr_id !== userId) {
      throw new BadRequestException('You can only delete your own tour plan');
    }

    // 24-Hour Edit/Delete Window Check for MRs
    if (!isAdmin) {
      const submissionTime = new Date(plan.submitted_at || Date.now()).getTime();
      const elapsedHours = (Date.now() - submissionTime) / (1000 * 60 * 60);
      if (elapsedHours > 24) {
        throw new BadRequestException(
          `The 24-Hour Edit/Delete Window has expired (${Math.floor(elapsedHours)} hours since submission). Tour Plans cannot be deleted after 24 hours.`,
        );
      }
    }

    await this.db.deleteMonthlyTourPlan(planId);
    return { success: true, message: 'Monthly Tour Plan removed successfully' };
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

        // Dynamically resolve route batch standard reimbursement rate
        let matchedBatch = null;
        if (entry.route_batch_id) {
          matchedBatch = this.db.routeBatches.find(
            (b) => b.id === entry.route_batch_id || b.batch_code === entry.route_batch_id,
          );
        } else if (entry.route_batch_code && entry.route_batch_code !== 'DIRECT_AREA') {
          matchedBatch = this.db.routeBatches.find(
            (b) => b.batch_code.toLowerCase() === entry.route_batch_code?.toLowerCase(),
          );
        }

        const effectiveRate =
          matchedBatch?.standard_reimbursement_rate !== undefined && matchedBatch?.standard_reimbursement_rate !== null
            ? matchedBatch.standard_reimbursement_rate
            : entry.reimbursement_rate;

        const effectiveBillableDist = roundTripKm !== undefined ? roundTripKm : entry.distance_km;
        const effectiveAmount =
          effectiveBillableDist !== undefined && effectiveRate !== undefined
            ? Math.round(effectiveBillableDist * effectiveRate * 100) / 100
            : entry.reimbursement_amount;

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
          destination: entry.destination || entry.planned_area || entry.route_batch_name || 'Field Territory',
          work_type: entry.work_type,
          planned_kol_drs: entry.planned_kol_drs || 'General Field Coverage',
          planned_activity: entry.planned_activity || 'Doctor & Chemist Detailing',
          route_batch_id: entry.route_batch_id,
          route_batch_code: entry.route_batch_code,
          route_batch_name: entry.route_batch_name,
          route: entry.route,
          route_stops: entry.route_stops,
          location_ids: entry.location_ids,
          selected_locations: entry.selected_locations,
          is_round_trip: isRoundTrip,
          one_way_distance_km: oneWayKm,
          round_trip_distance_km: roundTripKm,
          distance_km: entry.distance_km,
          reimbursement_rate: effectiveRate,
          reimbursement_amount: effectiveAmount,
          reimbursement_status: entry.reimbursement_status || (effectiveAmount !== undefined ? 'PENDING' : undefined),
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

    const statusUpper = (dto.status || '').toUpperCase();
    const normStatus =
      statusUpper === 'APPROVED' || statusUpper === 'APPROVE'
        ? 'APPROVED'
        : statusUpper === 'REJECTED' || statusUpper === 'REJECT'
        ? 'REJECTED'
        : 'SUBMITTED';

    plan.status = normStatus;
    plan.approved_by = adminId;
    plan.approved_at = new Date().toISOString();
    if (dto.remarks) plan.remarks = dto.remarks;

    // Automatically approve/reject all item reimbursement statuses to eliminate double-approval
    if (normStatus === 'APPROVED' || normStatus === 'REJECTED') {
      plan.entries.forEach((entry) => {
        entry.reimbursement_status = normStatus;
      });
    }

    await this.db.persistMonthlyTourPlan(plan);

    // If approved, automatically generate or reconcile sequenced geofenced tasks in the MR's agenda
    if (normStatus === 'APPROVED') {
      await this.reconcileTasksForTourPlan(plan, adminId);
    }

    await this.db.flushToDisk();

    // Send push notification to MR
    this.notificationsService.sendPushNotification(
      plan.mr_id,
      normStatus === 'APPROVED' ? '✅ Tour Plan Approved' : '❌ Tour Plan Rejected',
      `Your Monthly Tour Plan for ${plan.month} has been ${normStatus === 'APPROVED' ? 'approved' : 'rejected'}.${dto.remarks ? ` Note: "${dto.remarks}"` : ''}`,
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

    // If all entries are approved, update the parent plan status to APPROVED
    const allApproved = plan.entries.length > 0 && plan.entries.every((e) => e.reimbursement_status === 'APPROVED');
    const planStatusUpper = (plan.status || '').toUpperCase();
    if (allApproved && (planStatusUpper === 'SUBMITTED' || planStatusUpper === 'PENDING' || !plan.status)) {
      plan.status = 'APPROVED';
      plan.approved_by = adminId;
      plan.approved_at = new Date().toISOString();
    }

    // Always reconcile tasks immediately so the approved entry creates the task for that date & location right away!
    if (status === 'APPROVED' || plan.status === 'APPROVED') {
      await this.reconcileTasksForTourPlan(plan, adminId);
    }

    await this.db.persistMonthlyTourPlan(plan);
    await this.db.flushToDisk();

    // Send push notification to MR
    this.notificationsService.sendPushNotification(
      plan.mr_id,
      status === 'APPROVED' ? '💰 Reimbursement Approved' : '❌ Reimbursement Rejected',
      `Reimbursement for visit on ${entry.date} (${entry.planned_area || entry.route_batch_name || 'Travel'}) has been ${status.toLowerCase()}.${remarks ? ` Note: "${remarks}"` : ''}`,
      { planId: plan.id, entryId: entry.id, status, type: 'TP_REIMBURSEMENT_STATUS' },
    );

    return plan;
  }

  /**
   * Dynamically resolves coordinates for a location/stop without hardcoding Shahdol or any fixed location.
   */
  private resolveLocationCoordinates(
    locName: string,
    hqId?: string,
    seqIndex: number = 0,
    preferredLat?: number,
    preferredLng?: number,
    preferredRadius?: number,
  ): { latitude: number; longitude: number; geofence_radius_m: number } {
    if (
      preferredLat !== undefined &&
      preferredLng !== undefined &&
      preferredLat !== 0 &&
      preferredLng !== 0 &&
      !isNaN(Number(preferredLat)) &&
      !isNaN(Number(preferredLng))
    ) {
      return {
        latitude: Number(preferredLat),
        longitude: Number(preferredLng),
        geofence_radius_m: Number(preferredRadius) || 50,
      };
    }

    const cleanName = (locName || '').trim().toLowerCase();

    // 1. Search in savedLocations by name, clinic, or area
    const saved = this.db.savedLocations.find(
      (sl) =>
        sl.name.toLowerCase() === cleanName ||
        sl.clinic.toLowerCase() === cleanName ||
        (cleanName && sl.name.toLowerCase().includes(cleanName)) ||
        (cleanName && sl.area_name?.toLowerCase().includes(cleanName)),
    );
    if (saved && saved.latitude && saved.longitude) {
      return {
        latitude: Number(saved.latitude),
        longitude: Number(saved.longitude),
        geofence_radius_m: Number(saved.geofence_radius_m) || 50,
      };
    }

    // 2. Search in doctors collection
    const doc = this.db.doctors.find(
      (d) =>
        d.name.toLowerCase() === cleanName ||
        d.clinic.toLowerCase() === cleanName ||
        (cleanName && d.name.toLowerCase().includes(cleanName)),
    );
    if (doc && doc.latitude && doc.longitude) {
      return {
        latitude: Number(doc.latitude),
        longitude: Number(doc.longitude),
        geofence_radius_m: 50,
      };
    }

    // 3. Check HQ centers dictionary by stop name or HQ ID
    const directHqCenter =
      HQ_CENTERS[cleanName] ||
      HQ_CENTERS[hqId?.toLowerCase() || ''] ||
      (hqId ? Object.values(HQ_CENTERS).find((c) => c.id.toLowerCase() === hqId.toLowerCase()) : undefined);

    if (directHqCenter) {
      return {
        latitude: directHqCenter.latitude + seqIndex * 0.005,
        longitude: directHqCenter.longitude + seqIndex * 0.005,
        geofence_radius_m: 50,
      };
    }

    // 4. Fallback to base HQ center with dynamic sequence offset
    const baseHq = this.db.headquarters.find((h) => h.id === hqId || h.hq_id === hqId);
    const baseCenter = baseHq ? HQ_CENTERS[baseHq.name.toLowerCase()] || HQ_CENTERS['hq-shahdol'] : HQ_CENTERS['hq-shahdol'];
    return {
      latitude: (baseCenter?.latitude || 23.2953) + seqIndex * 0.005,
      longitude: (baseCenter?.longitude || 81.3586) + seqIndex * 0.005,
      geofence_radius_m: 50,
    };
  }

  /**
   * Reconciles location-based geofenced tasks whenever a Tour Plan is approved
   * or whenever an admin approves a change request.
   *
   * Rules (FRD §4, §6, §7):
   * 1. Unchanged planned visits: tasks retained.
   * 2. Completed tasks: NEVER deleted, altered, or overwritten (audit history preserved).
   * 3. Removed / superseded planned visits: unstarted ASSIGNED tasks are cancelled/removed.
   * 4. Newly approved visits / locations: new tasks generated with source 'TourPlan'.
   * 5. Manual tasks: NEVER modified (isolated by source/tp_id).
   * 6. Idempotent: Safe to call repeatedly without generating duplicate tasks.
   */
  async reconcileTasksForTourPlan(plan: MonthlyTourPlan, adminId: string): Promise<void> {
    if (!plan.entries || plan.entries.length === 0) return;

    interface ExpectedVisit {
      tp_entry_id: string;
      date: string;
      location_name: string;
      category?: string;
      address?: string;
      latitude: number;
      longitude: number;
      geofence_radius_m: number;
      route_batch_id?: string;
      route_batch_name?: string;
      sequence_order: number;
      scheduled_time: string;
    }

    const expectedVisits: ExpectedVisit[] = [];

    for (const entry of plan.entries) {
      // Generate tasks for approved visits (or all non-rejected visits if the whole plan is approved)
      const isEntryApproved = entry.reimbursement_status === 'APPROVED';
      const isPlanApproved = (plan.status || '').toUpperCase() === 'APPROVED';
      if (!isEntryApproved && !isPlanApproved) {
        continue;
      }
      if (entry.reimbursement_status === 'REJECTED') {
        continue;
      }

      const workType = (entry.work_type || '').toUpperCase();
      if (workType.includes('LEAVE') || workType.includes('HOLIDAY') || workType.includes('OFFICE')) {
        continue;
      }

      let rawLocs: Array<{
        id?: string;
        name: string;
        category?: string;
        address?: string;
        latitude?: number;
        longitude?: number;
        geofence_radius_m?: number;
      }> = [];

      if (entry.selected_locations && entry.selected_locations.length > 0) {
        rawLocs = entry.selected_locations;
      } else if (entry.location_ids && entry.location_ids.length > 0) {
        rawLocs = this.db.savedLocations.filter((l) => entry.location_ids?.includes(l.id));
      } else if (entry.route_batch_id) {
        const batch = this.db.routeBatches.find(
          (b) => b.id === entry.route_batch_id || b.batch_code === entry.route_batch_id,
        );
        if (batch?.location_ids && batch.location_ids.length > 0) {
          rawLocs = this.db.savedLocations.filter((l) => batch.location_ids?.includes(l.id));
        } else if (batch?.route_stops && batch.route_stops.length > 0) {
          rawLocs = batch.route_stops.map((stop, sIdx) => ({
            id: `stop-${sIdx + 1}`,
            name: stop,
            category: 'CLINIC',
            address: `${stop}, ${entry.planned_area || 'Field Territory'}`,
          }));
        }
      }

      // Fallback if no specific locations: create visit for planned area
      if (rawLocs.length === 0 && entry.planned_area) {
        rawLocs = [
          {
            id: `loc-${entry.id}-area`,
            name: `${entry.planned_area} Main Center`,
            category: 'CLINIC',
            address: `${entry.planned_area}, Territory`,
          },
        ];
      }

      rawLocs.forEach((l, idx) => {
        const coords = this.resolveLocationCoordinates(
          l.name,
          entry.hq_id || plan.mr_id,
          idx,
          l.latitude,
          l.longitude,
          l.geofence_radius_m,
        );

        const hours = 10 + Math.floor(idx * 1.25);
        const minutes = (idx * 15) % 60;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours;
        const scheduledTime = `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;

        const isEntryStockage = (entry.work_type || '').toLowerCase().includes('stockage');
        expectedVisits.push({
          tp_entry_id: entry.id,
          date: entry.date,
          location_name: l.name,
          category: isEntryStockage ? 'STOCKAGE' : (l.category || 'CLINIC'),
          address: l.address || `${l.name}, ${entry.planned_area || 'Territory'}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
          geofence_radius_m: isEntryStockage ? 50 : coords.geofence_radius_m,
          route_batch_id: entry.route_batch_id,
          route_batch_name: entry.route_batch_name || entry.planned_area,
          sequence_order: idx + 1,
          scheduled_time: scheduledTime,
        });
      });
    }

    // Existing tasks belonging to this Tour Plan only (Preserve manual tasks!)
    const tpTasks = this.db.tasks.filter(
      (t) =>
        !t.deleted_at &&
        t.assigned_mr_id === plan.mr_id &&
        (t.tp_id === plan.id ||
          t.source === 'TourPlan' ||
          (t.tp_entry_id && plan.entries.some((e) => e.id === t.tp_entry_id))),
    );

    const matchedTaskIds = new Set<string>();

    // 1. Process expected visits: update existing or create new
    for (const exp of expectedVisits) {
      const match = tpTasks.find(
        (t) =>
          !matchedTaskIds.has(t.id) &&
          (t.tp_entry_id === exp.tp_entry_id || t.date === exp.date) &&
          (t.location_name?.toLowerCase() === exp.location_name.toLowerCase() ||
            t.sequence_order === exp.sequence_order),
      );

      if (match) {
        matchedTaskIds.add(match.id);
        // Only update non-completed tasks; completed tasks retain audit integrity
        if (match.status !== 'COMPLETED') {
          match.tp_id = plan.id;
          match.source = 'TourPlan';
          match.tp_entry_id = exp.tp_entry_id;
          match.date = exp.date;
          match.time = exp.scheduled_time;
          match.latitude = exp.latitude;
          match.longitude = exp.longitude;
          match.geofence_radius_m = (exp.category || '').toUpperCase() === 'STOCKAGE' ? 50 : exp.geofence_radius_m;
          match.location_name = exp.location_name;
          match.route_batch_id = exp.route_batch_id;
          match.route_batch_name = exp.route_batch_name;
          match.sequence_order = exp.sequence_order;
          match.hq_accepted = true;
        }
      } else {
        // Create new task for newly approved visit
        const isStockage = (exp.category || '').toUpperCase() === 'STOCKAGE';
        const newTask: Task = {
          id: `task-tp-${uuidv4().substring(0, 8)}`,
          title: isStockage ? `Stockage: ${exp.location_name}` : `Visit: ${exp.location_name}`,
          description: isStockage
            ? `Scheduled Stockage audit/visit at ${exp.location_name}. Geofenced physical presence (50m) required.`
            : `Scheduled TP call at ${exp.location_name} (${exp.category}). Geofenced check-in required.`,
          assigned_mr_id: plan.mr_id,
          assigned_mr_name: plan.mr_name,
          created_by: adminId || 'SYSTEM_ADMIN',
          date: exp.date,
          time: exp.scheduled_time,
          latitude: exp.latitude,
          longitude: exp.longitude,
          geofence_radius_m: isStockage ? 50 : exp.geofence_radius_m,
          priority: 'HIGH',
          status: 'ASSIGNED',
          source: 'TourPlan',
          tp_id: plan.id,
          tp_entry_id: exp.tp_entry_id,
          location_name: exp.location_name,
          route_batch_id: exp.route_batch_id,
          route_batch_name: exp.route_batch_name,
          sequence_order: exp.sequence_order,
          hq_accepted: true,
          created_at: new Date().toISOString(),
        };

        this.db.tasks.push(newTask);
        this.db.taskAssignments.push({
          id: `ta-${uuidv4().substring(0, 8)}`,
          task_id: newTask.id,
          mr_id: plan.mr_id,
          assigned_at: new Date().toISOString(),
        });
      }
    }

    // 2. Remove or cancel superseded unstarted tasks for this TP
    for (const t of tpTasks) {
      if (!matchedTaskIds.has(t.id)) {
        if (t.status === 'ASSIGNED') {
          // Unstarted superseded task: remove cleanly
          const idx = this.db.tasks.findIndex((tk) => tk.id === t.id);
          if (idx >= 0) this.db.tasks.splice(idx, 1);
        } else if (t.status === 'COMPLETED') {
          // Completed task: PRESERVED with audit history
          t.description = `${t.description || ''} (Superseded by TP change - preserved for audit)`.trim();
        }
      }
    }

    await this.db.persistToDisk();
  }

  /**
   * Automatically generate sequenced geofenced tasks in the MR's daily agenda
   * for an approved Tour Plan (alias to reconcileTasksForTourPlan).
   */
  async generateTasksForApprovedTp(plan: MonthlyTourPlan, adminId: string): Promise<void> {
    return this.reconcileTasksForTourPlan(plan, adminId);
  }

  /**
   * Submit a Route Deviation / Change Request (§MR app)
   */
  async submitRouteChangeRequest(user: any, dto: CreateRouteChangeRequestDto): Promise<RouteChangeRequest> {
    const plan = this.db.monthlyTourPlans.find((tp) => tp.id === dto.tour_plan_id);
    if (!plan) throw new NotFoundException('Tour Plan not found');

    const entry = plan.entries.find((e) => e.id === dto.tour_plan_item_id || e.date === dto.date);
    if (!entry) throw new NotFoundException('Tour Plan date entry not found');

    // Prevent duplicate pending requests for the same entry
    const existingPending = this.db.routeChangeRequests.find(
      (r) =>
        r.status === 'PENDING' &&
        r.tour_plan_id === dto.tour_plan_id &&
        (r.tour_plan_item_id === entry.id || r.date === dto.date),
    );
    if (existingPending) {
      throw new BadRequestException('A change request for this planned date is already pending review.');
    }

    let reqBatch = null;
    if (dto.requested_batch_id) {
      reqBatch = this.db.routeBatches.find(
        (b) => b.id === dto.requested_batch_id || b.batch_code === dto.requested_batch_id,
      );
    }

    let requestedLocations = dto.requested_locations || [];
    if (requestedLocations.length === 0 && reqBatch?.location_ids && reqBatch.location_ids.length > 0) {
      requestedLocations = this.db.savedLocations
        .filter((l) => reqBatch.location_ids?.includes(l.id))
        .map((l) => ({
          id: l.id,
          name: l.name,
          category: l.category,
          address: l.address,
          latitude: l.latitude,
          longitude: l.longitude,
        }));
    }

    const requestItem: RouteChangeRequest = {
      id: `rcr-${uuidv4().substring(0, 8)}`,
      mr_id: user.id,
      mr_name: user.name,
      hq_id: user.hq_id || entry.hq_id,
      hq_name: user.hq_name || entry.hq_name,
      date: dto.date,
      tour_plan_id: dto.tour_plan_id,
      tour_plan_item_id: entry.id,
      original_batch_id: entry.route_batch_id,
      original_batch_code: entry.route_batch_code,
      original_batch_name: entry.route_batch_name || entry.planned_area || 'Standard Route',
      original_locations: entry.selected_locations || [],
      original_area: entry.planned_area,
      original_work_type: entry.work_type,
      original_kol_drs: entry.planned_kol_drs,
      original_activity: entry.planned_activity,
      requested_batch_id: dto.requested_batch_id || reqBatch?.id,
      requested_batch_code: dto.requested_batch_code || reqBatch?.batch_code,
      requested_batch_name: dto.requested_batch_name || reqBatch?.name || dto.requested_area || 'Deviation Route',
      requested_locations: requestedLocations,
      requested_area: dto.requested_area || dto.requested_batch_name || reqBatch?.name,
      requested_work_type: dto.requested_work_type || entry.work_type,
      requested_kol_drs: dto.requested_kol_drs || entry.planned_kol_drs,
      requested_activity: dto.requested_activity || entry.planned_activity,
      reason: dto.reason,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    this.db.routeChangeRequests.unshift(requestItem);
    await this.db.flushToDisk();

    // Notify admins
    const managers = this.db.users.filter(
      (u) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(u.role) && !u.deleted_at,
    );
    managers.forEach((m) => {
      this.notificationsService.sendPushNotification(
        m.id,
        '🔄 Route & TP Change Requested',
        `${user.name} requested changes for ${dto.date}: ${requestItem.original_batch_name} ➡️ ${requestItem.requested_batch_name}. Reason: "${dto.reason}"`,
        { requestId: requestItem.id, type: 'ROUTE_CHANGE_REQUEST' },
      );
    });

    return requestItem;
  }

  /**
   * Get all Route Change Requests (MR sees own, Admin sees all)
   */
  async getRouteChangeRequests(user: any, status?: string): Promise<RouteChangeRequest[]> {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role);
    let list = this.db.routeChangeRequests;
    if (!isAdmin) {
      list = list.filter((r) => r.mr_id === user.id);
    }
    if (status && status !== 'ALL') {
      list = list.filter((r) => r.status === status);
    }
    return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  /**
   * Admin approves or rejects a route change request
   */
  async reviewRouteChangeRequest(
    id: string,
    dto: ReviewRouteChangeRequestDto,
    adminUser: any,
  ): Promise<RouteChangeRequest> {
    const request = this.db.routeChangeRequests.find((r) => r.id === id);
    if (!request) throw new NotFoundException('Route Change Request not found');

    const statusUpper = (dto.status || '').toUpperCase();
    const normStatus =
      statusUpper === 'APPROVED' || statusUpper === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    request.status = normStatus;
    request.admin_id = adminUser.id;
    request.admin_name = adminUser.name;
    request.admin_remarks = dto.admin_remarks || '';
    request.reviewed_at = new Date().toISOString();

    if (normStatus === 'APPROVED') {
      const plan = this.db.monthlyTourPlans.find((tp) => tp.id === request.tour_plan_id);
      if (plan) {
        const entry = plan.entries.find(
          (e) => e.id === request.tour_plan_item_id || e.date === request.date,
        );
        if (entry) {
          if (request.requested_batch_id) {
            entry.route_batch_id = request.requested_batch_id;
            entry.route_batch_code = request.requested_batch_code;
            entry.route_batch_name = request.requested_batch_name;
            const batch = this.db.routeBatches.find((b) => b.id === request.requested_batch_id);
            if (batch) {
              entry.one_way_distance_km = batch.distance_km;
              entry.round_trip_distance_km = batch.distance_km * 2;
              entry.distance_km = batch.distance_km * 2;
              if (entry.reimbursement_rate) {
                entry.reimbursement_amount =
                  Math.round(batch.distance_km * 2 * entry.reimbursement_rate * 100) / 100;
              }
            }
          }
          if (request.requested_area) {
            entry.planned_area = request.requested_area;
          } else if (request.requested_batch_name) {
            entry.planned_area = request.requested_batch_name;
          }
          if (request.requested_locations && request.requested_locations.length > 0) {
            entry.selected_locations = request.requested_locations;
            entry.location_ids = request.requested_locations.map((l) => l.id);
          }
          if (request.requested_work_type) entry.work_type = request.requested_work_type;
          if (request.requested_kol_drs) entry.planned_kol_drs = request.requested_kol_drs;
          if (request.requested_activity) entry.planned_activity = request.requested_activity;

          await this.db.persistMonthlyTourPlan(plan);

          // Reconcile tasks cleanly for this plan
          await this.reconcileTasksForTourPlan(plan, adminUser.id);
        }
      }
    }

    await this.db.flushToDisk();

    this.notificationsService.sendPushNotification(
      request.mr_id,
      normStatus === 'APPROVED' ? '✅ TP Changes Approved' : '❌ TP Changes Rejected',
      `Your requested changes for ${request.date} (${request.requested_batch_name}) have been ${normStatus === 'APPROVED' ? 'approved' : 'rejected'}.${dto.admin_remarks ? ` Note: "${dto.admin_remarks}"` : ''}`,
      { requestId: request.id, status: normStatus, type: 'ROUTE_CHANGE_REVIEW' },
    );

    return request;
  }

  async getPendingCount(): Promise<{
    pending_plans: number;
    pending_requests: number;
    total_pending: number;
  }> {
    const pendingPlans = (this.db.monthlyTourPlans || []).filter(
      (p) => (p.status || '').toUpperCase() === 'SUBMITTED' || (p.status || '').toUpperCase() === 'PENDING',
    ).length;
    const pendingRequests = (this.db.routeChangeRequests || []).filter(
      (r) => (r.status || '').toUpperCase() === 'PENDING',
    ).length;
    return {
      pending_plans: pendingPlans,
      pending_requests: pendingRequests,
      total_pending: pendingPlans + pendingRequests,
    };
  }
}
