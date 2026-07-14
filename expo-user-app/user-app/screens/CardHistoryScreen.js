import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function CardHistoryScreen({ route }) {
    const { cardId } = route.params;
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('card_id', cardId)
                .order('timestamp', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        const isCredit = item.type === 'recharge';
        const amount = parseFloat(item.amount).toFixed(2);
        const date = new Date(item.timestamp);

        return (
            <View style={styles.txnCard}>
                <View style={styles.iconContainer}>
                    <View style={[
                        styles.iconCircle,
                        { backgroundColor: isCredit ? '#DCFCE7' : '#FEE2E2' }
                    ]}>
                        <Ionicons
                            name={isCredit ? "arrow-down" : "bus"}
                            size={20}
                            color={isCredit ? "#166534" : "#DC2626"}
                        />
                    </View>
                </View>

                <View style={styles.details}>
                    <Text style={styles.txnTitle}>
                        {isCredit ? 'Wallet Top-up' : 'Bus Ride'}
                    </Text>
                    <Text style={styles.txnDate}>
                        {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {item.payment_method && (
                        <Text style={styles.txnSub}>{item.payment_method}</Text>
                    )}
                </View>

                <View style={styles.amountContainer}>
                    <Text style={[
                        styles.amount,
                        { color: isCredit ? '#16A34A' : '#DC2626' }
                    ]}>
                        {isCredit ? '+' : '-'} ₹{amount}
                    </Text>
                    <Text style={styles.status}>{item.status}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#fff" barStyle="dark-content" />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2f6bb1" />
                </View>
            ) : transactions.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="time-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No transactions found</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    list: {
        padding: 16
    },
    txnCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 }
    },
    iconContainer: {
        marginRight: 16
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    details: {
        flex: 1
    },
    txnTitle: {
        fontWeight: 'bold',
        color: '#1F2937',
        fontSize: 15
    },
    txnDate: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 4
    },
    txnSub: {
        color: '#9CA3AF',
        fontSize: 10,
        marginTop: 2
    },
    amountContainer: {
        alignItems: 'flex-end'
    },
    amount: {
        fontWeight: 'bold',
        fontSize: 16
    },
    status: {
        fontSize: 10,
        color: '#6B7280',
        textTransform: 'capitalize',
        marginTop: 2
    },
    emptyText: {
        marginTop: 16,
        color: '#9CA3AF',
        fontSize: 16
    }
});
