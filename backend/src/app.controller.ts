import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './database/supabase.service';

@Controller()
export class AppController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'AHTRI FFA Backend',
      timestamp: new Date().toISOString(),
      supabase: this.supabase.getStatus(),
    };
  }
}
