export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.engineGain = null;
    this.siren = null;
    this.sirenGain = null;
    this.rotor = null;
    this.rotorGain = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    this.engine = this.ctx.createOscillator();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 60;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 620;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engine.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engine.start();

    this.siren = this.ctx.createOscillator();
    this.siren.type = 'triangle';
    this.siren.frequency.value = 620;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.siren.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.siren.start();

    this.rotor = this.ctx.createOscillator();
    this.rotor.type = 'square';
    this.rotor.frequency.value = 38;
    const rotorFilter = this.ctx.createBiquadFilter();
    rotorFilter.type = 'lowpass';
    rotorFilter.frequency.value = 240;
    this.rotorGain = this.ctx.createGain();
    this.rotorGain.gain.value = 0;
    this.rotor.connect(rotorFilter);
    rotorFilter.connect(this.rotorGain);
    this.rotorGain.connect(this.master);
    this.rotor.start();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
  }

  tone(freq, duration, type = 'sine', volume = 0.2, endFreq = freq) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  noise(duration, volume = 0.25, cutoff = 900) {
    if (!this.ctx) return;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index++) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  pickup() {
    this.tone(660, 0.1, 'sine', 0.22);
    setTimeout(() => this.tone(990, 0.16, 'sine', 0.2), 90);
  }

  crash() {
    this.noise(0.28, 0.32, 700);
    this.tone(90, 0.24, 'square', 0.16, 45);
  }

  punch() {
    this.noise(0.09, 0.18, 1600);
    this.tone(180, 0.08, 'square', 0.12, 80);
  }

  mission() {
    this.tone(523, 0.14, 'triangle', 0.18);
    setTimeout(() => this.tone(659, 0.14, 'triangle', 0.18), 130);
    setTimeout(() => this.tone(784, 0.28, 'triangle', 0.2), 260);
  }

  fail() {
    this.tone(320, 0.22, 'sawtooth', 0.14, 240);
    setTimeout(() => this.tone(180, 0.4, 'sawtooth', 0.14, 90), 200);
  }

  click() { this.tone(480, 0.06, 'square', 0.1, 620); }

  ability() { this.tone(420, 0.22, 'sine', 0.18, 880); }

  update(dt, info) {
    if (!this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const drive = info.driving ? 1 : 0;
    const speed = Math.min(1, Math.abs(info.speed || 0) / 40);
    const engineTarget = drive ? 0.035 + speed * 0.1 : 0.012;
    this.engine.frequency.setTargetAtTime(58 + speed * 150 + (drive ? 12 : 0), now, 0.08);
    this.engineGain.gain.setTargetAtTime(engineTarget, now, 0.1);
    const sirenTarget = info.wanted > 0 ? 0.06 + Math.min(info.wanted, 5) * 0.008 : 0;
    this.siren.frequency.setTargetAtTime(520 + Math.sin(now * 7) * 180, now, 0.05);
    this.sirenGain.gain.setTargetAtTime(sirenTarget, now, 0.15);
    const rotorTarget = info.heli ? 0.11 : 0;
    this.rotor.frequency.setTargetAtTime(info.heli ? 34 + speed * 8 : 20, now, 0.2);
    this.rotorGain.gain.setTargetAtTime(rotorTarget, now, 0.25);
  }
}
