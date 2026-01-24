import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function MLPredictionPanel({ busId, currentStopId, currentOccupancy, stops }) {
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);

    // Fetch ML prediction
    const fetchPrediction = async () => {
        if (!currentStopId || !stops || stops.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            // Find current stop index
            const stopIndex = stops.findIndex(s => s.id === currentStopId);
            const stopSequence = stopIndex >= 0 ? stopIndex / (stops.length - 1) : 0.5;

            const hour = new Date().getHours();
            const dayOfWeek = new Date().getDay();
            const isPeakHour = [7, 8, 9, 17, 18, 19].includes(hour);

            const response = await fetch('http://localhost:5001/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stop_id: stopIndex >= 0 ? stopIndex : 0,
                    hour: hour,
                    day_of_week: dayOfWeek,
                    is_peak_hour: isPeakHour,
                    current_occupancy: currentOccupancy || 20,
                    stop_sequence: stopSequence,
                    historical_avg: 8.0
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            setPrediction(data.prediction);
        } catch (err) {
            console.error('ML Prediction error:', err);
            setError('ML API unavailable');
        } finally {
            setLoading(false);
        }
    };

    // Fetch model metrics
    const fetchMetrics = async () => {
        try {
            const response = await fetch('http://localhost:5001/metrics');
            if (response.ok) {
                const data = await response.json();
                setMetrics(data.metrics);
            }
        } catch (err) {
            console.error('Metrics fetch error:', err);
        }
    };

    // Auto-fetch on stop change
    useEffect(() => {
        fetchPrediction();
    }, [currentStopId, currentOccupancy]);

    // Fetch metrics on mount
    useEffect(() => {
        fetchMetrics();
    }, []);

    if (error) {
        return (
            <div style={{
                padding: '20px',
                background: '#fff3cd',
                borderRadius: '8px',
                border: '1px solid #ffc107',
                marginTop: '20px'
            }}>
                <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                    <strong>ML Prediction Service:</strong> {error}
                    <br />
                    <small>Make sure the API is running on port 5001</small>
                </p>
            </div>
        );
    }

    return (
        <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            borderRadius: '8px',
            border: '2px solid #2196f3'
        }}>
            <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                fontWeight: '700',
                color: '#0d47a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <span>AI Passenger Demand Prediction</span>
                {metrics && (
                    <span style={{ fontSize: '11px', fontWeight: '500', color: '#1565c0' }}>
                        Model Accuracy: {(metrics.boarding.r2 * 100).toFixed(1)}%
                    </span>
                )}
            </h4>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#1565c0' }}>
                    Loading prediction...
                </div>
            ) : prediction ? (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        {/* Boarding Prediction */}
                        <div style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                Expected Boarding
                            </div>
                            <div style={{
                                fontSize: '28px',
                                fontWeight: '700',
                                color: '#4caf50',
                                marginBottom: '4px'
                            }}>
                                {prediction.expected_boarding}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999' }}>
                                Confidence: {prediction.confidence_boarding}%
                            </div>
                        </div>

                        {/* Alighting Prediction */}
                        <div style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                Expected Alighting
                            </div>
                            <div style={{
                                fontSize: '28px',
                                fontWeight: '700',
                                color: '#f44336',
                                marginBottom: '4px'
                            }}>
                                {prediction.expected_alighting}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999' }}>
                                Confidence: {prediction.confidence_alighting}%
                            </div>
                        </div>
                    </div>

                    {/* Net Change */}
                    <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            Predicted Net Change
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: prediction.expected_boarding - prediction.expected_alighting > 0 ? '#4caf50' : '#f44336'
                        }}>
                            {prediction.expected_boarding - prediction.expected_alighting > 0 ? '+' : ''}
                            {prediction.expected_boarding - prediction.expected_alighting} passengers
                        </div>
                    </div>

                    {/* Model Info */}
                    {metrics && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#0d47a1'
                        }}>
                            <strong>Model Performance:</strong> MAE: {metrics.boarding.mae.toFixed(2)} |
                            RMSE: {metrics.boarding.rmse.toFixed(2)} |
                            R²: {metrics.boarding.r2.toFixed(3)}
                        </div>
                    )}
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    Select a stop to see predictions
                </div>
            )}
        </div>
    );
}
