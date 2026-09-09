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
import { AppVersionInfo, AppUpdateService } from '../services/appUpdateService';

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
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !updateInfo) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const ok = await AppUpdateService.startUpdate(updateInfo.downloadUrl);
      if (!ok) {
        Alert.alert(
          'Update Link',
          `Direct update URL: ${updateInfo.downloadUrl}\n\nPlease open this in your browser to download.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not start update download.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => !isMandatory && onClose()}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Top Banner & Icon */}
          <View style={styles.bannerHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🚀</Text>
            </View>
            <Text style={styles.headerTitle}>New Update Available</Text>
            <Text style={styles.headerSubtitle}>
              {isMandatory ? 'Critical Security & Map Update' : 'Enhanced Features & Bug Fixes'}
            </Text>
          </View>

          {/* Version Pill Indicator */}
          <View style={styles.versionPillRow}>
            <View style={styles.versionBadgeCurrent}>
              <Text style={styles.versionLabel}>Installed</Text>
              <Text style={styles.versionValue}>v{currentVersion}</Text>
            </View>
            <Text style={styles.versionArrow}>➔</Text>
            <View style={styles.versionBadgeNew}>
              <Text style={styles.versionLabelNew}>New Release</Text>
              <Text style={styles.versionValueNew}>v{updateInfo.latestVersion}</Text>
            </View>
          </View>

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

          {/* Seamless In-Place Update Note */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              💡 <Text style={{ fontWeight: '700' }}>No uninstall needed:</Text> Tapping "Update Now" downloads and installs directly over your current app without losing login sessions or saved data.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {!isMandatory && (
              <TouchableOpacity style={styles.laterBtn} onPress={onClose} disabled={isUpdating}>
                <Text style={styles.laterBtnText}>Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.updateBtn, isMandatory && { flex: 1 }]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.updateBtnText}>Update Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  versionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  versionBadgeCurrent: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  versionLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  versionValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  versionArrow: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F8B5A',
  },
  versionBadgeNew: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  versionLabelNew: {
    fontSize: 9.5,
    color: '#166534',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  versionValueNew: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#15803D',
  },
  notesContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  notesHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  notesScroll: {
    maxHeight: 140,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  noteBullet: {
    color: '#0F8B5A',
    fontWeight: '800',
    marginRight: 8,
    fontSize: 12,
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  infoBox: {
    marginHorizontal: 18,
    marginBottom: 16,
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
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  laterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  laterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  updateBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  updateBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
