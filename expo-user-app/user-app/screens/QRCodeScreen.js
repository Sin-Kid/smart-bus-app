import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';
import { useFocusEffect } from '@react-navigation/native';

export default function QRCodeScreen({ cardId, navigation }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error || !data) {
        setCard(null);
      } else {
        setCard(data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCard();
    }, [cardId])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My QR Code</Text>
        </View>
        <View style={[styles.content, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#0BA360" />
        </View>
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My QR Code</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Ionicons name="qr-code-outline" size={80} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Card Linked</Text>
            <Text style={styles.emptyDesc}>
              Please link or issue a Smart Card in the "Card Info" tab to generate your travel QR code.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Card Info')}
            >
              <Text style={styles.btnText}>Go to Card Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Use customized card number if available (for physical sync), else ID
  const qrValue = card.card_number || card.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My QR Code</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Scan to Board</Text>
          <Text style={styles.subtitle}>Show this to the bus terminal</Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={qrValue}
              size={200}
              color="black"
              backgroundColor="white"
            />
          </View>

          <Text style={styles.idLabel}>CARD NUMBER</Text>
          <Text style={styles.idValue}>{qrValue}</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#0BA360" />
          <Text style={styles.infoText}>
            This QR code contains your unique card identity.
            It can be used for ticket inspection or boarding where supported.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0BA360', // Green Theme
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    alignItems: 'center'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    width: '100%',
    marginBottom: 30
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 30
  },
  qrContainer: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10
  },
  idLabel: {
    marginTop: 30,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
    letterSpacing: 2
  },
  idValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 5,
    letterSpacing: 1
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#DCFCE7',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    gap: 15
  },
  infoText: {
    flex: 1,
    color: '#166534',
    fontSize: 13,
    lineHeight: 18
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 20
  },
  emptyDesc: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20
  },
  primaryBtn: {
    backgroundColor: '#0BA360',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 2
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});
