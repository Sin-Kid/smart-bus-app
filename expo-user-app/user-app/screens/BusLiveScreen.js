// screens/BusLiveScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';
import { MapView, Marker } from '../utils/maps';

export default function BusLiveScreen() {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // Load all buses
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return;
    }
    
    const fetchBuses = async () => {
      const { data, error } = await supabase.from('buses').select('*');
      if (error) {
        console.error('Error loading buses:', error);
        return;
      }
      setBuses(data || []);
      if (!selectedBusId && data && data.length) setSelectedBusId(data[0].id);
    };
    
    fetchBuses();
    
    const subscription = supabase
      .channel('buses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, () => {
        fetchBuses();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Listen to latest telemetry for selected bus
  useEffect(() => {
    if (!selectedBusId || !supabase) return;
    setLoadingTelemetry(true);

    const fetchLatestTelemetry = async () => {
      const { data, error } = await supabase
        .from('telemetry')
        .select('*')
        .eq('bus_id', selectedBusId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.log('telemetry err', error);
        }
        setLatestTelemetry(null);
      } else {
        setLatestTelemetry(data);
      }
      setLoadingTelemetry(false);
    };

    fetchLatestTelemetry();

    const subscription = supabase
      .channel(`telemetry_${selectedBusId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'telemetry',
        filter: `bus_id=eq.${selectedBusId}`
      }, () => {
        fetchLatestTelemetry();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedBusId]);

  const renderBusItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.busItem,
        item.id === selectedBusId && styles.busItemSelected,
      ]}
      onPress={() => setSelectedBusId(item.id)}
    >
      <Text style={styles.busName}>{item.name || item.id}</Text>
      <Text style={styles.busSub}>
        {item.routeName || item.description || 'Tap to view live status'}
      </Text>
    </TouchableOpacity>
  );

  const tsText = latestTelemetry?.timestamp
    ? new Date(latestTelemetry.timestamp).toLocaleString()
    : '-';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Bus Tracking</Text>
        <Text style={styles.subtitle}>Real-time bus location and status</Text>
      </View>

      {buses.length > 0 ? (
        <>
      <View style={styles.listContainer}>
            <Text style={styles.sectionLabel}>Select Bus</Text>
        <FlatList
          data={buses}
          keyExtractor={(item) => item.id}
          renderItem={renderBusItem}
          horizontal
          showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
        />
      </View>

      <View style={styles.card}>
        {loadingTelemetry ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0BA360" />
                <Text style={styles.loadingText}>Loading bus data...</Text>
              </View>
        ) : latestTelemetry ? (
          <>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Bus {selectedBusId}</Text>
                    <Text style={styles.routeName}>
                      {buses.find(b => b.id === selectedBusId)?.routeName || 'Route information'}
            </Text>
                  </View>
                  <View style={styles.statusIndicator}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Live</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <Ionicons name="time-outline" size={20} color="#6B7280" />
                    <Text style={styles.infoLabel}>Last Update</Text>
                    <Text style={styles.infoValue}>{tsText}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Ionicons name="speedometer-outline" size={20} color="#6B7280" />
                    <Text style={styles.infoLabel}>Speed</Text>
                    <Text style={styles.infoValue}>{latestTelemetry.speed ?? '—'} km/h</Text>
                  </View>
                </View>

            {((latestTelemetry.location?.lat || latestTelemetry.lat) && (latestTelemetry.location?.lon || latestTelemetry.lon)) && (
              <View style={styles.mapContainer}>
                    <Text style={styles.mapLabel}>Current Location</Text>
                    {Platform.OS === 'web' ? (
                      <View style={styles.webMapFallback}>
                        <Ionicons name="location" size={48} color="#0BA360" />
                        <Text style={styles.coordinatesText}>
                          {(latestTelemetry.location?.lat || latestTelemetry.lat).toFixed(6)}, {(latestTelemetry.location?.lon || latestTelemetry.lon).toFixed(6)}
                        </Text>
                        <TouchableOpacity
                          style={styles.mapLinkButton}
                          onPress={() => {
                            const lat = latestTelemetry.location?.lat || latestTelemetry.lat;
                            const lon = latestTelemetry.location?.lon || latestTelemetry.lon;
                            const url = `https://www.google.com/maps?q=${lat},${lon}`;
                            Linking.openURL(url);
                          }}
                        >
                          <Ionicons name="open-outline" size={16} color="#0BA360" />
                          <Text style={styles.mapLinkText}>Open in Google Maps</Text>
                        </TouchableOpacity>
                      </View>
                    ) : MapView ? (
                <MapView
                        style={styles.map}
                  initialRegion={{
                    latitude: latestTelemetry.location?.lat || latestTelemetry.lat,
                    longitude: latestTelemetry.location?.lon || latestTelemetry.lon,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  region={{
                    latitude: latestTelemetry.location?.lat || latestTelemetry.lat,
                    longitude: latestTelemetry.location?.lon || latestTelemetry.lon,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                        {Marker && (
                  <Marker
                    coordinate={{
                      latitude: latestTelemetry.location?.lat || latestTelemetry.lat,
                      longitude: latestTelemetry.location?.lon || latestTelemetry.lon,
                    }}
                    title={`Bus ${selectedBusId}`}
                    description={`Speed: ${latestTelemetry.speed ?? '—'} km/h`}
                  />
                        )}
                </MapView>
                    ) : (
                      <View style={styles.webMapFallback}>
                        <Ionicons name="location" size={48} color="#0BA360" />
                        <Text style={styles.coordinatesText}>
                          {(latestTelemetry.location?.lat || latestTelemetry.lat).toFixed(6)}, {(latestTelemetry.location?.lon || latestTelemetry.lon).toFixed(6)}
                        </Text>
                      </View>
                    )}
              </View>
            )}
          </>
        ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="bus-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No telemetry data available</Text>
                <Text style={styles.emptySubtext}>Waiting for bus to send location updates...</Text>
              </View>
        )}
      </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="bus-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No buses available</Text>
          <Text style={styles.emptySubtext}>Check back later for live bus tracking</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    padding: 16,
        paddingTop: 40,
        backgroundColor: '#F3F4F6',
      },
  header: {
    marginBottom: 20,
  },
      title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
        color: '#111827',
      },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  listContent: {
    paddingRight: 8,
  },
  busItem: {
        backgroundColor: 'white',
    padding: 14,
    marginRight: 10,
    borderRadius: 14,
    minWidth: 150,
        shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    elevation: 2,
      },
      busItemSelected: {
        borderWidth: 2,
        borderColor: '#0BA360',
    backgroundColor: '#F0FDF4',
      },      
      busName: {
     fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
    color: '#111827',
      },
  busSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  routeName: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0BA360',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  mapContainer: {
    marginTop: 8,
  },
  mapLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  map: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  webMapFallback: {
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 12,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  mapLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0BA360',
    gap: 6,
    marginTop: 8,
  },
  mapLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0BA360',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
