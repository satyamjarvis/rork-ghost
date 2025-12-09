import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_MUTED_KEY = '@ghostGame:musicMuted';

export const [AudioContext, useAudio] = createContextHook(() => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const loadMutePreference = async () => {
      try {
        const savedMuted = await AsyncStorage.getItem(MUSIC_MUTED_KEY);
        if (savedMuted !== null) {
          const muted = JSON.parse(savedMuted);
          console.log('[Audio] Loaded mute preference:', muted);
          setIsMuted(muted);
        }
      } catch (error) {
        console.error('[Audio] Error loading mute preference:', error);
      }
    };

    loadMutePreference();
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
    }
  }, []);

  const initializeAudio = useCallback(async () => {
    try {
      console.log('[Audio] Configuring audio mode...');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      console.log('[Audio] Creating sound object...');
      const audioUrl = 'https://raw.githubusercontent.com/drobstl/rork-ghost/main/Super%20Ghost%20Theme%201.mp3';
      console.log('[Audio] Loading from URL:', audioUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { 
          isLooping: true, 
          shouldPlay: false,
          volume: 0.5,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsLoaded(true);
      console.log('[Audio] Sound loaded successfully');

      return sound;
    } catch (error) {
      console.error('[Audio] Error initializing audio:', error);
      return null;
    }
  }, [onPlaybackStatusUpdate]);

  const playMusic = useCallback(async () => {
    if (!soundRef.current) {
      console.log('[Audio] Sound not loaded, initializing...');
      const sound = await initializeAudio();
      if (!sound) return;
    }

    try {
      const savedMuted = await AsyncStorage.getItem(MUSIC_MUTED_KEY);
      const shouldBeMuted = savedMuted !== null ? JSON.parse(savedMuted) : false;
      
      if (!shouldBeMuted && soundRef.current) {
        console.log('[Audio] Starting playback...');
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('[Audio] Error playing music:', error);
    }
  }, [initializeAudio]);

  const pauseMusic = useCallback(async () => {
    if (soundRef.current) {
      try {
        console.log('[Audio] Pausing music...');
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('[Audio] Error pausing music:', error);
      }
    }
  }, []);

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    try {
      await AsyncStorage.setItem(MUSIC_MUTED_KEY, JSON.stringify(newMuted));
      console.log('[Audio] Saved mute preference:', newMuted);

      if (soundRef.current) {
        if (newMuted) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('[Audio] Error toggling mute:', error);
    }
  }, [isMuted]);

  const setMuted = useCallback(async (muted: boolean) => {
    setIsMuted(muted);

    try {
      await AsyncStorage.setItem(MUSIC_MUTED_KEY, JSON.stringify(muted));
      console.log('[Audio] Saved mute preference:', muted);

      if (soundRef.current) {
        if (muted) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('[Audio] Error setting mute:', error);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('[Audio] App state changed:', appStateRef.current, '->', nextAppState);

      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        if (soundRef.current && isPlaying) {
          console.log('[Audio] App going to background, pausing...');
          await soundRef.current.pauseAsync();
        }
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (soundRef.current && !isMuted) {
          console.log('[Audio] App coming to foreground, resuming...');
          await soundRef.current.playAsync();
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isMuted, isPlaying]);

  useEffect(() => {
    const setup = async () => {
      await initializeAudio();
      
      const savedMuted = await AsyncStorage.getItem(MUSIC_MUTED_KEY);
      const shouldBeMuted = savedMuted !== null ? JSON.parse(savedMuted) : false;
      
      if (!shouldBeMuted && soundRef.current) {
        console.log('[Audio] Auto-playing music on startup...');
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    };

    setup();

    return () => {
      if (soundRef.current) {
        console.log('[Audio] Unloading sound...');
        soundRef.current.unloadAsync();
      }
    };
  }, [initializeAudio]);

  return {
    isMuted,
    isLoaded,
    isPlaying,
    toggleMute,
    setMuted,
    playMusic,
    pauseMusic,
  };
});
