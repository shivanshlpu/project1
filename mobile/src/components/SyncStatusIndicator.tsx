import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface SyncStatusIndicatorProps {
  pendingCount: number;
  onManualSync?: () => void;
  isSyncing?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  pendingCount,
  onManualSync,
  isSyncing = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.dotRow}>
        <View
          style={[
            styles.dot,
            pendingCount === 0 ? styles.dotSynced : styles.dotPending,
          ]}
        />
        <Text style={styles.statusText}>
          {isSyncing
            ? 'Syncing with Server...'
            : pendingCount === 0
            ? 'All Drafts Synced'
            : `${pendingCount} Pending Sync`}
        </Text>
      </View>

      {pendingCount > 0 && onManualSync && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={onManualSync}
          disabled={isSyncing}
        >
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotSynced: {
    backgroundColor: '#0F8B5A',
  },
  dotPending: {
    backgroundColor: '#F57C00',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  syncButton: {
    backgroundColor: '#1A3C6E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
