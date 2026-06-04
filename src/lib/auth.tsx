import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  name: string | null;
  initials: string | null;
  pin: string | null;
  role: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLocked: boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: profile, status: profileStatus } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, name, initials, pin, role')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch failed:', error.message);
      }
      return data as UserProfile;
    },
    enabled: !!user?.id,
    meta: { persist: true },
  });

  const resetIdleTimer = useCallback(() => {
    if (isLocked) return;
    if ((window as any).idleTimer) clearTimeout((window as any).idleTimer);
    (window as any).idleTimer = setTimeout(() => setIsLocked(true), IDLE_TIMEOUT_MS);
  }, [isLocked]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(event => document.removeEventListener(event, resetIdleTimer));
      if ((window as any).idleTimer) clearTimeout((window as any).idleTimer);
    };
  }, [resetIdleTimer]);

  const unlock = (enteredPin: string) => {
    if (!profile?.pin) return false;
    if (enteredPin === profile.pin) {
      setIsLocked(false);
      resetIdleTimer();
      return true;
    }
    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const isFullyLoading = isSessionLoading || (!!user && profileStatus === 'pending');

  return (
    <AuthContext.Provider value={{ session, user, profile: profile || null, isLocked, unlock, lock: () => setIsLocked(true), logout, isLoading: isFullyLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};