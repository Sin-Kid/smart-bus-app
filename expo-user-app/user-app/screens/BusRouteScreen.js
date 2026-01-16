// screens/BusRouteScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function BusRouteScreen({ navigation, route }) {
    const { scheduleId, busId } = route.params;
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState(null);
    const [busLocation, setBusLocation] = useState(null);
    const [occupancy, setOccupancy] = useState(null);

    useEffect(() => {
        fetchRouteDetails();
    }, [scheduleId]);

    const fetchRouteDetails = async () => {
        try {
            setLoading(true);

            // 1. Get Schedule details (to get route_id)
            const { data: scheduleData, error: schedError } = await supabase
                .from('bus_schedules')
                .select('*, route:bus_routes(*), bus:buses(*)')
                .eq('id', scheduleId)
                .single();

            if (schedError) throw schedError;
            setSchedule(scheduleData);

            // 2. Get Stops for this route
            let stopsList = [];
            if (scheduleData.route_id) {
                const { data: stopsData, error: stopsError } = await supabase
                    .from('bus_stops')
                    .select('*')
                    .eq('route_id', scheduleData.route_id)
                    .order('order');

                if (stopsError) throw stopsError;
                stopsList = stopsData || [];
            }

            // Construct full journey: Source -> Stops -> Destination
            const fullJourney = [];

            // Add Source
            if (scheduleData.route?.source) {
                // Only add if not already the first stop (avoid duplication)
                if (!stopsList.length || stopsList[0].name !== scheduleData.route.source) {
                    fullJourney.push({
                        id: 'source-node',
                        name: scheduleData.route.source,
                        type: 'source'
                    });
                }
            }

            // Add intermediate stops
            fullJourney.push(...stopsList);

            // Add Destination
            if (scheduleData.route?.destination) {
                // Only add if not already the last stop
                if (!stopsList.length || stopsList[stopsList.length - 1].name !== scheduleData.route.destination) {
                    fullJourney.push({
                        id: 'dest-node',
                        name: scheduleData.route.destination,
                        type: 'destination'
                    });
                }
            }

            setStops(fullJourney);

            // 3. Get Occupancy Data (Prediction)
            if (scheduleData.bus_id) {
                const { data: occData, error: occError } = await supabase
                    .rpc('get_bus_occupancy', { p_bus_id: scheduleData.bus_id });

                if (!occError) {
                    setOccupancy(occData);
                }
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderStop = (stop, index) => {
        // Determine if this is the start, end, or middle
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;

        // Check if Bus is here
        // Logic: Check if status_message contains this stop's name ("At Kengeri")
        const currentStatus = schedule?.bus?.status_message || '';
        const isBusHere = currentStatus.toLowerCase().includes(`at ${stop.name.toLowerCase()}`);

        return (
            <View key={stop.id} style={styles.stopRow}>
                {/* Time Column */}
                <View style={styles.timeCol}>
                    <Text style={[styles.stopTime, (isFirst || isLast) && styles.boldTime]}>
                        {stop.arrival_time ? stop.arrival_time.substring(0, 5) :
                            (isFirst ? schedule?.departure_time?.substring(0, 5) :
                                (isLast ? schedule?.arrival_time?.substring(0, 5) : '--:--')
                            )
                        }
                    </Text>
                </View>

                {/* Timeline Graphic */}
                <View style={styles.timelineCol}>
                    <View style={[styles.line, isFirst && styles.hiddenLine]} />

                    {/* Bus Icon OR Dot */}
                    {isBusHere ? (
                        <View style={styles.busIconContainer}>
                            <Ionicons name="bus" size={16} color="white" />
                        </View>
                    ) : (
                        <View style={[styles.dot, (isFirst || isLast) && styles.bigDot]} />
                    )}

                    <View style={[styles.line, isLast && styles.hiddenLine]} />
                </View>

                {/* Stop Info */}
                <View style={styles.infoCol}>
                    <View style={styles.stopInfoRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[
                                styles.stopName,
                                (isFirst || isLast) && styles.boldName,
                                isBusHere && styles.activeStopName
                            ]}>
                                {stop.name}
                            </Text>
                            {isFirst && <Text style={styles.stopPlatform}>Source</Text>}
                            {isLast && <Text style={styles.stopPlatform}>Destination</Text>}
                            {isBusHere && <Text style={styles.liveTag}>LIVE</Text>}
                        </View>

                        {/* Inline Occupancy Info (Only for active stop) */}
                        {isBusHere && occupancy && (
                            <View style={styles.inlineOccupancy}>
                                <Text style={styles.occBadgeText}>
                                    {occupancy.occupied}/{occupancy.capacity} Seats ({occupancy.percent}%)
                                </Text>
                                <Text style={styles.occSubText}>
                                    Prediction: ~{occupancy.leaving_next_stop} leaving
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#2f6bb1" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>
                        {schedule?.route?.source || 'Source'} - {schedule?.route?.destination || 'Dest'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {schedule?.bus?.name} | Starts at {schedule?.departure_time?.substring(0, 5)}
                    </Text>
                </View>
            </View>

            {/* Timeline List */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <ActivityIndicator size="large" color="#2f6bb1" style={{ marginTop: 50 }} />
                ) : (
                    <>
                        {/* Location Header - "Not Started" or Live Status */}
                        <View style={[styles.liveBanner, {
                            backgroundColor: schedule?.bus?.status_message === 'On Time' ? '#ECFDF5' : '#FEF2F2'
                        }]}>
                            <Text style={[styles.liveText, {
                                color: schedule?.bus?.status_message === 'On Time' ? '#0BA360' : '#DC2626'
                            }]}>
                                {schedule?.bus?.status_message || 'No Status Info'}
                            </Text>
                            <TouchableOpacity style={styles.refreshBtn} onPress={fetchRouteDetails}>
                                <Ionicons name="refresh" size={16}
                                    color={schedule?.bus?.status_message === 'On Time' ? '#0BA360' : '#DC2626'}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Occupancy Card Removed - Moved Inline */}

                        <View style={styles.timelineContainer}>
                            {stops.map(renderStop)}
                        </View>
                    </>
                )}
            </ScrollView>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
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
    scrollContent: {
        paddingBottom: 20,
    },
    liveBanner: {
        flexDirection: 'row',
        backgroundColor: '#ECFDF5',
        padding: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    liveText: {
        color: '#0BA360',
        fontSize: 12,
        fontWeight: 'bold'
    },
    refreshBtn: {
        padding: 5
    },
    occupancyCard: {
        margin: 15,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    occHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    occTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#1F2937'
    },
    occPercent: {
        fontWeight: 'bold',
        fontSize: 14
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        marginBottom: 10,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4
    },
    occStats: {
        marginBottom: 10
    },
    occStatText: {
        fontSize: 12,
        color: '#4B5563'
    },
    predictionBox: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        gap: 8
    },
    predictionText: {
        fontSize: 12,
        color: '#6B7280',
        flex: 1
    },
    timelineContainer: {
        paddingVertical: 10,
    },
    stopRow: {
        flexDirection: 'row',
        height: 60, // Fixed height for alignment
    },
    timeCol: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopTime: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
    boldTime: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#000',
    },
    timelineCol: {
        width: 30,
        alignItems: 'center',
    },
    line: {
        width: 4,
        flex: 1,
        backgroundColor: '#DDDDDD', // Light gray standard line
    },
    hiddenLine: {
        backgroundColor: 'transparent',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#666',
        zIndex: 1,
    },
    bigDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderColor: '#2f6bb1',
        borderWidth: 3,
    },
    infoCol: {
        flex: 1,
        justifyContent: 'center',
        paddingLeft: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    stopName: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    boldName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#000',
    },
    stopPlatform: {
        fontSize: 10,
        color: '#999',
    },
    busIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#239d54', // Green
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        elevation: 4
    },
    activeStopName: {
        color: '#239d54',
        fontWeight: 'bold',
        fontSize: 16
    },
    liveTag: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#239d54',
        marginTop: 2
    },
    stopInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 10
    },
    inlineOccupancy: {
        alignItems: 'flex-end'
    },
    occBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 4
    },
    occDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6
    },
    occBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1F2937'
    },
    occSubText: {
        fontSize: 10,
        color: '#6B7280',
        fontStyle: 'italic'
    }
});
