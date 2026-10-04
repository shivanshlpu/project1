const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BUILD_ID = 'f24fecc0-5791-426c-aa02-52563c853711';
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
        latestVersion: '1.0.7',
        latestVersionCode: 8,
        minimumVersion: '1.0.0',
        downloadUrl: downloadUrl,
        forceUpdate: false,
        isActive: true,
        releaseDate: new Date().toISOString().split('T')[0],
        publishedAt: new Date().toISOString(),
        publishedBy: 'System Auto-Build',
        releaseNotes: [
          'Monthly Tour Plan (TP) Multi-Date Submission, Dynamic Sub-Area Filtering & 24h Edit Window',
          'Compressed Attendance Photo Capture with Work Attire Check & Dedicated Policy Modal',
          'Multi-HQ Stocker Hierarchy & Live Stock Balance Lookup',
          'Live Store In-Stock Medicine Detailing Focus & Real-Time Inventory Sync',
          'Compact Realistic 3D Map Markers & Dedicated Custom Location Marking',
          'Order Pending Workflow for Flexible Post-Detailing Order Entry',
          'Single Source of Truth Sales Competitions, Progress Tracking & Reward Claims',
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
      const infoMd = `# Latest AHTRI FFA Mobile APK Build (Version 1.0.7 - Tour Plans, Photo Proof & Store Inventory)

- **Build ID**: \`${BUILD_ID}\`
- **Version**: \`v1.0.7\` (Version Code \`8\`)
- **Branding**: Official AHTRI BIOTECH App Logo & Enterprise Palette
- **Git Commit**: \`${buildData.gitCommitHash || 'b59d8a1e1b53'}\`
- **Build Completed At**: \`${new Date().toISOString()}\`
- **Direct Expo Download Link**: [Download APK](${downloadUrl})
- **Universal Permanent Redirect Link**: [https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk)
- **Backend API Download Link**: [https://ahtri-backend.onrender.com/api/app/latest-apk](https://ahtri-backend.onrender.com/api/app/latest-apk)

---

### What's New in Version 1.0.7:
1. **Monthly Tour Plan (TP)**: Multi-date tour plan submission with objective detailing, review list, dynamic sub-area dropdowns, and 24-hour edit enforcement.
2. **Attendance Photo Proof & Storage Guidelines**: Compressed selfie capture with work attire check, geo-tagging, and dedicated employee Attendance Policy modal.
3. **Multi-HQ Stocker Hierarchy & Live Stock Balance**: Live stock balance lookup with sub-area filtering and shortage tracking.
4. **Live Store In-Stock Medicine Detailing**: Task detailing focus dynamically reflects store stock in real-time.
5. **Compact Realistic Map Markers**: Scaled down 3D Google Maps pins (24x32px) and dedicated custom location task assignment.
6. **Order Pending Workflow**: Flexible post-detailing order submission and shortage tolerance.
7. **Sales Competitions & Reward Claims**: Single source of truth progress bar and one-tap reward claims.

---

### Instructions for Employees:
1. Open this link on your Android smartphone:
   **[https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk)**
   *(or use the Direct Expo Download Link above)*
2. The download will start immediately.
3. Open the downloaded file to install/update the AHTRI FFA app with all the latest features!
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
        execSync('git commit -m "chore(release): update latest apk download url to version 1.0.5.1 (versionCode 6)"', {
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
