import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { sqliteQueue } from '../services/sqliteQueue';

export const ExpensesScreen: React.FC = () => {
  const [category, setCategory] = useState<'TA_DA' | 'FOOD' | 'ACCOMMODATION' | 'CONVEYANCE'>('CONVEYANCE');
  const [amount, setAmount] = useState<string>('350');
  const [receiptAttached, setReceiptAttached] = useState<boolean>(true);

  const handleAddExpense = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }

    await sqliteQueue.enqueueDraft('expense_drafts', {
      category,
      amount: numAmount,
      receipt_file_key: receiptAttached ? 'receipt_capture_01.jpg' : undefined,
      created_at: new Date().toISOString(),
    });

    Alert.alert('Expense Queued', 'Expense claim saved to local SQLite queue. Syncs automatically.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Field Expenses Claim</Text>
        <Text style={styles.headerSub}>Submit travel, daily allowance, and conveyance expenses</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Select Expense Category:</Text>
        <View style={styles.categoryRow}>
          {(['CONVEYANCE', 'TA_DA', 'FOOD', 'ACCOMMODATION'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat.replace('_', '/')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Claim Amount (₹):</Text>
        <TextInput
          style={styles.amountInput}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>Receipt Voucher / Fuel Slip:</Text>
        <TouchableOpacity
          style={styles.receiptBox}
          onPress={() => setReceiptAttached(!receiptAttached)}
        >
          <Text style={{ fontSize: 13, color: receiptAttached ? '#0F8B5A' : '#64748B', fontWeight: '600' }}>
            {receiptAttached ? 'Receipt Voucher Attached (receipt_01.jpg)' : 'Tap to Attach Receipt Photo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleAddExpense}>
          <Text style={styles.submitBtnText}>Add Expense (Offline Queue)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA', padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A3C6E' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 8, marginTop: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  categoryBtnActive: { backgroundColor: '#1A3C6E', borderColor: '#1A3C6E' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  categoryTextActive: { color: '#FFFFFF' },
  amountInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: '#F8FAFC',
  },
  receiptBox: {
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    backgroundColor: '#0F8B5A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
