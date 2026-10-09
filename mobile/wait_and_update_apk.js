const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BUILD_ID = '410a89e3-e20b-40bc-9c33-113ab8946548';
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
        latestVersion: '1.0.16',
        latestVersionCode: 17,
        minimumVersion: '1.0.0',
        downloadUrl: downloadUrl,
        forceUpdate: false,
        isActive: true,
        releaseDate: new Date().toISOString().split('T')[0],
        publishedAt: new Date().toISOString(),
        publishedBy: 'System Auto-Build',
        releaseNotes: [
          'App Performance & Battery Optimization: Background lifecycle pausing to freeze network polling when app is minimized',
          'Low-End Device Acceleration: Throttled UI intervals across task, order, and leave screens for smooth interaction',
          'Network Resilience: Idempotent task completion preventing duplicate submission errors on flaky connectivity',
          'Separate leave allocation per employee configured directly from Admin Panel',
          'Complete Field Orders workflow with HQ-specific assignment & delivery confirmation',
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
          controllerContent = controllerContent.replace(
            /latestVersion:\s*process\.env\.LATEST_APP_VERSION \|\|\s*'[^']*'/,
            `latestVersion: process.env.LATEST_APP_VERSION || '1.0.16'`
          );
          controllerContent = controllerContent.replace(
            /latestVersionCode:\s*parseInt\(process\.env\.LATEST_VERSION_CODE \|\|\s*'[^']*',\s*10\)/,
            `latestVersionCode: parseInt(process.env.LATEST_VERSION_CODE || '17', 10)`
          );
          fs.writeFileSync(controllerPath, controllerContent, 'utf-8');
          console.log(`[AutoAPK] Updated backend/src/app.controller.ts default APK url.`);
        } catch (cErr) {
          console.warn('[AutoAPK] Could not update app.controller.ts:', cErr.message);
        }
      }

      // 1c. Update admin-web/src/views/SettingsView.tsx
      const settingsPath = path.join(ROOT_DIR, 'admin-web', 'src', 'views', 'SettingsView.tsx');
      if (fs.existsSync(settingsPath)) {
        try {
          let settingsContent = fs.readFileSync(settingsPath, 'utf-8');
          settingsContent = settingsContent.replace(
            /latestVersion:\s*'[^']+'/,
            `latestVersion: '1.0.16'`
          );
          settingsContent = settingsContent.replace(
            /latestVersionCode:\s*\d+/,
            `latestVersionCode: 17`
          );
          settingsContent = settingsContent.replace(
            /downloadUrl:\s*'https:\/\/expo\.dev\/artifacts\/eas\/[^']+\.apk'/,
            `downloadUrl: '${downloadUrl}'`
          );
          settingsContent = settingsContent.replace(
            /placeholder="https:\/\/expo\.dev\/artifacts\/eas\/[^"]+\.apk"/,
            `placeholder="${downloadUrl}"`
          );
          fs.writeFileSync(settingsPath, settingsContent, 'utf-8');
          console.log(`[AutoAPK] Updated admin-web/src/views/SettingsView.tsx with new APK URL.`);
        } catch (sErr) {
          console.warn('[AutoAPK] Could not update SettingsView.tsx:', sErr.message);
        }
      }

      // 2. Write LATEST_APK_INFO.md in workspace root
      const infoMd = `# Latest AHTRI FFA Mobile APK Build (Version 1.0.15 - Leave Quota Sync & Orders Workflow)

- **Build ID**: \`${BUILD_ID}\`
- **Version**: \`v1.0.15\` (Version Code \`16\`)
- **Branding**: Official AHTRI BIOTECH App Logo & Enterprise Palette
- **Git Commit**: \`${buildData.gitCommitHash || '06699e1'}\`
- **Build Completed At**: \`${new Date().toISOString()}\`
- **Direct Expo Download Link**: [Download APK](${downloadUrl})
- **Universal Permanent Redirect Link**: [https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk)
- **Backend API Download Link**: [https://ahtri-backend.onrender.com/api/app/latest-apk](https://ahtri-backend.onrender.com/api/app/latest-apk)

---

### What's New in Version 1.0.15:
1. **Separate Leave Allocation per Employee**: Admin allocates leave allowances (Casual, Sick, Earned) for each employee separately from the admin panel with instant reflection on employee ID.
2. **Real-time Live Sync**: Whenever admin updates quotas or grants approved leaves, employee mobile app updates automatically in real-time with manual 1-tap Sync button.
3. **Field Orders & Delivery Workflow**: Orders list with product details, employee delivery confirmation, and HQ-specific acceptance before inventory deduction.

---

### Instructions for Employees:
1. Open this link on your Android smartphone:
   **[https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk)**
   *(or direct link: [${downloadUrl}](${downloadUrl}))*
2. The download will start immediately.
3. Open the downloaded file to install/update the AHTRI FFA app with all the latest features!
`;
      fs.writeFileSync(OUTPUT_INFO_FILE, infoMd, 'utf-8');
      console.log(`[AutoAPK] Written release info to ${OUTPUT_INFO_FILE}`);

      // 3. Ping local and live Render backend so OTA state updates immediately
      const postData = JSON.stringify(versionPayload);
      try {
        const fetch = globalThis.fetch || require('node-fetch');
        await fetch('http://localhost:3000/api/app/version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: postData,
        });
        console.log('[AutoAPK] Notified local backend (http://localhost:3000)');
      } catch (lErr) {
        console.warn('[AutoAPK] Local notify notice:', lErr.message);
      }

      try {
        const fetch = globalThis.fetch || require('node-fetch');
        await fetch('https://ahtri-backend.onrender.com/api/app/version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: postData,
        });
        console.log('[AutoAPK] Notified live Render backend');
      } catch (pingErr) {
        console.warn('[AutoAPK] Render notify notice:', pingErr.message);
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
        execSync('git add backend/data/app_version.json backend/src/app.controller.ts LATEST_APK_INFO.md admin-web/src/views/SettingsView.tsx mobile/wait_and_update_apk.js', {
          cwd: ROOT_DIR,
          shell: true,
        });
        execSync('git commit -m "chore(release): update latest apk download url to version 1.0.15 (versionCode 16)"', {
          cwd: ROOT_DIR,
          shell: true,
        });
        execSync('git push origin main', {
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
  }, 20000);
}

run();
