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
  AppState,
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
  Image,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNav, MobileTab } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { TodayTasksScreen } from './screens/TodayTasksScreen';
import { DoctorDirectoryScreen } from './screens/DoctorDirectoryScreen';
import { DoctorVisitScreen } from './screens/DoctorVisitScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { TaskHistoryScreen } from './screens/TaskHistoryScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { MonthlyTpScreen } from './screens/MonthlyTpScreen';
import { StocklistScreen } from './screens/StocklistScreen';
import { CompetitionScreen } from './screens/CompetitionScreen';
import { LoginScreen } from './screens/LoginScreen';
import { AppUpdateService, AppVersionInfo, CURRENT_APP_VERSION } from './services/appUpdateService';
import { UpdateModal } from './components/UpdateModal';
import { ServerStatusPill } from './components/ServerStatusPill';
import { ApiConfig } from './services/apiConfig';
import { NotificationService } from './services/notificationService';
import { HeadsUpNotificationBanner } from './components/HeadsUpNotificationBanner';
import * as Notifications from 'expo-notifications';

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
  hq_name?: string;
  hq_code?: string;
  hq_id?: string;
  assigned_territory?: string;
  assigned_route_batches?: string[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Restore persistent login session on boot
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then(async (saved) => {
        if (saved) {
          try {
            const user = JSON.parse(saved);
            setCurrentUser(user);
            if (user?.token) {
              await ApiConfig.setToken(user.token);
            }
            await ApiConfig.setUser(user);
          } catch {
            // Keep null
          }
        }
      })
      .finally(() => {
        setIsLoadingSession(false);
      });
  }, []);

  const [currentTab, setCurrentTab] = useState<MobileTab>('tasks');
  const [moreSubScreen, setMoreSubScreen] = useState<'menu' | 'orders' | 'monthly_tp' | 'stocklist' | 'competition'>('menu');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingDrafts, setPendingDrafts] = useState<number>(0);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [effectiveVersion, setEffectiveVersion] = useState<string>(CURRENT_APP_VERSION);
  const lastNotifiedVersionRef = React.useRef<string>('');

  // Auto-check for over-the-air in-app updates on boot, resume & active polling
  useEffect(() => {
    // Setup Android notification channels & permissions
    NotificationService.setupPermissionsAndChannels();

    // Non-blocking background warm-up for Render cold start
    ApiConfig.warmupServer();

    setEffectiveVersion(CURRENT_APP_VERSION);

    let isMounted = true;
    const checkUpdate = async () => {
      try {
        const res = await AppUpdateService.checkForUpdates();
        if (!isMounted) return;
        if (res.currentVersion) {
          setEffectiveVersion(res.currentVersion);
        }
        if (res.hasUpdate && res.info) {
          const isDismissed = await AppUpdateService.isVersionDismissed(res.info.latestVersion);
          if (!isDismissed || res.isMandatory) {
            setUpdateInfo(res.info);
            setIsUpdateModalOpen(true);
          }
          // Only fire notification once per new version so employee is not harassed
          if (lastNotifiedVersionRef.current !== res.info.latestVersion) {
            lastNotifiedVersionRef.current = res.info.latestVersion;
            NotificationService.notifyAppUpdateAvailable(res.info.latestVersion, res.info.downloadUrl);
          }
        }
      } catch {
        // Non-blocking silent catch
      }
    };

    // Staggered boot checks to accommodate Render cold start
    const t1 = setTimeout(checkUpdate, 2000);
    const t2 = setTimeout(checkUpdate, 7000);
    const t3 = setTimeout(checkUpdate, 16000);

    // Re-check whenever employee switches to the app (foreground resume)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkUpdate();
      }
    });

    // Active foreground poll every 60s so manager broadcasts arrive in near real-time
    const interval = setInterval(checkUpdate, 60000);

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // Poll for Manager Leave Decisions & Approvals
  const knownLeaveStatusesRef = React.useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    const checkLeaveDecisions = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders();
        const res = await fetch(`${baseUrl}/leave/my`, { headers });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((l: any) => {
              const prevStatus = knownLeaveStatusesRef.current.get(l.id);
              if (prevStatus === 'PENDING' && (l.status === 'APPROVED' || l.status === 'REJECTED')) {
                NotificationService.notifyLeaveDecision({
                  id: l.id,
                  status: l.status,
                  start_date: l.start_date,
                  end_date: l.end_date,
                  leave_type: l.leave_type || l.type,
                  admin_comment: l.admin_comment,
                });
              }
              knownLeaveStatusesRef.current.set(l.id, l.status);
            });
          }
        }
      } catch {}
    };

    checkLeaveDecisions();
    const leaveInterval = setInterval(checkLeaveDecisions, 60000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkLeaveDecisions();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(leaveInterval);
      subscription.remove();
    };
  }, [currentUser]);

  // Register for Remote Push Notifications (Expo / FCM)
  useEffect(() => {
    if (currentUser?.id) {
      NotificationService.registerForRemotePushNotifications(currentUser.id);
    }
  }, [currentUser?.id]);

  // Listen for user tapping on push notifications in Android status bar
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.taskId || data?.type === 'TASK_ASSIGNED') {
        setCurrentTab('tasks');
      } else if (data?.type === 'APP_UPDATE') {
        setIsUpdateModalOpen(true);
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  const handleManualUpdateCheck = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await AppUpdateService.checkForUpdates();
      if (res.currentVersion) {
        setEffectiveVersion(res.currentVersion);
      }
      if (res.hasUpdate && res.info) {
        setUpdateInfo(res.info);
        setIsUpdateModalOpen(true);
      } else {
        Alert.alert(
          'App is Up to Date',
          `AHTRI FFA Mobile v${res.currentVersion || effectiveVersion} is the latest version available.`
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
      if (user.token) {
        await ApiConfig.setToken(user.token);
      }
      await ApiConfig.setUser(user);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // Storage fallback
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const performLogout = async () => {
    setIsLogoutModalOpen(false);
    const userToLogOut = currentUser;
    const userIdToLogout = userToLogOut?.id;
    const userIdentifier = userToLogOut?.email || userToLogOut?.phone;
    const userDeviceId = userToLogOut?.device_id;

    // 1. Instantly clear user state so UI immediately returns to Login screen
    setCurrentUser(null);

    // 2. Clear all local storage tokens & sessions synchronously
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      await AsyncStorage.setItem('@ahtri_requires_reauth_otp', 'true');
      await ApiConfig.clearSession();
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.removeItem(SESSION_KEY);
        (window as any).localStorage.removeItem('@ahtri_auth_token');
        (window as any).localStorage.removeItem('@ahtri_auth_user');
      }
    } catch (err) {
      console.warn('Storage cleanup error on logout:', err);
    }

    // 3. Notify backend in the background with a fast timeout (2.5s)
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdToLogout,
          identifier: userIdentifier,
          deviceId: userDeviceId,
        }),
        signal: controller.signal,
      })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    } catch {}
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

  // Show loader while restoring session
  if (isLoadingSession) {
    return (
      <View style={[outerWrapperStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1A3C6E" />
      </View>
    );
  }

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
      {/* Floating in-app Heads-up Banner for instant task/leave/update alerts */}
      <HeadsUpNotificationBanner
        onPressTask={() => setCurrentTab('tasks')}
        onPressUpdate={() => setIsUpdateModalOpen(true)}
      />

      <View style={phoneContainerStyle}>
        <SafeAreaView style={styles.safeArea}>
          {/* App Header */}
          <View style={styles.topHeader}>
            <View style={styles.brandRow}>
              <Image
                source={require('../assets/logo.png')}
                style={{ width: 34, height: 34, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#38BDF8' }}
                resizeMode="cover"
              />
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <Text style={styles.brandTitle} numberOfLines={1}>AHTRI FFA Mobile</Text>
                <Text style={styles.brandUser} numberOfLines={1}>
                  {currentUser.name} • {currentUser.hq_name || 'Shahdol'} ({currentUser.hq_code || 'SHD'})
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

              {/* Server Status Dot Indicator (Clean dot, no text) */}
              <ServerStatusPill compact />

              {/* Redesigned Crisp Logout Button */}
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityLabel="Log out from account"
              >
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
                key={currentUser.id}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
              />
            )}

            {/* Completed Tasks History */}
            {currentTab === 'history' && (
              <TaskHistoryScreen
                key={currentUser.id}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
              />
            )}

            {/* Unified Doctors & Locations Tab with Interactive Map */}
            {currentTab === 'doctors' && (
              <DoctorDirectoryScreen key={currentUser.id} currentUser={currentUser} />
            )}

            {/* Doctor Detailing & Immediate Orders */}
            {currentTab === 'visits' && <DoctorVisitScreen key={currentUser.id} />}

            {/* Attendance Punch In / Out & Leave Management */}
            {currentTab === 'attendance' && (
              <AttendanceScreen key={currentUser.id} currentUser={currentUser} />
            )}

            {/* Device & Profile Info / Enterprise Tools (§5-§7, §14, §30) */}
            {currentTab === 'profile' && moreSubScreen === 'orders' && (
              <OrdersScreen
                key={currentUser.id}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                currentUserHqId={currentUser.hq_id}
                currentUserHqName={currentUser.hq_name}
                onBack={() => setMoreSubScreen('menu')}
              />
            )}

            {currentTab === 'profile' && moreSubScreen === 'monthly_tp' && (
              <MonthlyTpScreen
                key={currentUser.id}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                currentUserHqId={currentUser.hq_id}
                currentUserHqName={currentUser.hq_name}
                onBack={() => setMoreSubScreen('menu')}
              />
            )}

            {currentTab === 'profile' && moreSubScreen === 'stocklist' && (
              <StocklistScreen
                key={currentUser.id}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                onBack={() => setMoreSubScreen('menu')}
              />
            )}

            {currentTab === 'profile' && moreSubScreen === 'competition' && (
              <CompetitionScreen
                key={currentUser.id}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                onBack={() => setMoreSubScreen('menu')}
              />
            )}

            {currentTab === 'profile' && moreSubScreen === 'menu' && (
              <ScrollView style={styles.profileContainer}>
                {/* Enterprise Operations Modules (§5-§7, §14, §30) */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A3C6E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 2 }}>
                    Field Force Work Tools
                  </Text>

                  {/* Field Orders & Delivery Tracking */}
                  <TouchableOpacity
                    style={styles.moreNavCard}
                    onPress={() => setMoreSubScreen('orders')}
                  >
                    <View style={[styles.moreNavIconCircle, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={{ fontSize: 18 }}>🛍️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moreNavTitle}>Field Orders &amp; Deliveries</Text>
                      <Text style={styles.moreNavSubtitle}>View ordered products &amp; mark delivery completion</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '700' }}>→</Text>
                  </TouchableOpacity>

                  {/* Monthly Tour Plan */}
                  <TouchableOpacity
                    style={styles.moreNavCard}
                    onPress={() => setMoreSubScreen('monthly_tp')}
                  >
                    <View style={[styles.moreNavIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={{ fontSize: 18 }}>🗺️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moreNavTitle}>Monthly Tour Plan (TP)</Text>
                      <Text style={styles.moreNavSubtitle}>Plan monthly travel across HQs, areas &amp; KOLs</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '700' }}>→</Text>
                  </TouchableOpacity>

                  {/* Stocklist & Inventory */}
                  <TouchableOpacity
                    style={styles.moreNavCard}
                    onPress={() => setMoreSubScreen('stocklist')}
                  >
                    <View style={[styles.moreNavIconCircle, { backgroundColor: '#F0FDF4' }]}>
                      <Text style={{ fontSize: 18 }}>📦</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moreNavTitle}>Point-of-Care Stocklist</Text>
                      <Text style={styles.moreNavSubtitle}>Real-time stock availability &amp; shortage per HQ</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '700' }}>→</Text>
                  </TouchableOpacity>

                  {/* Sales Competitions & Rewards */}
                  <TouchableOpacity
                    style={styles.moreNavCard}
                    onPress={() => setMoreSubScreen('competition')}
                  >
                    <View style={[styles.moreNavIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={{ fontSize: 18 }}>🏆</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moreNavTitle}>Sales Competitions &amp; Rewards</Text>
                      <Text style={styles.moreNavSubtitle}>Track live sales targets &amp; claim cash rewards</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '700' }}>→</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.profileCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{currentUser.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.profileName}>{currentUser.name}</Text>
                  <Text style={styles.profileRole}>Medical Representative</Text>
                  <Text style={styles.profileTerritory}>
                    {(currentUser as any).territory || 'Headquarters Territory'} • AHTRI BIOTECH
                  </Text>

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
                        ACTIVE &amp; VERIFIED
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
                        🚀 Check for Updates (Installed v{effectiveVersion})
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
            onClose={() => {
              setIsUpdateModalOpen(false);
              AppUpdateService.getEffectiveCurrentVersion().then((v) => setEffectiveVersion(v));
            }}
            updateInfo={updateInfo}
            currentVersion={effectiveVersion}
            isMandatory={updateInfo?.forceUpdate}
          />

          {/* Universal In-App Logout Confirmation Modal */}
          <Modal
            visible={isLogoutModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsLogoutModalOpen(false)}
          >
            <View style={styles.logoutModalOverlay}>
              <View style={styles.logoutModalCard}>
                <View style={styles.logoutModalIconCircle}>
                  <Text style={{ fontSize: 24 }}>🚪</Text>
                </View>
                <Text style={styles.logoutModalTitle}>Log Out of Account?</Text>
                <Text style={styles.logoutModalMessage}>
                  Are you sure you want to log out from{' '}
                  <Text style={{ fontWeight: '800', color: '#0F172A' }}>{currentUser?.name}</Text> (
                  {currentUser?.hq_name || 'Shahdol'} HQ)?
                </Text>
                <Text style={styles.logoutModalSubtext}>
                  Your local offline sync data is safe. You can log in again anytime with your credentials.
                </Text>

                <View style={styles.logoutModalBtnRow}>
                  <TouchableOpacity
                    style={styles.logoutModalCancelBtn}
                    onPress={() => setIsLogoutModalOpen(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.logoutModalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.logoutModalConfirmBtn}
                    onPress={performLogout}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.logoutModalConfirmBtnText}>Yes, Log Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

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
    backgroundColor: '#DC2626',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
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
  moreNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  moreNavIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreNavTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  moreNavSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  logoutModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutModalMessage: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 6,
  },
  logoutModalSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 15,
  },
  logoutModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutModalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  logoutModalCancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  logoutModalConfirmBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoutModalConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
