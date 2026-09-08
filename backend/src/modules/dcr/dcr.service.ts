import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { SubmitDcrDto, ManagerCorrectionDcrDto, ApproveDcrDto } from './dto/dcr.dto';
import { DCR, DCRItem } from '../../database/database.types';

@Injectable()
export class DcrService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Section 4.2: DCR auto-population.
   * On GET /dcr/today, builds DCR draft by joining doctor_visits + location_verifications
   * for MR's date. Pre-fills date, doctor, time, duration, location, visit count.
   */
  async getTodayDcrDraft(mrId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    let dcr = this.db.dcrList.find((d) => d.mr_id === mrId && d.date === todayStr);

    if (!dcr) {
      dcr = {
        id: `dcr-${uuidv4().substring(0, 8)}`,
        mr_id: mrId,
        date: todayStr,
        status: 'DRAFT',
      };
      this.db.dcrList.push(dcr);
    }

    // Pull today's visits for this MR
    const todayVisits = this.db.doctorVisits.filter(
      (v) => v.mr_id === mrId && v.start_time.startsWith(todayStr),
    );

    // Auto-populate item drafts
    const populatedItems = todayVisits.map((v) => {
      const doc = this.db.doctors.find((d) => d.id === v.doctor_id);
      const existingItem = this.db.dcrItems.find(
        (di) => di.dcr_id === dcr!.id && di.visit_id === v.id,
      );
      const verifications = this.db.locationVerifications.filter(
        (lv) => lv.user_id === mrId && lv.created_at.startsWith(todayStr),
      );

      return {
        visit_id: v.id,
        doctor_id: v.doctor_id,
        doctor_name: doc?.name || 'Unknown Doctor',
        clinic: doc?.clinic || '',
        start_time: v.start_time,
        end_time: v.end_time,
        duration_seconds: v.duration_seconds || 0,
        start_lat: v.start_lat,
        start_lng: v.start_lng,
        signature_file_key: v.signature_file_key,
        gps_verified: verifications.some((lv) => lv.verified),
        // Subjective fields to be filled by MR
        products_discussed: existingItem?.products_discussed || [],
        samples: existingItem?.samples || 0,
        order_taken: existingItem?.order_taken || false,
        remarks: existingItem?.remarks || v.remarks || '',
      };
    });

    return {
      dcr,
      visit_count: populatedItems.length,
      items: populatedItems,
    };
  }

  async submitDcr(dcrId: string, mrId: string, dto: SubmitDcrDto) {
    const dcr = this.db.dcrList.find((d) => d.id === dcrId);
    if (!dcr) throw new NotFoundException('DCR not found');

    if (dcr.mr_id !== mrId) {
      throw new ForbiddenException('You are not authorized to submit this DCR');
    }

    if (dcr.status !== 'DRAFT' && dcr.status !== 'CORRECTION_REQUESTED') {
      throw new BadRequestException(`Cannot submit DCR in status: ${dcr.status}`);
    }

    // Save/update DCR items
    this.db.dcrItems = this.db.dcrItems.filter((di) => di.dcr_id !== dcr.id);
    for (const itemDto of dto.items) {
      const visit = this.db.doctorVisits.find((v) => v.id === itemDto.visit_id);
      const doc = visit ? this.db.doctors.find((d) => d.id === visit.doctor_id) : undefined;

      const item: DCRItem = {
        id: `dcri-${uuidv4().substring(0, 8)}`,
        dcr_id: dcr.id,
        visit_id: itemDto.visit_id,
        doctor_name: doc?.name || 'Unknown',
        products_discussed: itemDto.products_discussed,
        samples: itemDto.samples,
        order_taken: itemDto.order_taken,
        remarks: itemDto.remarks,
      };
      this.db.dcrItems.push(item);
    }

    dcr.status = 'SUBMITTED';
    dcr.submitted_at = new Date().toISOString();

    return {
      message: 'DCR submitted for manager review',
      dcr,
      items: this.db.dcrItems.filter((di) => di.dcr_id === dcr.id),
    };
  }

  async managerCorrection(dcrId: string, managerId: string, dto: ManagerCorrectionDcrDto) {
    const dcr = this.db.dcrList.find((d) => d.id === dcrId);
    if (!dcr) throw new NotFoundException('DCR not found');

    if (dcr.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted DCRs can have corrections requested');
    }

    dcr.status = 'CORRECTION_REQUESTED';
    dcr.manager_comment = dto.manager_comment;

    return { message: 'Correction requested', dcr };
  }

  async approveDcr(dcrId: string, managerId: string, dto: ApproveDcrDto) {
    const dcr = this.db.dcrList.find((d) => d.id === dcrId);
    if (!dcr) throw new NotFoundException('DCR not found');

    if (dcr.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted DCRs can be approved');
    }

    dcr.status = 'APPROVED';
    dcr.approved_by = managerId;
    dcr.approved_at = new Date().toISOString();
    if (dto.comment) dcr.manager_comment = dto.comment;

    return { message: 'DCR approved successfully', dcr };
  }

  async getAdminDcrList(filter: { mr_id?: string; status?: string; startDate?: string; endDate?: string }) {
    return this.db.dcrList
      .filter((d) => (filter.mr_id ? d.mr_id === filter.mr_id : true))
      .filter((d) => (filter.status ? d.status === filter.status : true))
      .filter((d) => (filter.startDate ? d.date >= filter.startDate : true))
      .filter((d) => (filter.endDate ? d.date <= filter.endDate : true))
      .map((d) => {
        const mr = this.db.users.find((u) => u.id === d.mr_id);
        const items = this.db.dcrItems.filter((di) => di.dcr_id === d.id);
        return {
          ...d,
          mr_name: mr?.name || 'Unknown MR',
          total_visits: items.length,
          items,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}
