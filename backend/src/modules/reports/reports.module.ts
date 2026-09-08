import { Injectable, Controller, Get, Query, UseGuards, Res, Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Response } from 'express';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getAttendanceReport(filter: { startDate?: string; endDate?: string; area_id?: string }) {
    return this.db.attendance
      .filter((a) => (filter.startDate ? a.date >= filter.startDate : true))
      .filter((a) => (filter.endDate ? a.date <= filter.endDate : true))
      .map((a) => {
        const user = this.db.users.find((u) => u.id === a.user_id);
        return {
          date: a.date,
          user_id: a.user_id,
          user_name: user?.name,
          check_in_at: a.check_in_at,
          check_out_at: a.check_out_at,
          status: a.status,
        };
      });
  }

  async getTasksReport(filter: { startDate?: string; endDate?: string }) {
    return this.db.tasks
      .filter((t) => (filter.startDate ? t.date >= filter.startDate : true))
      .filter((t) => (filter.endDate ? t.date <= filter.endDate : true))
      .map((t) => {
        const mr = this.db.users.find((u) => u.id === t.assigned_mr_id);
        const verifications = this.db.locationVerifications.filter((lv) => lv.task_id === t.id);
        return {
          id: t.id,
          title: t.title,
          date: t.date,
          mr_name: mr?.name,
          status: t.status,
          geofence_verified: verifications.some((v) => v.verified),
        };
      });
  }

  async getVisitsReport(filter: { startDate?: string; endDate?: string }) {
    return this.db.doctorVisits
      .filter((v) => (filter.startDate ? v.start_time >= filter.startDate : true))
      .filter((v) => (filter.endDate ? v.start_time <= filter.endDate : true))
      .map((v) => {
        const mr = this.db.users.find((u) => u.id === v.mr_id);
        const doc = this.db.doctors.find((d) => d.id === v.doctor_id);
        return {
          id: v.id,
          doctor_name: doc?.name,
          clinic: doc?.clinic,
          mr_name: mr?.name,
          start_time: v.start_time,
          duration_seconds: v.duration_seconds || 0,
          signature_captured: !!v.signature_file_key,
        };
      });
  }

  async getDcrReport(filter: { startDate?: string; endDate?: string }) {
    return this.db.dcrList
      .filter((d) => (filter.startDate ? d.date >= filter.startDate : true))
      .filter((d) => (filter.endDate ? d.date <= filter.endDate : true))
      .map((d) => {
        const mr = this.db.users.find((u) => u.id === d.mr_id);
        const items = this.db.dcrItems.filter((di) => di.dcr_id === d.id);
        return {
          id: d.id,
          date: d.date,
          mr_name: mr?.name,
          status: d.status,
          visit_count: items.length,
          orders_taken_count: items.filter((i) => i.order_taken).length,
        };
      });
  }

  async getExpensesReport(filter: { startDate?: string; endDate?: string }) {
    return this.db.expenses
      .filter((e) => (filter.startDate ? e.created_at >= filter.startDate : true))
      .filter((e) => (filter.endDate ? e.created_at <= filter.endDate : true))
      .map((e) => {
        const mr = this.db.users.find((u) => u.id === e.mr_id);
        return {
          id: e.id,
          mr_name: mr?.name,
          category: e.category,
          amount: e.amount,
          status: e.status,
          created_at: e.created_at,
        };
      });
  }

  generateCsv(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header] !== undefined ? String(row[header]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  async getAttendanceReport(@Query() filter: any) {
    return this.reportsService.getAttendanceReport(filter);
  }

  @Get('tasks')
  async getTasksReport(@Query() filter: any) {
    return this.reportsService.getTasksReport(filter);
  }

  @Get('visits')
  async getVisitsReport(@Query() filter: any) {
    return this.reportsService.getVisitsReport(filter);
  }

  @Get('dcr')
  async getDcrReport(@Query() filter: any) {
    return this.reportsService.getDcrReport(filter);
  }

  @Get('expenses')
  async getExpensesReport(@Query() filter: any) {
    return this.reportsService.getExpensesReport(filter);
  }

  @Get('export')
  async exportReport(
    @Query('type') type: 'attendance' | 'tasks' | 'visits' | 'dcr' | 'expenses',
    @Query('format') format: 'csv' | 'json',
    @Query() filter: any,
    @Res() res: Response,
  ) {
    let data: any[] = [];
    switch (type) {
      case 'attendance':
        data = await this.reportsService.getAttendanceReport(filter);
        break;
      case 'tasks':
        data = await this.reportsService.getTasksReport(filter);
        break;
      case 'visits':
        data = await this.reportsService.getVisitsReport(filter);
        break;
      case 'dcr':
        data = await this.reportsService.getDcrReport(filter);
        break;
      case 'expenses':
        data = await this.reportsService.getExpensesReport(filter);
        break;
      default:
        data = await this.reportsService.getVisitsReport(filter);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=report_${type}.json`);
      return res.send(JSON.stringify(data, null, 2));
    }

    const csvContent = this.reportsService.generateCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${type}.csv`);
    return res.send(csvContent);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
