/**
 * Synthesizes the game's original sound effects as 16-bit mono WAV files.
 * Run: node scripts/generate-sounds.js
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([h, data]));
}

function render(seconds, fn) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / RATE, i / n);
  return out;
}

// Soft granular crumble: sparse filtered noise grains with a decaying envelope.
function land() {
  let lp = 0;
  return render(0.32, (t, p) => {
    const grain = Math.random() < 0.35 * (1 - p) ? rand() : rand() * 0.15;
    lp += (grain - lp) * 0.25;
    return lp * Math.pow(1 - p, 2) * 0.9;
  });
}

const tone = (f, t) => Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);

// Bright rising arpeggio with a sandy shimmer.
function clear() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  let lp = 0;
  return render(0.7, (t, p) => {
    let v = 0;
    notes.forEach((f, k) => {
      const start = k * 0.07;
      if (t >= start) v += tone(f, t - start) * Math.exp(-(t - start) * 6) * 0.22;
    });
    lp += (rand() - lp) * 0.5;
    return v + lp * 0.12 * (1 - p) * (1 - p);
  });
}

// Higher, quicker sparkle for chain reactions.
function chain() {
  const notes = [987.77, 1318.5, 1567.98, 1975.5];
  return render(0.5, (t) => {
    let v = 0;
    notes.forEach((f, k) => {
      const start = k * 0.05;
      if (t >= start) v += tone(f, t - start) * Math.exp(-(t - start) * 8) * 0.2;
    });
    return v;
  });
}

// Descending, muted tones.
function gameover() {
  const notes = [392, 329.63, 261.63, 196];
  return render(1.2, (t) => {
    let v = 0;
    notes.forEach((f, k) => {
      const start = k * 0.22;
      if (t >= start) v += Math.sin(2 * Math.PI * f * (t - start)) * Math.exp(-(t - start) * 3) * 0.3;
    });
    return v;
  });
}

// Tiny tick for rotation / UI.
function tick() {
  return render(0.05, (t, p) => Math.sin(2 * Math.PI * 1400 * t) * (1 - p) * 0.25);
}

fs.mkdirSync(OUT, { recursive: true });
writeWav('land.wav', land());
writeWav('clear.wav', clear());
writeWav('chain.wav', chain());
writeWav('gameover.wav', gameover());
writeWav('tick.wav', tick());
console.log('sounds written to', OUT);
