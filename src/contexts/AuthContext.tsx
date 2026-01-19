import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'employee' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  profile: { full_name: string; email: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleData) {
      setUserRole(roleData.role as UserRole);
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer data fetching to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error && data.user) {
      // Create profile
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        full_name: fullName,
        email: email,
      });

      // Create default employee role
      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: 'employee',
      });

      // Create hours balance
      await supabase.from('hours_balance').insert({
        user_id: data.user.id,
        balance_minutes: 0,
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
