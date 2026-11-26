// sound-synth.js — engine hum and event beeps from WebAudio oscillators. No audio files,
// nothing to download; sound starts on the first pilot gesture and M mutes it.

export function createSoundEngine() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function resume() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(ctx.destination);
        engineOsc.start();
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      ctx = null;
    }
  }

  function setEngine(throttle, airborne) {
    if (!ctx || !engineOsc) return;
    const target = muted ? 0 : 0.015 + throttle * 0.05;
    engineGain.gain.setTargetAtTime(airborne || throttle > 0.05 ? target : 0, ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(55 + throttle * 95, ctx.currentTime, 0.1);
  }

  function beep(freq, dur = 0.12) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* sound is decoration */ }
  }

  function thud() {
    beep(72, 0.25);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return { resume, setEngine, beep, thud, toggleMute };
}
