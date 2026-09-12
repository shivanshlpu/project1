const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BUILD_ID = '1577c8b5-77dc-4902-80eb-c40fe63c5a89';
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DATA_DIR = path.join(ROOT_DIR, 'backend', 'data');
const BACKEND_DATA_FILE = path.join(BACKEND_DATA_DIR, 'app_version.json');
const OUTPUT_INFO_FILE = path.join(ROOT_DIR, 'LATEST_APK_INFO.md');
const APK_DESTINATION = path.join(ROOT_DIR, 'mobile', 'ahtri-ffa-latest.apk');

console.log(`[AutoAPK] Starting watcher for EAS build ${BUILD_ID}...`);
console.log(`[AutoAPK] Target root: ${ROOT_DIR}`);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`[AutoAPK] Downloaded APK successfully to: ${dest}`);
          resolve(dest);
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function checkBuild() {
  try {
    const stdout = execSync(`npx eas-cli build:view ${BUILD_ID} --json`, {
      cwd: path.join(ROOT_DIR, 'mobile'),
      encoding: 'utf-8',
      shell: true,
      env: { ...process.env, CI: 'true' },
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[AutoAPK] Waiting for build output...');
      return false;
    }

    const buildData = JSON.parse(jsonMatch[0]);
    console.log(`[AutoAPK] Current status: ${buildData.status}`);

    if (buildData.status === 'FINISHED') {
      const downloadUrl =
        buildData.artifacts?.buildUrl ||
        buildData.artifacts?.applicationArchiveUrl;

      if (!downloadUrl) {
        console.error('[AutoAPK] Build finished but no download URL found in artifacts!');
        return true;
      }

      console.log(`[AutoAPK] Build FINISHED! Download URL: ${downloadUrl}`);

      // 1. Write backend/data/app_version.json
      if (!fs.existsSync(BACKEND_DATA_DIR)) {
        fs.mkdirSync(BACKEND_DATA_DIR, { recursive: true });
      }

      const versionPayload = {
        appName: 'AHTRI FFA Mobile',
        packageName: 'com.ahtri.ffa',
        latestVersion: '1.0.4',
        latestVersionCode: 5,
        minimumVersion: '1.0.0',
        downloadUrl: downloadUrl,
        forceUpdate: false,
        isActive: true,
        releaseDate: new Date().toISOString().split('T')[0],
        publishedAt: new Date().toISOString(),
        publishedBy: 'System Auto-Build',
        releaseNotes: [
          'Official AHTRI Pharmaceuticals Branding & High-Resolution App Logo',
          'Live Task Lifecycle: Completed visits automatically move to History with Commercial Order Breakdown',
          'Persistent Geofenced Attendance Punch-in: Restores Marked Done status across tab switches',
          'Fluid 360-Degree Google Maps & Leaflet Touch Movement (Road & Satellite)',
          'Direct Tap-to-Pinpoint: Tap anywhere on the map or drag the pin with 100% precision',
          'Pinch-to-zoom, double-tap zoom, and smooth inertia panning without drone crosshairs',
          'High-Accuracy Indoor GPS & Live reverse-geocoding for clinics and pharmacies',
        ],
      };

      fs.writeFileSync(BACKEND_DATA_FILE, JSON.stringify(versionPayload, null, 2), 'utf-8');
      console.log(`[AutoAPK] Saved backend version payload to ${BACKEND_DATA_FILE}`);

      // 1b. Update backend/src/app.controller.ts defaultAppVersion
      const controllerPath = path.join(ROOT_DIR, 'backend', 'src', 'app.controller.ts');
      if (fs.existsSync(controllerPath)) {
        try {
          let controllerContent = fs.readFileSync(controllerPath, 'utf-8');
          controllerContent = controllerContent.replace(
            /process\.env\.APP_APK_URL \|\|\r?\n\s*'[^']*'/,
            `process.env.APP_APK_URL ||\n    '${downloadUrl}'`
          );
          fs.writeFileSync(controllerPath, controllerContent, 'utf-8');
          console.log(`[AutoAPK] Updated backend/src/app.controller.ts default APK url.`);
        } catch (cErr) {
          console.warn('[AutoAPK] Could not update app.controller.ts:', cErr.message);
        }
      }

      // 2. Write LATEST_APK_INFO.md in workspace root
      const infoMd = `# Latest AHTRI FFA Mobile APK Build (Official Logo & Branding)

- **Build ID**: \`${BUILD_ID}\`
- **Version**: \`v1.0.4\` (Version Code \`5\`)
- **Branding**: Official AHTRI Pharmaceuticals App Logo (App Icon, Splash Screen, Login Screen, App Header)
- **Git Commit**: \`${buildData.gitCommitHash || 'ff0a79ed7d0a'}\`
- **Build Completed At**: \`${new Date().toISOString()}\`
- **Direct Expo Download Link**: [Download APK](${downloadUrl})
- **Universal Permanent Redirect Link**: [https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk)
- **Backend API Download Link**: [https://ahtri-backend.onrender.com/api/app/latest-apk](https://ahtri-backend.onrender.com/api/app/latest-apk)

---

### Instructions for Employees:
1. Tap on the direct APK download link or visit [https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk) on any Android phone.
2. The download will start immediately.
3. Open the downloaded file to install/update the AHTRI FFA app with the new official logo and all latest features!
`;
      fs.writeFileSync(OUTPUT_INFO_FILE, infoMd, 'utf-8');
      console.log(`[AutoAPK] Written release info to ${OUTPUT_INFO_FILE}`);

      // 3. Ping live Render backend so in-memory state updates immediately
      try {
        const postData = JSON.stringify(versionPayload);
        const req = https.request('https://ahtri-backend.onrender.com/api/app/version', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        }, (res) => {
          console.log(`[AutoAPK] Notified live Render backend (status ${res.statusCode})`);
        });
        req.on('error', (e) => console.warn('[AutoAPK] Render ping error:', e.message));
        req.write(postData);
        req.end();
      } catch (pingErr) {
        console.warn('[AutoAPK] Render notify exception:', pingErr.message);
      }

      // 4. Download APK file locally
      try {
        console.log(`[AutoAPK] Downloading APK locally to ${APK_DESTINATION}...`);
        await downloadFile(downloadUrl, APK_DESTINATION);
        console.log(`[AutoAPK] Local APK download complete: ${APK_DESTINATION}`);
      } catch (dlErr) {
        console.warn(`[AutoAPK] Local download notice:`, dlErr.message);
      }

      // 5. Git commit & push
      try {
        console.log('[AutoAPK] Committing and pushing updated version to Git repository...');
        execSync('git add backend/data/app_version.json backend/src/app.controller.ts LATEST_APK_INFO.md admin-web/src/views/SettingsView.tsx', {
          cwd: ROOT_DIR,
          shell: true,
        });
        execSync('git commit -m "chore(release): update latest apk download url to version 1.0.4 with official app logo"', {
          cwd: ROOT_DIR,
          shell: true,
        });
        execSync('git -c http.sslVerify=false push origin main', {
          cwd: ROOT_DIR,
          shell: true,
        });
        console.log('[AutoAPK] Successfully pushed to origin main!');
      } catch (gitErr) {
        console.warn('[AutoAPK] Git push error (may be clean):', gitErr.message);
      }

      return true;
    } else if (buildData.status === 'ERRORED' || buildData.status === 'CANCELED') {
      console.error(`[AutoAPK] Build ${buildData.status}: ${JSON.stringify(buildData.error || {})}`);
      return true;
    }

    return false;
  } catch (err) {
    console.warn(`[AutoAPK] Poll check error:`, err.message);
    return false;
  }
}

async function run() {
  const isDone = await checkBuild();
  if (isDone) process.exit(0);

  const interval = setInterval(async () => {
    const finished = await checkBuild();
    if (finished) {
      clearInterval(interval);
      console.log('[AutoAPK] Completed successfully.');
      process.exit(0);
    }
  }, 30000);
}

run();
