import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { CreateDoctorDto, UpdateDoctorDto, DoctorFilterDto } from './dto/doctors.dto';
import { Doctor } from '../../database/database.types';
import { encodeBatchInAddress } from '../locations/locations.service';

@Injectable()
export class DoctorsService {
  constructor(private readonly db: DatabaseService) {}

  async getDoctors(filter: DoctorFilterDto, user?: any) {
    let list = this.db.doctors.filter((d) => !d.deleted_at);

    // Strict MR Isolation (§Client Requirement): An MR should ONLY see locations/doctors marked by them or assigned to them
    if (user && user.role === 'MR') {
      const mrId = user.id || user.sub;
      list = list.filter((d) => {
        const isCreatedByMe = d.created_by === mrId;
        const isAssignedToMe = d.assigned_mr_id === mrId;
        const matchesName = user.name && d.assigned_mr_name?.toLowerCase().includes(user.name.toLowerCase());
        const matchesCreatedName = user.name && d.created_by_name?.toLowerCase().includes(user.name.toLowerCase());
        return isCreatedByMe || isAssignedToMe || matchesName || matchesCreatedName;
      });
    } else if (filter.assigned_mr_id) {
      list = list.filter((d) => d.assigned_mr_id === filter.assigned_mr_id || d.created_by === filter.assigned_mr_id);
    }

    if (filter.area_id) {
      list = list.filter((d) => d.area_id === filter.area_id);
    }
    if (filter.class) {
      list = list.filter((d) => d.class === filter.class);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.clinic.toLowerCase().includes(q) ||
          (d.specialization && d.specialization.toLowerCase().includes(q)),
      );
    }

    return list;
  }

  async getDoctorById(id: string, user?: any) {
    const doctor = this.db.doctors.find((d) => d.id === id && !d.deleted_at);
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (user && user.role === 'MR') {
      const mrId = user.id || user.sub;
      const isCreatedByMe = doctor.created_by === mrId;
      const isAssignedToMe = doctor.assigned_mr_id === mrId;
      const matchesName = user.name && doctor.assigned_mr_name?.toLowerCase().includes(user.name.toLowerCase());
      const matchesCreatedName = user.name && doctor.created_by_name?.toLowerCase().includes(user.name.toLowerCase());
      if (!isCreatedByMe && !isAssignedToMe && !matchesName && !matchesCreatedName) {
        throw new NotFoundException('Doctor not found');
      }
    }

    return doctor;
  }

  async createDoctor(dto: CreateDoctorDto, createdBy: string) {
    const creator = this.db.users.find((u) => u.id === createdBy);
    const assignedMrId = dto.assigned_mr_id || (creator?.role === 'MR' ? creator.id : undefined);
    let assignedMrName = dto.assigned_mr_name;
    if (!assignedMrName && assignedMrId) {
      const assignedUser = this.db.users.find((u) => u.id === assignedMrId);
      assignedMrName = assignedUser ? assignedUser.name : (creator?.name || 'Field Representative');
    }

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
      area_id: dto.area_id || 'area-shd-07',
      assigned_mr_id: assignedMrId,
      assigned_mr_name: assignedMrName,
      batch_id: dto.batch_id,
      batch_code: dto.batch_code,
      batch_name: dto.batch_name,
      created_by: createdBy,
      created_by_role: creator ? creator.role : 'MR',
      created_by_name: creator ? creator.name : (assignedMrName || 'Field MR'),
      created_at: new Date().toISOString(),
    };

    this.db.doctors.push(doctor);
    this.db.persistToDisk();
    return doctor;
  }

  async updateDoctor(id: string, dto: UpdateDoctorDto, user?: any) {
    const doctor = await this.getDoctorById(id, user);

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
    const oldBatchId = doctor.batch_id;
    if (dto.batch_id !== undefined) {
      if (!dto.batch_id || dto.batch_id === '__none__' || dto.batch_id === 'none') {
        doctor.batch_id = undefined;
        doctor.batch_code = undefined;
        doctor.batch_name = undefined;
        if (oldBatchId) {
          const oldBatch = this.db.routeBatches.find((b) => b.id === oldBatchId || b.batch_code === oldBatchId);
          if (oldBatch && oldBatch.location_ids) {
            oldBatch.location_ids = oldBatch.location_ids.filter((lid) => lid !== doctor.id);
          }
        }
      } else {
        if (oldBatchId && oldBatchId !== dto.batch_id) {
          const oldBatch = this.db.routeBatches.find((b) => b.id === oldBatchId || b.batch_code === oldBatchId);
          if (oldBatch && oldBatch.location_ids) {
            oldBatch.location_ids = oldBatch.location_ids.filter((lid) => lid !== doctor.id);
          }
        }
        doctor.batch_id = dto.batch_id;
        const foundBatch = this.db.routeBatches.find(
          (b) => b.id === dto.batch_id || b.batch_code === dto.batch_id,
        );
        if (foundBatch) {
          doctor.batch_code = foundBatch.batch_code;
          doctor.batch_name = foundBatch.name;
          if (!foundBatch.location_ids) foundBatch.location_ids = [];
          if (!foundBatch.location_ids.includes(doctor.id)) {
            foundBatch.location_ids.push(doctor.id);
          }
        } else {
          doctor.batch_code = dto.batch_code;
          doctor.batch_name = dto.batch_name;
        }
      }
    } else {
      if (dto.batch_code !== undefined) doctor.batch_code = dto.batch_code;
      if (dto.batch_name !== undefined) doctor.batch_name = dto.batch_name;
    }

    if (dto.assigned_mr_id !== undefined) {
      doctor.assigned_mr_id = dto.assigned_mr_id;
      if (dto.assigned_mr_name) {
        doctor.assigned_mr_name = dto.assigned_mr_name;
      } else {
        const mr = this.db.users.find((u) => u.id === dto.assigned_mr_id);
        doctor.assigned_mr_name = mr ? mr.name : 'Assigned MR';
      }
    }

    // Also sync matching saved_location if present
    if (this.db.savedLocations) {
      const loc = this.db.savedLocations.find((l) => l.id === id);
      if (loc) {
        if (dto.clinic) loc.clinic = dto.clinic;
        if (dto.name) loc.name = dto.name;
        if (dto.name) loc.doctor_name = dto.name;
        if (dto.address) loc.address = dto.address;
        if (dto.phone) loc.phone = dto.phone;
        if (dto.latitude !== undefined) loc.latitude = dto.latitude;
        if (dto.longitude !== undefined) loc.longitude = dto.longitude;
        if (dto.batch_id !== undefined) {
          loc.batch_id = doctor.batch_id;
          loc.batch_code = doctor.batch_code;
          loc.batch_name = doctor.batch_name;
        }
      }
    }

    if (this.db.supabase?.isConnected) {
      const client = this.db.supabase.getClient();
      if (client) {
        try {
          const encodedAddress = encodeBatchInAddress(doctor.address, doctor.batch_id, doctor.batch_code, doctor.batch_name);
          await client.from('saved_locations').update({
            name: doctor.clinic || doctor.name,
            address: encodedAddress,
            latitude: doctor.latitude,
            longitude: doctor.longitude,
            contact_person: doctor.name,
            contact_phone: doctor.phone,
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        } catch (sbErr: any) {
          console.warn('[DoctorsService] Failed to update in Supabase:', sbErr?.message);
        }
      }
    }

    if (dto.batch_id !== undefined) {
      this.db.syncAllRouteBatchesToSupabase(this.db.routeBatches).catch(() => {});
    }

    this.db.persistToDisk();
    return doctor;
  }

  async getDoctorVisits(id: string, user?: any) {
    await this.getDoctorById(id, user);
    return this.db.doctorVisits
      .filter((v) => v.doctor_id === id)
      .sort((a, b) => b.start_time.localeCompare(a.start_time));
  }
}
