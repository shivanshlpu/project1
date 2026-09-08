import {
  Injectable,
  Controller,
  Get,
  Query,
  UseGuards,
  Module,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { AuditLog } from '../../database/database.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly db: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit mutation operations (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap((resBody) => {
          const user = req.user;
          if (user) {
            const auditEntry: AuditLog = {
              id: `aud-${uuidv4().substring(0, 8)}`,
              user_id: user.id,
              action: `${method} ${req.route?.path || req.url}`,
              entity_type: req.url.split('/')[1]?.toUpperCase() || 'GENERAL',
              entity_id: req.params?.id || resBody?.id || resBody?.task?.id || resBody?.dcr?.id || 'N/A',
              new_value_json: req.body,
              ip_address: req.ip || req.connection?.remoteAddress,
              device_info: req.headers['user-agent'] || 'Unknown Device',
              created_at: new Date().toISOString(),
            };
            this.db.auditLogs.push(auditEntry);
          }
        }),
      );
    }
    return next.handle();
  }
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async getAuditLogs(filter: { entity_type?: string; entity_id?: string; user_id?: string }) {
    return this.db.auditLogs
      .filter((a) => (filter.entity_type ? a.entity_type === filter.entity_type : true))
      .filter((a) => (filter.entity_id ? a.entity_id === filter.entity_id : true))
      .filter((a) => (filter.user_id ? a.user_id === filter.user_id : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('user_id') userId?: string,
  ) {
    return this.auditService.getAuditLogs({ entity_type: entityType, entity_id: entityId, user_id: userId });
  }
}

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
