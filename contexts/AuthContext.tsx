import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { supabase, Profile } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsUsername, setNeedsUsername] = useState<boolean>(false);

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('[Auth] Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[Auth] No profile found, user needs to create username');
          setNeedsUsername(true);
          return null;
        }
        console.error('[Auth] Error fetching profile:', error);
        return null;
      }

      console.log('[Auth] Profile found:', data.username);
      setProfile(data);
      setNeedsUsername(false);
      return data;
    } catch (err) {
      console.error('[Auth] Exception fetching profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log('[Auth] Initializing auth state');
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Auth] Got session:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] Auth state changed:', _event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setNeedsUsername(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithApple = useCallback(async () => {
    console.log('[Auth] Starting Apple Sign In');
    
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Apple Sign In is only available on iOS devices');
      return { error: new Error('Apple Sign In not available on web') };
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Auth] Got Apple credential');

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          console.error('[Auth] Supabase sign in error:', error);
          return { error };
        }

        console.log('[Auth] Supabase sign in success:', data.user?.id);
        return { data };
      }

      return { error: new Error('No identity token received') };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('[Auth] User canceled Apple Sign In');
        return { error: null };
      }
      console.error('[Auth] Apple Sign In error:', error);
      return { error };
    }
  }, []);

  const createProfile = useCallback(async (username: string, displayName?: string) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    console.log('[Auth] Creating profile with username:', username);

    try {
      const { data: available } = await supabase
        .rpc('check_username_available', { check_username: username });

      if (!available) {
        return { error: new Error('Username is already taken') };
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: username.toLowerCase(),
          display_name: displayName || username,
        })
        .select()
        .single();

      if (error) {
        console.error('[Auth] Error creating profile:', error);
        return { error };
      }

      console.log('[Auth] Profile created:', data.username);
      setProfile(data);
      setNeedsUsername(false);
      return { data };
    } catch (err: any) {
      console.error('[Auth] Exception creating profile:', err);
      return { error: err };
    }
  }, [user]);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Sign out error:', error);
    }
    setProfile(null);
    setNeedsUsername(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return {
    session,
    user,
    profile,
    isLoading,
    needsUsername,
    isAuthenticated: !!session && !!profile,
    signInWithApple,
    createProfile,
    signOut,
    refreshProfile,
  };
});
