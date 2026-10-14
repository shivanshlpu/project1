import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppVersionInfo, AppUpdateService, DownloadProgressPayload } from '../services/appUpdateService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppVersionInfo | null;
  currentVersion: string;
  isMandatory?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  currentVersion,
  isMandatory = false,
}) => {
  const [downloadState, setDownloadState] = useState<'IDLE' | 'DOWNLOADING' | 'READY_TO_INSTALL' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState<DownloadProgressPayload>({
    percent: 0,
    totalBytes: 0,
    writtenBytes: 0,
    formattedTotal: 'Calculating...',
    formattedWritten: '0 MB',
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen || !updateInfo) return null;

  const handleStartInAppUpdate = async () => {
    setDownloadState('DOWNLOADING');
    setErrorMessage('');

    try {
      const res = await AppUpdateService.downloadAndInstallApk(
        updateInfo.downloadUrl,
        (p) => {
          setProgress(p);
        },
        updateInfo.latestVersion
      );

      if (res.success) {
        setDownloadState('READY_TO_INSTALL');
      } else {
        setDownloadState('ERROR');
        setErrorMessage(res.error || 'Download interrupted');
      }
    } catch (err: any) {
      setDownloadState('ERROR');
      setErrorMessage(err?.message || 'Download error');
    }
  };

  const handleLaunchInstaller = async () => {
    try {
      const res = await AppUpdateService.launchApkInstaller();
      if (!res.success) {
        Alert.alert(
          'Installation Prompt',
          res.error || 'If your phone blocks installations from this source, enable "Allow from this source" in settings.',
          [
            { text: 'Settings', onPress: () => AppUpdateService.openInstallUnknownSourcesSettings() },
            { text: 'Browser Download', onPress: () => AppUpdateService.openBrowserDownload(updateInfo.downloadUrl) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Installation Error', err?.message || 'Could not launch package installer');
    }
  };

  const handleOpenBrowserFallback = async () => {
    await AppUpdateService.openBrowserDownload(updateInfo.downloadUrl);
  };

  const handleDismiss = async () => {
    if (updateInfo?.latestVersion) {
      await AppUpdateService.markVersionDismissed(updateInfo.latestVersion);
    }
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => !isMandatory && downloadState !== 'DOWNLOADING' && handleDismiss()}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Close 'X' Button at top-right (hidden if mandatory) */}
          {!isMandatory && downloadState !== 'DOWNLOADING' && (
            <TouchableOpacity
              style={styles.closeXBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeXText}>✕</Text>
            </TouchableOpacity>
          )}

          {/* Top Banner & Icon */}
          <View style={styles.bannerHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>
                {downloadState === 'DOWNLOADING' ? '⚡' : downloadState === 'READY_TO_INSTALL' ? '✅' : '🚀'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>
              {downloadState === 'DOWNLOADING'
                ? 'Downloading Update...'
                : downloadState === 'READY_TO_INSTALL'
                ? 'Ready to Install!'
                : 'New Update Available'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {downloadState === 'DOWNLOADING'
                ? 'Downloading package directly inside app'
                : downloadState === 'READY_TO_INSTALL'
                ? 'Package downloaded. Launch installer below.'
                : 'A newer version is available for download'}
            </Text>
          </View>

          {/* Version Pill Indicator */}
          <View style={styles.versionPillRow}>
            <View style={styles.versionBadgeCurrent}>
              <Text style={styles.versionLabel}>Current</Text>
              <Text style={styles.versionValue}>v{currentVersion}</Text>
            </View>
            <Text style={styles.versionArrow}>➔</Text>
            <View style={styles.versionBadgeNew}>
              <Text style={styles.versionLabelNew}>New</Text>
              <Text style={styles.versionValueNew}>v{updateInfo.latestVersion}</Text>
            </View>
          </View>

          {/* Body Content depending on download state */}
          {downloadState === 'DOWNLOADING' ? (
            <View style={styles.downloadProgressCard}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressPercentText}>{progress.percent}%</Text>
                <Text style={styles.progressBytesText}>
                  {progress.formattedWritten} / {progress.formattedTotal}
                </Text>
              </View>

              {/* Progress Bar Track */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progress.percent}%` }]} />
              </View>

              <Text style={styles.progressStatusNotice}>
                Please keep the app open. Android installer will prompt automatically once finished.
              </Text>
            </View>
          ) : downloadState === 'READY_TO_INSTALL' ? (
            <View style={styles.readyCard}>
              <Text style={styles.readyHeading}>Update File Ready!</Text>
              <Text style={styles.readyText}>
                The update package is ready on your device. Tap below to launch the Android installer.
              </Text>

              {/* Installer Action Button */}
              <TouchableOpacity style={styles.primaryInstallBtn} onPress={handleLaunchInstaller}>
                <Text style={styles.primaryInstallBtnText}>📲 Open Android Installer</Text>
              </TouchableOpacity>

              {/* Helper Links Row */}
              <View style={styles.installerHelpRow}>
                <TouchableOpacity
                  style={styles.helpLinkBtn}
                  onPress={() => AppUpdateService.openInstallUnknownSourcesSettings()}
                >
                  <Text style={styles.helpLinkText}>⚙️ App Permissions</Text>
                </TouchableOpacity>
                <Text style={styles.helpLinkDivider}>•</Text>
                <TouchableOpacity style={styles.helpLinkBtn} onPress={handleOpenBrowserFallback}>
                  <Text style={styles.helpLinkText}>🌐 Browser Download</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.unknownSourcesNote}>
                Note: If prompted, allow "Install unknown apps" for AHTRI FFA to proceed.
              </Text>

              <TouchableOpacity style={styles.doneBtn} onPress={handleDismiss}>
                <Text style={styles.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Release Notes */}
              <View style={styles.notesContainer}>
                <Text style={styles.notesHeading}>What's New in this Update:</Text>
                <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
                  {updateInfo.releaseNotes && updateInfo.releaseNotes.length > 0 ? (
                    updateInfo.releaseNotes.map((note, idx) => (
                      <View key={idx} style={styles.noteItem}>
                        <Text style={styles.noteBullet}>✓</Text>
                        <Text style={styles.noteText}>{note}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noteText}>Performance improvements, bug fixes, and map updates.</Text>
                  )}
                </ScrollView>
              </View>

              {downloadState === 'ERROR' && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMessage || 'Download error. Please try again.'}</Text>
                  <TouchableOpacity
                    style={styles.errorFallbackBtn}
                    onPress={handleOpenBrowserFallback}
                  >
                    <Text style={styles.errorFallbackText}>🌐 Download via Browser Instead</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {downloadState !== 'DOWNLOADING' && downloadState !== 'READY_TO_INSTALL' && (
              <>
                {!isMandatory && (
                  <TouchableOpacity style={styles.laterBtn} onPress={handleDismiss}>
                    <Text style={styles.laterBtnText}>Later</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.updateBtn, isMandatory ? { flex: 1 } : null]}
                  onPress={handleStartInAppUpdate}
                >
                  <Text style={styles.updateBtnText}>
                    {downloadState === 'ERROR' ? 'Retry In-App Update' : 'Download & Install'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  bannerHeader: {
    backgroundColor: '#0B2545',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'center',
  },
  versionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  versionBadgeCurrent: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 7,
  },
  versionLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  versionValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  versionArrow: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F8B5A',
  },
  versionBadgeNew: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  versionLabelNew: {
    fontSize: 9,
    color: '#166534',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  versionValueNew: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  notesContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  notesHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 120,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  noteBullet: {
    color: '#0F8B5A',
    fontWeight: '800',
    marginRight: 7,
    fontSize: 11,
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  infoBox: {
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBoxText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
  },
  errorBox: {
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 9,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },
  downloadProgressCard: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressPercentText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F8B5A',
  },
  progressBytesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0F8B5A',
    borderRadius: 5,
  },
  progressStatusNotice: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
  readyCard: {
    padding: 20,
    alignItems: 'center',
  },
  readyHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F8B5A',
    marginBottom: 6,
  },
  readyText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  primaryInstallBtn: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#0F8B5A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F8B5A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  primaryInstallBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  installerHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  helpLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  helpLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  helpLinkDivider: {
    color: '#94A3B8',
    fontSize: 12,
  },
  unknownSourcesNote: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  errorFallbackBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignSelf: 'flex-start',
  },
  errorFallbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 10,
  },
  laterBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  laterBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  updateBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: '#0F8B5A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  updateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeXBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeXText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  doneBtn: {
    marginTop: 10,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F8B5A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
