import { Controller, Get, Post, Body, Head, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseService } from './database/supabase.service';

export interface AppVersionData {
  appName: string;
  packageName: string;
  latestVersion: string;
  latestVersionCode: number;
  minimumVersion: string;
  downloadUrl: string;
  forceUpdate: boolean;
  isActive: boolean;
  releaseDate: string;
  releaseNotes: string[];
  publishedAt?: string;
  publishedBy?: string;
}

const defaultAppVersion: AppVersionData = {
  appName: 'AHTRI FFA Mobile',
  packageName: 'com.ahtri.ffa',
  latestVersion: process.env.LATEST_APP_VERSION || '1.0.2',
  latestVersionCode: parseInt(process.env.LATEST_VERSION_CODE || '3', 10),
  minimumVersion: process.env.MIN_APP_VERSION || '1.0.0',
  downloadUrl:
    process.env.APP_APK_URL ||
    'https://expo.dev/artifacts/eas/fxrTnPzj_yZRx9iFK6DhNwSoMM2E-wYG1g0iZbSEE0Y.apk',
  forceUpdate: process.env.FORCE_APP_UPDATE === 'true',
  isActive: true,
  releaseDate: new Date().toISOString().split('T')[0],
  publishedAt: new Date().toISOString(),
  publishedBy: 'System Admin',
  releaseNotes: [
    'Free Touch & Pan Live Google Maps with Road & Satellite views',
    'Tap-to-Pinpoint: Instantly mark clinic/hospital locations anywhere',
    'Seamless Native Update Prompt: No browser redirects required',
    'Territory doctor directory & instant geotagging',
    'Ultra-fast server connection & zero freeze',
  ],
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'app_version.json');

function loadPersistedVersion(): AppVersionData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.latestVersion && parsed.downloadUrl) {
        return { ...defaultAppVersion, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[AppVersion] Could not load persisted app_version.json, using defaults:', err);
  }
  return { ...defaultAppVersion };
}

function savePersistedVersion(data: AppVersionData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AppVersion] Failed to save app_version.json:', err);
  }
}

// In-memory version state initialized from persistent storage
let currentAppVersion: AppVersionData = loadPersistedVersion();

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
   * Set new APK link or version on the server dynamically from Admin Panel
   * Saves to persistent file storage so server restarts never lose the link.
   */
  @Post('api/app/version')
  @Post('app/version')
  updateAppVersion(@Body() body: Partial<AppVersionData>) {
    if (body.downloadUrl && body.downloadUrl.trim()) {
      const newUrl = body.downloadUrl.trim();
      if (newUrl !== currentAppVersion.downloadUrl) {
        currentAppVersion.downloadUrl = newUrl;
        // Auto-increment version if admin didn't specify one
        if (!body.latestVersion) {
          const parts = (currentAppVersion.latestVersion || '1.0.1').split('.');
          const lastIndex = Math.max(0, parts.length - 1);
          const nextPatch = (parseInt(parts[lastIndex] || '0', 10) || 0) + 1;
          parts[lastIndex] = String(nextPatch);
          currentAppVersion.latestVersion = parts.join('.');
          currentAppVersion.latestVersionCode = (currentAppVersion.latestVersionCode || 1) + 1;
        }
      }
    }
    if (body.latestVersion) currentAppVersion.latestVersion = body.latestVersion.trim();
    if (body.latestVersionCode) currentAppVersion.latestVersionCode = Number(body.latestVersionCode);
    if (body.minimumVersion) currentAppVersion.minimumVersion = body.minimumVersion.trim();
    if (typeof body.forceUpdate === 'boolean') currentAppVersion.forceUpdate = body.forceUpdate;
    if (typeof body.isActive === 'boolean') currentAppVersion.isActive = body.isActive;
    if (Array.isArray(body.releaseNotes)) currentAppVersion.releaseNotes = body.releaseNotes.filter(Boolean);
    if (body.publishedBy) currentAppVersion.publishedBy = body.publishedBy;

    currentAppVersion.releaseDate = new Date().toISOString().split('T')[0];
    currentAppVersion.publishedAt = new Date().toISOString();

    // Persist to disk
    savePersistedVersion(currentAppVersion);

    return {
      success: true,
      message: 'App version broadcast updated and persisted successfully on server',
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
