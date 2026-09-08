import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OfflineBannerProps {
  isOffline: boolean;
  pendingCount?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  pendingCount = 0,
}) => {
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        Offline Mode — {pendingCount} actions queued for automatic sync
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F57C00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
