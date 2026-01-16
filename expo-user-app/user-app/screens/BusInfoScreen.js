// screens/BusInfoScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function BusInfoScreen({ route, navigation }) {
  const { route: routeData, buses } = route.params || {};
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [routeData]);

  const fetchSchedule = async () => {
    if (!routeData?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bus_schedules')
        .select('*')
        .eq('route_id', routeData.id)
        .eq('status', 'active')
        .order('departure_time', { ascending: true })
        .limit(1);

      if (error) throw error;
      setSchedule(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    // If it's already in HH:MM format, return as is
    if (typeof timeString === 'string' && timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    return '--:--';
  };

  const stops = routeData?.stops || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0BA360" />
        <Text style={styles.loadingText}>Loading bus information...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{routeData?.name || 'Bus Route'}</Text>
          <Text style={styles.headerSubtitle}>
            {routeData?.source || 'Source'} → {routeData?.destination || 'Destination'}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {/* Top Left: Arrival Time */}
        <View style={[styles.gridItem, styles.gridItemTopLeft]}>
          <View style={styles.gridItemHeader}>
            <Ionicons name="time" size={24} color="#0BA360" />
            <Text style={styles.gridItemTitle}>Arrival Time</Text>
          </View>
          <Text style={styles.timeValue}>
            {schedule ? formatTime(schedule.arrival_time) : '--:--'}
          </Text>
          <Text style={styles.gridItemSubtext}>24-hour format</Text>
        </View>

        {/* Top Right: Stops */}
        <View style={[styles.gridItem, styles.gridItemTopRight]}>
          <View style={styles.gridItemHeader}>
            <Ionicons name="location" size={24} color="#0BA360" />
            <Text style={styles.gridItemTitle}>Stops</Text>
          </View>
          <ScrollView style={styles.stopsList} nestedScrollEnabled>
            {stops.length > 0 ? (
              stops
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((stop, index) => (
                  <View key={stop.id || index} style={styles.stopItem}>
                    <View style={styles.stopDot} />
                    <Text style={styles.stopName} numberOfLines={1}>
                      {stop.name || `Stop ${index + 1}`}
                    </Text>
                  </View>
                ))
            ) : (
              <Text style={styles.noStopsText}>No stops available</Text>
            )}
          </ScrollView>
        </View>

        {/* Bottom Left: Prediction Table */}
        <View style={[styles.gridItem, styles.gridItemBottomLeft]}>
          <View style={styles.gridItemHeader}>
            <Ionicons name="analytics" size={24} color="#0BA360" />
            <Text style={styles.gridItemTitle}>Prediction</Text>
          </View>
          <View style={styles.predictionContainer}>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Bus Available:</Text>
              <View style={styles.predictionBadge}>
                <View style={[styles.predictionDot, styles.predictionDotPending]} />
                <Text style={styles.predictionText}>To be connected</Text>
              </View>
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Estimated Wait:</Text>
              <Text style={styles.predictionValue}>-- min</Text>
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Next Bus:</Text>
              <Text style={styles.predictionValue}>--</Text>
            </View>
          </View>
        </View>

        {/* Bottom Right: Departure Time */}
        <View style={[styles.gridItem, styles.gridItemBottomRight]}>
          <View style={styles.gridItemHeader}>
            <Ionicons name="calendar" size={24} color="#0BA360" />
            <Text style={styles.gridItemTitle}>Departure</Text>
          </View>
          <Text style={styles.timeValue}>
            {schedule ? formatTime(schedule.departure_time) : '--:--'}
          </Text>
          <Text style={styles.gridItemSubtext}>24-hour format</Text>
          {schedule?.fare && (
            <View style={styles.fareBadge}>
              <Text style={styles.fareText}>₹{schedule.fare}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bus Info Card */}
      {buses.length > 0 && (
        <View style={styles.busInfoCard}>
          <Text style={styles.busInfoTitle}>Available Buses</Text>
          {buses.map((bus) => (
            <View key={bus.id} style={styles.busItem}>
              <Ionicons name="bus" size={20} color="#0BA360" />
              <Text style={styles.busName}>{bus.name || bus.id}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    backgroundColor: '#0BA360',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 180,
  },
  gridItemTopLeft: {},
  gridItemTopRight: {},
  gridItemBottomLeft: {},
  gridItemBottomRight: {},
  gridItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  gridItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0BA360',
    marginBottom: 4,
  },
  gridItemSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  stopsList: {
    maxHeight: 120,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0BA360',
    marginRight: 10,
  },
  stopName: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  noStopsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  predictionContainer: {
    gap: 12,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  predictionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  predictionDotPending: {
    backgroundColor: '#F59E0B',
  },
  predictionText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  fareBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  fareText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0BA360',
  },
  busInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  busInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  busItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  busName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
});

