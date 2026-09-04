import { Vibration, Platform } from 'react-native';

class SoundService {
  private isPlaying: boolean = false;
  private audioCtx: any = null;
  private osc: any = null;
  private gainNode: any = null;
  private sirenInterval: any = null;

  /**
   * Start playing emergency evacuation / disaster siren.
   * - On Web / Browser: Synthesizes rising & falling dual-pitch siren tone via Web Audio API (600Hz <-> 960Hz)
   * - On Native (iOS/Android): Triggers looping urgent emergency vibration pattern
   */
  public playEmergencySiren() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // 1. Native Emergency Vibration
    try {
      // Pattern: wait 0ms, vibrate 600ms, pause 200ms, vibrate 600ms...
      Vibration.vibrate([0, 600, 200, 600, 200, 600], true);
    } catch (e) {
      console.warn('Vibration not supported on this platform:', e);
    }

    // 2. Web Audio Synthesizer (Zero-latency, no network download required)
    if (typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!this.audioCtx || this.audioCtx.state === 'closed') {
            this.audioCtx = new AudioContextClass();
          }

          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }

          const ctx = this.audioCtx;
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(650, ctx.currentTime);

          gainNode.gain.setValueAtTime(0.18, ctx.currentTime);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start();

          this.osc = osc;
          this.gainNode = gainNode;

          // Frequency modulation for real EAS disaster siren wail (650Hz to 960Hz sweep)
          let goingUp = true;
          this.sirenInterval = setInterval(() => {
            if (!this.osc || !this.audioCtx) return;
            try {
              const now = this.audioCtx.currentTime;
              const targetFreq = goingUp ? 960 : 650;
              this.osc.frequency.linearRampToValueAtTime(targetFreq, now + 0.45);
              goingUp = !goingUp;
            } catch (err) {
              // Context closed or node stopped
            }
          }, 450);
        }
      } catch (audioErr) {
        console.warn('Web Audio synthesis not allowed or supported:', audioErr);
      }
    }
  }

  /**
   * Immediately silence the emergency siren and stop all vibration.
   */
  public stopEmergencySiren() {
    this.isPlaying = false;

    // Cancel native vibration
    try {
      Vibration.cancel();
    } catch (e) {}

    // Cancel Web Audio Siren
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }

    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch (e) {}
      this.osc = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {}
      this.gainNode = null;
    }
  }

  public startEmergencySiren() {
    this.playEmergencySiren();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const soundService = new SoundService();
