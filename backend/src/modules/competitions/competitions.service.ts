import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  DecideRewardClaimDto,
} from './competitions.dto';
import {
  Competition,
  RewardClaim,
  RewardClaimStatus,
} from '../../database/database.types';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class CompetitionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // === 1. CREATE & MANAGE COMPETITION (ADMIN) ===
  async createCompetition(dto: CreateCompetitionDto): Promise<Competition> {
    const hq = this.db.headquarters.find((h) => h.id === dto.hq_id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    const med = this.db.medicines.find((m) => m.id === dto.medicine_id);
    if (!med) throw new NotFoundException('Medicine not found');

    if (dto.start_date > dto.end_date) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    const competition: Competition = {
      id: `comp-${uuidv4().substring(0, 8)}`,
      name: dto.name,
      start_date: dto.start_date,
      end_date: dto.end_date,
      hq_id: dto.hq_id,
      hq_name: hq.name,
      medicine_id: dto.medicine_id,
      medicine_name: med.name,
      target_quantity: dto.target_quantity,
      reward_amount: dto.reward_amount,
      description: dto.description || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.db.competitions.push(competition);

    // Broadcast incentive notification to MRs in this HQ
    const mrs = this.db.users.filter((u) => u.role === 'MR' && !u.deleted_at);
    mrs.forEach((mr) => {
      this.notificationsService.sendPushNotification(
        mr.id,
        '🏆 New Sales Competition Announced!',
        `${competition.name}: Target ${competition.target_quantity} units of ${med.name}. Earn ₹${competition.reward_amount.toLocaleString()} reward!`,
        { competitionId: competition.id, type: 'COMPETITION_ANNOUNCEMENT' },
      );
    });

    return competition;
  }

  async updateCompetition(id: string, dto: UpdateCompetitionDto): Promise<Competition> {
    const comp = this.db.competitions.find((c) => c.id === id);
    if (!comp) throw new NotFoundException('Competition not found');

    if (dto.name) comp.name = dto.name;
    if (dto.start_date) comp.start_date = dto.start_date;
    if (dto.end_date) comp.end_date = dto.end_date;
    if (dto.target_quantity !== undefined) comp.target_quantity = dto.target_quantity;
    if (dto.reward_amount !== undefined) comp.reward_amount = dto.reward_amount;
    if (dto.description !== undefined) comp.description = dto.description;
    if (dto.status) comp.status = dto.status;

    return comp;
  }

  /**
   * COUNTING LOGIC (§28 & §29 & §32)
   * Calculates actual units sold from valid completed task orders within start_date and end_date.
   * Single source of truth.
   */
  calculateMrProgress(comp: Competition, mrId: string): {
    achieved_quantity: number;
    supporting_orders: Array<{ taskId: string; date: string; quantity: number }>;
  } {
    let totalAchieved = 0;
    const supportingOrders: Array<{ taskId: string; date: string; quantity: number }> = [];

    const completedTasks = this.db.tasks.filter((t) => {
      if (t.deleted_at) return false;
      if (t.assigned_mr_id !== mrId) return false;
      if (t.status !== 'COMPLETED') return false; // valid completed orders only (§28)
      if (t.date < comp.start_date || t.date > comp.end_date) return false; // strict date window (§29)
      return true;
    });

    const targetMedNameLower = comp.medicine_name.toLowerCase();

    for (const task of completedTasks) {
      if (!task.orders || !Array.isArray(task.orders)) continue;

      for (const orderItem of task.orders) {
        const matchesProduct =
          (orderItem.product_id && orderItem.product_id === comp.medicine_id) ||
          orderItem.product_name.toLowerCase().includes(targetMedNameLower) ||
          targetMedNameLower.includes(orderItem.product_name.toLowerCase());

        if (matchesProduct && orderItem.quantity > 0) {
          totalAchieved += orderItem.quantity;
          supportingOrders.push({
            taskId: task.id,
            date: task.date,
            quantity: orderItem.quantity,
          });
        }
      }
    }

    return { achieved_quantity: totalAchieved, supporting_orders: supportingOrders };
  }

  // === 2. MR COMPETITIONS VIEW (§30 & §31) ===
  async getMyCompetitions(mrId: string): Promise<any[]> {
    const activeComps = this.db.competitions.filter((c) => c.status === 'ACTIVE');

    return activeComps.map((comp) => {
      const progress = this.calculateMrProgress(comp, mrId);
      const remaining = Math.max(0, comp.target_quantity - progress.achieved_quantity);
      const isEligible = progress.achieved_quantity >= comp.target_quantity;

      // Check existing claim
      const claim = this.db.rewardClaims.find(
        (rc) => rc.competition_id === comp.id && rc.mr_id === mrId,
      );

      return {
        ...comp,
        achieved_quantity: progress.achieved_quantity,
        remaining_quantity: remaining,
        is_eligible: isEligible,
        claim_status: claim ? claim.status : isEligible ? 'ELIGIBLE' : 'IN_PROGRESS',
        claim_id: claim?.id || null,
        supporting_orders_count: progress.supporting_orders.length,
      };
    });
  }

  // === 3. CLAIM REWARD WORKFLOW (§33) ===
  async claimReward(competitionId: string, mrId: string): Promise<RewardClaim> {
    const comp = this.db.competitions.find((c) => c.id === competitionId);
    if (!comp) throw new NotFoundException('Competition not found');

    const mr = this.db.users.find((u) => u.id === mrId);
    if (!mr) throw new NotFoundException('MR user not found');

    const existingClaim = this.db.rewardClaims.find(
      (rc) => rc.competition_id === competitionId && rc.mr_id === mrId,
    );
    if (existingClaim) {
      throw new ConflictException(`Reward claim has already been submitted (Status: ${existingClaim.status})`);
    }

    const progress = this.calculateMrProgress(comp, mrId);
    if (progress.achieved_quantity < comp.target_quantity) {
      throw new BadRequestException(
        `Target not reached yet. Achieved: ${progress.achieved_quantity}/${comp.target_quantity} units.`,
      );
    }

    const claim: RewardClaim = {
      id: `claim-${uuidv4().substring(0, 8)}`,
      competition_id: comp.id,
      competition_name: comp.name,
      mr_id: mr.id,
      mr_name: mr.name,
      achieved_quantity: progress.achieved_quantity,
      target_quantity: comp.target_quantity,
      reward_amount: comp.reward_amount,
      eligible_at: new Date().toISOString(),
      claimed_at: new Date().toISOString(),
      status: 'APPLIED',
      order_ids: progress.supporting_orders.map((o) => o.taskId),
    };

    this.db.rewardClaims.push(claim);

    // Notify Admins about the new claim
    const admins = this.db.users.filter(
      (u) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role) && !u.deleted_at,
    );
    admins.forEach((admin) => {
      this.notificationsService.sendPushNotification(
        admin.id,
        '🎁 Reward Claim Received',
        `${mr.name} has achieved target for "${comp.name}" and claimed ₹${comp.reward_amount.toLocaleString()}. Please review orders.`,
        { claimId: claim.id, competitionId: comp.id, type: 'REWARD_CLAIM' },
      );
    });

    return claim;
  }

  // === 4. ADMIN COMPETITION MONITORING & CLAIMS (§34) ===
  async getAdminCompetitions(): Promise<any[]> {
    const mrs = this.db.users.filter((u) => u.role === 'MR' && !u.deleted_at);

    return this.db.competitions.map((comp) => {
      const participants = mrs.map((mr) => {
        const progress = this.calculateMrProgress(comp, mr.id);
        const remaining = Math.max(0, comp.target_quantity - progress.achieved_quantity);
        const isEligible = progress.achieved_quantity >= comp.target_quantity;
        const claim = this.db.rewardClaims.find(
          (rc) => rc.competition_id === comp.id && rc.mr_id === mr.id,
        );

        return {
          mr_id: mr.id,
          mr_name: mr.name,
          mr_phone: mr.phone,
          achieved_quantity: progress.achieved_quantity,
          remaining_quantity: remaining,
          is_eligible: isEligible,
          claim_status: claim ? claim.status : isEligible ? 'ELIGIBLE' : 'IN_PROGRESS',
          claim_id: claim?.id || null,
          orders_count: progress.supporting_orders.length,
        };
      });

      const totalAchievedAllMrs = participants.reduce((sum, p) => sum + p.achieved_quantity, 0);
      const eligibleCount = participants.filter((p) => p.is_eligible).length;
      const claimsCount = this.db.rewardClaims.filter((rc) => rc.competition_id === comp.id).length;

      return {
        ...comp,
        total_sales_all_mrs: totalAchievedAllMrs,
        eligible_mrs_count: eligibleCount,
        claims_count: claimsCount,
        participants,
      };
    });
  }

  async getAllRewardClaims(): Promise<RewardClaim[]> {
    return this.db.rewardClaims.sort((a, b) => b.claimed_at.localeCompare(a.claimed_at));
  }

  async decideRewardClaim(claimId: string, dto: DecideRewardClaimDto, adminId: string): Promise<RewardClaim> {
    const claim = this.db.rewardClaims.find((rc) => rc.id === claimId);
    if (!claim) throw new NotFoundException('Reward claim not found');

    claim.status = dto.status;
    claim.reviewed_by = adminId;
    claim.reviewed_at = new Date().toISOString();
    if (dto.comment) claim.admin_comment = dto.comment;

    // Notify MR
    this.notificationsService.sendPushNotification(
      claim.mr_id,
      dto.status === 'PAID'
        ? '💰 Reward Payment Dispatched!'
        : dto.status === 'APPROVED'
        ? '🎉 Reward Claim Approved!'
        : '⚠️ Reward Claim Rejected',
      `Your incentive claim of ₹${claim.reward_amount.toLocaleString()} for "${claim.competition_name}" has been ${dto.status.toLowerCase()}.${dto.comment ? ` Note: ${dto.comment}` : ''}`,
      { claimId: claim.id, status: claim.status, type: 'CLAIM_DECISION' },
    );

    return claim;
  }
}
