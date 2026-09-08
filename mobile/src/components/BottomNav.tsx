import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type MobileTab = 'tasks' | 'doctors' | 'visits' | 'attendance' | 'profile';

interface BottomNavProps {
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'tasks' as MobileTab, label: 'Tasks', code: 'TSK' },
    { id: 'doctors' as MobileTab, label: 'Doctors', code: 'DOC' },
    { id: 'visits' as MobileTab, label: 'Orders', code: 'ORD' },
    { id: 'attendance' as MobileTab, label: 'Attendance', code: 'ATT' },
    { id: 'profile' as MobileTab, label: 'Device', code: 'DEV' },
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onSelectTab(tab.id)}
          >
            <View style={[styles.codeBadge, isActive && styles.codeBadgeActive]}>
              <Text style={[styles.codeText, isActive && styles.codeTextActive]}>
                {tab.code}
              </Text>
            </View>
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
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    marginBottom: 3,
  },
  codeBadgeActive: {
    backgroundColor: '#0F8B5A',
  },
  codeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  codeTextActive: {
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  labelActive: {
    color: '#0F8B5A',
    fontWeight: '700',
  },
  labelInactive: {
    color: '#64748B',
  },
});
