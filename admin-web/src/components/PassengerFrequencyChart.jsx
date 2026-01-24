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

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function PassengerFrequencyChart({ busId }) {
    const [chartData, setChartData] = useState(null);
    const [timeInterval, setTimeInterval] = useState('hourly');
    const [loading, setLoading] = useState(true);
    const [totalScans, setTotalScans] = useState(0);

    useEffect(() => {
        if (busId) {
            fetchRealData();
        }
    }, [busId, timeInterval]);

    const fetchRealData = async () => {
        setLoading(true);

        try {
            // Fetch REAL RFID logs from Supabase
            const { data: logs, error } = await supabase
                .from('rfid_logs')
                .select('event_type, created_at')
                .eq('bus_id', busId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching RFID logs:', error);
                setChartData(null);
                setLoading(false);
                return;
            }

            if (!logs || logs.length === 0) {
                setChartData(null);
                setTotalScans(0);
                setLoading(false);
                return;
            }

            setTotalScans(logs.length);

            // Process real data into chart format
            const processed = processRealData(logs, timeInterval);
            setChartData(processed);

        } catch (err) {
            console.error('Error:', err);
            setChartData(null);
        }

        setLoading(false);
    };

    const processRealData = (logs, interval) => {
        if (interval === 'hourly') {
            // Group by hour (0-23)
            const hourBuckets = Array(24).fill(0).map(() => ({ entry: 0, exit: 0 }));

            logs.forEach(log => {
                const hour = new Date(log.created_at).getHours();
                if (log.event_type === 'entry') {
                    hourBuckets[hour].entry++;
                } else if (log.event_type === 'exit') {
                    hourBuckets[hour].exit++;
                }
            });

            const labels = Array.from({ length: 24 }, (_, i) =>
                i < 10 ? `0${i}:00` : `${i}:00`
            );

            return {
                labels,
                datasets: [
                    {
                        label: 'Boarding (Entry)',
                        data: hourBuckets.map(b => b.entry),
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Alighting (Exit)',
                        data: hourBuckets.map(b => b.exit),
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            };
        } else {
            // Group by day of week
            const dayBuckets = Array(7).fill(0).map(() => ({ entry: 0, exit: 0 }));

            logs.forEach(log => {
                const day = new Date(log.created_at).getDay();
                if (log.event_type === 'entry') {
                    dayBuckets[day].entry++;
                } else if (log.event_type === 'exit') {
                    dayBuckets[day].exit++;
                }
            });

            const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            return {
                labels,
                datasets: [
                    {
                        label: 'Boarding (Entry)',
                        data: dayBuckets.map(b => b.entry),
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Alighting (Exit)',
                        data: dayBuckets.map(b => b.exit),
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            };
        }
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 12,
                        weight: '600'
                    }
                }
            },
            title: {
                display: true,
                text: `Passenger Frequency - ${timeInterval === 'hourly' ? 'Hourly' : 'Daily'} Pattern`,
                font: {
                    size: 14,
                    weight: '700'
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ${context.parsed.y} passengers`;
                    }
                }
            }
        },
        scales: {
            y: {
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
            x: {
                title: {
                    display: true,
                    text: timeInterval === 'hourly' ? 'Time of Day' : 'Day of Week',
                    font: {
                        size: 12,
                        weight: '600'
                    }
                },
                ticks: {
                    font: {
                        size: 10
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
                    Passenger Flow Analysis {totalScans > 0 && `(${totalScans} scans)`}
                </h4>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setTimeInterval('hourly')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            border: '1px solid #2196f3',
                            backgroundColor: timeInterval === 'hourly' ? '#2196f3' : 'white',
                            color: timeInterval === 'hourly' ? 'white' : '#2196f3',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Hourly
                    </button>
                    <button
                        onClick={() => setTimeInterval('daily')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            border: '1px solid #2196f3',
                            backgroundColor: timeInterval === 'daily' ? '#2196f3' : 'white',
                            color: timeInterval === 'daily' ? 'white' : '#2196f3',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Daily
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    Loading real RFID data...
                </div>
            ) : chartData ? (
                <div style={{ height: '350px' }}>
                    <Bar data={chartData} options={options} />
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        No RFID scan data yet
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                        Start scanning RFID cards to see passenger frequency patterns
                    </p>
                </div>
            )}

            <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#e8f5e9',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#2e7d32',
                border: '1px solid #a5d6a7'
            }}>
                <strong>Data Source:</strong> Real RFID scan logs from Supabase database.
                {chartData && ` Showing ${timeInterval} passenger frequency patterns from actual scans.`}
            </div>
        </div>
    );
}
