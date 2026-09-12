import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { NotificationService, InAppAlertPayload } from '../services/notificationService';

export const HeadsUpNotificationBanner: React.FC<{
  onPressTask?: (taskId: string) => void;
  onPressUpdate?: () => void;
}> = ({ onPressTask, onPressUpdate }) => {
  const [activeAlert, setActiveAlert] = useState<InAppAlertPayload | null>(null);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((alert) => {
      setActiveAlert(alert);
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
      }).start();

      // Auto dismiss after 5.5s
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setActiveAlert(null));
      }, 5500);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, [slideAnim]);

  if (!activeAlert) return null;

  const getTheme = () => {
    switch (activeAlert.type) {
      case 'TASK':
        return { bg: '#0F172A', border: '#22C55E', icon: '📋', accent: '#4ADE80' };
      case 'LEAVE':
        return { bg: '#064E3B', border: '#34D399', icon: '🎉', accent: '#6EE7B7' };
      case 'UPDATE':
        return { bg: '#0B2545', border: '#38BDF8', icon: '🚀', accent: '#7DD3FC' };
      default:
        return { bg: '#1E293B', border: '#94A3B8', icon: '🔔', accent: '#E2E8F0' };
    }
  };

  const theme = getTheme();

  const handlePress = () => {
    if (activeAlert.type === 'UPDATE' && onPressUpdate) {
      onPressUpdate();
    } else if (activeAlert.type === 'TASK' && onPressTask) {
      onPressTask(activeAlert.id);
    }
    // Dismiss
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setActiveAlert(null));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{theme.icon}</Text>
        </View>

        <View style={styles.textContainer}>
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: theme.accent }]}>{activeAlert.title}</Text>
            <Text style={styles.timeText}>{activeAlert.timestamp}</Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {activeAlert.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 10,
    left: 12,
    right: 12,
    zIndex: 99999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  timeText: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 6,
    fontWeight: '600',
  },
  body: {
    fontSize: 11.5,
    color: '#F1F5F9',
    lineHeight: 15,
  },
});
