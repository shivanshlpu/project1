import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { ApiConfig } from '../services/apiConfig';

interface ServerStatusPillProps {
  compact?: boolean;
}

export const ServerStatusPill: React.FC<ServerStatusPillProps> = ({ compact = false }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const checkConnection = async () => {
    setIsPinging(true);
    try {
      const res = await ApiConfig.testConnection();
      if (res.ok) {
        setStatus('connected');
        setLatency(res.latency ?? null);
        setFailedCount(0);
      } else {
        setFailedCount((prev) => {
          const next = prev + 1;
          // Only show red "offline" after 2 consecutive failures to allow Render cold start
          if (next >= 2) {
            setStatus('offline');
          } else {
            setStatus('checking');
          }
          return next;
        });
        setLatency(null);
      }
    } catch {
      setFailedCount((prev) => {
        const next = prev + 1;
        if (next >= 2) {
          setStatus('offline');
        } else {
          setStatus('checking');
        }
        return next;
      });
      setLatency(null);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 20000);
    return () => clearInterval(interval);
  }, []);

  const dotColor =
    status === 'connected' ? '#10B981' : status === 'checking' ? '#F59E0B' : '#EF4444';
  const labelText =
    status === 'connected'
      ? `Server Connected ${latency ? `(${latency}ms)` : ''}`
      : status === 'checking'
      ? failedCount > 0
        ? 'Waking up server...'
        : 'Connecting to Server...'
      : 'Server Offline';

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={[
            styles.compactPill,
            status === 'connected'
              ? styles.pillBorderGreen
              : status === 'checking'
              ? styles.pillBorderYellow
              : styles.pillBorderRed,
          ]}
          onPress={() => setIsModalOpen(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.compactText} numberOfLines={1}>
            {status === 'connected'
              ? 'Server Online'
              : status === 'checking'
              ? failedCount > 0
                ? 'Waking up...'
                : 'Connecting...'
              : 'Server Offline'}
          </Text>
        </TouchableOpacity>

        {/* Diagnostic Modal */}
        <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Backend Server Connection</Text>
              <Text style={styles.modalSubtitle}>
                Production server status and telemetry information
              </Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Server Endpoint:</Text>
                <Text style={styles.infoValue}>https://ahtri-backend.onrender.com</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Configuration:</Text>
                <Text style={[styles.infoValue, { color: '#0F8B5A', fontWeight: '700' }]}>
                  🔒 Locked (Enterprise Production • Read-Only)
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Connection Status:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={{ fontWeight: '700', color: dotColor }}>
                    {status === 'connected'
                      ? 'Connected & Healthy (200 OK)'
                      : status === 'checking'
                      ? failedCount > 0
                        ? 'Waking up server (Render cold start)...'
                        : 'Testing Connection...'
                      : 'Unreachable (Retry in progress)'}
                  </Text>
                </View>
              </View>

              {latency && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Roundtrip Latency:</Text>
                  <Text style={styles.infoValue}>{latency} ms</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.pingBtn}
                  onPress={checkConnection}
                  disabled={isPinging}
                >
                  {isPinging ? (
                    <ActivityIndicator size="small" color="#1A3C6E" />
                  ) : (
                    <Text style={styles.pingBtnText}>⚡ Test Connection Now</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View style={styles.fullCard}>
      <View style={styles.fullCardTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <View>
            <Text style={styles.fullStatusTitle}>{labelText}</Text>
            <Text style={styles.fullUrlText}>https://ahtri-backend.onrender.com (Locked)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.testBtn} onPress={checkConnection} disabled={isPinging}>
          {isPinging ? (
            <ActivityIndicator size="small" color="#1A3C6E" />
          ) : (
            <Text style={styles.testBtnText}>Test</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  pillBorderGreen: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  pillBorderYellow: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  pillBorderRed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  fullCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    marginVertical: 8,
  },
  fullCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  fullUrlText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  testBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A3C6E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  pingBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  pingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  closeModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
