import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type MobileTab = 'tasks' | 'doctors' | 'visits' | 'attendance' | 'profile';

interface BottomNavProps {
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'tasks' as MobileTab, label: 'Tasks', icon: '✓' },
    { id: 'doctors' as MobileTab, label: 'Doctors', icon: '+' },
    { id: 'visits' as MobileTab, label: 'Orders', icon: '₹' },
    { id: 'attendance' as MobileTab, label: 'Attendance', icon: '●' },
    { id: 'profile' as MobileTab, label: 'Device', icon: 'ID' },
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
          >
            {/* Top Active Bar */}
            {isActive && <View style={styles.activeTopBar} />}

            {/* Icon Circle */}
            <View style={[styles.iconCircle, isActive && styles.iconCircleActive]}>
              <Text style={[styles.iconText, isActive && styles.iconTextActive]}>
                {tab.icon}
              </Text>
            </View>

            {/* Label */}
            <Text
              style={[
                styles.tabLabel,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    height: 62,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flex: 1,
    position: 'relative',
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabItemActive: {
    backgroundColor: 'rgba(27, 154, 170, 0.04)',
  },
  activeTopBar: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#0F8B5A',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconCircleActive: {
    backgroundColor: '#0F8B5A',
  },
  iconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  iconTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#0F8B5A',
    fontWeight: '700',
  },
  labelInactive: {
    color: '#64748B',
  },
});
