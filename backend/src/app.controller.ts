import { Controller, Get, Head } from '@nestjs/common';
import { SupabaseService } from './database/supabase.service';

@Controller()
export class AppController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  @Head()
  getRoot() {
    return {
      status: 'ok',
      service: 'AHTRI FFA Backend',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @Head('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'AHTRI FFA Backend',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      supabase: this.supabase.getStatus(),
    };
  }
}
