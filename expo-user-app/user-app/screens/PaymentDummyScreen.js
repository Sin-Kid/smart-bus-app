import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function PaymentDummyScreen({ navigation, route }) {
    const { amount, cardId } = route.params;
    const [status, setStatus] = useState('processing'); // processing | success | failed
    const [countdown, setCountdown] = useState(3);
    const timerRef = useRef(null);

    useEffect(() => {
        startTransaction();
    }, []); // Run ONCE on mount

    useEffect(() => {
        // Prevent hardware back button
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (status === 'success') {
                navigation.popToTop();
                return true;
            }
            return true;
        });

        return () => backHandler.remove();
    }, [status]);

    // Auto-redirect on success with countdown
    useEffect(() => {
        if (status === 'success') {
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        navigation.popToTop(); // Exit completely to MainTabs
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [status]);

    const startTransaction = async () => {
        // 1. Simulate Network Delay for Bank
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // SAFE PARSING OF AMOUNT
            const cleanAmount = parseFloat(amount || 0);

            const { data: cardData, error: fetchError } = await supabase
                .from('cards')
                .select('balance, total_recharges')
                .eq('id', cardId)
                .single();

            if (fetchError) throw fetchError;

            // SAFE PARSING OF DB VALUES
            // Ensure we never have string concatenation
            const currentBal = parseFloat(cardData.balance) || 0;
            const currentTotal = parseFloat(cardData.total_recharges) || 0;

            console.log('Payment Math Debug:', {
                amountIn: amount,
                parsedAmount: cleanAmount,
                dbBalance: cardData.balance,
                parsedBalance: currentBal
            });

            const newBalance = Number((currentBal + cleanAmount).toFixed(2));
            const newTotal = Number((currentTotal + cleanAmount).toFixed(2));

            const { error: updateError } = await supabase
                .from('cards')
                .update({
                    balance: newBalance,
                    last_recharge: cleanAmount,
                    last_recharge_date: new Date(),
                    total_recharges: newTotal
                })
                .eq('id', cardId);

            if (updateError) throw updateError;

            const { error: txnError } = await supabase
                .from('transactions')
                .insert([{
                    card_id: cardId,
                    type: 'recharge',
                    amount: cleanAmount,
                    status: 'completed',
                    payment_method: 'UPI_SIMULATOR',
                    timestamp: new Date()
                }]);

            if (txnError) throw txnError;

            setStatus('success');

        } catch (err) {
            console.error("Payment Error:", err);
            setStatus('failed');
        }
    };

    const handleFinish = () => {
        navigation.popToTop();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {status === 'processing' && (
                    <>
                        <ActivityIndicator size={60} color="#2f6bb1" />
                        <Text style={styles.title}>Processing Payment</Text>
                        <Text style={styles.subtitle}>Connecting to Secure Gateway...</Text>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <View style={styles.iconCircle}>
                            <Ionicons name="checkmark" size={50} color="white" />
                        </View>
                        <Text style={styles.successTitle}>Payment Successful!</Text>
                        <Text style={styles.amount}>₹ {parseFloat(amount).toFixed(2)}</Text>
                        <Text style={styles.msg}>Your card balance has been updated successfully.</Text>

                        <Text style={styles.redirectText}>Redirecting in {countdown}...</Text>

                        <TouchableOpacity style={styles.btn} onPress={handleFinish}>
                            <Text style={styles.btnText}>Done</Text>
                        </TouchableOpacity>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <View style={[styles.iconCircle, { backgroundColor: '#EF4444' }]}>
                            <Ionicons name="close" size={50} color="white" />
                        </View>
                        <Text style={styles.successTitle}>Payment Failed</Text>
                        <Text style={styles.msg}>Something went wrong. Please try again.</Text>

                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF4444' }]} onPress={handleFinish}>
                            <Text style={styles.btnText}>Close</Text>
                        </TouchableOpacity>
                    </>
                )}

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        color: '#334155'
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 10
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#16A34A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        elevation: 5
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 10
    },
    amount: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 10
    },
    msg: {
        textAlign: 'center',
        color: '#64748B',
        marginBottom: 20
    },
    redirectText: {
        fontSize: 16,
        color: '#2f6bb1',
        fontWeight: 'bold',
        marginBottom: 30
    },
    btn: {
        backgroundColor: '#2f6bb1',
        width: '100%',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center'
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});
