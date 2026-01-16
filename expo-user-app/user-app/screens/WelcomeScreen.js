// screens/WelcomeScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

export default function WelcomeScreen({ navigation }) {
  const [cardId, setCardId] = useState('');

  const handleContinue = () => {
    const trimmed = cardId.trim();
    if (!trimmed) return;
    navigation.replace('MainTabs', { cardId: trimmed });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.top}>
        <Text style={styles.appName}>Namma Smart Bus</Text>
        <Text style={styles.tagline}>Nimma ride, nimma control.</Text>

        {/* You can replace this with your own SVG/PNG of a city + bus */}
        <View style={styles.illustrationBox}>
          <Text style={styles.illustrationText}>🚌🚇</Text>
          <Text style={styles.illustrationSub}>
            Track your bus, view trips & stay on time.
          </Text>
        </View>
      </View>

      <View style={styles.bottomCard}>
        <Text style={styles.bottomTitle}>Link your travel card</Text>
        <Text style={styles.bottomSub}>
          Enter the Card ID used on your RFID smart card.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Card ID"
          placeholderTextColor="#9CA3AF"
          value={cardId}
          onChangeText={setCardId}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, !cardId.trim() && { opacity: 0.5 }]}
          onPress={handleContinue}
          disabled={!cardId.trim()}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0BA360', // metro green
  },
  top: {
    flex: 0.9,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  tagline: {
    marginTop: 4,
    fontSize: 14,
    color: '#E5E7EB',
  },
  illustrationBox: {
    marginTop: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: 20,
  },
  illustrationText: {
    fontSize: 40,
    textAlign: 'center',
  },
  illustrationSub: {
    marginTop: 12,
    textAlign: 'center',
    color: '#F9FAFB',
    fontSize: 14,
  },
  bottomCard: {
    flex: 1.1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  bottomTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  bottomSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0BA360',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
