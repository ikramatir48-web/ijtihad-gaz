import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileLoadedFor = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        profileLoadedFor.current = null;
        setLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      if (event === 'USER_UPDATED' && session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    // Éviter de recharger si déjà chargé pour cet utilisateur
    if (profileLoadedFor.current === userId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data || null);
      profileLoadedFor.current = userId;
    } catch (err) {
      console.error('fetchProfile error:', err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (!user) return;
    profileLoadedFor.current = null;
    await fetchProfile(user.id);
  }

  async function signIn(email, password) {
    profileLoadedFor.current = null;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signUp(email, password, nom, telephone, extra = {}) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom, role: 'client', telephone, ...extra } },
    });
    return { error };
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth',
    });
    return { error };
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }

  async function signOut() {
    profileLoadedFor.current = null;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        fetchProfile: refreshProfile,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
