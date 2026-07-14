import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function TripsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>My Trips - Coming Soon</Text>
        </View>
    );
}

export function QRCodeScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Scan QR - Coming Soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, color: '#666' }
});
