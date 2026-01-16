// screens/HomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation, cardId }) {
  const goTo = (screen) => {
    if (screen === 'Card Info') {
      navigation.navigate('Card Info', { cardId });
    } else {
    navigation.navigate(screen);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Top hero */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.appName}>Namma Smart Bus</Text>
          <Text style={styles.greeting}>Hi, commuter 👋</Text>
          <Text style={styles.cardLabel}>Linked Card</Text>
          <Text style={styles.cardValue}>{cardId}</Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="bus" size={24} color="white" />
          <Text style={styles.heroBadgeText}>Live tracking</Text>
        </View>
      </View>

      {/* Quick actions grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.grid}>
          <Tile
            icon="navigate"
            title="Live Bus"
            subtitle="Track your bus on map"
            onPress={() => goTo('Live Bus')}
          />
          <Tile
            icon="receipt"
            title="My Trips"
            subtitle="View last 30 rides"
            onPress={() => goTo('My Trips')}
          />
          <Tile
            icon="qr-code"
            title="QR Code"
            subtitle="Show QR for boarding"
            onPress={() => goTo('QR Code')}
          />
          <Tile
            icon="card"
            title="Card Info"
            subtitle="View balance & recharge"
            onPress={() => goTo('Card Info')}
          />
        </View>
      </View>

      {/* Info strip like fare-info bar */}
      <View style={styles.infoStrip}>
        <Ionicons name="alert-circle" size={18} color="#047857" />
        <Text style={styles.infoStripText}>
          Live bus & trips are in beta. Data may be delayed by a few minutes.
        </Text>
      </View>
    </ScrollView>
  );
}

function Tile({ icon, title, subtitle, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.tile, disabled && { opacity: 0.4 }]}
      activeOpacity={0.8}
      onPress={disabled ? undefined : onPress}
    >
      <View style={styles.tileIconWrap}>
        <Ionicons name={icon} size={22} color="#0BA360" />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  hero: {
    backgroundColor: '#0BA360',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  appName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  greeting: {
    marginTop: 4,
    color: '#ECFDF5',
    fontSize: 13,
  },
  cardLabel: {
    marginTop: 12,
    color: '#D1FAE5',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  heroBadge: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  infoStrip: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoStripText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
  },
});
