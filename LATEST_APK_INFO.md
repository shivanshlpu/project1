# Latest AHTRI FFA Mobile APK Build (Version 1.0.41 - TP Approval Sync, Change Requests & Automated Geofenced Tasks)

- **Version**: `v1.0.41` (Version Code `42`)
- **Package Name**: `com.ahtri.ffa`
- **Branding**: Official AHTRI BIOTECH App Logo & Enterprise Dark Palette
- **Release Date**: `2026-10-23`
- **Release Download URL**: [https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile.apk](https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile.apk)
- **Direct Versioned APK Link**: [https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile-v1.0.41.apk](https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile-v1.0.41.apk)
- **Universal Permanent Redirect Link**: [https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk)
- **Backend API Download Link**: [https://ahtri-backend.onrender.com/api/app/latest-apk](https://ahtri-backend.onrender.com/api/app/latest-apk)

---

### What's New in Version 1.0.41 (Build 42):

1. **Tour Plan Approval State Persistence**:
   - Fixed the issue where approved Tour Plans showed as "Submitted" in the mobile app.
   - Authoritative synchronization ensures approved plans immediately display the green `● Approved` badge across app reloads and offline caching.

2. **Admin-Approved Tour Plan Change Request Workflow**:
   - Medical Representatives can request mid-cycle route deviations directly on approved Tour Plans.
   - Select requested destination area, alternative route batch, and specific planned doctors/locations.
   - Existing approved visits and daily tasks remain active while the deviation is pending admin review.
   - MRs receive real-time status banners and admin feedback notes upon approval or rejection.

3. **Automated Geofenced Task Generation (50m Perimeter)**:
   - When an MR's monthly Tour Plan is approved, location-based daily tasks are automatically scheduled and sequenced across all planned stops.
   - Enforces strict 50m geofence radius on every generated task with server-side physical presence verification.

4. **Zero-Hardcoding Dynamic Multi-Territory Coordinates**:
   - Location GPS coordinates are resolved dynamically from verified clinic locations, doctor directories, and territory headquarters centers (`HQ_CENTERS` for Kotma, Ambikapur, Shahdol, Manpur, etc.). Zero reliance on single-location fallbacks.

5. **Task Reconciliation Engine**:
   - Modifying approved Tour Plans automatically reconciles active field tasks: cancels unstarted tasks for superseded routes, generates tasks for new visits, and strictly preserves completed visit records, orders, and audit history.

---

### Instructions for Employees:
1. Open this link on your Android smartphone:
   **[https://ahtri-backend.onrender.com/download-apk](https://ahtri-backend.onrender.com/download-apk)**
   *(or direct link: [https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile.apk](https://github.com/shivanshlpu/project1/releases/download/v1.0.41/ahtri-ffa-mobile.apk))*
2. The download will start automatically.
3. Open the downloaded APK file to install/update the AHTRI FFA app to **v1.0.41 (Build 42)**!
