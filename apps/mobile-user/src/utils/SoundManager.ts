import { Vibration, Alert, Platform } from 'react-native';

class SoundManagerClass {
  // Vibration Patterns: [delay, vibrate, delay, vibrate, ...]
  
  // A gentle double pulse for pending approval
  playPending() {
    Vibration.vibrate([0, 100, 100, 100]);
    console.log('[SoundManager] Pending approval vibration triggered');
  }

  // A rapid triple pulse for confirmed booking
  playConfirmed() {
    Vibration.vibrate([0, 60, 50, 60, 50, 200]);
    console.log('[SoundManager] Confirmed booking vibration triggered');
  }

  // A long warning pulse for starting service
  playStart() {
    Vibration.vibrate([0, 300]);
    console.log('[SoundManager] Service start vibration triggered');
  }

  // A cheerful rhythmic pattern for completed service
  playCompleted() {
    Vibration.vibrate([0, 100, 50, 100, 50, 300]);
    console.log('[SoundManager] Service completed vibration triggered');
  }
}

export const SoundManager = new SoundManagerClass();
