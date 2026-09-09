import { Controller, Get, Post, Body, Head, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from './database/supabase.service';

interface AppVersionData {
  appName: string;
  packageName: string;
  latestVersion: string;
  latestVersionCode: number;
  minimumVersion: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseDate: string;
  releaseNotes: string[];
}

// In-memory version state with fallback to environment variables
let currentAppVersion: AppVersionData = {
  appName: 'AHTRI FFA Mobile',
  packageName: 'com.ahtri.ffa',
  latestVersion: process.env.LATEST_APP_VERSION || '1.0.1',
  latestVersionCode: parseInt(process.env.LATEST_VERSION_CODE || '2', 10),
  minimumVersion: process.env.MIN_APP_VERSION || '1.0.0',
  downloadUrl:
    process.env.APP_APK_URL ||
    'https://expo.dev/artifacts/eas/Nw3kdnt3upYrJLLbnqZPdyQdQxYB1bPvIDE1n7saZV4.apk',
  forceUpdate: process.env.FORCE_APP_UPDATE === 'true',
  releaseDate: new Date().toISOString().split('T')[0],
  releaseNotes: [
    'In-App Download Progress Bar (Just like Google Play Store)',
    'Seamless Native Update Prompt: No browser redirects required',
    'High-Resolution Live Google Maps with Road & Satellite views',
    'Territory doctor directory & instant geotagging',
    'Zero map freeze and smooth gesture panning',
  ],
};

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

  /**
   * Check latest version metadata
   */
  @Get('api/app/version')
  @Head('api/app/version')
  @Get('app/version')
  @Head('app/version')
  getAppVersion() {
    return currentAppVersion;
  }

  /**
   * Set new APK link or version on the server dynamically
   * Any client can update or admin can publish
   */
  @Post('api/app/version')
  @Post('app/version')
  updateAppVersion(@Body() body: Partial<AppVersionData>) {
    if (body.latestVersion) currentAppVersion.latestVersion = body.latestVersion;
    if (body.latestVersionCode) currentAppVersion.latestVersionCode = Number(body.latestVersionCode);
    if (body.minimumVersion) currentAppVersion.minimumVersion = body.minimumVersion;
    if (body.downloadUrl) currentAppVersion.downloadUrl = body.downloadUrl;
    if (typeof body.forceUpdate === 'boolean') currentAppVersion.forceUpdate = body.forceUpdate;
    if (Array.isArray(body.releaseNotes)) currentAppVersion.releaseNotes = body.releaseNotes;
    currentAppVersion.releaseDate = new Date().toISOString().split('T')[0];

    return {
      success: true,
      message: 'App version and APK link updated successfully on server',
      current: currentAppVersion,
    };
  }

  /**
   * Direct APK Download Stream / 302 Redirect
   * Allows downloading directly from https://ahtri-backend.onrender.com/app/latest-apk
   */
  @Get('api/app/latest-apk')
  @Get('app/latest-apk')
  downloadLatestApk(@Res() res: Response) {
    if (!currentAppVersion.downloadUrl) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'No APK download URL configured.' });
    }
    // Redirect directly to the storage APK URL
    return res.redirect(HttpStatus.FOUND, currentAppVersion.downloadUrl);
  }
}
