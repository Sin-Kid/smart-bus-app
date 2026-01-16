import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';
import { useFocusEffect } from '@react-navigation/native';

export default function TripsScreen({ cardId }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = async () => {
    try {
      if (!cardId) return;
      const { data, error } = await supabase
        .from('trips')
        .select(`
                    *,
                    bus:buses(name)
                `)
        .eq('card_id', cardId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching trips:', error);
      } else {
        setTrips(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTrips();
    }, [cardId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const renderItem = ({ item }) => {
    const isOngoing = item.status === 'ongoing';
    const date = new Date(item.start_time).toLocaleDateString();
    const time = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.busInfo}>
            <View style={[styles.iconBox, { backgroundColor: isOngoing ? '#DCFCE7' : '#E0F2FE' }]}>
              <Ionicons name="bus" size={20} color={isOngoing ? '#166534' : '#0284C7'} />
            </View>
            <View>
              <Text style={styles.busName}>{item.bus?.name || 'Bus'}</Text>
              <Text style={styles.date}>{date} • {time}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: isOngoing ? '#166534' : '#64748B' }]}>
              {isOngoing ? 'ON BOARD' : 'COMPLETED'}
            </Text>
          </View>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.pointsLabel}>
            Fare: <Text style={styles.fareValue}>₹{item.fare || (isOngoing ? '-' : '0')}</Text>
          </Text>
          {item.end_time && (
            <Text style={styles.duration}>
              Duration: {Math.round((new Date(item.end_time) - new Date(item.start_time)) / 60000)} min
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading && !refreshing}>
          <Ionicons name="refresh" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#0BA360" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0BA360']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bus-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No trips taken yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827'
  },
  listContent: {
    padding: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  busName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  date: {
    fontSize: 12,
    color: '#6B7280'
  },
  statusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  pointsLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  fareValue: {
    fontWeight: '700',
    color: '#111827'
  },
  duration: {
    fontSize: 12,
    color: '#94A3B8'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  emptyText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 16
  }
});
