import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { DecideApprovalDto, CreateLeaveDto } from './dto/approvals.dto';
import { Approval, LeaveRequest, Notification } from '../../database/database.types';

@Injectable()
export class ApprovalsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Register a new polymorphic approval request (§4.3)
   */
  async registerApproval(
    entityType: 'LEAVE' | 'EXPENSE' | 'DCR_CORRECTION' | 'TOUR_PLAN',
    entityId: string,
    requestedBy: string,
  ) {
    const approval: Approval = {
      id: `appr-${uuidv4().substring(0, 8)}`,
      entity_type: entityType,
      entity_id: entityId,
      requested_by: requestedBy,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    this.db.approvals.push(approval);
    return approval;
  }

  /**
   * Get pending approvals filtered by approver's scope (§4.3 & §20)
   */
  async getPendingApprovals(approverUser: any) {
    let pending = this.db.approvals.filter((a) => a.status === 'PENDING');

    // Role scoping: Manager only sees team MRs; Super Admin sees all
    if (approverUser.role === 'MANAGER') {
      const teamMrIds = this.db.users
        .filter((u) => u.manager_id === approverUser.id || (u.area_id && u.area_id === approverUser.area_id))
        .map((u) => u.id);
      pending = pending.filter((a) => teamMrIds.includes(a.requested_by));
    }

    return pending.map((a) => {
      const requester = this.db.users.find((u) => u.id === a.requested_by);
      let entityDetails: any = null;

      if (a.entity_type === 'EXPENSE') {
        entityDetails = this.db.expenses.find((e) => e.id === a.entity_id);
      } else if (a.entity_type === 'LEAVE') {
        entityDetails = this.db.leaveRequests.find((l) => l.id === a.entity_id);
      } else if (a.entity_type === 'DCR_CORRECTION') {
        entityDetails = this.db.dcrList.find((d) => d.id === a.entity_id);
      }

      return {
        ...a,
        requester_name: requester?.name || 'Unknown',
        requester_role: requester?.role || 'MR',
        entity_details: entityDetails,
      };
    });
  }

  /**
   * Generic approval decision handler that updates both the approval record
   * and the underlying polymorphic entity (§4.3)
   */
  async decideApproval(approvalId: string, approverUser: any, dto: DecideApprovalDto) {
    const approval = this.db.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new NotFoundException('Approval record not found');

    if (approval.status !== 'PENDING') {
      throw new BadRequestException(`Approval has already been resolved: ${approval.status}`);
    }

    approval.status = dto.status;
    approval.approver_id = approverUser.id;
    approval.comment = dto.comment;
    approval.decided_at = new Date().toISOString();

    // Propagate decision to the underlying entity
    switch (approval.entity_type) {
      case 'EXPENSE': {
        const exp = this.db.expenses.find((e) => e.id === approval.entity_id);
        if (exp) exp.status = dto.status;
        break;
      }
      case 'LEAVE': {
        const leave = this.db.leaveRequests.find((l) => l.id === approval.entity_id);
        if (leave) {
          leave.status = dto.status;
          leave.approved_by = approverUser.id;
        }
        break;
      }
      case 'DCR_CORRECTION': {
        const dcr = this.db.dcrList.find((d) => d.id === approval.entity_id);
        if (dcr) {
          dcr.status = dto.status === 'APPROVED' ? 'APPROVED' : 'CORRECTION_REQUESTED';
          dcr.approved_by = approverUser.id;
          dcr.approved_at = new Date().toISOString();
        }
        break;
      }
    }

    // Auto-dispatch in-app notification to requester
    const notification: Notification = {
      id: `notif-${uuidv4().substring(0, 8)}`,
      user_id: approval.requested_by,
      type: 'APPROVAL_DECISION',
      title: `${approval.entity_type} ${dto.status}`,
      body: `Your ${approval.entity_type.toLowerCase()} request was ${dto.status.toLowerCase()} by ${approverUser.name}.${dto.comment ? ' Note: ' + dto.comment : ''}`,
      created_at: new Date().toISOString(),
    };
    this.db.notifications.push(notification);

    return {
      message: `Approval decided: ${dto.status}`,
      approval,
      notification,
    };
  }

  // Leave management helper methods
  async createLeave(mrId: string, dto: CreateLeaveDto) {
    const leave: LeaveRequest = {
      id: `leave-${uuidv4().substring(0, 8)}`,
      mr_id: mrId,
      start_date: dto.start_date,
      end_date: dto.end_date,
      reason: dto.reason,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    this.db.leaveRequests.push(leave);
    await this.registerApproval('LEAVE', leave.id, mrId);

    return { message: 'Leave request submitted successfully', leave };
  }

  async getMyLeaves(mrId: string) {
    return this.db.leaveRequests
      .filter((l) => l.mr_id === mrId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getAdminLeaves(filter: { mr_id?: string; status?: string }) {
    return this.db.leaveRequests
      .filter((l) => (filter.mr_id ? l.mr_id === filter.mr_id : true))
      .filter((l) => (filter.status ? l.status === filter.status : true))
      .map((l) => {
        const mr = this.db.users.find((u) => u.id === l.mr_id);
        return { ...l, mr_name: mr?.name || 'Unknown' };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}
