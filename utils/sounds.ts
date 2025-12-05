import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let letterTapSound: Audio.Sound | null = null;
let opponentLetterSound: Audio.Sound | null = null;
let roundWinSound: Audio.Sound | null = null;
let pointsTickSound: Audio.Sound | null = null;

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

    pointsTickSound = new Audio.Sound();
    await pointsTickSound.loadAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
      { shouldPlay: false }
    );

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

export const playPointsTickSound = async () => {
  try {
    if (pointsTickSound) {
      await pointsTickSound.setPositionAsync(0);
      await pointsTickSound.playAsync();
    }
  } catch (error) {
    console.error('[Sounds] Error playing points tick:', error);
  }
};

export const unloadSounds = async () => {
  try {
    if (letterTapSound) await letterTapSound.unloadAsync();
    if (opponentLetterSound) await opponentLetterSound.unloadAsync();
    if (roundWinSound) await roundWinSound.unloadAsync();
    if (pointsTickSound) await pointsTickSound.unloadAsync();
  } catch (error) {
    console.error('[Sounds] Error unloading sounds:', error);
  }
};
