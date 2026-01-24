// screens/BusListScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function BusListScreen({ navigation, route }) {
    // 1. Trim Params
    const source = route.params?.source?.trim() || '';
    const destination = route.params?.destination?.trim() || '';

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchedules();
    }, [source, destination]);

    const fetchSchedules = async () => {
        try {
            setLoading(true);

            // 1. Get Routes matching Source (as Route-Source or Stop)
            const startRoutesReq = supabase.from('bus_routes').select('id').ilike('source', `%${source}%`);
            const startStopsReq = supabase.from('bus_stops').select('route_id').ilike('name', `%${source}%`);

            // 2. Get Routes matching Destination (as Route-Dest or Stop)
            const endRoutesReq = supabase.from('bus_routes').select('id').ilike('destination', `%${destination}%`);
            const endStopsReq = supabase.from('bus_stops').select('route_id').ilike('name', `%${destination}%`);

            const [
                { data: startR }, { data: startS },
                { data: endR }, { data: endS }
            ] = await Promise.all([startRoutesReq, startStopsReq, endRoutesReq, endStopsReq]);

            // Collect Route IDs
            const startIds = new Set([
                ...(startR?.map(r => r.id) || []),
                ...(startS?.map(s => s.route_id) || [])
            ]);

            const endIds = new Set([
                ...(endR?.map(r => r.id) || []),
                ...(endS?.map(s => s.route_id) || [])
            ]);

            // 3. Candidate Routes = Intersection
            const candidateIds = [...startIds].filter(id => endIds.has(id));
            console.log('Candidate Route IDs:', candidateIds);

            if (candidateIds.length === 0) {
                console.log('No routes connect these two points.');
                setSchedules([]);
                return;
            }

            // 4. Verify Order for each candidate
            const verifiedRouteIds = [];

            // We need full details for these routes to verify order
            // This might be N queries, but usually N is small (num matching routes)
            // Optimization: Fetch all needed data in 2 calls
            const [{ data: routesDetails }, { data: stopsDetails }] = await Promise.all([
                supabase.from('bus_routes').select('id, source, destination').in('id', candidateIds),
                supabase.from('bus_stops').select('route_id, name, order').in('route_id', candidateIds).order('order')
            ]);

            for (const rId of candidateIds) {
                const routeObj = routesDetails?.find(r => r.id === rId);
                const routeStops = stopsDetails?.filter(s => s.route_id === rId) || [];

                if (!routeObj) continue;

                // Build Ordered Sequence
                // Sequence Items: { name: string, type: 'source'|'stop'|'dest' }
                const sequence = [];

                // 1. Source (always first)
                if (routeObj.source) sequence.push({ name: routeObj.source.toLowerCase(), type: 'source' });

                // 2. Intermediate Stops (sorted by order)
                routeStops.forEach(s => {
                    if (s.name) sequence.push({ name: s.name.toLowerCase(), type: 'stop' });
                });

                // 3. Destination (always last)
                if (routeObj.destination) sequence.push({ name: routeObj.destination.toLowerCase(), type: 'dest' });

                // Check indices
                // Note: User query might match multiple points (search "Park", matches "Central Park" and "Hyde Park")
                // We consider it valid if ANY matching "Start" appears before ANY matching "End"

                const searchSrc = source.toLowerCase();
                const searchDst = destination.toLowerCase();

                const startIndices = sequence.map((s, i) => s.name.includes(searchSrc) ? i : -1).filter(i => i !== -1);
                const endIndices = sequence.map((s, i) => s.name.includes(searchDst) ? i : -1).filter(i => i !== -1);

                if (startIndices.length && endIndices.length) {
                    const minStart = Math.min(...startIndices);
                    const maxEnd = Math.max(...endIndices);

                    if (minStart < maxEnd) {
                        verifiedRouteIds.push(rId);
                    }
                }
            }

            if (verifiedRouteIds.length === 0) {
                setSchedules([]);
                return;
            }

            // 5. Fetch Schedules
            const { data: scheduleData, error: scheduleError } = await supabase
                .from('bus_schedules')
                .select(`
                    id,
                    departure_time,
                    arrival_time,
                    fare,
                    days_of_week,
                    bus:buses(id, name),
                    route:bus_routes(id, name, source, destination)
                `)
                .in('route_id', verifiedRouteIds)
                .eq('status', 'active');

            if (scheduleError) throw scheduleError;

            // 6. Calculate Dynamic Fare for each schedule
            const finalSchedules = await Promise.all((scheduleData || []).map(async (sched) => {
                let totalCost = 0;

                // Get all stops for this route (ordered)
                const { data: routeStops } = await supabase
                    .from('bus_stops')
                    .select('name, price, order')
                    .eq('route_id', sched.route.id)
                    .order('order');

                if (routeStops && routeStops.length > 0) {
                    // Find indices of user's requested Source and Destination
                    const searchSrc = source.toLowerCase();
                    const searchDst = destination.toLowerCase();

                    // We need to match loose names (e.g. "Kengeri" matches "Kengeri Bus Stand")
                    const startIdx = routeStops.findIndex(s => s.name?.toLowerCase().includes(searchSrc));
                    const endIdx = routeStops.findIndex(s => s.name?.toLowerCase().includes(searchDst));

                    if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
                        // Sum prices from Start to End
                        // Logic: If I travel from Stop 1 to Stop 3, I pay for Stop 1 (maybe?), Stop 2, Stop 3.
                        // Consistent with Backend: Sum of prices of stops in range [lower, upper]
                        for (let i = startIdx; i <= endIdx; i++) {
                            const p = Number(routeStops[i].price);
                            totalCost += (p > 0 ? p : 10);
                        }
                    } else {
                        // Fallback if full stops logic fails (maybe source is Route Source, not in stops table?)
                        totalCost = sched.fare || 50;
                    }
                } else {
                    totalCost = sched.fare || 50;
                }

                return { ...sched, calculatedFare: totalCost };
            }));

            setSchedules(finalSchedules);
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        // Format times (assuming TIME format like "14:30:00")
        const formatTime = (timeStr) => {
            if (!timeStr) return '--:--';
            const [hours, minutes] = timeStr.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const formattedH = h % 12 || 12;
            return `${formattedH}:${minutes} ${ampm}`;
        };

        const depTime = formatTime(item.departure_time);
        const arrTime = formatTime(item.arrival_time);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('BusRoute', { scheduleId: item.id, busId: item.bus?.id })}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.busName}>{item.bus?.name || 'Bus'}</Text>
                    <View style={styles.runsOnBadge}>
                        <Text style={styles.runsOnText}>RUNS DAILY</Text>
                    </View>
                </View>

                <View style={styles.timeRow}>
                    <View>
                        <Text style={styles.timeText}>{depTime}</Text>
                        <Text style={styles.stationText}>{item.route?.source}</Text>
                    </View>

                    <View style={styles.arrowContainer}>
                        <View style={styles.line} />
                        <Ionicons name="arrow-forward" size={16} color="#999" />
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.timeText}>{arrTime}</Text>
                        <Text style={styles.stationText}>{item.route?.destination}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.durationText}>Calculated Duration</Text>
                    <Text style={styles.fareText}>₹ {item.calculatedFare || 50}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#2f6bb1" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{source} to {destination}</Text>
                    <Text style={styles.headerSubtitle}>{schedules.length} Buses found</Text>
                </View>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2f6bb1" />
                </View>
            ) : schedules.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={{ color: '#666' }}>No direct buses found for this route.</Text>
                </View>
            ) : (
                <FlatList
                    data={schedules}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        elevation: 4,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: '#e0e0e0',
        fontSize: 12,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 10,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 6,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 }
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    busName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    runsOnBadge: {

    },
    runsOnText: {
        fontSize: 10,
        color: '#239d54',
        fontWeight: 'bold',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    timeText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    stationText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    arrowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    line: {
        height: 1,
        backgroundColor: '#ccc',
        flex: 1,
        marginRight: 5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
    },
    durationText: {
        fontSize: 12,
        color: '#999',
    },
    fareText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    }
});
