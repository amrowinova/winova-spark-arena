import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { logActivity, logFailure } from '@/lib/ai/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  lastAuthEvent: string | null;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ data: { user: User | null; session: Session | null } | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAuthEvent, setLastAuthEvent] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLastAuthEvent(event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    metadata?: Record<string, unknown>
  ) => {
    const t0 = Date.now();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: metadata,
        },
      });
      logActivity({ action_type: 'auth_signup', user_id: data?.user?.id, success: !error, error_code: error?.message, duration_ms: Date.now() - t0 });
      if (error) logFailure({ rpc_name: 'auth.signUp', error_message: error.message });
      return {
        data: data ? { user: data.user ?? null, session: data.session ?? null } : null,
        error: error as Error | null,
      };
    } catch (error) {
      logFailure({ rpc_name: 'auth.signUp', error_message: String(error) });
      return { data: null, error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const t0 = Date.now();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      logActivity({ action_type: 'auth_login', success: !error, error_code: error?.message, duration_ms: Date.now() - t0 });
      if (error) logFailure({ rpc_name: 'auth.signInWithPassword', error_message: error.message });
      return { error: error as Error | null };
    } catch (error) {
      logFailure({ rpc_name: 'auth.signInWithPassword', error_message: String(error) });
      return { error: error as Error };
    }
  };

  const signInWithOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      logActivity({ action_type: 'auth_password_reset', success: !error, error_code: error?.message });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    const uid = user?.id;
    await supabase.auth.signOut();
    logActivity({ action_type: 'auth_logout', user_id: uid, success: true });
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        lastAuthEvent,
        signUp,
        signIn,
        signInWithOtp,
        verifyOtp,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
