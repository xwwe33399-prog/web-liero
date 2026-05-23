import { G } from "./globals";

let audioCtx: AudioContext | null = null;
let masterSFXGain: GainNode | null = null;
let masterMusicGain: GainNode | null = null;
let masterVictoryGain: GainNode | null = null;
let isMenuMusicPlaying = false;
let menuMusicInterval: any = null;

let melodyIndex = 0,
  bassIndex = 0;
let nextMelodyTime = 0,
  nextBassTime = 0;

let deathBuffer: AudioBuffer | null = null;
let minigunBuffer: AudioBuffer | null = null;
let bloodDieBuffer: AudioBuffer | null = null;
let bloodSplatterBuffer: AudioBuffer | null = null;
let lastSplatterTime = 0;

// Start prefetching audio assets immediately when module loads to eliminate network latency on first interactions
const deathPromise = fetch("wowhumandeath.mp3")
  .then((r) => r.arrayBuffer())
  .catch(() => null);
const bloodDiePromise = fetch("blooddie.mp3")
  .then((r) => r.arrayBuffer())
  .catch(() => null);
const bloodSplatterPromise = fetch("bloodsplatter.mp3")
  .then((r) => r.arrayBuffer())
  .catch(() => null);
const minigunPromise = fetch("minigun.mp3")
  .then((r) => r.arrayBuffer())
  .catch(() => null);

// Removes leading silence from decoded MP3 files (MP3 encoders naturally inject ~10-50ms padding at the start)
function trimSilence(buffer: AudioBuffer): AudioBuffer {
  if (!audioCtx) return buffer;
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  let earliestActiveSample = buffer.length;
  const threshold = 0.003; // detect anything above minimal noise floor

  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > threshold) {
        if (i < earliestActiveSample) {
          earliestActiveSample = i;
        }
        break;
      }
    }
  }

  // If no silence found, return original buffer
  if (earliestActiveSample === 0 || earliestActiveSample >= buffer.length) {
    return buffer;
  }

  const trimmedLength = buffer.length - earliestActiveSample;
  try {
    const trimmedBuffer = audioCtx.createBuffer(
      numChannels,
      trimmedLength,
      sampleRate,
    );
    for (let c = 0; c < numChannels; c++) {
      const srcData = buffer.getChannelData(c);
      const destData = trimmedBuffer.getChannelData(c);
      destData.set(srcData.subarray(earliestActiveSample));
    }
    return trimmedBuffer;
  } catch (e) {
    return buffer;
  }
}

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    masterSFXGain = audioCtx.createGain();
    masterMusicGain = audioCtx.createGain();
    masterVictoryGain = audioCtx.createGain();
    masterSFXGain.connect(audioCtx.destination);
    masterMusicGain.connect(audioCtx.destination);
    masterVictoryGain.connect(audioCtx.destination);
    updateAudioVolumes();

    try {
      deathPromise
        .then((b) => {
          if (b && audioCtx) return audioCtx.decodeAudioData(b.slice(0));
        })
        .then((buf) => {
          if (buf) deathBuffer = trimSilence(buf);
        })
        .catch(() => {});
      bloodDiePromise
        .then((b) => {
          if (b && audioCtx) return audioCtx.decodeAudioData(b.slice(0));
        })
        .then((buf) => {
          if (buf) bloodDieBuffer = trimSilence(buf);
        })
        .catch(() => {});
      bloodSplatterPromise
        .then((b) => {
          if (b && audioCtx) return audioCtx.decodeAudioData(b.slice(0));
        })
        .then((buf) => {
          if (buf) bloodSplatterBuffer = trimSilence(buf);
        })
        .catch(() => {});
      minigunPromise
        .then((b) => {
          if (b && audioCtx) return audioCtx.decodeAudioData(b.slice(0));
        })
        .then((buf) => {
          if (buf) minigunBuffer = trimSilence(buf);
        })
        .catch(() => {});
    } catch (e) {}
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

let activeMinigunSources = new Map<string, AudioBufferSourceNode>();
let lastMinigunShotTimes = new Map<string, number>();

export function stopMinigunCheck() {
  const now = Date.now();
  for (const [key, time] of lastMinigunShotTimes.entries()) {
    if (now - time > 150) {
      const src = activeMinigunSources.get(key);
      if (src) {
        try {
          src.stop();
        } catch (e) {}
      }
      activeMinigunSources.delete(key);
      lastMinigunShotTimes.delete(key);
    }
  }
}

setInterval(stopMinigunCheck, 50);

export function playExternalSound(name: string) {
  if (!audioCtx) return;

  if (name === "death") {
    if (deathBuffer) {
      const src1 = audioCtx.createBufferSource();
      src1.buffer = deathBuffer;
      src1.connect(masterSFXGain!);
      src1.start(0);
    }
    if (bloodDieBuffer) {
      const src2 = audioCtx.createBufferSource();
      src2.buffer = bloodDieBuffer;
      src2.connect(masterSFXGain!);
      src2.start(0);
    }
    return;
  }

  if (name === "bloodsplatter") {
    if (bloodSplatterBuffer) {
      const now = audioCtx.currentTime;
      let vol = 0.55;
      if (now - lastSplatterTime < 0.12) {
        vol = 0.15; // play softer if hit twice/very fast
      }
      lastSplatterTime = now;

      const src = audioCtx.createBufferSource();
      src.buffer = bloodSplatterBuffer;
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(vol, now);
      src.connect(gainNode);
      gainNode.connect(masterSFXGain!);
      src.start(0);
    }
    return;
  }

  const isMinigun = name.startsWith("minigun");
  const buf = isMinigun ? minigunBuffer : null;
  if (!buf) return;

  if (isMinigun) {
    const now = Date.now();
    if (!activeMinigunSources.has(name)) {
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(masterSFXGain!);
      src.start(0);
      activeMinigunSources.set(name, src);
    }
    lastMinigunShotTimes.set(name, now);
    return;
  }

  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(masterSFXGain!);
  src.start(0);
}

export function updateAudioVolumes() {
  if (masterSFXGain) masterSFXGain.gain.value = G.settingSfxVol / 10;
  if (masterMusicGain) masterMusicGain.gain.value = G.settingMusicVol / 10;
  if (masterVictoryGain)
    masterVictoryGain.gain.value = G.settingVictoryVol / 10;
}

const BPM = 148;
const BEAT = 60 / BPM;

const MELODY_NOTES = [
  [440, 0.5],
  [494, 0.5],
  [523, 1],
  [494, 0.5],
  [440, 0.5],
  [392, 0.5],
  [330, 0.5],
  [294, 1],
  [0, 0.5],
  [294, 0.5],
  [330, 0.5],
  [349, 0.5],
  [392, 0.5],
  [440, 0.5],
  [494, 1],
  [0, 0.75],
  [523, 0.25],
  [587, 0.5],
  [659, 0.5],
  [698, 0.5],
  [784, 0.5],
  [880, 1],
  [784, 0.5],
  [698, 0.5],
  [659, 0.5],
  [587, 0.5],
  [523, 1],
  [494, 0.5],
  [440, 0.5],
  [392, 1],
  [0, 0.5],
  [880, 0.25],
  [784, 0.25],
  [698, 0.25],
  [659, 0.25],
  [622, 0.25],
  [587, 0.25],
  [523, 0.25],
  [494, 0.25],
  [440, 0.5],
  [392, 0.5],
  [349, 0.5],
  [330, 0.5],
  [294, 1],
  [330, 0.5],
  [392, 0.5],
  [440, 2],
  [0, 0.5],
  [440, 0.25],
  [494, 0.25],
  [523, 0.25],
  [587, 0.25],
  [659, 1],
];
const BASS_NOTES = [
  [110, 2],
  [131, 2],
  [110, 1],
  [98, 1],
  [110, 2],
  [131, 2],
  [147, 2],
  [131, 1],
  [110, 1],
  [131, 2],
  [98, 2],
  [110, 4],
];

function schedNote(
  freq: number,
  dur: number,
  time: number,
  type: OscillatorType = "square",
  vol = 0.07,
  isSfx = false,
  isVictory = false,
) {
  if (!audioCtx || freq === 0) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const targetGain = isVictory
    ? masterVictoryGain!
    : isSfx
      ? masterSFXGain!
      : masterMusicGain!;
  osc.connect(g);
  g.connect(targetGain);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(vol, time);
  g.gain.setValueAtTime(vol, time + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.98);
  osc.start(time);
  osc.stop(time + dur + 0.01);
}

function schedDrum(time: number, isKick: boolean) {
  if (!audioCtx) return;

  if (isKick) {
    // Luodaan ja soitetaan kick-ääni
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g);
    g.connect(masterMusicGain!);

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.08);
    g.gain.setValueAtTime(0.3, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.1);
  } else {
    // Luodaan ja soitetaan hi-hat-ääni (suhina)
    const buf = audioCtx.createBuffer(
      1,
      audioCtx.sampleRate * 0.05,
      audioCtx.sampleRate,
    );
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const flt = audioCtx.createBiquadFilter();
    flt.type = "highpass";
    flt.frequency.value = 3000;
    const gg = audioCtx.createGain();
    gg.gain.setValueAtTime(0.1, time);
    gg.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    src.connect(flt);
    flt.connect(gg);
    gg.connect(masterMusicGain!);

    src.start(time);
    src.stop(time + 0.05);
  }
}

let drumStep = 0,
  nextDrumTime = 0;
const DRUM_PATTERN = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
const HAT_PATTERN = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];

export function startMenuMusic() {
  if (isMenuMusicPlaying || !audioCtx) return;
  isMenuMusicPlaying = true;
  melodyIndex = 0;
  bassIndex = 0;
  drumStep = 0;
  nextMelodyTime = audioCtx.currentTime + 0.12;
  nextBassTime = audioCtx.currentTime + 0.12;
  nextDrumTime = audioCtx.currentTime + 0.12;
  const LOOK = 0.4;
  menuMusicInterval = setInterval(() => {
    if (!isMenuMusicPlaying) {
      clearInterval(menuMusicInterval);
      return;
    }
    const now = audioCtx.currentTime;
    while (nextMelodyTime < now + LOOK) {
      const [f, b] = MELODY_NOTES[melodyIndex % MELODY_NOTES.length];
      const waveTypes: OscillatorType[] = [
        "square",
        "square",
        "sawtooth",
        "triangle",
      ];
      const wt =
        waveTypes[Math.floor((melodyIndex / MELODY_NOTES.length) * 4) % 4];
      schedNote(f, b * BEAT, nextMelodyTime, wt, 0.075);
      nextMelodyTime += b * BEAT;
      melodyIndex++;
    }
    while (nextBassTime < now + LOOK) {
      const [f, b] = BASS_NOTES[bassIndex % BASS_NOTES.length];
      schedNote(f * 0.5, b * BEAT * 0.75, nextBassTime, "sawtooth", 0.045);
      nextBassTime += b * BEAT;
      bassIndex++;
    }
    while (nextDrumTime < now + LOOK) {
      const si = drumStep % 16;
      if (DRUM_PATTERN[si]) schedDrum(nextDrumTime, true);
      if (HAT_PATTERN[si]) schedDrum(nextDrumTime, false);
      nextDrumTime += BEAT * 0.5;
      drumStep++;
    }
  }, 80);
}

export function stopMenuMusic() {
  isMenuMusicPlaying = false;
  if (menuMusicInterval) clearInterval(menuMusicInterval);
}

export function playSound(type: string) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const mkOscGain = (
    oscType: OscillatorType,
    freq: number,
    vol: number,
    dur: number,
    freqEnd?: number,
  ) => {
    const osc = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    osc.connect(g);
    g.connect(masterSFXGain!);
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  };

  if (type === "hover") mkOscGain("sine", 1000, 0.05, 0.04, 600);
  else if (type === "click") mkOscGain("square", 500, 0.1, 0.08, 200);
  else if (type === "shoot_handgun") {
    mkOscGain("square", 380, 0.25, 0.12, 80);
  } else if (type === "shoot_minigun") {
    mkOscGain("sawtooth", 200 + Math.random() * 60, 0.18, 0.1, 30);
  } else if (type === "shoot_sniper") {
    mkOscGain("sawtooth", 150, 0.5, 0.4, 30);
    mkOscGain("square", 800, 0.3, 0.2, 50);
  } else if (type === "shoot_gauss") {
    mkOscGain("square", 1400, 0.4, 0.3, 100);
    mkOscGain("sine", 1800, 0.2, 0.4, 400);
  } else if (type === "shoot_laser") {
    mkOscGain("square", 1200, 0.3, 0.3, 600);
    mkOscGain("sine", 2000, 0.1, 0.2, 800);
  } else if (type === "shoot_shotgun") {
    for (let i = 0; i < 3; i++)
      setTimeout(() => {
        if (audioCtx)
          mkOscGain("square", 150 + Math.random() * 80, 0.2, 0.12, 20);
      }, i * 10);
  } else if (type === "shoot_supershotgun") {
    for (let i = 0; i < 5; i++)
      setTimeout(() => {
        if (audioCtx)
          mkOscGain("square", 100 + Math.random() * 60, 0.4, 0.2, 10);
      }, i * 15);
    mkOscGain("sawtooth", 200, 0.5, 0.3, 50);
  } else if (type === "shoot_bazooka") {
    mkOscGain("sawtooth", 80, 0.4, 0.4, 250);
    mkOscGain("sine", 150, 0.4, 0.3, 400);
  } else if (type === "flame")
    mkOscGain("sawtooth", 100 + Math.random() * 200, 0.08, 0.08, 30);
  else if (type === "hit") mkOscGain("square", 90, 0.35, 0.1, 18);
  else if (type === "hitmarker") {
    mkOscGain("sawtooth", 320, 0.4, 0.06, 40);
    mkOscGain("square", 1200, 0.15, 0.04, 200);
  } else if (type === "empty") mkOscGain("sine", 350, 0.1, 0.06, 250);
  else if (type === "reload") mkOscGain("triangle", 180, 0.12, 0.35, 320);
  else if (type === "switch") mkOscGain("sine", 700, 0.1, 0.1, 900);
  else if (type === "shovel") mkOscGain("triangle", 220, 0.9, 0.12, 80);
  else if (type === "rock_hit") mkOscGain("square", 170, 0.1, 0.06, 50);
  else if (type === "casing_bounce")
    mkOscGain("triangle", 900, 0.04, 0.05, 500);
  else if (type === "grenade_bounce") mkOscGain("triangle", 130, 0.12, 0.1, 60);
  else if (type === "boomerang_throw") mkOscGain("sine", 900, 0.2, 0.4, 1200);
  else if (type === "rope_shoot") mkOscGain("sawtooth", 1400, 0.22, 0.18, 500);
  else if (type === "god_mode") mkOscGain("sawtooth", 600, 0.3, 0.6, 1400);
  else if (type === "rapid_fire") mkOscGain("square", 800, 0.25, 0.5, 1600);
  else if (type === "spawn") mkOscGain("square", 300, 0.2, 0.4, 600);
  else if (type === "shield_on") {
    mkOscGain("sine", 800, 0.3, 0.2, 1600);
    mkOscGain("square", 600, 0.15, 0.25, 1200);
  } else if (type === "countdown_beep")
    mkOscGain("square", 880, 0.3, 0.12, 660);
  else if (type === "countdown_go") {
    mkOscGain("square", 1320, 0.5, 0.3, 880);
    mkOscGain("sawtooth", 660, 0.3, 0.2, 330);
  } else if (type === "sticky_beep") mkOscGain("square", 1100, 0.2, 0.05, 700);
  else if (type === "implode") {
    mkOscGain("sine", 100, 0.5, 2.0, 1000);
  } else if (type === "explosion_bam") {
    playExplosion("BAM");
  } else if (type === "explosion_huge") {
    playExplosion("HUGE");
  } else if (type === "explosion_puff") {
    playExplosion("PUFF");
  } else if (type === "explosion_grenade") {
    playExplosion("GRENADE");
  }
}

function playExplosion(type: string) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const sLen = audioCtx.sampleRate * 0.8;
  const buf = audioCtx.createBuffer(1, sLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < sLen; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = "lowpass";
  const g = audioCtx.createGain();
  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.connect(og);
  og.connect(masterSFXGain!);
  src.connect(flt);
  flt.connect(g);
  g.connect(masterSFXGain!);

  if (type === "BAM") {
    // Add heavy sub bass punch
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
    subGain.gain.setValueAtTime(2.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    subOsc.connect(subGain);
    subGain.connect(masterSFXGain!);
    subOsc.start(now);
    subOsc.stop(now + 0.45);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 0.85);
    og.gain.setValueAtTime(2.2, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    flt.frequency.setValueAtTime(1800, now);
    flt.frequency.exponentialRampToValueAtTime(25, now + 0.85);
    g.gain.setValueAtTime(4.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  } else if (type === "HUGE") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(1, now + 1.5);
    og.gain.setValueAtTime(2.0, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    flt.frequency.setValueAtTime(800, now);
    flt.frequency.exponentialRampToValueAtTime(10, now + 1.5);
    g.gain.setValueAtTime(4.0, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  } else if (type === "GRENADE") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    og.gain.setValueAtTime(1.0, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    flt.frequency.setValueAtTime(1500, now);
    flt.frequency.exponentialRampToValueAtTime(80, now + 0.5);
    g.gain.setValueAtTime(2.0, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  } else {
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 0.3);
    og.gain.setValueAtTime(0.5, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    flt.frequency.setValueAtTime(450, now);
    flt.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    g.gain.setValueAtTime(1.0, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  }
  osc.start(now);
  osc.stop(now + 1.5);
  src.start(now);
  src.stop(now + 1.5);
}

export function playWinMusic() {
  if (!audioCtx) return;
  const melody = [
    523, 659, 784, 880, 784, 659, 523, 440, 494, 523, 659, 784, 880, 988, 880,
    1046,
  ];
  const now = audioCtx.currentTime;
  for (let i = 0; i < melody.length; i++) {
    schedNote(
      melody[i],
      BEAT * 0.45,
      now + i * BEAT * 0.5,
      "square",
      0.6,
      false,
      true,
    );
    schedNote(
      melody[i] / 2, // bass octave
      BEAT * 0.45,
      now + i * BEAT * 0.5,
      "sawtooth",
      0.5,
      false,
      true,
    );
  }
}
