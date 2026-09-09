// Hermes native runtime safety polyfill
if (typeof global !== 'undefined') {
  if (typeof (global as any).document === 'undefined') {
    (global as any).document = {
      createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, removeChild: () => {} }),
      documentElement: { style: {} },
      head: { appendChild: () => {}, removeChild: () => {} },
      body: { appendChild: () => {}, removeChild: () => {} },
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
  if (typeof (global as any).window === 'undefined') {
    (global as any).window = global;
  }
}

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNav, MobileTab } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { TodayTasksScreen } from './screens/TodayTasksScreen';
import { DoctorDirectoryScreen } from './screens/DoctorDirectoryScreen';
import { DoctorVisitScreen } from './screens/DoctorVisitScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { LoginScreen } from './screens/LoginScreen';
import { AppUpdateService, AppVersionInfo, CURRENT_APP_VERSION } from './services/appUpdateService';
import { UpdateModal } from './components/UpdateModal';

const SESSION_KEY = '@ahtri_mobile_session';

interface LoggedInUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  device_id: string;
  device_model: string;
  token?: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>({
    id: 'usr-mr-01',
    name: 'Rahul Sharma',
    email: 'mr@ahtri.com',
    phone: '9876543212',
    role: 'MR',
    device_id: 'dev-hw-s22-9f8a2c',
    device_model: 'Samsung Galaxy S22 (SM-S901B)',
  });
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Restore persistent login session on boot
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((saved) => {
        if (saved) {
          try {
            const user = JSON.parse(saved);
            setCurrentUser(user);
          } catch {
            // Keep default
          }
        }
      })
      .finally(() => {
        setIsLoadingSession(false);
      });
  }, []);

  const [currentTab, setCurrentTab] = useState<MobileTab>('tasks');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingDrafts, setPendingDrafts] = useState<number>(0);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);

  // Auto-check for over-the-air in-app updates on boot
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await AppUpdateService.checkForUpdates();
        if (res.hasUpdate && res.info) {
          setUpdateInfo(res.info);
          setIsUpdateModalOpen(true);
        }
      } catch {
        // Silent catch on boot
      }
    };
    const timer = setTimeout(checkUpdate, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleManualUpdateCheck = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await AppUpdateService.checkForUpdates();
      if (res.hasUpdate && res.info) {
        setUpdateInfo(res.info);
        setIsUpdateModalOpen(true);
      } else {
        Alert.alert(
          'App is Up to Date',
          `AHTRI FFA Mobile v${CURRENT_APP_VERSION} is the latest version available.`
        );
      }
    } catch (err: any) {
      Alert.alert('Notice', 'Could not connect to update server. Please check your network.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Responsive device dimensions
  const { width } = useWindowDimensions();
  const isMobileScreen = width < 600;
  const isTablet = width >= 600 && width < 1024;

  // PWA Install Event & Detection
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isIOSWeb, setIsIOSWeb] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone;
      if (isStandalone) {
        setIsAppInstalled(true);
      }

      const ua = window.navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      if (isIOS && !isStandalone) {
        setIsIOSWeb(true);
      }

      const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', () => {
        setIsAppInstalled(true);
        setInstallPrompt(null);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setIsAppInstalled(true);
      }
      setInstallPrompt(null);
    } else if (isIOSWeb) {
      Alert.alert(
        'Install on iPhone / iPad',
        'Tap the Share button at the bottom of Safari and select "Add to Home Screen".'
      );
    } else {
      Alert.alert(
        'Install AHTRI App',
        'To install this app on your device, open your browser menu (three dots) and tap "Install app" or "Add to Home screen".'
      );
    }
  };

  const handleManualSync = () => {
    setPendingDrafts(0);
    Alert.alert('Sync Complete', 'All offline drafts synchronized with server.');
  };

  const handleLoginSuccess = async (user: LoggedInUser) => {
    setCurrentUser(user);
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // Storage fallback
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(SESSION_KEY);
          } catch {
            // Ignore
          }
          setCurrentUser(null);
        },
      },
    ]);
  };

  // Responsive container styles
  const outerWrapperStyle = [
    styles.appOuterWrapper,
    isMobileScreen && { backgroundColor: '#FFFFFF', padding: 0 },
  ];
  const phoneContainerStyle = [
    styles.phoneContainer,
    isMobileScreen && { maxWidth: '100%' as any, borderRadius: 0, shadowOpacity: 0, elevation: 0 },
    isTablet && { maxWidth: 720, borderRadius: 16 },
  ];

  // If not logged in, render Login Screen
  if (!currentUser) {
    return (
      <View style={outerWrapperStyle}>
        <View style={phoneContainerStyle}>
          <SafeAreaView style={styles.safeArea}>
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <View style={outerWrapperStyle}>
      <View style={phoneContainerStyle}>
        <SafeAreaView style={styles.safeArea}>
          {/* App Header */}
          <View style={styles.topHeader}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>A</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>AHTRI FFA Mobile</Text>
                <Text style={styles.brandUser}>
                  {currentUser.name} • {currentUser.phone}
                </Text>
              </View>
            </View>

            {/* Right Header Actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>


              {/* Install PWA Button in Header */}
              {!isAppInstalled && (installPrompt || isIOSWeb) && (
                <TouchableOpacity style={styles.headerInstallBtn} onPress={handleInstallClick}>
                  <Text style={styles.headerInstallBtnText}>Install</Text>
                </TouchableOpacity>
              )}

              {/* Offline / Online Network Toggle */}
              <TouchableOpacity
                style={[styles.networkToggle, isOffline ? styles.offlineToggle : styles.onlineToggle]}
                onPress={() => setIsOffline(!isOffline)}
              >
                <Text style={styles.networkToggleText}>
                  {isOffline ? 'Offline' : 'Online'}
                </Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PWA Install Notification Banner */}
          {showInstallBanner && !isAppInstalled && (installPrompt || isIOSWeb) && (
            <View style={styles.pwaBanner}>
              <View style={styles.pwaTextGroup}>
                <Text style={styles.pwaTitle}>Install AHTRI App (PWA)</Text>
                <Text style={styles.pwaSubtitle}>
                  {isIOSWeb
                    ? 'Tap Safari Share -> "Add to Home Screen" to install.'
                    : 'Install on your home screen for fast 1-tap launch & offline use.'}
                </Text>
              </View>
              <View style={styles.pwaActionGroup}>
                <TouchableOpacity style={styles.pwaInstallBtn} onPress={handleInstallClick}>
                  <Text style={styles.pwaInstallBtnText}>Install</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pwaDismissBtn}
                  onPress={() => setShowInstallBanner(false)}
                >
                  <Text style={styles.pwaDismissBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Offline Alert Banner */}
          <OfflineBanner isOffline={isOffline} pendingCount={pendingDrafts} />

          {/* Sync Status Indicator */}
          <SyncStatusIndicator
            pendingCount={pendingDrafts}
            onManualSync={handleManualSync}
          />

          {/* Main Screen Router */}
          <View style={styles.screenContainer}>
            {/* Tasks Tab */}
            {currentTab === 'tasks' && (
              <TodayTasksScreen
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
              />
            )}

            {/* Unified Doctors & Locations Tab with Interactive Map */}
            {currentTab === 'doctors' && (
              <DoctorDirectoryScreen currentUser={currentUser} />
            )}

            {/* Doctor Detailing & Immediate Orders */}
            {currentTab === 'visits' && <DoctorVisitScreen />}

            {/* Attendance Punch In / Out & Leave Management */}
            {currentTab === 'attendance' && <AttendanceScreen currentUser={currentUser} />}

            {/* Device & Profile Info */}
            {currentTab === 'profile' && (
              <ScrollView style={styles.profileContainer}>
                <View style={styles.profileCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{currentUser.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.profileName}>{currentUser.name}</Text>
                  <Text style={styles.profileRole}>Medical Representative</Text>
                  <Text style={styles.profileTerritory}>South Delhi Territory • AHTRI Pharma</Text>

                  {/* Device Security Card */}
                  <View style={styles.deviceCard}>
                    <Text style={styles.deviceCardTitle}>Authorized Device</Text>
                    <Text style={styles.deviceCardText}>
                      Your account is bound to this phone for security and attendance tracking.
                    </Text>

                    <View style={styles.deviceRow}>
                      <Text style={styles.deviceRowLabel}>Model:</Text>
                      <Text style={styles.deviceRowVal}>{currentUser.device_model}</Text>
                    </View>

                    <View style={styles.deviceRow}>
                      <Text style={styles.deviceRowLabel}>Registered Phone:</Text>
                      <Text style={styles.deviceRowVal}>{currentUser.phone}</Text>
                    </View>

                    <View style={styles.deviceRow}>
                      <Text style={styles.deviceRowLabel}>Status:</Text>
                      <Text style={[styles.deviceRowVal, { color: '#0F8B5A', fontWeight: '700' }]}>
                        ACTIVE & VERIFIED
                      </Text>
                    </View>
                  </View>

                  {/* Install PWA App Button in Profile */}
                  {!isAppInstalled && (
                    <TouchableOpacity style={styles.installProfileBtn} onPress={handleInstallClick}>
                      <Text style={styles.installProfileBtnText}>
                        {isIOSWeb ? 'Add App to iPhone Home Screen' : 'Download / Install App on Phone'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Check for App Updates Button */}
                  <TouchableOpacity
                    style={styles.updateProfileBtn}
                    onPress={handleManualUpdateCheck}
                    disabled={isCheckingUpdate}
                  >
                    {isCheckingUpdate ? (
                      <ActivityIndicator size="small" color="#15803D" />
                    ) : (
                      <Text style={styles.updateProfileBtnText}>
                        🚀 Check for Updates (Installed v{CURRENT_APP_VERSION})
                      </Text>
                    )}
                  </TouchableOpacity>



                  <TouchableOpacity style={styles.logoutLargeBtn} onPress={handleLogout}>
                    <Text style={styles.logoutLargeBtnText}>Log Out Account</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>



          {/* In-App Auto-Update Modal */}
          <UpdateModal
            isOpen={isUpdateModalOpen}
            onClose={() => setIsUpdateModalOpen(false)}
            updateInfo={updateInfo}
            currentVersion={CURRENT_APP_VERSION}
            isMandatory={updateInfo?.forceUpdate}
          />

          {/* Bottom Navigation */}
          <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appOuterWrapper: {
    flex: 1,
    backgroundColor: '#0F172A', // Premium dark canvas on desktop
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  phoneContainer: {
    width: '100%',
    maxWidth: 460,
    height: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  topHeader: {
    height: 56,
    backgroundColor: '#1A3C6E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#0F8B5A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  brandTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  brandUser: { color: '#CBD5E1', fontSize: 10 },
  serverChipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  serverChipBtnText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  updateProfileBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    marginBottom: 10,
  },
  updateProfileBtnText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 12,
  },
  serverProfileBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    marginBottom: 10,
  },
  serverProfileBtnText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
  },
  networkToggle: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineToggle: { backgroundColor: 'rgba(15, 139, 90, 0.5)' },
  offlineToggle: { backgroundColor: '#DC2626' },
  networkToggleText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoutBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  screenContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  profileContainer: { flex: 1, padding: 14 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A3C6E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  profileRole: { fontSize: 12, color: '#0F8B5A', fontWeight: '600', marginBottom: 2 },
  profileTerritory: { fontSize: 11, color: '#64748B', marginBottom: 16 },
  deviceCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  deviceCardTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  deviceCardText: { fontSize: 10.5, color: '#64748B', marginBottom: 10, lineHeight: 14 },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  deviceRowLabel: { fontSize: 10.5, color: '#64748B' },
  deviceRowVal: { fontSize: 10.5, color: '#1E293B', fontWeight: '600' },
  logoutLargeBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  logoutLargeBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  headerInstallBtn: {
    backgroundColor: '#0F8B5A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 2,
  },
  headerInstallBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  pwaBanner: {
    backgroundColor: '#0B2545',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pwaTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  pwaTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pwaSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  pwaActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pwaInstallBtn: {
    backgroundColor: '#0F8B5A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pwaInstallBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pwaDismissBtn: {
    padding: 4,
  },
  pwaDismissBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  installProfileBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 6,
    backgroundColor: '#0F8B5A',
    alignItems: 'center',
    marginBottom: 10,
  },
  installProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
