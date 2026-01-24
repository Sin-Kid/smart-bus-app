import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';
import { useFocusEffect } from '@react-navigation/native';

export default function TripsScreen({ cardId }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'others'

  const fetchTrips = async () => {
    try {
      if (!cardId) return;
      const { data, error } = await supabase
        .from('trips')
        .select(`
                    *,
                    bus:buses(name, current_location_name)
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

  const getFilteredTrips = () => {
    if (activeTab === 'active') {
      return trips.filter(t => t.status === 'ongoing');
    } else if (activeTab === 'completed') {
      return trips.filter(t => t.status === 'finished' || t.status === 'completed');
    } else {
      return []; // 'Others' tab placeholder
    }
  };

  const renderItem = ({ item }) => {
    const isOngoing = item.status === 'ongoing';

    return (
      <View style={styles.card}>
        {/* Top Row: Logo & Button */}
        <View style={styles.cardHeader}>
          <View style={styles.logoContainer}>
            <Ionicons name="bus" size={24} color="#7E22CE" />
            <Text style={styles.busName}>{item.bus?.name || 'SmartBus'}</Text>
          </View>
          <TouchableOpacity style={styles.viewTicketBtn}>
            <Text style={styles.viewTicketText}>View Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineContainer}>
          {/* Left Graphics (Dots & Line) */}
          <View style={styles.timelineGraphics}>
            <View style={[styles.dot, { borderColor: '#16A34A' }]} />
            <View style={styles.line} />
            <View style={[styles.dot, { borderColor: '#16A34A' }]} />
          </View>

          {/* Right Text Content */}
          <View style={styles.timelineContent}>
            {/* Start Node */}
            <View style={styles.nodeBox}>
              <Text style={styles.nodeTitle}>{item.start_stop_name || 'Boarding Point'}</Text>
              <Text style={styles.nodeSubtitle}>Started at {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>

            <View style={{ height: 20 }} />

            {/* End Node */}
            <View style={styles.nodeBox}>
              <Text style={[styles.nodeTitle, isOngoing && { color: '#059669' }]}>
                {isOngoing ? 'Trip in Progress' : (item.end_stop_name || 'Destination')}
              </Text>

              {isOngoing ? (
                <View>
                  <Text style={styles.liveTag}>LIVE</Text>
                  <Text style={[styles.nodeSubtitle, { marginTop: 4, fontWeight: 'bold', color: '#059669' }]}>
                    Fare Deducted: ₹50
                  </Text>
                </View>
              ) : (
                <Text style={styles.nodeSubtitle}>Ticket Cost: ₹{item.fare || 50}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Footer info (optional expander) */}
        {!isOngoing && (
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>Completed • ₹{item.fare}.0</Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My SmartBus Tickets</Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading && !refreshing}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['active', 'completed', 'others'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#0BA360" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={getFilteredTrips()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0BA360']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bus-outline" size={60} color="#E5E7EB" />
              <Text style={styles.emptyText}>No {activeTab} trips found.</Text>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#0BA360', // SmartBus Green
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: '#0BA360'
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280'
  },
  activeTabText: {
    color: '#0BA360'
  },
  listContent: {
    padding: 16
  },
  card: {
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  busName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    width: 140
  },
  viewTicketBtn: {
    backgroundColor: '#0BA360',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  viewTicketText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  timelineContainer: {
    flexDirection: 'row',
    marginBottom: 12
  },
  timelineGraphics: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
    marginRight: 12
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: 'white'
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: 4,
    borderStyle: 'dashed', // Note: borderStyle dashed only works with borderWidth on RN
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'space-between'
  },
  nodeBox: {
    minHeight: 40,
    justifyContent: 'center'
  },
  nodeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827'
  },
  nodeSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  liveTag: {
    fontSize: 10,
    color: '#059669',
    fontWeight: 'bold',
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 4
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 10
  }
});
