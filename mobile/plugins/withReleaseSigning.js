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

    if (!buildGradle.includes('release.keystore')) {
      const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || process.env.KEYSTORE_PASSWORD || 'ahtri123';
      const keyAlias = process.env.ANDROID_KEY_ALIAS || 'ahtri-key';
      const keyPassword = process.env.ANDROID_KEY_PASSWORD || process.env.KEY_PASSWORD || storePassword;

      const releaseSigningConfig = `
        release {
            if (file("release.keystore").exists()) {
                storeFile file("release.keystore")
                storePassword "${storePassword}"
                keyAlias "${keyAlias}"
                keyPassword "${keyPassword}"
            } else if (file("../../credentials/ahtri-release.keystore").exists()) {
                storeFile file("../../credentials/ahtri-release.keystore")
                storePassword "${storePassword}"
                keyAlias "${keyAlias}"
                keyPassword "${keyPassword}"
            }
        }`;

      buildGradle = buildGradle.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {${releaseSigningConfig}`
      );
    }

    buildGradle = buildGradle.replace(
      /(release\s*\{[^}]*?signingConfig\s+)signingConfigs\.debug/g,
      '$1signingConfigs.release'
    );

    config.modResults.contents = buildGradle;
    return config;
  });
};

module.exports = createRunOncePlugin(withReleaseSigning, 'withReleaseSigning', '1.0.0');
