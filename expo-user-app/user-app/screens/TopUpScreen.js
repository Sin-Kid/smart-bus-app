import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TopUpScreen({ navigation, route }) {
    const { cardId, currentBalance } = route.params || {};
    const [amount, setAmount] = useState('');

    const PRESETS = [50, 100, 200, 500];

    const handlePreset = (val) => {
        setAmount(val.toString());
    };

    const handleProceed = () => {
        // Parse float to support decimals (e.g. 12.50)
        let val = parseFloat(amount);

        if (isNaN(val) || val < 10) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount (Min ₹10)');
            return;
        }

        // Round to 2 decimal places to be safe
        val = Math.round(val * 100) / 100;

        // Navigate to Dummy Payment Gateway
        navigation.navigate('PaymentDummy', {
            amount: val, // Send number
            cardId: cardId
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#2f6bb1" barStyle="light-content" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.content}>

                    {/* Card Preview */}
                    <View style={styles.cardPreview}>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardLabel}>Smart Card Ending {cardId ? cardId.substring(0, 4) : '****'}</Text>
                            <Ionicons name="refresh-circle" size={20} color="rgba(255,255,255,0.8)" />
                        </View>
                        <View>
                            <Text style={styles.balLabel}>Current Balance</Text>
                            <Text style={styles.balValue}>₹ {currentBalance ? parseFloat(currentBalance).toFixed(2) : '0.00'}</Text>
                        </View>
                    </View>

                    {/* Input Section */}
                    <Text style={styles.label}>Enter Top-up Amount</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                            autoFocus
                        />
                    </View>

                    <View style={styles.minInfo}>
                        <Ionicons name="information-circle-outline" size={16} color="#64748B" />
                        <Text style={styles.minInfoText}>Minimum recharge value: ₹10</Text>
                    </View>

                    {/* Presets */}
                    <View style={styles.presetsContainer}>
                        {PRESETS.map(val => (
                            <TouchableOpacity key={val} style={styles.presetBtn} onPress={() => handlePreset(val)}>
                                <Text style={styles.presetText}>+ ₹{val}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.note}>
                        Note: Maximum recharge limit is ₹10,000. Balance is updated immediately after successful payment.
                    </Text>

                    <View style={{ flex: 1 }} />

                    {/* Footer Action */}
                    <TouchableOpacity style={styles.payBtn} onPress={handleProceed}>
                        <Text style={styles.payBtnText}>Proceed to Pay ₹ {amount || '0'}</Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                    </TouchableOpacity>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    cardPreview: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        elevation: 4
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15
    },
    cardLabel: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: 'bold'
    },
    balLabel: {
        color: '#CBD5E1',
        fontSize: 14,
    },
    balValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 4
    },
    label: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: 'bold',
        marginBottom: 10
    },
    minInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20
    },
    minInfoText: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 4
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#2f6bb1',
        paddingVertical: 5,
        marginBottom: 20
    },
    currencySymbol: {
        fontSize: 32,
        color: '#1E293B',
        fontWeight: 'bold',
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    presetsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    presetBtn: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    presetText: {
        color: '#334155',
        fontWeight: '600'
    },
    note: {
        fontSize: 12,
        color: '#94A3B8',
        lineHeight: 18
    },
    payBtn: {
        backgroundColor: '#16A34A', // Green
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        marginBottom: 20 // Lift up from bottom edge
    },
    payBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 10
    }
});
