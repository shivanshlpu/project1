import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ApiConfig, PRESET_SERVER_URLS, DEFAULT_API_URL } from '../services/apiConfig';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerUrlChanged?: (newUrl: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onServerUrlChanged,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    uptime?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      ApiConfig.getBaseUrl().then((url) => {
        setCurrentUrl(url);
        setInputUrl(url);
        handleTest(url);
      });
    }
  }, [isOpen]);

  const handleTest = async (urlToTest?: string) => {
    const target = urlToTest || inputUrl;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await ApiConfig.testConnection(target);
      setTestResult({
        ok: res.ok,
        message: res.message,
        uptime: res.data?.uptime,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Failed to ping server',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!inputUrl.trim()) {
      Alert.alert('Invalid URL', 'Please provide a valid backend server URL.');
      return;
    }
    const cleanUrl = inputUrl.trim().replace(/\/+$/, '');
    await ApiConfig.setBaseUrl(cleanUrl);
    setCurrentUrl(cleanUrl);
    if (onServerUrlChanged) {
      onServerUrlChanged(cleanUrl);
    }
    Alert.alert('Server URL Saved', `App backend address updated to:\n${cleanUrl}`);
    onClose();
  };

  const handleReset = async () => {
    const defaultUrl = await ApiConfig.resetToDefault();
    setInputUrl(defaultUrl);
    setCurrentUrl(defaultUrl);
    if (onServerUrlChanged) {
      onServerUrlChanged(defaultUrl);
    }
    handleTest(defaultUrl);
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Server Connection Settings</Text>
              <Text style={styles.subtitle}>Configure mobile app backend API endpoint</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Indicator Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  testResult?.ok
                    ? styles.statusGreen
                    : testResult === null
                    ? styles.statusYellow
                    : styles.statusRed,
                ]}
              />
              <Text style={styles.statusTitle}>
                {isTesting
                  ? 'Testing Connection...'
                  : testResult?.ok
                  ? 'Connected to Server'
                  : 'Disconnected / Unreachable'}
              </Text>
            </View>
            {testResult && (
              <Text
                style={[
                  styles.statusMessage,
                  testResult.ok ? styles.messageSuccess : styles.messageError,
                ]}
              >
                {testResult.message}
                {testResult.uptime !== undefined ? ` (Uptime: ${testResult.uptime}s)` : ''}
              </Text>
            )}
          </View>

          {/* URL Input */}
          <Text style={styles.fieldLabel}>Backend Server URL (HTTP/HTTPS)</Text>
          <TextInput
            style={styles.urlInput}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="http://10.48.153.83:3000"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Presets */}
          <Text style={styles.fieldLabel}>Quick Presets</Text>
          <View style={styles.presetsCol}>
            {PRESET_SERVER_URLS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetBtn,
                  inputUrl === preset.url && styles.presetBtnActive,
                ]}
                onPress={() => {
                  setInputUrl(preset.url);
                  handleTest(preset.url);
                }}
              >
                <Text
                  style={[
                    styles.presetLabel,
                    inputUrl === preset.url && styles.presetLabelActive,
                  ]}
                >
                  {preset.label}: {preset.url}
                </Text>
                <Text style={styles.presetDesc}>{preset.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Test & Reset Action Bar */}
          <View style={styles.middleActionRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTest()}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.testBtnText}>Ping Health Check</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset Default</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Save / Cancel */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save & Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  statusCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusGreen: { backgroundColor: '#0F8B5A' },
  statusYellow: { backgroundColor: '#EAB308' },
  statusRed: { backgroundColor: '#DC2626' },
  statusTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusMessage: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 18,
  },
  messageSuccess: { color: '#0F8B5A', fontWeight: '600' },
  messageError: { color: '#DC2626', fontWeight: '500' },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
    marginTop: 6,
  },
  urlInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  presetsCol: {
    gap: 6,
    marginBottom: 10,
  },
  presetBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  presetBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  presetLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  presetLabelActive: {
    color: '#1D4ED8',
  },
  presetDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  middleActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  testBtn: {
    flex: 2,
    backgroundColor: '#1E40AF',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0F8B5A',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
