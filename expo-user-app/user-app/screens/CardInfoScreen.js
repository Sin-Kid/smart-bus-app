import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function CardInfoScreen({ cardId, navigation }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* New State for Add Card Form */
  const [showAddCard, setShowAddCard] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCardInfo = async () => {
    try {
      // Only show full loading spinner on initial load if no card data exists
      if (!card) setLoading(true);

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) {
        setCard(null);
      } else {
        setCard(data);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCardInfo();
    }, [cardId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCardInfo();
  }

  const handleCreateCard = async () => {
    if (!newName.trim()) {
      alert('Please enter your name');
      return;
    }

    const finalCardNum = newCardNumber || Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('cards')
        .insert([{
          id: cardId,
          name: newName,
          card_number: finalCardNum,
          balance: 0,
          created_at: new Date()
        }]);

      if (error) throw error;
      alert('Card Issued Successfully!');
      setShowAddCard(false);
      fetchCardInfo();

    } catch (err) {
      console.error('Error creating card:', err);
      alert('Failed to issue card. ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2f6bb1" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Smart Card</Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading && !refreshing}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2f6bb1']} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#2f6bb1" style={{ marginTop: 50 }} />
        ) : card ? (
          <>
            {/* Card Visualization */}
            <View style={styles.cardVisual}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>SMART BUS PASS</Text>

                {/* Top Up Button (Was Reload) */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('TopUp', { cardId: card.id, currentBalance: card.balance })}
                  style={{ zIndex: 10 }}
                >
                  <View style={styles.reloadBadge}>
                    <Ionicons name="wallet" size={14} color="white" style={{ marginRight: 4 }} />
                    <Text style={styles.reloadText}>TOP UP</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceAmount}>₹ {card.balance?.toFixed(2)}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.cardHolderLabel}>Card Holder</Text>
                  <Text style={styles.cardHolderName}>{card.name || `User #${card.id.substring(0, 4)}`}</Text>
                </View>
                <View style={styles.liveTagContainer}>
                  <Text style={styles.liveTagText}>ACTIVE</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('TopUp', { cardId: card.id, currentBalance: card.balance })}
              >
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="add-circle" size={24} color="#0284C7" />
                </View>
                <Text style={styles.actionText}>Add Money</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('CardHistory', { cardId: card.id })}
              >
                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="time" size={24} color="#166534" />
                </View>
                <Text style={styles.actionText}>History</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="lock-closed" size={24} color="#DC2626" />
                </View>
                <Text style={styles.actionText}>Block Card</Text>
              </TouchableOpacity>
            </View>

            {/* Info List */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Card Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Card Number</Text>
                <Text style={styles.infoValue}>{card.card_number || '**** **** **** ' + card.id.substring(0, 4)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Issued Date</Text>
                <Text style={styles.infoValue}>{new Date(card.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>{card.card_type || 'Standard'}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            {!showAddCard ? (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={80} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Card Linked</Text>
                <Text style={styles.emptyDesc}>Link your smart card to manage balance and view trips.</Text>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowAddCard(true)}>
                  <Text style={styles.btnText}>Issue / Link Card</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formCard}>
                <TouchableOpacity onPress={() => setShowAddCard(false)} style={{ marginBottom: 15 }}>
                  <Ionicons name="arrow-back" size={24} color="#4B5563" />
                </TouchableOpacity>
                <Text style={styles.formTitle}>Issue New Smart Card</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Enter your full name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Custom Card Number (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={newCardNumber}
                    onChangeText={setNewCardNumber}
                    placeholder="Leave empty to auto-generate"
                    keyboardType="number-pad"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleCreateCard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.btnText}>Issue Card Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2f6bb1',
    padding: 20,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  cardVisual: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    height: 200,
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontSize: 12,
  },
  reloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  reloadText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10
  },
  balanceContainer: {
    marginVertical: 10,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  cardHolderLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textTransform: 'uppercase'
  },
  cardHolderName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  liveTagContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)', // Green tint
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveTagText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%'
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  actionText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500'
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  infoLabel: {
    color: '#6B7280',
    fontSize: 14
  },
  infoValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 20
  },
  emptyDesc: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20
  },
  primaryBtn: {
    backgroundColor: '#2f6bb1',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 2
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    margin: 10
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1E293B'
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500'
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B'
  }
});
