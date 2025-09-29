import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role: 'admin' | 'recruiter' | 'recruitment_lead' | 'hiring_manager';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('[AuthContext] Loading profile for user:', userId);
      const response = await fetch(`/api/users/${userId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('[AuthContext] Response status:', response.status);
      console.log('[AuthContext] Response content-type:', response.headers.get('content-type'));

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('[AuthContext] User data loaded:', data);
          setProfile({
            id: data.id,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
          });
        } else {
          console.error('[AuthContext] Expected JSON but got:', contentType);
          const text = await response.text();
          console.error('[AuthContext] Response body:', text.substring(0, 200));
        }
      } else if (response.status === 404) {
        console.log('[AuthContext] User not found in database, creating...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              id: user.id,
              email: user.email,
              fullName: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: 'recruiter',
            }),
          });

          if (createResponse.ok) {
            const newUser = await createResponse.json();
            console.log('[AuthContext] User created:', newUser);
            setProfile({
              id: newUser.id,
              email: newUser.email,
              fullName: newUser.fullName,
              role: newUser.role,
            });
          } else {
            console.error('[AuthContext] Failed to create user');
          }
        }
      } else {
        console.error('[AuthContext] Failed to load user profile, status:', response.status);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          fullName,
          role: 'recruiter',
        }),
      });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}