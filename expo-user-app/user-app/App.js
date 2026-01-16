// App.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabaseConfig';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './screens/LoginScreen';
import FindBusScreen from './screens/FindBusScreen';
import BusListScreen from './screens/BusListScreen';
import BusRouteScreen from './screens/BusRouteScreen';
import BusInfoScreen from './screens/BusInfoScreen';
import CardInfoScreen from './screens/CardInfoScreen';
import TripsScreen from './screens/TripsScreen';
import QRCodeScreen from './screens/QRCodeScreen';
import TopUpScreen from './screens/TopUpScreen';
import PaymentDummyScreen from './screens/PaymentDummyScreen';
import CardHistoryScreen from './screens/CardHistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tabs after login
function MainTabs({ route }) {
  const { userId } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0BA360',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 90, // Increased height for better accessibility
          paddingBottom: 30, // Push icons up from bottom edge
          paddingTop: 10,
        },
        tabBarIcon: ({ focused, size, color }) => {
          let iconName = 'search';
          if (route.name === 'Find Bus') iconName = focused ? 'search' : 'search-outline';
          if (route.name === 'My Trips') iconName = focused ? 'receipt' : 'receipt-outline';
          if (route.name === 'QR Code') iconName = focused ? 'qr-code' : 'qr-code-outline';
          if (route.name === 'Card Info') iconName = focused ? 'card' : 'card-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Find Bus" component={FindBusScreen} />
      <Tab.Screen name="My Trips">
        {(props) => <TripsScreen {...props} cardId={userId} />}
      </Tab.Screen>
      <Tab.Screen name="QR Code">
        {(props) => <QRCodeScreen {...props} cardId={userId} />}
      </Tab.Screen>
      <Tab.Screen name="Card Info">
        {(props) => <CardInfoScreen {...props} cardId={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            animation: 'slide_from_right',
          }}
        >
          {!session ? (
            // No session - show login
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          ) : (
            // Has session - show main app
            <>
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                initialParams={{ userId: session.user.id }}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BusInfo"
                component={BusInfoScreen}
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="BusList"
                component={BusListScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BusRoute"
                component={BusRouteScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Card Info"
                options={{
                  headerShown: true,
                  headerTitle: 'Card Information',
                  headerStyle: { backgroundColor: '#0BA360' },
                  headerTintColor: 'white',
                  headerTitleStyle: { fontWeight: '700' },
                }}
              >
                {(props) => <CardInfoScreen {...props} cardId={session.user.id} />}
              </Stack.Screen>

              <Stack.Screen
                name="TopUp"
                component={TopUpScreen}
                options={{
                  headerTitle: 'Top Up Card',
                  headerStyle: { backgroundColor: '#2f6bb1' },
                  headerTintColor: 'white'
                }}
              />
              <Stack.Screen
                name="PaymentDummy"
                component={PaymentDummyScreen}
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="CardHistory"
                component={CardHistoryScreen}
                options={{
                  headerTitle: 'Transaction History',
                  headerStyle: { backgroundColor: 'white' },
                  headerTintColor: 'black'
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
