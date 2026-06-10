import { Vibration, Alert, Platform } from 'react-native';
import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

class SoundManagerClass {
  private bellSound: Sound | null = null;

  constructor() {
    // Load the sound file 'booking_bell.ogg' from the app bundle
    this.bellSound = new Sound('booking_bell.ogg', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('[Admin SoundManager] failed to load the sound', error);
        return;
      }
    });
  }

  // Double pulse & Sound for new queue booking updates
  playPending() {
    Vibration.vibrate([0, 120, 80, 120]);
    if (this.bellSound) {
      this.bellSound.stop(() => {
        this.bellSound?.play();
      });
    }
    console.log('[Admin SoundManager] New booking/pending update vibration & sound triggered');
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
