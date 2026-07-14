// screens/BusOccupancyScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  FlatList,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

// ─── Seat State Constants ─────────────────────────────────────────────────────
const SEAT = { FREE: 'free', OCCUPIED: 'occupied', LEAVING: 'leaving' };

const SEAT_STYLE = {
  [SEAT.FREE]:     { bg: '#d1fae5', border: '#34d399', text: '#065f46' },
  [SEAT.OCCUPIED]: { bg: '#fee2e2', border: '#f87171', text: '#991b1b' },
  [SEAT.LEAVING]:  { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
};

// ─── Build seat data array ────────────────────────────────────────────────────
function buildSeats(capacity, occupied, leaving) {
  const seats = [];
  const safeLeaving = Math.min(leaving || 0, occupied || 0);
  for (let i = 1; i <= capacity; i++) {
    if (i <= safeLeaving)         seats.push({ id: i, state: SEAT.LEAVING });
    else if (i <= occupied)        seats.push({ id: i, state: SEAT.OCCUPIED });
    else                           seats.push({ id: i, state: SEAT.FREE });
  }
  return seats;
}

// ─── Single Seat Cell ─────────────────────────────────────────────────────────
function SeatCell({ seat }) {
  const s = SEAT_STYLE[seat.state];
  return (
    <View style={[styles.seat, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={[styles.seatBack, { backgroundColor: s.border }]} />
      <Text style={[styles.seatNum, { color: s.text }]}>{seat.id}</Text>
    </View>
  );
}

// ─── Occupancy Color Helper ───────────────────────────────────────────────────
function occColor(occ, cap) {
  const pct = cap > 0 ? (occ / cap) * 100 : 0;
  if (pct >= 85) return { bar: '#ef4444', bg: '#fee2e2', text: '#991b1b', label: 'Packed' };
  if (pct >= 60) return { bar: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'Moderate' };
  return       { bar: '#10b981', bg: '#dcfce7', text: '#065f46', label: 'Spacious' };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BusOccupancyScreen({ route, navigation }) {
  const { busId, busName, routeId } = route.params || {};

  const [busData, setBusData] = useState(null);
  const [stops, setStops] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDiagram, setShowDiagram] = useState(false);

  // Pulse animation for "bus here" indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const standAnim1 = useRef(new Animated.Value(0)).current;
  const standAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();

    const loopSway1 = Animated.loop(
      Animated.sequence([
        Animated.timing(standAnim1, { toValue: -3, duration: 1000, useNativeDriver: true }),
        Animated.timing(standAnim1, { toValue: 0,  duration: 1000, useNativeDriver: true }),
      ])
    );
    loopSway1.start();

    let loopSway2;
    const t = setTimeout(() => {
      loopSway2 = Animated.loop(
        Animated.sequence([
          Animated.timing(standAnim2, { toValue: -3, duration: 1000, useNativeDriver: true }),
          Animated.timing(standAnim2, { toValue: 0,  duration: 1000, useNativeDriver: true }),
        ])
      );
      loopSway2.start();
    }, 500);

    return () => {
      loop.stop();
      loopSway1.stop();
      if (loopSway2) loopSway2.stop();
      clearTimeout(t);
    };
  }, []);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = async () => {
    if (!busId) return;
    try {
      // 1. Bus info
      const { data: bus } = await supabase
        .from('buses')
        .select('*')
        .eq('id', busId)
        .single();
      setBusData(bus);

      // 2. Active schedule → route
      const { data: sched } = await supabase
        .from('bus_schedules')
        .select('route_id, route:bus_routes(source, destination, name)')
        .eq('bus_id', busId)
        .eq('status', 'active')
        .limit(1)
        .single();

      const resolvedRouteId = routeId || sched?.route_id;
      if (resolvedRouteId) {
        setRouteInfo(sched?.route);
        const { data: stopsData } = await supabase
          .from('bus_stops')
          .select('*')
          .eq('route_id', resolvedRouteId)
          .order('order');
        setStops(stopsData || []);
      }
    } catch (e) {
      console.error('BusOccupancyScreen fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const sub = supabase
      .channel(`occupancy_${busId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'buses',
        filter: `id=eq.${busId}`,
      }, () => fetchData())
      .subscribe();

    return () => sub.unsubscribe();
  }, [busId]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const SEAT_CAP  = 52;
  const STAND_CAP = 15;
  const TOTAL_CAP = SEAT_CAP + STAND_CAP;  // 67

  const capacity  = SEAT_CAP;
  const occupied  = busData?.sim_occupied || 0;   // total passengers with tickets
  const leaving   = busData?.sim_leaving  || 0;

  // Seated = those who have a seat, Standing = overflow into the aisle
  const seated    = Math.min(occupied, SEAT_CAP);
  const standing  = Math.min(Math.max(0, occupied - SEAT_CAP), STAND_CAP);
  const freeSeats = SEAT_CAP - seated;
  const totalPct  = TOTAL_CAP > 0 ? Math.round((occupied / TOTAL_CAP) * 100) : 0;
  const seatPct   = SEAT_CAP > 0 ? Math.round((seated / SEAT_CAP) * 100) : 0;
  const standPct  = Math.round((standing / STAND_CAP) * 100);

  const color      = occColor(seated, SEAT_CAP);
  const standColor = standing >= STAND_CAP ? '#ef4444' : standing > 8 ? '#f59e0b' : '#8b5cf6';
  const currentStop = busData?.current_location_name;

  const standingLeaving = Math.min(leaving, standing);
  const seatedLeaving   = Math.max(0, leaving - standing);

  const seats = buildSeats(SEAT_CAP, seated, seatedLeaving);

  // Build rows of 4 (2 left | aisle | 2 right)
  const seatRows = [];
  for (let i = 0; i < seats.length; i += 4) seatRows.push(seats.slice(i, i + 4));

  // Build standing passengers states (determine which ones are leaving)
  const standingPaxStates = [];
  for (let i = 0; i < standing; i++) {
    standingPaxStates.push({ isLeaving: i < standingLeaving });
  }

  // Distribute standing passenger states across rows (staggered layout)
  const standingRows = Array.from({ length: seatRows.length }, () => []);
  let paxIdx = 0;
  // First pass: 1 per row
  for (let r = 0; r < seatRows.length && paxIdx < standing; r++) {
    standingRows[r].push(standingPaxStates[paxIdx++]);
  }
  // Second pass: double up from the middle
  if (paxIdx < standing) {
    for (let r2 = Math.floor(seatRows.length / 4); r2 < seatRows.length && paxIdx < standing; r2++) {
      standingRows[r2].push(standingPaxStates[paxIdx++]);
    }
  }

  // Build timeline nodes
  const allNodes = [
    ...(routeInfo?.source ? [{ id: 'src', name: routeInfo.source, arrival_time: stops[0]?.arrival_time, isEndpoint: true }] : []),
    ...stops,
    ...(routeInfo?.destination ? [{ id: 'dst', name: routeInfo.destination, arrival_time: '', isEndpoint: true }] : []),
  ];

  const currentIdx = currentStop
    ? allNodes.findIndex(n => n.name?.toLowerCase() === currentStop.toLowerCase())
    : -1;

  const getStopOcc = (idx) => {
    if (currentIdx < 0) return occupied;
    if (idx < currentIdx)  return Math.min(Math.round(occupied * (1 + (currentIdx - idx) * 0.08)), capacity);
    if (idx === currentIdx) return occupied;
    return Math.max(occupied - (idx - currentIdx) * Math.round(leaving * 0.6), 0);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading occupancy data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{busName || busId} — Occupancy</Text>
          <Text style={styles.headerSub}>
            {routeInfo?.source} → {routeInfo?.destination}
          </Text>
        </View>
      </View>

      {/* ── Live status strip ──────────────────────────────────────────────── */}
      <View style={[styles.statusStrip, { backgroundColor: color.bg }]}>
        <View style={styles.statusDot} />
        <Text style={[styles.statusLabel, { color: color.text }]}>
          {color.label} · {occupied}/{TOTAL_CAP} total · {totalPct}%
        </Text>
        {currentStop && (
          <Text style={[styles.currentStopText, { color: color.text }]}>
            📍 {currentStop}
          </Text>
        )}
      </View>

      {/* ── Stats grid (5 cols) ─────────────────────────────────────────────── */}
      <View style={[styles.statsRow, { flexWrap: 'wrap' }]}>
        {[
          { label: 'Total Cap', value: TOTAL_CAP, color: '#6b7280' },
          { label: 'Seated',    value: seated,    color: '#ef4444' },
          { label: 'Standing',  value: standing,  color: standColor },
          { label: 'Leaving',   value: leaving,   color: '#f59e0b' },
          { label: 'Free',      value: freeSeats, color: '#10b981' },
        ].map(({ label, value, color: c }) => (
          <View key={label} style={[styles.statBox, { minWidth: '18%' }]}>
            <Text style={[styles.statValue, { color: c, fontSize: 17 }]}>{value}</Text>
            <Text style={[styles.statLabel, { fontSize: 8 }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Occupancy bars ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔢 Occupancy</Text>

        {/* Seated bar */}
        <Text style={styles.barSubLabel}>💺 Seated  {seated}/{SEAT_CAP}</Text>
        <View style={styles.occBarBg}>
          <View style={[styles.occBarFill, { width: `${seatPct}%`, backgroundColor: color.bar }]} />
        </View>

        {/* Standing bar */}
        <Text style={[styles.barSubLabel, { marginTop: 8, color: standColor }]}>
          🧍 Standing (Aisle)  {standing}/{STAND_CAP}
          {standing >= STAND_CAP ? '  ⚠️ FULL' : ''}
        </Text>
        <View style={[styles.occBarBg, { borderColor: standing >= STAND_CAP ? '#fca5a5' : '#e5e7eb' }]}>
          <View style={[
            styles.occBarFill,
            {
              width: `${standPct}%`,
              backgroundColor: standColor,
            }
          ]} />
        </View>

        {standing >= STAND_CAP && (
          <View style={styles.standAlertBanner}>
            <Text style={styles.standAlertText}>⚠️ Aisle full — no more boarding!</Text>
          </View>
        )}

        <View style={styles.occLegend}>
          {[
            { c: '#ef4444', l: 'Seated' },
            { c: '#f59e0b', l: 'Leaving' },
            { c: '#8b5cf6', l: 'Standing' },
            { c: '#10b981', l: 'Free' },
          ].map(({ c, l }) => (
            <View key={l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c }]} />
              <Text style={styles.legendText}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── SEAT MAP ───────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚌 Seat Map — Digital Twin</Text>
        {/* horizontal scroll so 52px seats never overflow on small phones */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ minWidth: 300 }}
          style={{ marginHorizontal: -4 }}
        >
          <View style={[styles.busBody, { minWidth: 300 }]}>
          {/* Front */}
          <View style={styles.doorRow}>
            <View style={styles.doorLine} />
            <View style={styles.doorBadge}>
              <Text style={styles.doorText}>🚪 FRONT DOOR</Text>
            </View>
            <View style={styles.doorLine} />
          </View>

          {/* Driver */}
          <View style={{ alignItems: 'flex-end', marginBottom: 8, marginRight: 4 }}>
            <View style={[styles.seat, { backgroundColor: '#dbeafe', borderColor: '#93c5fd', width: 52 }]}>
              <Text style={{ fontSize: 18 }}>🧑‍✈️</Text>
              <Text style={{ fontSize: 9, color: '#1e40af', fontWeight: '700' }}>DRIVER</Text>
            </View>
          </View>

          {/* Seat rows + aisle standing icons */}
          {seatRows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.seatRow}>
              {/* Left pair */}
              <View style={styles.seatPair}>
                {row.slice(0, 2).map(s => <SeatCell key={s.id} seat={s} />)}
              </View>

              {/* Aisle: standing person dots OR label */}
              <View style={styles.aisleCol}>
                {rowIdx === 0 && (
                  <Text style={styles.aisleLabel}>AISLE</Text>
                )}
                 {standingRows[rowIdx].map((pax, pi) => {
                   const sway = (rowIdx % 2 === 0) ? standAnim1 : standAnim2;
                   const bg = pax.isLeaving ? '#fbbf24' : (standing >= STAND_CAP ? '#ef4444' : standing > 8 ? '#f59e0b' : '#8b5cf6');
                   return (
                     <Animated.View
                       key={pi}
                       style={[
                         styles.standingDot,
                         {
                           backgroundColor: bg,
                           transform: [{ translateY: sway }]
                         },
                       ]}
                     >
                       <Text style={{ fontSize: 10, lineHeight: 14 }}>🧍</Text>
                     </Animated.View>
                   );
                 })}
              </View>

              {/* Right pair */}
              <View style={styles.seatPair}>
                {row.slice(2, 4).map(s => <SeatCell key={s.id} seat={s} />)}
              </View>
              <Text style={styles.rowLabel}>R{rowIdx + 1}</Text>
            </View>
          ))}

          {/* Rear */}
          <View style={styles.doorRow}>
            <View style={styles.doorLine} />
            <View style={[styles.doorBadge, { backgroundColor: '#374151' }]}>
              <Text style={styles.doorText}>🚪 REAR DOOR</Text>
            </View>
            <View style={styles.doorLine} />
          </View>
        </View>
        </ScrollView>

        {/* Seat legend */}
        <View style={styles.seatLegend}>
          {[
            { bg: '#d1fae5', border: '#34d399', label: 'Free' },
            { bg: '#fee2e2', border: '#f87171', label: 'Seated' },
            { bg: '#fef3c7', border: '#fbbf24', label: 'Leaving' },
          ].map(({ bg, border, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendSeat, { backgroundColor: bg, borderColor: border }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
          {/* Standing legend */}
          <View style={styles.legendItem}>
            <View style={[styles.standingDot, { backgroundColor: '#8b5cf6', width: 14, height: 14, borderRadius: 7 }]} />
            <Text style={styles.legendText}>Standing</Text>
          </View>
        </View>

        {/* View Aisle Schema Button */}
        <TouchableOpacity
          style={styles.viewDiagramBtn}
          onPress={() => setShowDiagram(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={15} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={styles.viewDiagramBtnText}>📐 View Aisle Layout Diagram</Text>
        </TouchableOpacity>
      </View>

      {/* Diagram Modal */}
      <Modal
        visible={showDiagram}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiagram(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📐 Aisle Standing Section Design</Text>
              <TouchableOpacity onPress={() => setShowDiagram(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Image
              source={require('../assets/bus_aisle_standing_diagram.png')}
              style={styles.modalImage}
              resizeMode="contain"
            />
            <Text style={styles.modalFooterText}>
              Shows 650mm wide central transit corridor layout with yellow passenger footprint markers, stanchions, and safety handrail designs.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── ROUTE TIMELINE ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗺️ Route Timeline</Text>
        {allNodes.map((node, idx) => {
          const stopOcc  = getStopOcc(idx);
          const stopPct  = capacity > 0 ? Math.round((stopOcc / capacity) * 100) : 0;
          const c        = occColor(stopOcc, capacity);
          const isCurrent = idx === currentIdx;
          const isPast    = idx < currentIdx;

          return (
            <View key={node.id || idx} style={styles.timelineRow}>
              {/* Line + dot */}
              <View style={styles.timelineLeft}>
                <View style={[styles.connLine, { backgroundColor: idx === 0 ? 'transparent' : '#e5e7eb' }]} />
                <Animated.View style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isCurrent ? '#2563eb' : node.isEndpoint ? '#1e3a5f' : (isPast ? '#9ca3af' : c.bar),
                    width: isCurrent ? 16 : node.isEndpoint ? 14 : 11,
                    height: isCurrent ? 16 : node.isEndpoint ? 14 : 11,
                    borderWidth: isCurrent ? 3 : 2,
                    borderColor: isCurrent ? '#93c5fd' : '#fff',
                    transform: isCurrent ? [{ scale: pulseAnim }] : [],
                  },
                ]} />
                <View style={[styles.connLine, { backgroundColor: idx === allNodes.length - 1 ? 'transparent' : '#e5e7eb' }]} />
              </View>

              {/* Stop card */}
              <View style={[
                styles.stopCard,
                isCurrent && styles.stopCardCurrent,
                isPast && styles.stopCardPast,
              ]}>
                {isCurrent && (
                  <View style={styles.busHereBadge}>
                    <Text style={styles.busHereText}>🚌 BUS HERE</Text>
                  </View>
                )}
                <View style={styles.stopCardHeader}>
                  <Text style={[styles.stopName, { color: isPast ? '#9ca3af' : '#111827', fontWeight: node.isEndpoint || isCurrent ? '700' : '500' }]}>
                    {node.isEndpoint && idx === 0 ? '🟢 ' : node.isEndpoint ? '🏁 ' : `${idx}. `}
                    {node.name}
                  </Text>
                  {node.arrival_time ? (
                    <Text style={[styles.arrivalTime, { color: isCurrent ? '#2563eb' : isPast ? '#9ca3af' : '#374151' }]}>
                      🕐 {node.arrival_time}
                    </Text>
                  ) : null}
                </View>

                {!node.isEndpoint && (
                  <>
                    <View style={styles.occBarBgSmall}>
                      <View style={[styles.occBarFillSmall, {
                        width: `${stopPct}%`,
                        backgroundColor: isPast ? '#d1d5db' : c.bar,
                      }]} />
                    </View>
                    <View style={styles.stopCardFooter}>
                      <Text style={styles.stopPaxText}>{stopOcc}/{capacity} seats</Text>
                      <View style={[styles.occBadge, { backgroundColor: isPast ? '#f3f4f6' : c.bg }]}>
                        <Text style={[styles.occBadgeText, { color: isPast ? '#9ca3af' : c.text }]}>
                          {isPast ? 'passed' : `${c.label} ${stopPct}%`}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  contentContainer: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },

  header: {
    backgroundColor: '#1e3a5f',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { marginRight: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 12, color: '#93c5fd', marginTop: 2 },

  statusStrip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981',
  },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  currentStopText: { fontSize: 12, marginLeft: 'auto' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statBox: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9, color: '#9ca3af', marginTop: 2, textTransform: 'uppercase' },

  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  occBarBg: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  occBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  barSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  standAlertBanner: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center',
  },
  standAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  occLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#6b7280' },
  legendSeat: {
    width: 12, height: 12, borderRadius: 3, borderWidth: 2,
  },

  busBody: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  doorLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  doorBadge: {
    backgroundColor: '#1e3a5f',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  doorText: { color: 'white', fontSize: 9, fontWeight: '700' },

  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  seatPair: { flexDirection: 'row', gap: 5 },
  aisleCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'column',
    gap: 2,
    minWidth: 28,
  },
  aisleLabel: {
    fontSize: 7,
    color: '#d1d5db',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  standingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 8, color: '#cbd5e1', width: 20, textAlign: 'right' },

  seat: {
    width: 52,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  seatBack: {
    width: '80%',
    height: 10,
    borderRadius: 4,
  },
  seatNum: {
    fontSize: 10,
    fontWeight: '700',
  },
  seatLegend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
  },
  connLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
  },
  timelineDot: {
    borderRadius: 20,
    zIndex: 1,
  },
  stopCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  stopCardCurrent: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#eff6ff',
  },
  stopCardPast: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  busHereBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  busHereText: { color: 'white', fontSize: 9, fontWeight: '700' },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stopName: { fontSize: 13, flex: 1 },
  arrivalTime: { fontSize: 11, fontWeight: '700' },
  occBarBgSmall: {
    height: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  occBarFillSmall: {
    height: '100%',
    borderRadius: 3,
  },
  stopCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    alignItems: 'center',
  },
  stopPaxText: { fontSize: 9, color: '#9ca3af' },
  occBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  occBadgeText: { fontSize: 9, fontWeight: '600' },
  viewDiagramBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    alignSelf: 'stretch',
  },
  viewDiagramBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e3a5f',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalImage: {
    width: '100%',
    height: 320,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  modalFooterText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
});
