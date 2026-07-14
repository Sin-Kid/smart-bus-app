import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseConfig';

export default function ChatbotScreen({ cardId }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: '🤖 Hello! I am your Smart Bus AI Assistant. How can I help you travel today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const suggestedQueries = [
    { label: '🚌 Where is Express 101?', query: 'Where is Express 101?' },
    { label: '💵 Check My Balance', query: 'What is my card balance?' },
    { label: '🗺️ Next bus to Kengeri?', query: 'Next bus to Kengeri?' },
    { label: '🏁 Show active routes', query: 'Show active routes' },
  ];

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    Keyboard.dismiss();

    // Trigger typing indicator
    setIsTyping(true);
    scrollViewRef.current?.scrollToEnd({ animated: true });

    // Staggered reply simulation (800ms) for premium feel
    setTimeout(async () => {
      try {
        const reply = await parseAndReply(text);
        setMessages((prev) => [...prev, reply]);
      } catch (err) {
        console.error('Chatbot error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'bot',
            text: '❌ Apologies, I encountered an error searching the schedules. Please try again.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
      }
    }, 850);
  };

  const OLLAMA_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:11434' : 'http://localhost:11434';

  const cleanJson = (str) => {
    let cleaned = str.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }
    return cleaned;
  };

  const fallbackParseAndReply = async (input) => {
    const cleanInput = input.toLowerCase().trim();
    const botId = Date.now().toString();

    // 1. CARD BALANCE QUERY
    if (cleanInput.includes('balance') || cleanInput.includes('card') || cleanInput.includes('money')) {
      if (!cardId) {
        return {
          id: botId,
          sender: 'bot',
          text: '💳 Please log in or issue a Smart Card in the "Card Info" tab to check your balance.',
          timestamp: new Date(),
        };
      }
      const { data: card, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error || !card) {
        return {
          id: botId,
          sender: 'bot',
          text: '💳 I couldn\'t find a card linked to your account. You can create one in the Card Info tab.',
          timestamp: new Date(),
        };
      }
      return {
        id: botId,
        sender: 'bot',
        type: 'card_info',
        data: card,
        timestamp: new Date(),
      };
    }

    // 2. BUS STATUS / LOCATION QUERY (e.g. "where is Express 101", "bus 102", "status")
    const busMatch = cleanInput.match(/(bus|express|metro|circle)\s*(\d+)/i) || cleanInput.match(/express\s+(\w+)/i);
    if (busMatch || cleanInput.includes('status') || cleanInput.includes('where is')) {
      let queryName = '';
      if (busMatch) {
        queryName = busMatch[0]; // e.g. "express 101"
      } else {
        // Fallback: look for keywords in input
        if (cleanInput.includes('101')) queryName = '101';
        else if (cleanInput.includes('102')) queryName = '102';
        else if (cleanInput.includes('103')) queryName = '103';
      }

      // Query database
      const { data: buses } = await supabase
        .from('buses')
        .select('*');

      const foundBus = buses?.find(b =>
        b.name?.toLowerCase().includes(queryName) || b.id?.toLowerCase().includes(queryName)
      );

      if (foundBus) {
        return {
          id: botId,
          sender: 'bot',
          type: 'bus_status',
          data: foundBus,
          timestamp: new Date(),
        };
      } else {
        return {
          id: botId,
          sender: 'bot',
          text: '🚌 I couldn\'t find details for that specific bus. Our active fleet consists of: Express 101, Metro Link 102, and City Circle 103.',
          timestamp: new Date(),
        };
      }
    }

    // 3. STOP / TIMING / DEPARTURE QUERY (e.g., "timing", "next bus", "to kengeri")
    const stopKeywords = ['kengeri', 'challaghatta', 'majestic', 'jhananbharati', 'pattangere', 'ksr', 'hebbal', 'whitefield', 'airport'];
    const stopMatch = stopKeywords.find(word => cleanInput.includes(word));
    if (stopMatch || cleanInput.includes('schedule') || cleanInput.includes('timing') || cleanInput.includes('departure')) {
      const targetStop = stopMatch || 'kengeri';

      // Query schedules with routes
      const { data: schedules } = await supabase
        .from('bus_schedules')
        .select('*, route:bus_routes(*), bus:buses(*)');

      const matchingScheds = schedules?.filter(s =>
        s.route?.destination?.toLowerCase().includes(targetStop) ||
        s.route?.source?.toLowerCase().includes(targetStop) ||
        s.bus?.status_message?.toLowerCase().includes(targetStop)
      );

      if (matchingScheds && matchingScheds.length > 0) {
        return {
          id: botId,
          sender: 'bot',
          type: 'timing_list',
          data: { stop: targetStop.toUpperCase(), schedules: matchingScheds.slice(0, 3) },
          timestamp: new Date(),
        };
      } else {
        return {
          id: botId,
          sender: 'bot',
          text: `🗺️ I couldn't find any direct schedules matching "${targetStop}". Try asking about our main destination terminuses like Kengeri, Challaghatta, or Majestic.`,
          timestamp: new Date(),
        };
      }
    }

    // 4. ACTIVE ROUTES QUERY
    if (cleanInput.includes('route') || cleanInput.includes('direction') || cleanInput.includes('where go')) {
      const { data: routes } = await supabase.from('bus_routes').select('*');
      if (routes && routes.length > 0) {
        return {
          id: botId,
          sender: 'bot',
          type: 'routes_list',
          data: routes,
          timestamp: new Date(),
        };
      }
    }

    // 5. DEFAULT FALLBACK
    return {
      id: botId,
      sender: 'bot',
      text: '🤔 I can help you with live bus statuses, route schedules, and your Smart Card details.\n\nTry asking:\n• "Where is Express 101?"\n• "What is my balance?"\n• "Show departures to Kengeri"',
      timestamp: new Date(),
    };
  };

  const parseAndReply = async (input) => {
    const botId = Date.now().toString();
    
    try {
      console.log('[Chatbot] Querying Supabase context...');
      // 1. Fetch data from Supabase
      const { data: buses } = await supabase.from('buses').select('*');
      const { data: schedules } = await supabase
        .from('bus_schedules')
        .select('*, route:bus_routes(*), bus:buses(*)');
      
      let card = null;
      if (cardId) {
        const { data: cardData } = await supabase
          .from('cards')
          .select('*')
          .eq('id', cardId)
          .single();
        card = cardData;
      }
      
      console.log('[Chatbot] Contacting Ollama at', OLLAMA_HOST);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
      
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama3.2',
          messages: [
            {
              role: 'system',
              content: `You are the Smart Bus AI Assistant.
Current Local Time: ${new Date().toLocaleTimeString()}
Current Date: ${new Date().toLocaleDateString()}

Context Data:
- User's Smart Card: ${card ? JSON.stringify(card) : 'No card linked.'}
- Active Buses: ${JSON.stringify(buses || [])}
- Active Routes & Schedules: ${JSON.stringify(schedules || [])}

Instructions:
Reply ONLY with a valid JSON object matching the schema below. Do not wrap in markdown block (no \`\`\`json or \`\`\`). Do not include any text before or after the JSON.
{
  "reply": "Your conversational answer to the user query, using the live data. Keep it friendly and concise (max 3 sentences). Ensure you mention live details when asked (e.g. current location, occupancy).",
  "richType": "bus_status" | "card_info" | "timing_list" | "routes_list" | null,
  "richData": <matching object, or null>
}

Rules for richType and richData (MANDATORY):
1. Card Queries: If the user is asking about balance, money, recharges, or card info, you MUST set richType to "card_info" and richData to the user's Smart Card object.
2. Bus Queries: If the user is asking about a specific bus, its status, location, or occupancy (e.g., Ambari, RED BUS, BLUE BUS, KBS-3C Express, Express 101, Metro 102, Circle 103), you MUST set richType to "bus_status" and richData to the matched bus object from the Active Buses list.
3. Schedule/Timing Queries: If the user is asking about timings, departures, next bus, or schedules to/from a stop (e.g. Challaghatta, Kengeri, Majestic), you MUST set richType to "timing_list" and richData to: { "stop": "STOP_NAME", "schedules": [<1 to 3 matching schedules from the Route Schedules list>] }.
4. Route list Queries: If the user is asking about active corridors or general routes, you MUST set richType to "routes_list" and richData to the list of active routes.
5. Else: Set both richType and richData to null if it is just a greeting or general conversational query.`
            },
            {
              role: 'user',
              content: input
            }
          ],
          stream: false
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const resJson = await response.json();
      const content = resJson.message?.content || '';
      console.log('[Chatbot] Ollama raw content response:', content);
      
      // Clean and parse JSON response
      const cleaned = cleanJson(content);
      const parsed = JSON.parse(cleaned);
      
      if (parsed && typeof parsed.reply === 'string') {
        return {
          id: botId,
          sender: 'bot',
          text: parsed.reply,
          type: parsed.richType || null,
          data: parsed.richData || null,
          timestamp: new Date(),
        };
      }
      throw new Error('Invalid response structure from LLM');
    } catch (err) {
      console.warn('[Chatbot] Ollama failed, falling back to static parser:', err.message || err);
      return fallbackParseAndReply(input);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Ionicons name="robot" size={24} color="white" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Transit AI Assistant</Text>
          <Text style={styles.headerSub}>Live Timings & Bus Status</Text>
        </View>
      </View>

      {/* Main Messages Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <View
                key={msg.id}
                style={[styles.msgRow, isBot ? styles.msgRowLeft : styles.msgRowRight]}
              >
                {isBot && (
                  <View style={[styles.bubbleAvatar, { backgroundColor: '#3b82f6' }]}>
                    <Ionicons name="hardware-chip-outline" size={14} color="white" />
                  </View>
                )}
                <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
                  {/* Text Reply */}
                  {msg.text && (
                    <Text style={isBot ? styles.textBot : styles.textUser}>{msg.text}</Text>
                  )}

                  {/* Rich Type: Bus Status Card */}
                  {msg.type === 'bus_status' && (
                    <View style={styles.richCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardBusTitle}>🚌 {msg.data.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                          <Text style={styles.statusBadgeText}>ACTIVE</Text>
                        </View>
                      </View>

                      <Text style={styles.cardLabel}>CURRENT LOCATION</Text>
                      <Text style={styles.cardValue}>📍 {msg.data.current_location_name || 'Terminal'}</Text>

                      <View style={styles.cardDivider} />

                      <View style={styles.cardColumns}>
                        <View>
                          <Text style={styles.cardLabel}>SEATED</Text>
                          <Text style={styles.cardStat}>{Math.min(msg.data.sim_occupied, 52)} / 52</Text>
                        </View>
                        <View>
                          <Text style={styles.cardLabel}>STANDING</Text>
                          <Text style={[styles.cardStat, { color: '#8b5cf6' }]}>
                            {Math.min(Math.max(0, msg.data.sim_occupied - 52), 15)} / 15
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.cardLabel}>ON BOARD</Text>
                          <Text style={[styles.cardStat, { fontWeight: '800' }]}>{msg.data.sim_occupied} Pax</Text>
                        </View>
                      </View>

                      {msg.data.status_message && (
                        <View style={styles.cardStatusStrip}>
                          <Text style={styles.cardStatusStripText}>⚠️ {msg.data.status_message}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Rich Type: Card Balance Card */}
                  {msg.type === 'card_info' && (
                    <View style={[styles.richCard, { backgroundColor: '#1e293b', borderLeftColor: '#0ba360', borderLeftWidth: 4 }]}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={[styles.cardBusTitle, { color: 'white' }]}>💳 Smart Card Balance</Text>
                        <View style={{ backgroundColor: 'rgba(52, 211, 153, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#34d399', fontSize: 9, fontWeight: '700' }}>LINKED</Text>
                        </View>
                      </View>
                      
                      <View style={{ marginVertical: 12 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>CARD HOLDER</Text>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: '700', marginTop: 2 }}>{msg.data.name}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <View>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>AVAILABLE FUNDS</Text>
                          <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginTop: 2 }}>₹{msg.data.balance?.toFixed(2)}</Text>
                        </View>
                        <Ionicons name="wallet-outline" size={32} color="rgba(255,255,255,0.3)" />
                      </View>
                    </View>
                  )}

                  {/* Rich Type: Timings List */}
                  {msg.type === 'timing_list' && (
                    <View style={styles.richCard}>
                      <Text style={styles.cardBusTitle}>🗺️ Scheduled Departures: {msg.data.stop}</Text>
                      {msg.data.schedules.map((s, idx) => (
                        <View key={s.id || idx} style={styles.timingRow}>
                          <View style={styles.timingRowLeft}>
                            <Ionicons name="time-outline" size={14} color="#4f46e5" />
                            <Text style={styles.timingTime}>{s.departure_time?.substring(0, 5)}</Text>
                          </View>
                          <View style={{ flex: 1, paddingLeft: 10 }}>
                            <Text style={styles.timingBusName}>{s.bus?.name || 'Bus'}</Text>
                            <Text style={styles.timingRoute}>{s.route?.source} ➔ {s.route?.destination}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Rich Type: Routes List */}
                  {msg.type === 'routes_list' && (
                    <View style={styles.richCard}>
                      <Text style={styles.cardBusTitle}>🏁 Active Corridor Routes</Text>
                      {msg.data.map((r, idx) => (
                        <View key={r.id || idx} style={styles.timingRow}>
                          <Ionicons name="git-commit-outline" size={16} color="#059669" />
                          <View style={{ flex: 1, paddingLeft: 10 }}>
                            <Text style={styles.timingBusName}>{r.name}</Text>
                            <Text style={styles.timingRoute}>{r.source} ➔ {r.destination}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {isTyping && (
            <View style={[styles.msgRow, styles.msgRowLeft]}>
              <View style={[styles.bubbleAvatar, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="hardware-chip-outline" size={14} color="white" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, { paddingVertical: 12 }]}>
                <ActivityIndicator size="small" color="#64748b" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestion Chips */}
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
            {suggestedQueries.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => handleSend(item.query)}
              >
                <Text style={styles.suggestionChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about timing, bus status, balance..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2f6bb1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 4,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#93c5fd',
    fontSize: 11,
    marginTop: 1,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
    width: '100%',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleBot: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  textBot: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  textUser: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
  },
  // Rich cards inside bubbles
  richCard: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    minWidth: 230,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardBusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a5f',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#166534',
    fontSize: 8,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
    marginBottom: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 6,
  },
  cardColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardStat: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  cardStatusStrip: {
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  cardStatusStripText: {
    fontSize: 10,
    color: '#b45309',
    fontWeight: '600',
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timingTime: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4f46e5',
    marginLeft: 4,
  },
  timingBusName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  timingRoute: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  suggestionsContainer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  suggestionScroll: {
    paddingHorizontal: 12,
  },
  suggestionChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2f6bb1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#2f6bb1',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
