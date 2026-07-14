// Simulated data generator for demo purposes
// Use this when Supabase is not available or for testing

export const generateSimulatedBuses = () => {
    // Actual bus fleet with realistic WEST route locations
    return [
        {
            id: 'BUS101',
            name: 'Express 101',
            status_message: 'At Jhananbharati',
            capacity: 67,
            sim_occupied: 43,
            sim_leaving: 5,
            location: { lat: 12.9352, lon: 77.5245 },  // Jhananbharati coordinates
            updated_at: new Date().toISOString(),
            current_stop_id: 'stop_2',
            current_location_name: 'Jhananbharati',
            route: 'WEST DOWN'
        },
        {
            id: 'BUS102',
            name: 'Metro Link 102',
            status_message: 'At Kengeri',
            capacity: 67,
            sim_occupied: 50,
            sim_leaving: 3,
            location: { lat: 12.9141, lon: 77.4854 },  // Kengeri coordinates
            updated_at: new Date().toISOString(),
            current_stop_id: 'stop_4',
            current_location_name: 'Kengeri',
            route: 'WEST DOWN'
        },
        {
            id: 'BUS103',
            name: 'City Circle 103',
            status_message: 'At Challaghatta',
            capacity: 67,
            sim_occupied: 30,
            sim_leaving: 8,
            location: { lat: 12.8941, lon: 77.4654 },  // Challaghatta coordinates
            updated_at: new Date().toISOString(),
            current_stop_id: 'stop_5',
            current_location_name: 'Challaghatta',
            route: 'WEST UP'
        }
    ];
};

export const generateSimulatedTelemetry = () => {
    const buses = ['BUS101', 'BUS102', 'BUS103'];
    const telemetry = [];

    for (let i = 0; i < 20; i++) {
        const timestamp = new Date();
        timestamp.setMinutes(timestamp.getMinutes() - i * 5);

        telemetry.push({
            bus_id: buses[i % buses.length],
            location: {
                lat: 12.9716 + (Math.random() - 0.5) * 0.1,
                lon: 77.5946 + (Math.random() - 0.5) * 0.1
            },
            speed: Math.floor(Math.random() * 60) + 10,
            timestamp: timestamp.toISOString(),
            buses: {
                name: `Express ${101 + (i % buses.length)}`
            }
        });
    }

    return telemetry;
};

export const generateSimulatedRFIDLogs = (busId) => {
    const logs = [];
    const now = new Date();

    // Random Forest-based hourly pattern generation
    for (let hour = 0; hour < 24; hour++) {
        // Use RF prediction logic for each hour
        const isPeakHour = [7, 8, 9, 17, 18, 19].includes(hour);
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Base counts using RF decision tree logic
        let baseEntry, baseExit;

        if (hour >= 7 && hour <= 9) {
            // Morning peak
            baseEntry = 15 + Math.floor(Math.random() * 8);
            baseExit = 5 + Math.floor(Math.random() * 4);
        } else if (hour >= 17 && hour <= 19) {
            // Evening peak
            baseEntry = 12 + Math.floor(Math.random() * 6);
            baseExit = 15 + Math.floor(Math.random() * 8);
        } else if (hour >= 10 && hour <= 16) {
            // Mid-day
            baseEntry = 8 + Math.floor(Math.random() * 5);
            baseExit = 8 + Math.floor(Math.random() * 5);
        } else if (hour >= 6 && hour < 7) {
            // Early morning
            baseEntry = 10 + Math.floor(Math.random() * 5);
            baseExit = 2 + Math.floor(Math.random() * 3);
        } else if (hour >= 20 && hour <= 23) {
            // Late evening
            baseEntry = 5 + Math.floor(Math.random() * 4);
            baseExit = 8 + Math.floor(Math.random() * 5);
        } else {
            // Off-hours
            baseEntry = Math.floor(Math.random() * 3);
            baseExit = Math.floor(Math.random() * 3);
        }

        // Weekend adjustment (RF tree logic)
        if (isWeekend) {
            baseEntry = Math.floor(baseEntry * 0.6);
            baseExit = Math.floor(baseExit * 0.6);
        }

        // Generate entry events
        for (let i = 0; i < baseEntry; i++) {
            const timestamp = new Date(now);
            timestamp.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);

            logs.push({
                event_type: 'entry',
                created_at: timestamp.toISOString(),
                bus_id: busId,
                card_uid: `CARD${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`
            });
        }

        // Generate exit events
        for (let i = 0; i < baseExit; i++) {
            const timestamp = new Date(now);
            timestamp.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);

            logs.push({
                event_type: 'exit',
                created_at: timestamp.toISOString(),
                bus_id: busId,
                card_uid: `CARD${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`
            });
        }
    }

    return logs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

export const generateSimulatedTrips = (timeRange = 'today') => {
    // Only use actual routes: WEST DOWN and WEST UP
    // Random Forest-based passenger distribution

    const routes = [
        {
            name: 'WEST DOWN',
            baseCount: 45,  // Base daily trips
            peakMultiplier: 1.2  // Higher demand route
        },
        {
            name: 'WEST UP',
            baseCount: 38,  // Base daily trips
            peakMultiplier: 1.0  // Standard demand
        }
    ];

    const trips = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    routes.forEach(route => {
        let count = route.baseCount;

        // Random Forest decision tree logic for trip count
        // Adjust based on time range
        if (timeRange === 'today') {
            count = Math.floor(count * 0.3);  // 30% of daily trips
        } else if (timeRange === 'week') {
            count = Math.floor(count * 1.5);  // 1.5x for 7 days
        } else if (timeRange === 'month') {
            count = Math.floor(count * 4);    // 4x for 30 days
        }

        // Weekend adjustment (RF tree logic)
        if (isWeekend && timeRange === 'today') {
            count = Math.floor(count * 0.6);  // -40% on weekends
        }

        // Peak route multiplier
        count = Math.floor(count * route.peakMultiplier);

        // Generate trips with realistic timestamps
        for (let i = 0; i < count; i++) {
            const startTime = new Date(now);

            if (timeRange === 'today') {
                // Distribute across operating hours (6 AM - 11 PM)
                const hour = 6 + Math.floor(Math.random() * 18);
                startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
            } else if (timeRange === 'week') {
                // Distribute across last 7 days
                const daysAgo = Math.floor(Math.random() * 7);
                startTime.setDate(now.getDate() - daysAgo);
                const hour = 6 + Math.floor(Math.random() * 18);
                startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
            } else {
                // Distribute across last 30 days
                const daysAgo = Math.floor(Math.random() * 30);
                startTime.setDate(now.getDate() - daysAgo);
                const hour = 6 + Math.floor(Math.random() * 18);
                startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
            }

            trips.push({
                id: `trip_${route.name.replace(' ', '_')}_${i}`,
                bus_id: `BUS${Math.floor(Math.random() * 3) + 101}`,
                start_time: startTime.toISOString(),
                status: 'completed',
                buses: {
                    route_id: `route_${route.name.toLowerCase().replace(' ', '_')}`,
                    routes: {
                        name: route.name
                    }
                }
            });
        }
    });

    return trips;
};

export const generateSimulatedMLPrediction = (stopId, hour, currentOccupancy) => {
    // Random Forest-based prediction algorithm
    // Mimics the trained ML model's decision tree logic

    const isPeakHour = [7, 8, 9, 17, 18, 19].includes(hour);
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Feature engineering (matching train_model.py)
    const stopSequence = typeof stopId === 'number' ? stopId / 9 : 0.5;
    const historicalAvg = isPeakHour ? 10 : 6;

    // Random Forest ensemble prediction (simplified)
    // Simulates multiple decision trees voting
    const trees = 10; // Number of trees in forest
    let boardingPredictions = [];
    let alightingPredictions = [];

    for (let tree = 0; tree < trees; tree++) {
        // Each tree makes a prediction based on different feature combinations
        let boarding = 0;
        let alighting = 0;

        // Tree 1: Hour-based split
        if (hour >= 7 && hour <= 9) {
            // Morning peak
            boarding = 10 + Math.floor(Math.random() * 8);
            alighting = 3 + Math.floor(Math.random() * 5);
        } else if (hour >= 17 && hour <= 19) {
            // Evening peak
            boarding = 8 + Math.floor(Math.random() * 6);
            alighting = 10 + Math.floor(Math.random() * 8);
        } else if (hour >= 10 && hour <= 16) {
            // Mid-day
            boarding = 5 + Math.floor(Math.random() * 4);
            alighting = 5 + Math.floor(Math.random() * 4);
        } else {
            // Off-peak
            boarding = 2 + Math.floor(Math.random() * 3);
            alighting = 2 + Math.floor(Math.random() * 3);
        }

        // Tree 2: Stop sequence adjustment
        if (stopSequence < 0.3) {
            // Early stops: more boarding
            boarding = Math.floor(boarding * 1.3);
            alighting = Math.floor(alighting * 0.7);
        } else if (stopSequence > 0.7) {
            // Late stops: more alighting
            boarding = Math.floor(boarding * 0.7);
            alighting = Math.floor(alighting * 1.3);
        }

        // Tree 3: Occupancy-based adjustment
        const occupancyRatio = currentOccupancy / 40;
        if (occupancyRatio > 0.8) {
            // Bus nearly full: less boarding
            boarding = Math.floor(boarding * 0.5);
            alighting = Math.floor(alighting * 1.2);
        } else if (occupancyRatio < 0.2) {
            // Bus nearly empty: more boarding
            boarding = Math.floor(boarding * 1.2);
            alighting = Math.floor(alighting * 0.8);
        }

        // Tree 4: Day of week adjustment
        if (isWeekend) {
            boarding = Math.floor(boarding * 0.6);
            alighting = Math.floor(alighting * 0.6);
        }

        // Tree 5: Historical average influence
        const historicalInfluence = 0.3;
        boarding = Math.floor(boarding * (1 - historicalInfluence) + historicalAvg * historicalInfluence);

        // Add noise (tree randomness)
        boarding = Math.max(0, boarding + Math.floor((Math.random() - 0.5) * 3));
        alighting = Math.max(0, alighting + Math.floor((Math.random() - 0.5) * 3));

        boardingPredictions.push(boarding);
        alightingPredictions.push(alighting);
    }

    // Ensemble voting: average of all trees
    const avgBoarding = Math.round(boardingPredictions.reduce((a, b) => a + b, 0) / trees);
    const avgAlighting = Math.round(alightingPredictions.reduce((a, b) => a + b, 0) / trees);

    // Calculate confidence based on prediction variance
    const boardingVariance = boardingPredictions.reduce((sum, val) =>
        sum + Math.pow(val - avgBoarding, 2), 0) / trees;
    const alightingVariance = alightingPredictions.reduce((sum, val) =>
        sum + Math.pow(val - avgAlighting, 2), 0) / trees;

    // Lower variance = higher confidence
    const boardingConfidence = Math.max(60, Math.min(95, 90 - boardingVariance * 2));
    const alightingConfidence = Math.max(60, Math.min(95, 90 - alightingVariance * 2));

    return {
        prediction: {
            expected_boarding: avgBoarding,
            expected_alighting: avgAlighting,
            confidence_boarding: Math.round(boardingConfidence),
            confidence_alighting: Math.round(alightingConfidence)
        }
    };
};

export const generateSimulatedMLMetrics = () => {
    return {
        metrics: {
            boarding: {
                mae: 2.38,
                rmse: 3.75,
                r2: 0.767,
                mape: 31.3
            },
            alighting: {
                mae: 1.89,
                rmse: 2.92,
                r2: 0.714,
                mape: 35.5
            }
        }
    };
};

export const generateSimulatedRouteStops = (routeId) => {
    const routes = {
        'route_west_down': [
            { id: 'stop_1', name: 'KSR', lat: 12.9716, lon: 77.5946, order: 1, price: 0 },
            { id: 'stop_2', name: 'Jhananbharati', lat: 12.9352, lon: 77.5245, order: 2, price: 10 },
            { id: 'stop_3', name: 'Pattangere', lat: 12.9141, lon: 77.5054, order: 3, price: 20 },
            { id: 'stop_4', name: 'Kengeri', lat: 12.9141, lon: 77.4854, order: 4, price: 30 },
            { id: 'stop_5', name: 'Challaghatta', lat: 12.8941, lon: 77.4654, order: 5, price: 50 }
        ],
        'route_west_up': [
            { id: 'stop_5', name: 'Challaghatta', lat: 12.8941, lon: 77.4654, order: 1, price: 0 },
            { id: 'stop_4', name: 'Kengeri', lat: 12.9141, lon: 77.4854, order: 2, price: 20 },
            { id: 'stop_2', name: 'Jhananbharati', lat: 12.9352, lon: 77.5245, order: 3, price: 40 },
            { id: 'stop_1', name: 'KSR', lat: 12.9716, lon: 77.5946, order: 4, price: 50 }
        ]
    };

    return routes[routeId] || routes['route_west_down'];
};
