import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { StartVisitDto, EndVisitDto } from './dto/visits.dto';
import { DoctorVisit, VisitDetail } from '../../database/database.types';

@Injectable()
export class VisitsService {
  constructor(private readonly db: DatabaseService) {}

  async startVisit(mrId: string, dto: StartVisitDto) {
    const doctor = this.db.doctors.find((d) => d.id === dto.doctor_id && !d.deleted_at);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const activeVisit = this.db.doctorVisits.find(
      (v) => v.mr_id === mrId && !v.end_time,
    );
    if (activeVisit) {
      throw new ConflictException('You already have an active visit in progress. Please end it first.');
    }

    const visit: DoctorVisit = {
      id: `vis-${uuidv4().substring(0, 8)}`,
      doctor_id: dto.doctor_id,
      mr_id: mrId,
      start_time: new Date().toISOString(),
      start_lat: dto.latitude,
      start_lng: dto.longitude,
      gps_accuracy_m: dto.gps_accuracy_m || 10,
      created_at: new Date().toISOString(),
    };

    this.db.doctorVisits.push(visit);
    return {
      message: 'Visit started successfully',
      visit,
      doctor: { id: doctor.id, name: doctor.name, clinic: doctor.clinic },
    };
  }

  async endVisit(visitId: string, mrId: string, dto: EndVisitDto) {
    const visit = this.db.doctorVisits.find((v) => v.id === visitId);
    if (!visit) throw new NotFoundException('Visit not found');

    if (visit.mr_id !== mrId) {
      throw new ForbiddenException('You are not authorized to end this visit');
    }

    if (visit.end_time) {
      throw new BadRequestException('Visit has already been completed');
    }

    const endTime = new Date();
    const startTime = new Date(visit.start_time);
    const durationSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    visit.end_time = endTime.toISOString();
    visit.duration_seconds = durationSeconds;
    visit.end_lat = dto.end_lat || visit.start_lat;
    visit.end_lng = dto.end_lng || visit.start_lng;
    visit.signature_file_key = dto.signature_file_key;
    visit.remarks = dto.remarks;
    visit.follow_up_date = dto.follow_up_date;

    const details: VisitDetail[] = [];
    if (dto.products && dto.products.length > 0) {
      for (const p of dto.products) {
        const detail: VisitDetail = {
          id: `vd-${uuidv4().substring(0, 8)}`,
          visit_id: visit.id,
          product_id: p.product_id,
          product_name: p.product_name,
          samples_given: p.samples_given,
          notes: p.notes,
        };
        this.db.visitDetails.push(detail);
        details.push(detail);
      }
    }

    return {
      message: 'Visit completed successfully',
      visit,
      details,
    };
  }

  async getMyVisits(mrId: string, date?: string) {
    return this.db.doctorVisits
      .filter((v) => v.mr_id === mrId)
      .filter((v) => (date ? v.start_time.startsWith(date) : true))
      .map((v) => {
        const doc = this.db.doctors.find((d) => d.id === v.doctor_id);
        const details = this.db.visitDetails.filter((vd) => vd.visit_id === v.id);
        return {
          ...v,
          doctor_name: doc?.name || 'Unknown Doctor',
          doctor_clinic: doc?.clinic || '',
          details,
        };
      })
      .sort((a, b) => b.start_time.localeCompare(a.start_time));
  }

  async getAdminVisits(filter: { mr_id?: string; doctor_id?: string; startDate?: string; endDate?: string }) {
    return this.db.doctorVisits
      .filter((v) => (filter.mr_id ? v.mr_id === filter.mr_id : true))
      .filter((v) => (filter.doctor_id ? v.doctor_id === filter.doctor_id : true))
      .filter((v) => (filter.startDate ? v.start_time >= filter.startDate : true))
      .filter((v) => (filter.endDate ? v.start_time <= filter.endDate : true))
      .map((v) => {
        const mr = this.db.users.find((u) => u.id === v.mr_id);
        const doc = this.db.doctors.find((d) => d.id === v.doctor_id);
        const details = this.db.visitDetails.filter((vd) => vd.visit_id === v.id);
        return {
          ...v,
          mr_name: mr?.name || 'Unknown MR',
          doctor_name: doc?.name || 'Unknown Doctor',
          doctor_clinic: doc?.clinic || '',
          details,
        };
      })
      .sort((a, b) => b.start_time.localeCompare(a.start_time));
  }
}
