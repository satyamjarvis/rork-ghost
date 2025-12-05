import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let letterTapSound: Audio.Sound | null = null;
let opponentLetterSound: Audio.Sound | null = null;
let roundWinSound: Audio.Sound | null = null;
let pointsPopSounds: Audio.Sound[] = [];

export const initializeSounds = async () => {
  try {
    if (Platform.OS === 'web') {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
      });
    } else {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    }

    letterTapSound = new Audio.Sound();
    await letterTapSound.loadAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
      { shouldPlay: false }
    );

    opponentLetterSound = new Audio.Sound();
    await opponentLetterSound.loadAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3' },
      { shouldPlay: false }
    );

    roundWinSound = new Audio.Sound();
    await roundWinSound.loadAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3' },
      { shouldPlay: false }
    );

    // Load ascending pitch pop sounds for points cascade
    const popSoundUrls = [
      'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // base pop
      'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // slightly higher
      'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3', // medium
      'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3', // higher
      'https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3', // coin/ding
    ];
    
    for (const url of popSoundUrls) {
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: url }, { shouldPlay: false });
      pointsPopSounds.push(sound);
    }

    console.log('[Sounds] All sounds loaded successfully');
  } catch (error) {
    console.error('[Sounds] Error loading sounds:', error);
  }
};

export const playLetterTapSound = async () => {
  try {
    if (letterTapSound) {
      await letterTapSound.setPositionAsync(0);
      await letterTapSound.playAsync();
    }
  } catch (error) {
    console.error('[Sounds] Error playing letter tap:', error);
  }
};

export const playOpponentLetterSound = async () => {
  try {
    if (opponentLetterSound) {
      await opponentLetterSound.setPositionAsync(0);
      await opponentLetterSound.playAsync();
    }
  } catch (error) {
    console.error('[Sounds] Error playing opponent letter:', error);
  }
};

export const playRoundWinSound = async () => {
  try {
    if (roundWinSound) {
      await roundWinSound.setPositionAsync(0);
      await roundWinSound.playAsync();
    }
  } catch (error) {
    console.error('[Sounds] Error playing round win:', error);
  }
};

export const playPointsTickSound = async (tickIndex: number = 0, totalTicks: number = 10) => {
  try {
    if (pointsPopSounds.length === 0) return;
    
    // Calculate which sound to play based on progress through the cascade
    // Start with lower pitched sounds and progress to higher pitched ones
    const progress = totalTicks > 1 ? tickIndex / (totalTicks - 1) : 0;
    const soundIndex = Math.min(
      Math.floor(progress * pointsPopSounds.length),
      pointsPopSounds.length - 1
    );
    
    const sound = pointsPopSounds[soundIndex];
    if (sound) {
      await sound.setPositionAsync(0);
      // Increase playback rate slightly as we progress for ascending pitch effect
      const playbackRate = 0.8 + (progress * 0.6); // 0.8 to 1.4
      await sound.setRateAsync(playbackRate, true);
      await sound.playAsync();
    }
  } catch (error) {
    console.error('[Sounds] Error playing points pop:', error);
  }
};

export const unloadSounds = async () => {
  try {
    if (letterTapSound) await letterTapSound.unloadAsync();
    if (opponentLetterSound) await opponentLetterSound.unloadAsync();
    if (roundWinSound) await roundWinSound.unloadAsync();
    for (const sound of pointsPopSounds) {
      await sound.unloadAsync();
    }
    pointsPopSounds = [];
  } catch (error) {
    console.error('[Sounds] Error unloading sounds:', error);
  }
};
