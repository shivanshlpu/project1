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

  @Get('api/app/version')
  @Head('api/app/version')
  @Get('app/version')
  @Head('app/version')
  getAppVersion() {
    const latestVersion = process.env.LATEST_APP_VERSION || '1.0.1';
    const latestVersionCode = parseInt(process.env.LATEST_VERSION_CODE || '2', 10);
    const minimumVersion = process.env.MIN_APP_VERSION || '1.0.0';
    const downloadUrl =
      process.env.APP_APK_URL ||
      'https://expo.dev/artifacts/eas/STernUOxw1uIVH1kMk5NwbbKfKgHY-rKm6Lq5mxsMbM.apk';
    const forceUpdate = process.env.FORCE_APP_UPDATE === 'true';

    return {
      appName: 'AHTRI FFA Mobile',
      packageName: 'com.ahtri.ffa',
      latestVersion,
      latestVersionCode,
      minimumVersion,
      downloadUrl,
      forceUpdate,
      releaseDate: '2026-09-09',
      releaseNotes: [
        'New High-Resolution Live Interactive Map with Road and Satellite modes',
        'Direct live search for newly opened clinics, medical shops, pharmacies & hospitals',
        'Fixed map tile server access on mobile phones (resolved 403 / blocked tile error)',
        'Fluid touch panning gesture and high-precision GPS lock with accuracy meter',
        'Automatic in-app update notification system (no more uninstall/reinstall needed)',
      ],
    };
  }
}
