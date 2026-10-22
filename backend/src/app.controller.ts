import { Controller, Get, Post, Body, Head, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseService } from './database/supabase.service';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { Roles } from './common/roles.decorator';

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
  appName: 'AHTRI FFA',
  packageName: 'com.ahtri.ffa',
  latestVersion: process.env.LATEST_APP_VERSION || '1.0.38',
  latestVersionCode: parseInt(process.env.LATEST_VERSION_CODE || '39', 10),
  minimumVersion: process.env.MIN_APP_VERSION || '1.0.0',
  downloadUrl:
    process.env.APP_APK_URL ||
    'https://github.com/shivanshlpu/project1/releases/download/v1.0.38/ahtri-ffa-mobile.apk',
  forceUpdate: process.env.FORCE_APP_UPDATE === 'true',
  isActive: true,
  releaseDate: new Date().toISOString().split('T')[0],
  publishedAt: new Date().toISOString(),
  publishedBy: 'System Admin',
  releaseNotes: [
    'Out-of-Stock Order Visibility: Orders containing out-of-stock items remain visible with warnings instead of being hidden',
    'MR Location Attribution & Isolation: Field Representatives view and manage their own marked locations with complete author attribution',
    'Route Batch Location Assignment: Territory route batches allow assigning and grouping multiple verified clinic locations',
    'Multi-Location Tour Planning: Monthly TP allows selecting multiple pinned locations per day/date with automatic sequence ordering',
    'Route Change Request Workflow: MRs can request mid-cycle route changes for approved tour plans with instant admin review & approval',
    'TP-Driven Geofenced Task Sequencing: Approved tour plans automatically generate sequenced daily tasks with 50-meter geofence enforcement',
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

  
  @Get(['api/app/version', 'app/version'])
  @Head(['api/app/version', 'app/version'])
  getAppVersion() {
    return currentAppVersion;
  }

  
  @Post(['api/app/version', 'app/version'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  updateAppVersion(@Body() body: Partial<AppVersionData>) {
    if (body.downloadUrl && body.downloadUrl.trim()) {
      const trimmedUrl = body.downloadUrl.trim();
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          currentAppVersion.downloadUrl = trimmedUrl;
        }
      } catch {
        
      }
    }

    if (body.latestVersion && body.latestVersion.trim()) {
      currentAppVersion.latestVersion = body.latestVersion.trim();
    } else {
      
      const parts = (currentAppVersion.latestVersion || '1.0.3').split('.');
      const lastIndex = Math.max(0, parts.length - 1);
      const nextPatch = (parseInt(parts[lastIndex] || '0', 10) || 0) + 1;
      parts[lastIndex] = String(nextPatch);
      currentAppVersion.latestVersion = parts.join('.');
      currentAppVersion.latestVersionCode = (currentAppVersion.latestVersionCode || 4) + 1;
    }

    if (body.latestVersionCode) currentAppVersion.latestVersionCode = Number(body.latestVersionCode);
    if (body.minimumVersion) currentAppVersion.minimumVersion = body.minimumVersion.trim();
    if (typeof body.forceUpdate === 'boolean') currentAppVersion.forceUpdate = body.forceUpdate;
    if (typeof body.isActive === 'boolean') currentAppVersion.isActive = body.isActive;
    if (Array.isArray(body.releaseNotes)) currentAppVersion.releaseNotes = body.releaseNotes.filter(Boolean);
    if (body.publishedBy) currentAppVersion.publishedBy = body.publishedBy;

    currentAppVersion.releaseDate = new Date().toISOString().split('T')[0];
    currentAppVersion.publishedAt = new Date().toISOString();

    
    savePersistedVersion(currentAppVersion);

    return {
      success: true,
      message: 'App version broadcast updated and persisted successfully on server',
      current: currentAppVersion,
    };
  }

  
  @Get([
    'api/app/latest-apk',
    'app/latest-apk',
    'download-apk',
    'latest-apk',
    'download',
    'api/download-apk',
    'api/latest-apk',
    'api/download',
    'app/download',
  ])
  downloadLatestApk(@Res() res: Response) {
    if (!currentAppVersion.downloadUrl) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'No APK download URL configured.' });
    }
    
    return res.redirect(HttpStatus.FOUND, currentAppVersion.downloadUrl);
  }
}
