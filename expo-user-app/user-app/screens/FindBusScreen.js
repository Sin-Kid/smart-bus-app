// screens/FindBusScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function FindBusScreen({ navigation }) {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [allStops, setAllStops] = useState([]);
  const [busesLive, setBusesLive] = useState([]);

  // Autocomplete State
  const [showDropdown, setShowDropdown] = useState(null); // 'source' or 'destination' or null
  const [filteredStops, setFilteredStops] = useState([]);

  useEffect(() => {
    fetchStops();
    fetchLiveBuses();

    const sub = supabase
      .channel('find_buses_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, fetchLiveBuses)
      .subscribe();
    return () => sub.unsubscribe();
  }, []);

  const fetchLiveBuses = async () => {
    const { data } = await supabase
      .from('buses')
      .select('id, name, sim_occupied, capacity, sim_leaving, current_location_name, status_message')
      .order('name');
    setBusesLive(data || []);
  };

  const fetchStops = async () => {
    try {
      // 1. Fetch unique stop names from bus_stops
      const { data: stopsData, error: stopsError } = await supabase
        .from('bus_stops')
        .select('name');

      if (stopsError) throw stopsError;

      // 2. Fetch unique source/destination from bus_routes (to ensure start/end points are included)
      const { data: routesData, error: routesError } = await supabase
        .from('bus_routes')
        .select('source, destination');

      if (routesError) throw routesError;

      // Merge and Unique
      const allNames = new Set();
      stopsData?.forEach(s => s.name && allNames.add(s.name));
      routesData?.forEach(r => {
        if (r.source) allNames.add(r.source);
        if (r.destination) allNames.add(r.destination);
      });

      const uniqueNames = [...allNames].sort();
      setAllStops(uniqueNames);
    } catch (err) {
      console.error('Error fetching stops:', err);
    }
  };

  const handleInputChange = (text, type) => {
    if (type === 'source') setSource(text);
    if (type === 'destination') setDestination(text);

    if (text.length > 0) {
      const filtered = allStops.filter(stop =>
        stop.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStops(filtered);
      setShowDropdown(type);
    } else {
      setShowDropdown(null);
    }
  };

  const selectStop = (stopName) => {
    if (showDropdown === 'source') setSource(stopName);
    if (showDropdown === 'destination') setDestination(stopName);
    setShowDropdown(null);
  };

  // Swap source and destination
  const handleSwap = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const handleSearch = () => {
    if (!source.trim() || !destination.trim()) {
      alert('Please enter both Source and Destination');
      return;
    }

    if (source.trim().toLowerCase() === destination.trim().toLowerCase()) {
      alert('Source and Destination cannot be the same');
      return;
    }

    // Navigate to Bus List with search params
    navigation.navigate('BusList', {
      source: source.trim(),
      destination: destination.trim()
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2f6bb1" barStyle="light-content" />

      {/* Blue Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Where is My Bus</Text>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Main Content */}
        <View style={styles.content}>

          {/* Search Card */}
          <View style={styles.searchCard}>

            {/* Source Input */}
            <View style={styles.inputContainer}>
              <View style={styles.connectorLine}>
                <View style={styles.dotCircle} />
                <View style={styles.verticalLine} />
                <View style={styles.dotCircle} />
              </View>

              <View style={styles.inputsWrapper}>
                {/* Source Input Row */}
                <View style={[styles.inputRow, { zIndex: showDropdown === 'source' ? 2000 : 1 }]}>
                  <Text style={styles.inputLabel}>From</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Source Station"
                    value={source}
                    onChangeText={(t) => handleInputChange(t, 'source')}
                    onFocus={() => {
                      setFilteredStops(allStops);
                      setShowDropdown('source');
                    }}
                  />
                  {showDropdown === 'source' && (
                    <View style={styles.dropdown}>
                      <FlatList
                        data={filteredStops}
                        keyboardShouldPersistTaps='handled'
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity style={styles.dropdownItem} onPress={() => selectStop(item)}>
                            <Text>{item}</Text>
                          </TouchableOpacity>
                        )}
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                {/* Destination Input Row */}
                <View style={[styles.inputRow, { zIndex: showDropdown === 'destination' ? 2000 : 1 }]}>
                  <Text style={styles.inputLabel}>To</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Destination Station"
                    value={destination}
                    onChangeText={(t) => handleInputChange(t, 'destination')}
                    onFocus={() => {
                      setFilteredStops(allStops);
                      setShowDropdown('destination');
                    }}
                  />
                  {showDropdown === 'destination' && (
                    <View style={styles.dropdown}>
                      <FlatList
                        data={filteredStops}
                        keyboardShouldPersistTaps='handled'
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity style={styles.dropdownItem} onPress={() => selectStop(item)}>
                            <Text>{item}</Text>
                          </TouchableOpacity>
                        )}
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* Swap Button */}
              <TouchableOpacity style={styles.swapButton} onPress={handleSwap} activeOpacity={0.8}>
                <Ionicons name="swap-vertical" size={24} color="#2f6bb1" />
              </TouchableOpacity>
            </View>

            {/* Find Button */}
            <TouchableOpacity style={styles.findButton} onPress={handleSearch} activeOpacity={0.9}>
              <Text style={styles.findButtonText}>Find buses</Text>
            </TouchableOpacity>

          </View>

          {/* ── Live Fleet Occupancy ─────────────────────────── */}
          {busesLive.length > 0 && (
            <View style={styles.fleetSection}>
              <Text style={styles.fleetTitle}>🚌 Live Fleet Occupancy</Text>
              {busesLive.map((bus) => {
                const pct = bus.capacity > 0 ? Math.round((bus.sim_occupied / bus.capacity) * 100) : 0;
                const isHigh   = pct >= 85;
                const isMid    = pct >= 60 && pct < 85;
                const barColor = isHigh ? '#ef4444' : isMid ? '#f59e0b' : '#10b981';
                const bgColor  = isHigh ? '#fee2e2' : isMid ? '#fef3c7' : '#dcfce7';
                const label    = isHigh ? 'Packed' : isMid ? 'Moderate' : 'Spacious';
                const txtColor = isHigh ? '#991b1b' : isMid ? '#92400e' : '#065f46';

                return (
                  <View key={bus.id} style={styles.busCard}>
                    <View style={styles.busCardLeft}>
                      <Text style={styles.busCardName}>{bus.name}</Text>
                      {bus.current_location_name ? (
                        <Text style={styles.busCardLoc}>📍 {bus.current_location_name}</Text>
                      ) : null}
                      {/* Progress bar */}
                      <View style={styles.busOccBar}>
                        <View style={[styles.busOccFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={styles.busOccDetail}>
                        {bus.sim_occupied}/{bus.capacity} pax · ~{bus.sim_leaving} leaving next stop
                      </Text>
                    </View>
                    <View style={[styles.occPill, { backgroundColor: bgColor }]}>
                      <Text style={[styles.occPillText, { color: txtColor }]}>{label}</Text>
                      <Text style={[styles.occPillPct, { color: txtColor }]}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Click outside to close dropdown */}
          {showDropdown && (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setShowDropdown(null)}
            />
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2f6bb1',
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
    flex: 1,
    zIndex: 1,
  },
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 4,
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 15,
    zIndex: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    zIndex: 3,
  },
  connectorLine: {
    alignItems: 'center',
    marginRight: 10,
    height: 80, // Approximate height to span both inputs
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  dotCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#999',
    backgroundColor: 'white',
  },
  verticalLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#ccc',
    marginVertical: 2,
    borderStyle: 'dotted', // Dotted line effect (requires workaround in some RN versions, simply gray line here)
  },
  inputsWrapper: {
    flex: 1,
    zIndex: 4,
  },
  inputRow: {
    paddingVertical: 10,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#000',
    padding: 0,
    fontWeight: '500',
    height: 30, // Fixed height for input area
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 5,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowOffset: { width: 0, height: 2 },
    zIndex: 1000, // Very high z-index
    elevation: 10,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  swapButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -20, // Half of height
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8, // Increased elevation
    shadowColor: '#000',
    shadowOpacity: 0.3, // Darker shadow for visibility
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#d1d5db',
    zIndex: 9000, // Extremely high Z to ensure top
  },
  findButton: {
    backgroundColor: '#239d54', // Green button color
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    zIndex: 1,
  },
  findButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ── Fleet Occupancy Section ───────────────────────────────────────
  fleetSection: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  fleetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 12,
  },
  busCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  busCardLeft: { flex: 1 },
  busCardName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  busCardLoc: { fontSize: 11, color: '#6b7280', marginBottom: 5 },
  busOccBar: {
    height: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 3,
  },
  busOccFill: { height: '100%', borderRadius: 3 },
  busOccDetail: { fontSize: 10, color: '#9ca3af' },
  occPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 70,
  },
  occPillText: { fontSize: 11, fontWeight: '700' },
  occPillPct: { fontSize: 13, fontWeight: '800', marginTop: 1 },
});

