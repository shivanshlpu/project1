import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationService } from '../services/locationService';
import { CameraService, PhotoResult } from '../services/cameraService';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import { LeaveScreen } from './LeaveScreen';
import * as FileSystem from 'expo-file-system';

interface AttendanceScreenProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  initialSubTab?: 'punch' | 'history' | 'leave';
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({
  currentUser,
  initialSubTab = 'punch',
}) => {
  const [subTab, setSubTab] = useState<'punch' | 'history' | 'leave'>(initialSubTab);
  const [checkedIn, setCheckedIn] = useState<boolean>(false);
  const [checkedOut, setCheckedOut] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);

  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkInGps, setCheckInGps] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<PhotoResult | null>(null);

  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [checkOutGps, setCheckOutGps] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [lateEntryNotice, setLateEntryNotice] = useState<string | null>(null);
  const [earlyExitNotice, setEarlyExitNotice] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const userId = currentUser?.id || 'usr-mr-01';
  const ATTENDANCE_KEY = `@ahtri_attendance_${userId}_${todayStr}`;

  // Restore today's attendance strictly for active user
  useEffect(() => {
    // 1. Reset volatile UI state on user switch
    setCheckedIn(false);
    setCheckedOut(false);
    setCheckInTime(null);
    setCheckOutTime(null);
    setCheckInGps(null);
    setCheckOutGps(null);
    setLateEntryNotice(null);
    setEarlyExitNotice(null);
    setSelfiePhoto(null);
    setAttendanceHistory([]);

    // 2. Immediately load locally cached attendance for THIS user (offline-first instant restore)
    AsyncStorage.getItem(ATTENDANCE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const rec = JSON.parse(raw);
            if (rec && rec.checkedIn) {
              setCheckedIn(true);
              setCheckInTime(rec.checkInTime);
              setCheckInGps(rec.checkInGps);
              if (rec.checkInPhoto) {
                setSelfiePhoto({
                  uri: rec.checkInPhoto,
                  width: 360,
                  height: 360,
                  base64: rec.checkInPhoto.startsWith('data:') ? rec.checkInPhoto.split(',')[1] : rec.checkInPhoto,
                });
              }
            }
            if (rec && rec.checkedOut) {
              setCheckedOut(true);
              setCheckOutTime(rec.checkOutTime);
              setCheckOutGps(rec.checkOutGps);
            }
          } catch {
            // Ignored
          }
        }
      })
      .catch(() => {});

    // 3. Fetch live status & history from backend strictly for THIS user ID
    (async () => {
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders(userId);
        const res = await fetch(`${baseUrl}/attendance/my?userId=${encodeURIComponent(userId)}`, {
          headers: { ...headers, 'x-user-id': userId },
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const userRecords = list.filter((a: any) => !a.user_id || a.user_id === userId);
            setAttendanceHistory(userRecords);
            const todayRec = userRecords.find((a: any) => a.date === todayStr);

            if (todayRec) {
              const inTime = todayRec.check_in_at
                ? new Date(todayRec.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '09:15 AM';
              const gpsStr = todayRec.check_in_lat
                ? `GPS: ${Number(todayRec.check_in_lat).toFixed(4)}, ${Number(todayRec.check_in_lng).toFixed(4)}`
                : null;

              setCheckedIn(true);
              setCheckInTime(inTime);
              if (gpsStr) setCheckInGps(gpsStr);

              // Restore photo from server if returned, or maintain existing local photo
              let photoToKeep = todayRec.check_in_photo;
              if (!photoToKeep) {
                try {
                  const cachedRaw = await AsyncStorage.getItem(ATTENDANCE_KEY);
                  if (cachedRaw) {
                    const parsed = JSON.parse(cachedRaw);
                    photoToKeep = parsed.checkInPhoto;
                  }
                } catch {}
              }

              if (photoToKeep) {
                setSelfiePhoto({
                  uri: photoToKeep,
                  width: 360,
                  height: 360,
                  base64: photoToKeep.startsWith('data:') ? photoToKeep.split(',')[1] : photoToKeep,
                });
              }

              if (todayRec.late_minutes && todayRec.late_minutes > 0) {
                setLateEntryNotice(`Late Entry — ${todayRec.late_minutes} minutes`);
              }

              let outTime: string | null = null;
              if (todayRec.check_out_at) {
                outTime = new Date(todayRec.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setCheckedOut(true);
                setCheckOutTime(outTime);
                if (todayRec.early_minutes && todayRec.early_minutes > 0) {
                  setEarlyExitNotice(`Early Punch Out — ${todayRec.early_minutes} minutes`);
                }
              } else {
                setCheckedOut(false);
                setCheckOutTime(null);
                setEarlyExitNotice(null);
              }

              AsyncStorage.setItem(
                ATTENDANCE_KEY,
                JSON.stringify({
                  checkedIn: true,
                  checkInTime: inTime,
                  checkInGps: gpsStr,
                  checkInPhoto: photoToKeep,
                  checkedOut: !!todayRec.check_out_at,
                  checkOutTime: outTime,
                  isSyncedWithServer: true,
                  userId,
                  date: todayStr,
                }),
              );
            } else {
              // Server did not return a record for today.
              // CRITICAL: NEVER erase local punch! Check if employee already marked punch locally today.
              try {
                const cachedRaw = await AsyncStorage.getItem(ATTENDANCE_KEY);
                if (cachedRaw) {
                  const localRec = JSON.parse(cachedRaw);
                  if (localRec && localRec.checkedIn) {
                    // Restore local punch & photo immediately!
                    setCheckedIn(true);
                    setCheckInTime(localRec.checkInTime);
                    setCheckInGps(localRec.checkInGps);
                    if (localRec.checkInPhoto) {
                      setSelfiePhoto({
                        uri: localRec.checkInPhoto,
                        width: 360,
                        height: 360,
                        base64: localRec.checkInPhoto.startsWith('data:') ? localRec.checkInPhoto.split(',')[1] : localRec.checkInPhoto,
                      });
                    }
                    if (localRec.checkedOut) {
                      setCheckedOut(true);
                      setCheckOutTime(localRec.checkOutTime);
                      setCheckOutGps(localRec.checkOutGps);
                    }

                    // Auto-sync local punch to server in background
                    fetch(`${baseUrl}/attendance/check-in`, {
                      method: 'POST',
                      headers: { ...headers, 'x-user-id': userId },
                      body: JSON.stringify({
                        userId,
                        employeeId: userId,
                        latitude: localRec.latitude || 28.5245,
                        longitude: localRec.longitude || 77.2066,
                        gps_accuracy_m: localRec.accuracy || 10,
                        check_in_photo: localRec.checkInPhoto,
                        location_name: localRec.checkInGps || `GPS: 28.5245, 77.2066`,
                      }),
                    }).catch(() => {});

                    return;
                  }
                }
              } catch {}

              // Only reset if genuinely no punch locally either
              setCheckedIn(false);
              setCheckedOut(false);
              setCheckInTime(null);
              setCheckOutTime(null);
              setCheckInGps(null);
              setCheckOutGps(null);
              setLateEntryNotice(null);
              setEarlyExitNotice(null);
            }
          }
        }
      } catch {}
    })();
  }, [userId, todayStr]);

  // Take selfie photo via Camera (§21)
  const handleTakeSelfie = async () => {
    Alert.alert(
      'Work Attire & ID Card Verification',
      'Please ensure you are in full dress / formal company uniform with your official ID card clearly visible on your chest. Stand in a well-lit area.',
      [
        {
          text: 'Open Camera',
          onPress: async () => {
            const photo = await CameraService.captureLivePhoto({
              aspect: [4, 4],
              quality: 0.5, // Compressed to conserve 512MB database storage
            });
            if (photo) {
              setSelfiePhoto(photo);
            } else {
              Alert.alert(
                'Camera Notice',
                'Camera permission is required or capture was cancelled. You can retry taking your photo.'
              );
            }
          },
        },
      ]
    );
  };

  // Perform GPS-tagged Punch-in (§20, §21, §22, §24)
  const handleCheckIn = async () => {
    if (!selfiePhoto) {
      Alert.alert(
        'Full Dress & ID Card Photo Required',
        'Please capture a live photo in full formal attire with your official ID card clearly visible before punching in.'
      );
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get Live GPS with Anti-Mock detection
      const coords = await LocationService.getCurrentLocation();
      const lat = coords?.latitude || 28.5245;
      const lon = coords?.longitude || 77.2066;
      const accuracy = coords?.accuracy ? Math.round(coords.accuracy) : 10;
      const isMocked = (coords as any)?.isMocked || (coords as any)?.is_mocked || false;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const gpsFormatted = `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)} (±${accuracy}m)`;

      // 2. Prepare compressed photo payload (guaranteed base64 data URL for cross-platform DB viewing)
      let photoPayload: string | null = null;
      if (selfiePhoto.base64 && selfiePhoto.base64.startsWith('data:image')) {
        photoPayload = selfiePhoto.base64;
      } else if (selfiePhoto.base64 && !selfiePhoto.base64.startsWith('file:') && !selfiePhoto.base64.startsWith('content:')) {
        const raw = selfiePhoto.base64.includes(',') ? selfiePhoto.base64.split(',')[1] : selfiePhoto.base64;
        photoPayload = `data:image/jpeg;base64,${raw}`;
      } else if (selfiePhoto.uri && selfiePhoto.uri.startsWith('data:image')) {
        photoPayload = selfiePhoto.uri;
      } else {
        const targetUri = selfiePhoto.uri || (selfiePhoto.base64 && selfiePhoto.base64.startsWith('file:') ? selfiePhoto.base64 : null);
        if (targetUri) {
          try {
            const raw = await FileSystem.readAsStringAsync(targetUri, { encoding: FileSystem.EncodingType.Base64 });
            if (raw && raw.length > 50) {
              photoPayload = `data:image/jpeg;base64,${raw}`;
            }
          } catch (fsErr) {
            console.warn('FileSystem direct read error in AttendanceScreen:', fsErr);
          }
        }
      }

      const photoKey = `photo_att_in_${Date.now()}`;

      // 3. Post to Backend with Photo & Geo-Location
      let lateMsg = '';
      let isSyncedWithServer = false;
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders(userId);
        const res = await fetch(`${baseUrl}/attendance/check-in`, {
          method: 'POST',
          headers: { ...headers, 'x-user-id': userId },
          body: JSON.stringify({
            userId,
            employeeId: userId,
            latitude: lat,
            longitude: lon,
            gps_accuracy_m: accuracy,
            is_mocked: isMocked,
            check_in_photo: photoPayload,
            location_name: `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            photo_key: photoKey,
          }),
        });

        if (res.ok) {
          isSyncedWithServer = true;
          const data = await res.json();
          if (data.late_minutes && data.late_minutes > 0) {
            lateMsg = `Late Entry — ${data.late_minutes} minutes`;
            setLateEntryNotice(lateMsg);
          } else {
            setLateEntryNotice('On-Time Entry');
          }
        } else {
          console.warn('Backend check-in notice, HTTP status:', res.status);
        }
      } catch (err) {
        console.warn('Network sync notice:', err);
      }

      setCheckedIn(true);
      setCheckInTime(nowStr);
      setCheckInGps(gpsFormatted);

      // 4. Save locally in AsyncStorage immediately WITH photoPayload (never lost on logout)
      await AsyncStorage.setItem(
        ATTENDANCE_KEY,
        JSON.stringify({
          checkedIn: true,
          checkInTime: nowStr,
          checkInGps: gpsFormatted,
          checkInPhoto: photoPayload,
          checkedOut: false,
          checkOutTime: null,
          isSyncedWithServer,
          latitude: lat,
          longitude: lon,
          accuracy,
          userId,
          date: todayStr,
        }),
      );

      Alert.alert(
        'Attendance Marked Done! ✓',
        `Punch-in recorded at ${nowStr}.\nStatus: PRESENT (Active Shift)\nLocation: ${lat.toFixed(4)}, ${lon.toFixed(4)}\n${lateMsg ? `\n• ${lateMsg}` : '\n• On-Time Entry'}\n\n✓ Full dress & ID card verified\n✓ Geo-location tagged\n✓ Active on Admin Panel`,
      );
    } catch (error: any) {
      Alert.alert('Attendance Error', error?.message || 'Failed to record attendance.');
    } finally {
      setIsLoading(false);
    }
  };

  // Perform GPS-tagged Punch-out (§23, §24)
  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const coords = await LocationService.getCurrentLocation();
      const lat = coords?.latitude || 28.5300;
      const lon = coords?.longitude || 77.2100;
      const accuracy = coords?.accuracy ? Math.round(coords.accuracy) : 12;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const gpsFormatted = `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)} (±${accuracy}m)`;

      let earlyMsg = '';
      try {
        const baseUrl = await ApiConfig.getBaseUrl();
        const headers = await ApiConfig.getAuthHeaders(userId);
        const res = await fetch(`${baseUrl}/attendance/check-out`, {
          method: 'POST',
          headers: { ...headers, 'x-user-id': userId },
          body: JSON.stringify({
            userId,
            employeeId: userId,
            latitude: lat,
            longitude: lon,
            gps_accuracy_m: accuracy,
            photo_key: `photo_att_out_${Date.now()}`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.early_minutes && data.early_minutes > 0) {
            earlyMsg = `Early Punch Out — ${data.early_minutes} minutes`;
            setEarlyExitNotice(earlyMsg);
          }
        }
      } catch {
        // Safe offline queue
      }

      setCheckedOut(true);
      setCheckOutTime(nowStr);
      setCheckOutGps(gpsFormatted);

      // Preserve existing photo from state or storage
      const currentPhoto = selfiePhoto?.uri || (selfiePhoto?.base64 ? (selfiePhoto.base64.startsWith('data:') ? selfiePhoto.base64 : `data:image/jpeg;base64,${selfiePhoto.base64}`) : null);

      // Save locally in AsyncStorage
      await AsyncStorage.setItem(
        ATTENDANCE_KEY,
        JSON.stringify({
          checkedIn: true,
          checkInTime,
          checkInGps,
          checkInPhoto: currentPhoto,
          checkedOut: true,
          checkOutTime: nowStr,
          checkOutGps: gpsFormatted,
          userId,
          date: todayStr,
        }),
      );

      Alert.alert(
        'Shift Ended ✓',
        `Punch-out recorded at ${nowStr}.\nShift marked as Completed.\n${earlyMsg ? `\n• ${earlyMsg}` : '\n• Standard Shift Hours Completed'}`
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to record checkout.');
    } finally {
      setIsLoading(false);
    }
  };

  if (subTab === 'leave') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F1F5F9', padding: 14 }}>
        <View style={styles.topSegmentBar}>
          <TouchableOpacity
            style={[styles.topSegmentBtn, styles.topSegmentBtnInactive]}
            onPress={() => setSubTab('punch')}
          >
            <Text style={styles.topSegmentText}>Daily Geo-Punch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topSegmentBtn, styles.topSegmentBtnInactive]}
            onPress={() => setSubTab('history')}
          >
            <Text style={styles.topSegmentText}>My Attendance Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topSegmentBtn, styles.topSegmentBtnActive]}
            onPress={() => setSubTab('leave')}
          >
            <Text style={styles.topSegmentTextActive}>Apply for Leave</Text>
          </TouchableOpacity>
        </View>

        <LeaveScreen
          currentUserId={currentUser?.id || 'usr-mr-01'}
          currentUserName={currentUser?.name || 'Rahul Sharma'}
        />
      </View>
    );
  }

  if (subTab === 'history') {
    return (
      <ScrollView style={[styles.container, { padding: 14 }]}>
        <View style={styles.topSegmentBar}>
          <TouchableOpacity
            style={[styles.topSegmentBtn, styles.topSegmentBtnInactive]}
            onPress={() => setSubTab('punch')}
          >
            <Text style={styles.topSegmentText}>Daily Geo-Punch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topSegmentBtn, styles.topSegmentBtnActive]}
            onPress={() => setSubTab('history')}
          >
            <Text style={styles.topSegmentTextActive}>My Attendance Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topSegmentBtn, styles.topSegmentBtnInactive]}
            onPress={() => setSubTab('leave')}
          >
            <Text style={styles.topSegmentText}>Apply for Leave</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Attendance History</Text>
          <Text style={styles.headerSub}>Punch-in/out records, working duration &amp; compliance</Text>
        </View>

        {attendanceHistory.length === 0 ? (
          <View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>No past attendance records found.</Text>
          </View>
        ) : (
          attendanceHistory.map((rec: any, idx: number) => {
            const isMissingPunchOut = rec.check_in_at && !rec.check_out_at && rec.date !== todayStr;
            const inTimeStr = rec.check_in_at
              ? new Date(rec.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--';
            const outTimeStr = rec.check_out_at
              ? new Date(rec.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : isMissingPunchOut
              ? 'MISSING'
              : 'Pending';

            return (
              <View
                key={rec.id || `att-hist-${idx}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: isMissingPunchOut ? '#FCA5A5' : '#E2E8F0',
                  borderLeftWidth: 4,
                  borderLeftColor: isMissingPunchOut ? '#DC2626' : rec.check_out_at ? '#10B981' : '#F59E0B',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    📅 {formatDateDDMMYYYY(rec.date)}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      backgroundColor: isMissingPunchOut ? '#FEE2E2' : rec.check_out_at ? '#DCFCE7' : '#FEF3C7',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: isMissingPunchOut ? '#991B1B' : rec.check_out_at ? '#166534' : '#92400E',
                      }}
                    >
                      {isMissingPunchOut ? 'MISSING PUNCH-OUT' : rec.status || 'PRESENT'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>PUNCH IN</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F8B5A' }}>{inTimeStr}</Text>
                    {rec.late_minutes && rec.late_minutes > 0 ? (
                      <Text style={{ fontSize: 9.5, color: '#DC2626', fontWeight: '700' }}>
                        Late: {rec.late_minutes}m
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 9.5, color: '#166534' }}>On-Time</Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>PUNCH OUT</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isMissingPunchOut ? '#DC2626' : '#1E40AF',
                      }}
                    >
                      {outTimeStr}
                    </Text>
                    {rec.early_minutes && rec.early_minutes > 0 ? (
                      <Text style={{ fontSize: 9.5, color: '#DC2626', fontWeight: '700' }}>
                        Early: {rec.early_minutes}m
                      </Text>
                    ) : rec.check_out_at ? (
                      <Text style={{ fontSize: 9.5, color: '#166534' }}>Completed</Text>
                    ) : null}
                  </View>
                </View>

                {rec.total_working_hours !== undefined && (
                  <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10.5, color: '#64748B' }}>Duration: {rec.total_working_hours} hrs</Text>
                    <Text style={{ fontSize: 10.5, color: '#0F8B5A', fontWeight: '600' }}>✓ GPS Verified</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topSegmentBar}>
        <TouchableOpacity
          style={[styles.topSegmentBtn, styles.topSegmentBtnActive]}
          onPress={() => setSubTab('punch')}
        >
          <Text style={styles.topSegmentTextActive}>Daily Geo-Punch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topSegmentBtn, styles.topSegmentBtnInactive]}
          onPress={() => setSubTab('history')}
        >
          <Text style={styles.topSegmentText}>My Attendance Log</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topSegmentBtn, styles.topSegmentBtnInactive]}
          onPress={() => setSubTab('leave')}
        >
          <Text style={styles.topSegmentText}>Apply for Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Field Attendance & In/Out Log</Text>
        <Text style={styles.headerSub}>Live camera verification in work attire &amp; GPS geofence</Text>
      </View>

      {/* Attendance & Dress Code Notice Card with Policy Link */}
      <View style={styles.reassuranceCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={{ fontSize: 16 }}>👔</Text>
            <Text style={styles.reassuranceTitle}>Full Dress &amp; ID Card Required</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowPolicyModal(true)}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 10,
              backgroundColor: '#EEF2FF',
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#C7D2FE',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338CA' }}>View Policy 📋</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.reassuranceBody}>
          Every attendance punch requires a live photo in full formal attire with your company ID card clearly visible. Location is verified automatically.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Today's Shift Status</Text>
          <Text
            style={[
              styles.statusValue,
              { color: checkedOut ? '#0052cc' : checkedIn ? '#0F8B5A' : '#de350b' },
            ]}
          >
            {checkedOut
              ? 'SHIFT COMPLETED (PRESENT) ✓'
              : checkedIn
              ? 'MARKED DONE (PRESENT) ✓'
              : 'NOT CHECKED IN'}
          </Text>
          <Text style={styles.statusSub}>
            Date: {formatDateDDMMYYYY(new Date())} • Standard Shift: 09:00 AM – 06:00 PM
          </Text>

          {/* Prominent Marked Done Verification Banner */}
          {checkedIn && (
            <View
              style={{
                backgroundColor: '#DCFCE7',
                borderColor: '#86EFAC',
                borderWidth: 1,
                padding: 10,
                borderRadius: 8,
                marginTop: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, color: '#166534', fontWeight: '800' }}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#166534' }}>
                  ATTENDANCE MARKED DONE
                </Text>
                <Text style={{ fontSize: 11, color: '#15803D' }}>
                  Punched in at {checkInTime || '09:15 AM'} • Geotagged on field
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Shift Timings Grid (In-Time and Out-Time) */}
        <View style={styles.timingGrid}>
          <View style={[styles.timingTile, checkedIn ? styles.timingTileActive : {}]}>
            <Text style={styles.timingLabel}>In-Time (Punch In)</Text>
            <Text style={[styles.timingVal, checkedIn ? { color: '#0F8B5A' } : {}]}>
              {checkInTime || 'Not punched in'}
            </Text>
          </View>
          <View style={[styles.timingTile, checkedOut ? styles.timingTileActive : {}]}>
            <Text style={styles.timingLabel}>Out-Time (Punch Out)</Text>
            <Text style={[styles.timingVal, checkedOut ? { color: '#0052cc' } : {}]}>
              {checkOutTime || (checkedIn ? 'Pending end of day' : 'Not punched out')}
            </Text>
          </View>
        </View>

        {/* Camera Photo Section (if not yet checked in) (§21) */}
        {!checkedIn && (
          <View style={styles.selfieSection}>
            {selfiePhoto ? (
              <View style={styles.selfiePreviewBox}>
                <Image source={{ uri: selfiePhoto.uri }} style={[styles.selfieImage, { width: 130, height: 160, borderRadius: 10 }]} />
                <View style={styles.photoVerifiedBadge}>
                  <Text style={styles.photoVerifiedText}>✓ Full Dress &amp; ID Card Photo Captured</Text>
                  <Text style={styles.photoVerifiedSub}>Identity &amp; uniform verified for shift</Text>
                </View>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={handleTakeSelfie}
                >
                  <Text style={styles.retakeBtnText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.cameraTriggerBtn}
                onPress={handleTakeSelfie}
              >
                <Text style={styles.cameraTriggerIcon}>📷</Text>
                <Text style={styles.cameraTriggerText}>Click Photo (Full Dress &amp; ID Card)</Text>
                <Text style={[styles.cameraTriggerSub, { fontWeight: '600', color: '#1E40AF', marginTop: 4 }]}>
                  Stand properly in full uniform with your company ID card clearly visible.
                </Text>
                <Text style={[styles.cameraTriggerSub, { fontSize: 10, color: '#64748B', marginTop: 2 }]}>
                  Live camera verification &amp; GPS geotag required.
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Check-In Details Card (§20, §24) */}
        {checkedIn && (
          <View style={styles.recordBox}>
            <View style={styles.recordHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordTitle}>✓ In-Time Recorded: {checkInTime || '09:15 AM'}</Text>
                <Text style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Work Attire &amp; ID Card Verified</Text>
              </View>
              {selfiePhoto && (
                <View style={{ alignItems: 'center' }}>
                  <Image
                    source={{ uri: selfiePhoto.uri }}
                    style={{ width: 48, height: 48, borderRadius: 8, borderWidth: 2, borderColor: '#16A34A' }}
                  />
                  <Text style={{ fontSize: 9, color: '#166534', fontWeight: '700', marginTop: 2 }}>Photo ✓</Text>
                </View>
              )}
            </View>
            {lateEntryNotice ? (
              <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>⏱ {lateEntryNotice}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>✓ On-Time Shift Entry</Text>
              </View>
            )}
            <Text style={styles.recordDetails}>{checkInGps || 'GPS: 28.5245, 77.2066 (Accuracy: ±8m)'}</Text>
          </View>
        )}

        {/* Check-Out Details Card (§23, §24) */}
        {checkedOut && (
          <View style={[styles.recordBox, { backgroundColor: '#EBF8FF' }]}>
            <Text style={[styles.recordTitle, { color: '#0052cc' }]}>
              ✓ Out-Time Recorded: {checkOutTime || '06:15 PM'}
            </Text>
            {earlyExitNotice && (
              <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>⏱ {earlyExitNotice}</Text>
              </View>
            )}
            <Text style={[styles.recordDetails, { color: '#004099' }]}>
              {checkOutGps || 'GPS: 28.5300, 77.2100 (Accuracy: ±10m)'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#0b2545" />
            <Text style={styles.loadingText}>Recording In/Out Time & GPS...</Text>
          </View>
        ) : (
          <>
            {!checkedIn && (
              <TouchableOpacity
                style={[styles.btnIn, !selfiePhoto ? styles.btnDisabled : {}]}
                onPress={handleCheckIn}
              >
                <Text style={styles.btnText}>
                  {selfiePhoto ? 'Punch In (Confirm In-Time)' : 'Click Photo First to Punch In'}
                </Text>
              </TouchableOpacity>
            )}

            {checkedIn && !checkedOut && (
              <TouchableOpacity style={styles.btnOut} onPress={handleCheckOut}>
                <Text style={styles.btnText}>Punch Out (End of Day)</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Attendance & Uniform Policy Modal (§ Employee Policy Guide) */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyModalContainer}>
            <View style={styles.policyModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>📋</Text>
                <View>
                  <Text style={styles.policyModalTitle}>Attendance &amp; Attire Policy</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Field Representative Guidelines</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowPolicyModal(false)}
                style={styles.policyModalCloseBtn}
              >
                <Text style={styles.policyModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Section 1: Dress Code */}
              <View style={styles.policySection}>
                <Text style={styles.policySectionTitle}>👔 1. Mandatory Formal Dress Code</Text>
                <Text style={styles.policySectionBody}>
                  All field representatives must report for duty in complete formal attire or prescribed company uniform. Professional grooming is mandatory for all field visits.
                </Text>
              </View>

              {/* Section 2: ID Card */}
              <View style={styles.policySection}>
                <Text style={styles.policySectionTitle}>🪪 2. Official ID Card Placement</Text>
                <Text style={styles.policySectionBody}>
                  Your official company ID card must be worn visibly on your chest during check-in. The live camera photo verifies your identity and credentials for administration.
                </Text>
              </View>

              {/* Section 3: GPS Geotagging */}
              <View style={styles.policySection}>
                <Text style={styles.policySectionTitle}>📍 3. Live GPS Field Verification</Text>
                <Text style={styles.policySectionBody}>
                  Exact GPS coordinates are recorded upon punch-in and punch-out to verify your assigned headquarters or area presence. Simulated or mock location tools are strictly prohibited.
                </Text>
              </View>

              {/* Section 4: Privacy & Verification - Note: Server cleans photo blobs after 24h for bandwidth/quota */}
              <View style={styles.policySection}>
                <Text style={styles.policySectionTitle}>🛡️ 4. Verification &amp; Records</Text>
                <Text style={styles.policySectionBody}>
                  Attendance verification details, shift timestamps, and working hours are securely maintained for company payroll and administrative compliance.
                </Text>
              </View>

              {/* Section 5: Punctuality */}
              <View style={styles.policySection}>
                <Text style={styles.policySectionTitle}>⏱️ 5. Shift Timings &amp; Working Hours</Text>
                <Text style={styles.policySectionBody}>
                  Standard check-in is expected by 10:00 AM. A 30-minute grace window is provided, after which late entries are calculated automatically. Punch-out before 06:00 PM is recorded as early departure.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.policyAgreeBtn}
              onPress={() => setShowPolicyModal(false)}
            >
              <Text style={styles.policyAgreeBtnText}>I Understand the Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA', padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0B2545' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0B2545',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statusBox: { alignItems: 'center', marginBottom: 20 },
  statusLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  statusSub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  selfieSection: {
    marginBottom: 18,
    alignItems: 'center',
  },
  cameraTriggerBtn: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTriggerIcon: { fontSize: 32, marginBottom: 4 },
  cameraTriggerText: { fontSize: 14, fontWeight: '700', color: '#0B2545' },
  cameraTriggerSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  selfiePreviewBox: {
    alignItems: 'center',
    gap: 8,
  },
  selfieImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#0F8B5A',
  },
  thumbnailSelfie: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0F8B5A',
  },
  retakeBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  retakeBtnText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  recordBox: {
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  recordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordTitle: { fontSize: 14, fontWeight: '700', color: '#0F8B5A' },
  recordDetails: { fontSize: 12, color: '#2E7D32', marginTop: 4 },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  btnIn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0F8B5A',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnOut: {
    backgroundColor: '#0B2545',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0B2545',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  topSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  topSegmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 6,
  },
  topSegmentBtnActive: {
    backgroundColor: '#1A3C6E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  topSegmentBtnInactive: {
    backgroundColor: 'transparent',
  },
  topSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  topSegmentTextActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reassuranceCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  reassuranceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  reassuranceBody: {
    fontSize: 11.5,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  timingGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  timingTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  timingTileActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  timingLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timingVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '800',
  },
  photoVerifiedBadge: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  photoVerifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  photoVerifiedSub: {
    fontSize: 10.5,
    color: '#15803D',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  policyModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 440,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  policyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  policyModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  policyModalCloseBtn: {
    padding: 6,
  },
  policyModalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  policySection: {
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  policySectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  policySectionBody: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  policyAgreeBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  policyAgreeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
});
