import { Vibration, Alert, Platform } from 'react-native';

class SoundManagerClass {
  // Gentle double pulse for new queue booking updates (needs attention)
  playPending() {
    Vibration.vibrate([0, 120, 80, 120]);
    console.log('[Admin SoundManager] New booking/pending update vibration triggered');
  }

  // Success chime pulse for confirmed actions
  playConfirmed() {
    Vibration.vibrate([0, 80, 60, 80, 200]);
    console.log('[Admin SoundManager] Action confirmation vibration triggered');
  }

  // Long feedback pulse for service starting
  playStart() {
    Vibration.vibrate([0, 350]);
    console.log('[Admin SoundManager] Service start vibration triggered');
  }

  // Celebratory feedback pattern for service completed
  playCompleted() {
    Vibration.vibrate([0, 120, 60, 120, 60, 350]);
    console.log('[Admin SoundManager] Service completion vibration triggered');
  }
}

export const SoundManager = new SoundManagerClass();
