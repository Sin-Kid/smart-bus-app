import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { supabase } from '../supabaseConfig';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function RoutePassengerChart() {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('today'); // 'today', 'week', 'month'

    useEffect(() => {
        fetchRouteData();
    }, [timeRange]);

    const fetchRouteData = async () => {
        setLoading(true);

        try {
            // Calculate date range
            const now = new Date();
            let startDate = new Date();

            if (timeRange === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else {
                startDate.setDate(now.getDate() - 30);
            }

            // Fetch trips with route information
            const { data: trips, error } = await supabase
                .from('trips')
                .select(`
          id,
          bus_id,
          buses!inner(route_id, routes!inner(name))
        `)
                .gte('start_time', startDate.toISOString())
                .eq('status', 'completed');

            if (error) throw error;

            if (!trips || trips.length === 0) {
                setChartData(null);
                setLoading(false);
                return;
            }

            // Group by route
            const routeCounts = {};
            trips.forEach(trip => {
                const routeName = trip.buses?.routes?.name || 'Unknown Route';
                routeCounts[routeName] = (routeCounts[routeName] || 0) + 1;
            });

            // Sort by passenger count (descending)
            const sortedRoutes = Object.entries(routeCounts)
                .sort((a, b) => b[1] - a[1]);

            const labels = sortedRoutes.map(([name]) => name);
            const data = sortedRoutes.map(([, count]) => count);

            // Color bars based on passenger volume (green=high, yellow=medium, red=low)
            const maxCount = Math.max(...data);
            const colors = data.map(count => {
                const ratio = count / maxCount;
                if (ratio > 0.7) return 'rgba(76, 175, 80, 0.8)'; // Green - high traffic
                if (ratio > 0.4) return 'rgba(255, 193, 7, 0.8)'; // Yellow - medium traffic
                return 'rgba(244, 67, 54, 0.8)'; // Red - low traffic
            });

            setChartData({
                labels,
                datasets: [{
                    label: 'Number of Passengers',
                    data,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1
                }]
            });

        } catch (err) {
            console.error('Error fetching route data:', err);
            setChartData(null);
        }

        setLoading(false);
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bars
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: `Passenger Distribution by Route (${timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'})`,
                font: {
                    size: 14,
                    weight: '700'
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.parsed.x} passengers`;
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Passengers',
                    font: {
                        size: 12,
                        weight: '600'
                    }
                },
                ticks: {
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Route Name',
                    font: {
                        size: 12,
                        weight: '600'
                    }
                },
                ticks: {
                    font: {
                        size: 11
                    }
                }
            }
        }
    };

    return (
        <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <h4 style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#333'
                }}>
                    Route Demand Analysis
                </h4>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setTimeRange('today')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            border: '1px solid #4caf50',
                            backgroundColor: timeRange === 'today' ? '#4caf50' : 'white',
                            color: timeRange === 'today' ? 'white' : '#4caf50',
                            cursor: 'pointer'
                        }}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setTimeRange('week')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            border: '1px solid #4caf50',
                            backgroundColor: timeRange === 'week' ? '#4caf50' : 'white',
                            color: timeRange === 'week' ? 'white' : '#4caf50',
                            cursor: 'pointer'
                        }}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => setTimeRange('month')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            border: '1px solid #4caf50',
                            backgroundColor: timeRange === 'month' ? '#4caf50' : 'white',
                            color: timeRange === 'month' ? 'white' : '#4caf50',
                            cursor: 'pointer'
                        }}
                    >
                        30 Days
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    Loading route data...
                </div>
            ) : chartData ? (
                <>
                    <div style={{ height: '400px' }}>
                        <Bar data={chartData} options={options} />
                    </div>

                    <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#666'
                    }}>
                        <strong>Color Legend:</strong>
                        <span style={{ marginLeft: '12px', color: '#4caf50' }}>● High Traffic (Deploy more buses)</span>
                        <span style={{ marginLeft: '12px', color: '#ffc107' }}>● Medium Traffic</span>
                        <span style={{ marginLeft: '12px', color: '#f44336' }}>● Low Traffic (Deploy fewer buses)</span>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        No trip data available
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                        Complete some trips to see route demand analysis
                    </p>
                </div>
            )}

            <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#1565c0',
                border: '1px solid #90caf9'
            }}>
                <strong>Management Insight:</strong> Routes with higher passenger counts should have more buses deployed.
                Routes with lower counts can operate with fewer buses to optimize fleet utilization.
            </div>
        </div>
    );
}
