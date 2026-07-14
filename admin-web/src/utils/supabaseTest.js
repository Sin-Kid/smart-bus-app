// src/utils/supabaseTest.js
import { supabase } from '../supabaseConfig'

/**
 * Test Supabase connection
 * @returns {Promise<{connected: boolean, error?: string, message?: string}>}
 */
export async function testSupabaseConnection() {
  try {
    // Test basic connection by querying a simple table
    const { data, error } = await supabase
      .from('buses')
      .select('id')
      .limit(1)

    if (error) {
      // If buses table doesn't exist, try another common table
      const { error: error2 } = await supabase
        .from('bus_stops')
        .select('id')
        .limit(1)

      if (error2) {
        // Try one more table
        const { error: error3 } = await supabase
          .from('bus_routes')
          .select('id')
          .limit(1)

        if (error3) {
          return {
            connected: false,
            error: error.message || 'Unable to connect to Supabase. Please check your credentials and ensure tables exist.'
          }
        }
      }
    }
    
    return {
      connected: true,
      message: 'Successfully connected to Supabase'
    }
  } catch (err) {
    return {
      connected: false,
      error: err.message || 'Connection test failed'
    }
  }
}

/**
 * Get connection status with more details
 */
export async function getConnectionStatus() {
  const connection = await testSupabaseConnection()
  
  if (!connection.connected) {
    return connection
  }

  // Try to get table counts
  try {
    const [buses, routes, stops] = await Promise.all([
      supabase.from('buses').select('id', { count: 'exact', head: true }),
      supabase.from('bus_routes').select('id', { count: 'exact', head: true }),
      supabase.from('bus_stops').select('id', { count: 'exact', head: true })
    ])

    return {
      connected: true,
      message: 'Connected to Supabase',
      tables: {
        buses: buses.count || 0,
        routes: routes.count || 0,
        stops: stops.count || 0
      }
    }
  } catch (err) {
    return {
      connected: true,
      message: 'Connected to Supabase',
      warning: 'Could not fetch table information'
    }
  }
}

