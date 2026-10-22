class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Skid sound nodes
  private skidNode: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;

  // Nitro sound nodes
  private nitroNoise: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;

  private isRunning: boolean = false;
  private currentVehicleType: 'car' | 'bike' = 'car';

  constructor() {
    // Initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSound();
      this.setupSkidSound();
      this.setupNitroSound();
    } catch {
      // Audio not supported or blocked
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private setupEngineSound() {
    if (!this.ctx || !this.masterGain) return;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineSub = this.ctx.createOscillator();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineSub.type = 'sine';

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineSub.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  private setupSkidSound() {
    if (!this.ctx || !this.masterGain) return;

    // Procedural white noise buffer for tire friction
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.skidNode = this.ctx.createBufferSource();
    this.skidNode.buffer = noiseBuffer;
    this.skidNode.loop = true;
    this.skidNode.connect(filter);
    filter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    this.skidNode.start();
  }

  private setupNitroSound() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.nitroNoise = this.ctx.createBufferSource();
    this.nitroNoise.buffer = noiseBuffer;
    this.nitroNoise.loop = true;
    this.nitroNoise.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    this.nitroNoise.start();
  }

  public setVehicleType(type: 'car' | 'bike') {
    this.currentVehicleType = type;
  }

  public startEngine() {
    this.init();
    this.resume();
    this.isRunning = true;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0.25, this.ctx.currentTime, 0.1);
    }
  }

  public stopEngine() {
    this.isRunning = false;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
    if (this.skidGain && this.ctx) {
      this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    if (this.nitroGain && this.ctx) {
      this.nitroGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  public updateEngine(speedKmH: number, maxSpeedKmH: number, throttle: number, isDrifting: boolean, isNitro: boolean) {
    if (!this.ctx || !this.isRunning) return;

    const normSpeed = Math.min(Math.max(speedKmH / Math.max(maxSpeedKmH, 100), 0), 1.2);
    const isBike = this.currentVehicleType === 'bike';

    // Simulated 6-gear system for sound pitch
    const gearCount = 6;
    const gearFraction = 1 / gearCount;
    const currentGearIdx = Math.min(Math.floor(normSpeed / gearFraction), gearCount - 1);
    const speedInGear = (normSpeed - currentGearIdx * gearFraction) / gearFraction;
    const rpm = 0.25 + speedInGear * 0.75 + (throttle > 0 ? 0.08 : 0);

    const now = this.ctx.currentTime;

    if (this.engineOsc1 && this.engineOsc2 && this.engineSub && this.engineFilter) {
      // Bikes rev higher (screaming inline-4 / V4 up to 600Hz base), Cars deeper V8/V10 (55Hz - 320Hz)
      const baseFreq = isBike ? 95 : 55;
      const targetFreq = baseFreq + rpm * (isBike ? 420 : 250);

      this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(targetFreq * (isBike ? 1.5 : 1.01), now, 0.05);
      this.engineSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.05);

      const filterFreq = 300 + rpm * (isBike ? 4000 : 2600) + (isNitro ? 1200 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);
    }

    if (this.skidGain) {
      const targetSkid = isDrifting ? Math.min(0.35, normSpeed * 0.4) : 0;
      this.skidGain.gain.setTargetAtTime(targetSkid, now, 0.05);
    }

    if (this.nitroGain) {
      const targetNitro = isNitro ? 0.4 : 0;
      this.nitroGain.gain.setTargetAtTime(targetNitro, now, 0.06);
    }
  }

  public playBlowOff() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const node = this.ctx.createBufferSource();
      const length = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.3));
      }
      node.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2200, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      node.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      node.start();
    } catch {}
  }

  public playCrash(intensity: number = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

      gain.gain.setValueAtTime(Math.min(intensity * 0.4, 0.5), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(now + 0.35);
    } catch {}
  }

  public playCountdown(isGo: boolean = false) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.4 : 0.2));

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(now + (isGo ? 0.4 : 0.2));
    } catch {}
  }

  public playVictory() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(now + 0.45);
      }, idx * 110);
    });
  }

  public playClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(now + 0.05);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
