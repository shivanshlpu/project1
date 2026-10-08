import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ApiConfig } from '../services/apiConfig';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface CompetitionScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  onBack?: () => void;
}

interface CompetitionItem {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  hq_id: string;
  hq_name: string;
  medicine_id: string;
  medicine_name: string;
  target_quantity: number;
  reward_amount: number;
  description: string;
  achieved_quantity: number;
  remaining_quantity: number;
  is_eligible: boolean;
  claim_status: 'IN_PROGRESS' | 'ELIGIBLE' | 'APPLIED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  claim_id?: string | null;
  supporting_orders_count: number;
}

export const CompetitionScreen: React.FC<CompetitionScreenProps> = ({
  currentUserId = 'usr-mr-02',
  currentUserName = 'Aman Rathore',
  onBack,
}) => {
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [claimingCompId, setClaimingCompId] = useState<string | null>(null);

  const fetchCompetitions = async () => {
    setIsLoading(true);
    try {
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/competitions/my`, { headers });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setCompetitions(list);
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const handleClaimReward = async (comp: CompetitionItem) => {
    Alert.alert(
      'Apply / Claim Reward',
      `Congratulations! You have achieved ${comp.achieved_quantity} / ${comp.target_quantity} units of ${comp.medicine_name}.\n\nDo you want to submit your claim for ₹${comp.reward_amount.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Claim ✓',
          onPress: async () => {
            setClaimingCompId(comp.id);
            try {
              const baseUrl = await ApiConfig.getBaseUrl();
              const headers = await ApiConfig.getAuthHeaders();
              const res = await fetch(`${baseUrl}/competitions/${comp.id}/claim`, {
                method: 'POST',
                headers,
              });

              if (res.ok) {
                Alert.alert(
                  'Claim Submitted! 🎉',
                  `Your incentive claim for ₹${comp.reward_amount.toLocaleString()} has been received and sent for management review.\nStatus: APPLIED`,
                );
                fetchCompetitions();
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Claim Notice', err.message || 'Unable to submit reward claim.');
              }
            } catch (err: any) {
              Alert.alert('Network Error', err?.message || 'Could not connect to server.');
            } finally {
              setClaimingCompId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#93C5FD', fontWeight: '700', fontSize: 13 }}>← Back to More Menu</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Sales Competitions & Rewards</Text>
        <Text style={styles.headerSub}>
          {currentUserName} • Live Incentive Challenges
        </Text>
      </View>

      {/* Intro Banner */}
      <View style={styles.bannerBox}>
        <Text style={styles.bannerTitle}>🏆 Field Force Incentive System</Text>
        <Text style={styles.bannerText}>
          All sales numbers are computed automatically from verified, completed doctor calls. Reach your target before the period ends to unlock cash rewards!
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ padding: 40 }} color="#1A3C6E" />
      ) : competitions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active sales competitions for your territory currently.</Text>
        </View>
      ) : (
        competitions.map((comp) => {
          const progressPercent = Math.min(
            100,
            Math.round((comp.achieved_quantity / comp.target_quantity) * 100),
          );

          return (
            <View key={comp.id} style={styles.compCard}>
              {/* Top row: Title and HQ */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.compTitle}>{comp.name}</Text>
                  <Text style={styles.compHq}>
                    HQ: {comp.hq_name} • Product: {comp.medicine_name}
                  </Text>
                </View>

                {/* Reward Pill */}
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillLabel}>REWARD</Text>
                  <Text style={styles.rewardPillAmount}>₹{comp.reward_amount.toLocaleString()}</Text>
                </View>
              </View>

              {comp.description ? (
                <Text style={styles.compDesc}>{comp.description}</Text>
              ) : null}

              {/* Validity Dates */}
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>
                  Valid: {formatDateDDMMYYYY(comp.start_date)} to {formatDateDDMMYYYY(comp.end_date)}
                </Text>
                <Text style={{ fontSize: 10, color: '#64748B' }}>
                  Orders tracked: {comp.supporting_orders_count} calls
                </Text>
              </View>

              {/* Progress Bar Container */}
              <View style={styles.progressSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.progressLabel}>
                    Target: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{comp.target_quantity} units</Text>
                  </Text>
                  <Text style={styles.progressLabel}>
                    Your Sales: <Text style={{ fontWeight: '800', color: '#0F8B5A' }}>{comp.achieved_quantity} units</Text>
                  </Text>
                </View>

                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: comp.is_eligible ? '#0F8B5A' : '#1A3C6E',
                      },
                    ]}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                    {progressPercent}% Complete
                  </Text>
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '700',
                      color: comp.remaining_quantity === 0 ? '#0F8B5A' : '#D97706',
                    }}
                  >
                    {comp.remaining_quantity === 0
                      ? 'Target Achieved! ✓'
                      : `${comp.remaining_quantity} units remaining`}
                  </Text>
                </View>
              </View>

              {/* Automatic Eligibility & Action Button (§31 & §33) */}
              <View style={styles.actionSection}>
                {comp.claim_status === 'APPLIED' || comp.claim_status === 'UNDER_REVIEW' ? (
                  <View style={styles.appliedBanner}>
                    <Text style={styles.appliedBannerTitle}>⏳ Claim Submitted (Under Review)</Text>
                    <Text style={styles.appliedBannerSub}>
                      Your claim for ₹{comp.reward_amount.toLocaleString()} is being verified by admin against your call logs.
                    </Text>
                  </View>
                ) : comp.claim_status === 'APPROVED' ? (
                  <View style={styles.approvedBanner}>
                    <Text style={styles.approvedBannerTitle}>🎉 Claim Approved!</Text>
                    <Text style={styles.approvedBannerSub}>
                      Incentive of ₹{comp.reward_amount.toLocaleString()} has been approved for disbursement.
                    </Text>
                  </View>
                ) : comp.claim_status === 'PAID' ? (
                  <View style={styles.paidBanner}>
                    <Text style={styles.paidBannerTitle}>💰 Reward Paid &amp; Settled!</Text>
                    <Text style={styles.paidBannerSub}>
                      ₹{comp.reward_amount.toLocaleString()} transferred to your account.
                    </Text>
                  </View>
                ) : comp.is_eligible ? (
                  <View style={styles.eligibleBox}>
                    <View style={styles.eligibleBadge}>
                      <Text style={styles.eligibleBadgeText}>✨ Target Achieved • Eligible for Reward!</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.claimBtn, claimingCompId === comp.id && { opacity: 0.7 }]}
                      onPress={() => handleClaimReward(comp)}
                      disabled={claimingCompId === comp.id}
                    >
                      {claimingCompId === comp.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.claimBtnText}>
                          🎁 Apply / Claim Reward (₹{comp.reward_amount.toLocaleString()})
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.inProgressBox}>
                    <Text style={styles.inProgressText}>
                      Sell {comp.remaining_quantity} more units to unlock your ₹{comp.reward_amount.toLocaleString()} reward!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { backgroundColor: '#1A3C6E', padding: 16 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  bannerBox: {
    backgroundColor: '#EFF6FF',
    margin: 12,
    marginBottom: 0,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerTitle: { fontSize: 12, fontWeight: '800', color: '#1E40AF', marginBottom: 2 },
  bannerText: { fontSize: 11, color: '#1E3A8A', lineHeight: 15 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, color: '#64748B' },
  compCard: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  compTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  compHq: { fontSize: 11, fontWeight: '600', color: '#1A3C6E', marginTop: 2 },
  rewardPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  rewardPillLabel: { fontSize: 8.5, fontWeight: '800', color: '#B45309' },
  rewardPillAmount: { fontSize: 13, fontWeight: '900', color: '#B45309' },
  compDesc: { fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 15 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: { fontSize: 10.5, color: '#64748B', fontWeight: '600' },
  progressSection: { marginTop: 10 },
  progressLabel: { fontSize: 11, color: '#475569' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  actionSection: { marginTop: 12 },
  eligibleBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  eligibleBadge: { marginBottom: 6 },
  eligibleBadgeText: { fontSize: 11.5, fontWeight: '800', color: '#15803D' },
  claimBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  claimBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 },
  inProgressBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  inProgressText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  appliedBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
  },
  appliedBannerTitle: { fontSize: 12, fontWeight: '800', color: '#B45309' },
  appliedBannerSub: { fontSize: 10.5, color: '#92400E', marginTop: 2 },
  approvedBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 10,
  },
  approvedBannerTitle: { fontSize: 12, fontWeight: '800', color: '#15803D' },
  approvedBannerSub: { fontSize: 10.5, color: '#166534', marginTop: 2 },
  paidBanner: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 8,
    padding: 10,
  },
  paidBannerTitle: { fontSize: 12, fontWeight: '800', color: '#6D28D9' },
  paidBannerSub: { fontSize: 10.5, color: '#5B21B6', marginTop: 2 },
});
