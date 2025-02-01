import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  onAuthComplete?: () => void;
}

export function Auth({ onAuthComplete }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Clear any existing sessions on mount
  useEffect(() => {
    const clearSession = async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error clearing session:', err);
      }
    };
    clearSession();
  }, []);

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Client-side validation
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }

      if (!isValidEmail(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!formData.password) {
        throw new Error('Password is required');
      }

      setLoading(true);

      // First check if session exists and clear it
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Error clearing existing session:', signOutError);
      }

      // Try to sign in with small delay to ensure session is cleared
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(), // Normalize email
        password: formData.password
      });

      if (signInError) {
        // Handle specific error cases
        switch (signInError.message) {
          case 'Invalid login credentials':
            throw new Error('Invalid email or password');
          case 'Email not confirmed':
            throw new Error('Please verify your email address');
          case 'Too many requests':
            throw new Error('Too many attempts. Please try again later');
          default:
            throw signInError;
        }
      }

      if (!data.session) {
        throw new Error('Failed to create session');
      }

      // Verify session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Failed to verify session');
      }

      // Clear form and errors on success
      setFormData({ email: '', password: '' });
      setError(null);
      onAuthComplete?.();
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      
      // Attempt to clear session on error
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.error('Error clearing session after failed login:', signOutErr);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
          <div className="text-center mb-8">
            <Lock className="h-12 w-12 mx-auto mb-4 text-indigo-400" />
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-white/60 mt-2">
              Sign in to access your account
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    setError(null);
                  }}
                  className="w-full bg-white/10 rounded-lg pl-10 pr-4 py-2 border border-white/20 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-colors"
                  placeholder="you@example.com"
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, password: e.target.value }));
                    setError(null);
                  }}
                  className="w-full bg-white/10 rounded-lg pl-10 pr-12 py-2 border border-white/20 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-colors"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`
                w-full flex items-center justify-center gap-2 px-6 py-3 
                rounded-lg font-medium transition-all
                ${loading 
                  ? 'bg-indigo-600/50 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_4px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none'
                }
              `}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}