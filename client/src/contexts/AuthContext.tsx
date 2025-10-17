import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';

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
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 使用 useRef 来管理请求状态，避免依赖项问题
  const loadingUserIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadUserProfile = useCallback(async (userId: string) => {
    // 防止重复加载同一个用户
    if (loadingUserIdRef.current === userId) {
      console.log('[AuthContext] Already loading profile for user:', userId);
      return;
    }
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const newAbortController = new AbortController();
    abortControllerRef.current = newAbortController;
    loadingUserIdRef.current = userId;
    
    try {
      console.log('[AuthContext] Loading profile for user:', userId);

      const response = await apiRequest("GET", `/api/users/${userId}`, undefined, { signal: newAbortController.signal });
      
      // 检查是否已被取消
      if (newAbortController.signal.aborted) {
        console.log('[AuthContext] Request was cancelled after response');
        return;
      }
      
      const data = await response.json();
      const resolvedName = data.name || data.fullName || data.email?.split('@')[0] || '';
      setProfile({
        id: data.id,
        email: data.email,
        fullName: resolvedName,
        role: data.role || 'recruiter',
      });
      console.log('[AuthContext] Profile loaded successfully:', resolvedName);
    } catch (error: any) {
      // 如果是请求被取消，不处理错误
      if (error.name === 'AbortError' || newAbortController.signal.aborted) {
        console.log('[AuthContext] Request was cancelled');
        return;
      }
      
      console.error('[AuthContext] Error loading user profile:', error);
      
      // 如果是404错误，尝试创建新用户
      if (error.message && error.message.startsWith('404:')) {
        console.log('[AuthContext] User not found in database, creating...');
        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (user && !newAbortController.signal.aborted) {
            const createResponse = await apiRequest("POST", '/api/users', {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: 'recruiter',
            }, { signal: newAbortController.signal });

            if (!newAbortController.signal.aborted) {
              const newUser = await createResponse.json();
              console.log('[AuthContext] User created:', newUser);
              setProfile({
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.name || newUser.email?.split('@')[0],
                role: newUser.role || 'recruiter',
              });
            }
          }
        } catch (createError: any) {
          if (createError.name !== 'AbortError' && !newAbortController.signal.aborted) {
            console.error('[AuthContext] Failed to create user:', createError);
          }
        }
      }
    } finally {
      // 只有当前请求没有被取消时才更新状态
      if (!newAbortController.signal.aborted) {
        setLoading(false);
        loadingUserIdRef.current = null;
        abortControllerRef.current = null;
      }
    }
  }, []); // 移除依赖项，避免函数重新创建

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] Initial session:', session?.user?.id);
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state change:', event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
        loadingUserIdRef.current = null;
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

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

    if (data.user && data.session) {
      await apiRequest("POST", '/api/users', {
        id: data.user.id,
        email: data.user.email,
        name: fullName,
        role: 'recruiter',
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
