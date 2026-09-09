import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TerritoriesModule } from './modules/territories/territories.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { VisitsModule } from './modules/visits/visits.module';
import { DcrModule } from './modules/dcr/dcr.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule, AuditInterceptor } from './modules/audit/audit.module';
import { LocationsModule } from './modules/locations/locations.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    TerritoriesModule,
    TasksModule,
    AttendanceModule,
    DoctorsModule,
    VisitsModule,
    DcrModule,
    ExpensesModule,
    ApprovalsModule,
    NotificationsModule,
    ReportsModule,
    AiAssistantModule,
    SyncModule,
    AuditModule,
    LocationsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
