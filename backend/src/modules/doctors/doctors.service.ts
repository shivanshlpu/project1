import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { CreateDoctorDto, UpdateDoctorDto, DoctorFilterDto } from './dto/doctors.dto';
import { Doctor } from '../../database/database.types';

@Injectable()
export class DoctorsService {
  constructor(private readonly db: DatabaseService) {}

  async getDoctors(filter: DoctorFilterDto) {
    return this.db.doctors
      .filter((d) => !d.deleted_at)
      .filter((d) => (filter.area_id ? d.area_id === filter.area_id : true))
      .filter((d) => (filter.class ? d.class === filter.class : true))
      .filter((d) => (filter.assigned_mr_id ? d.assigned_mr_id === filter.assigned_mr_id : true))
      .filter((d) =>
        filter.search
          ? d.name.toLowerCase().includes(filter.search.toLowerCase()) ||
            d.clinic.toLowerCase().includes(filter.search.toLowerCase()) ||
            (d.specialization && d.specialization.toLowerCase().includes(filter.search.toLowerCase()))
          : true,
      );
  }

  async getDoctorById(id: string) {
    const doctor = this.db.doctors.find((d) => d.id === id && !d.deleted_at);
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async createDoctor(dto: CreateDoctorDto, createdBy: string) {
    const creator = this.db.users.find((u) => u.id === createdBy);
    const doctor: Doctor = {
      id: `doc-${uuidv4().substring(0, 8)}`,
      name: dto.name,
      qualification: dto.qualification || '',
      specialization: dto.specialization || '',
      class: dto.class || 'B',
      potential_score: dto.potential_score ?? 70,
      phone: dto.phone || '',
      whatsapp: dto.whatsapp || '',
      clinic: dto.clinic || dto.name,
      category: dto.category || 'CLINIC',
      hospital: dto.hospital || '',
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      area_id: dto.area_id || 'area-sdelhi-1',
      created_by: createdBy,
      created_by_role: creator ? creator.role : 'MR',
      created_by_name: creator ? creator.name : 'Unknown User',
      created_at: new Date().toISOString(),
    };

    this.db.doctors.push(doctor);
    return doctor;
  }

  async updateDoctor(id: string, dto: UpdateDoctorDto) {
    const doctor = this.db.doctors.find((d) => d.id === id && !d.deleted_at);
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (dto.name) doctor.name = dto.name;
    if (dto.qualification !== undefined) doctor.qualification = dto.qualification;
    if (dto.specialization !== undefined) doctor.specialization = dto.specialization;
    if (dto.class) doctor.class = dto.class;
    if (dto.potential_score !== undefined) doctor.potential_score = dto.potential_score;
    if (dto.phone) doctor.phone = dto.phone;
    if (dto.clinic) doctor.clinic = dto.clinic;
    if (dto.address) doctor.address = dto.address;
    if (dto.latitude !== undefined) doctor.latitude = dto.latitude;
    if (dto.longitude !== undefined) doctor.longitude = dto.longitude;
    if (dto.area_id) doctor.area_id = dto.area_id;
    if (dto.assigned_mr_id !== undefined) {
      doctor.assigned_mr_id = dto.assigned_mr_id;
      if (dto.assigned_mr_name) {
        doctor.assigned_mr_name = dto.assigned_mr_name;
      } else {
        const mr = this.db.users.find((u) => u.id === dto.assigned_mr_id);
        doctor.assigned_mr_name = mr ? mr.name : 'Assigned MR';
      }
    }

    return doctor;
  }

  async getDoctorVisits(id: string) {
    await this.getDoctorById(id);
    return this.db.doctorVisits
      .filter((v) => v.doctor_id === id)
      .sort((a, b) => b.start_time.localeCompare(a.start_time));
  }
}
