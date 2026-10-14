const { withAppBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to automatically configure permanent release keystore signing.
 * Ensures consistent cryptographic signature across all builds (local & CI)
 * so Android allows seamless in-place APK updates without uninstalling.
 */
const withReleaseSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const keystoreSrc = path.join(projectRoot, 'credentials', 'ahtri-release.keystore');
    const androidAppDir = path.join(projectRoot, 'android', 'app');
    const keystoreDest = path.join(androidAppDir, 'release.keystore');

    // 1. Copy persistent keystore into android/app if available
    try {
      if (fs.existsSync(keystoreSrc)) {
        if (!fs.existsSync(androidAppDir)) {
          fs.mkdirSync(androidAppDir, { recursive: true });
        }
        fs.copyFileSync(keystoreSrc, keystoreDest);
      }
    } catch (e) {
      console.warn('[withReleaseSigning] Keystore copy warning:', e.message);
    }

    let buildGradle = config.modResults.contents;

    // 2. Add release signing config inside signingConfigs block
    if (!buildGradle.includes('keyAlias "ahtri-key"') && !buildGradle.includes('release.keystore')) {
      const releaseSigningConfig = `
        release {
            if (file("release.keystore").exists()) {
                storeFile file("release.keystore")
                storePassword "ahtri123"
                keyAlias "ahtri-key"
                keyPassword "ahtri123"
            } else if (file("../../credentials/ahtri-release.keystore").exists()) {
                storeFile file("../../credentials/ahtri-release.keystore")
                storePassword "ahtri123"
                keyAlias "ahtri-key"
                keyPassword "ahtri123"
            }
        }`;

      buildGradle = buildGradle.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {${releaseSigningConfig}`
      );
    }

    // 3. Ensure release buildType points to release signingConfig
    // Target release block specifically without crossing braces
    buildGradle = buildGradle.replace(
      /(release\s*\{[^}]*?signingConfig\s+)signingConfigs\.debug/g,
      '$1signingConfigs.release'
    );

    config.modResults.contents = buildGradle;
    return config;
  });
};

module.exports = createRunOncePlugin(withReleaseSigning, 'withReleaseSigning', '1.0.0');
