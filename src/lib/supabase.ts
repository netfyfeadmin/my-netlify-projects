import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.');
}

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'digital-scoreboard'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Health check function with improved error handling
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      if (error.message.includes('Failed to fetch')) {
        console.error('Network error connecting to Supabase:', error);
        return false;
      }
      
      if (error.message.includes('Invalid JWT')) {
        // Session is invalid but connection works
        return true;
      }
      
      console.error('Supabase auth error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error checking Supabase connection:', err);
    return false;
  }
}

// Reconnection helper with exponential backoff
export async function waitForConnection(
  maxAttempts = 5,
  initialInterval = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Checking connection (attempt ${i + 1}/${maxAttempts})...`);
    
    if (await checkSupabaseConnection()) {
      console.log('Connection restored!');
      return true;
    }

    if (i < maxAttempts - 1) {
      const backoffDelay = initialInterval * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  console.error('Failed to establish connection after multiple attempts');
  return false;
}

// Auto-reconnect subscription setup with improved error handling
let reconnectTimeout: number | null = null;

export function setupAutoReconnect() {
  // Clear any existing reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    }
  });

  // Listen for realtime subscription changes
  supabase.channel('system')
    .on('system', { event: '*' }, async (payload) => {
      if (payload.event === 'disconnected') {
        console.log('Disconnected from Supabase realtime');
        
        // Set up reconnection attempt with debouncing
        if (!reconnectTimeout) {
          reconnectTimeout = window.setTimeout(async () => {
            try {
              const connected = await waitForConnection();
              if (!connected) {
                console.error('Failed to reconnect to Supabase');
              }
            } catch (err) {
              console.error('Error during reconnection:', err);
            } finally {
              reconnectTimeout = null;
            }
          }, 1000);
        }
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to system channel');
      }
    });
}

// Initialize auto-reconnect
setupAutoReconnect();