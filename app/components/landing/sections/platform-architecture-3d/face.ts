import { CanvasTexture, SRGBColorSpace, type MeshStandardMaterial, type Texture } from 'three';
import type { ReactorSignal } from './reactor';

/**
 * The engine's front display: a minimalist cyan bot face (two oval eyes, short brows, a small
 * smile on a dark screen) drawn into one reused canvas texture on the existing front panel.
 *
 * A small controller layers three things, each with its own timer so they never conflict:
 *   gaze  — idle look-around (hold 2–5 s, move over ~0.3 s), or the pointer when it is near;
 *   blink — every 3–7 s, sometimes double; never starts while the eyes are already closed;
 *   mood  — neutral | curious | happy | surprised | focused | sleepy, one at a time, temporary
 *           moods return to neutral.
 * Moods follow the reactor's real phase (reactor.ts): it looks up at the orb while charging,
 * is surprised at the discharge, then blinks and smiles during recovery.
 * Shapes are smoothed (never toggled) and the canvas repaints only when something changed (≤30 fps).
 * Reduced motion / paused: the neutral smiling face, static.
 */

export type Mood = 'neutral' | 'curious' | 'happy' | 'surprised' | 'focused' | 'sleepy';
type Shape = { open: number; tall: number; arc: number; browLift: number; browTilt: number; smileW: number; smileCurve: number; mouthO: number };

const MOODS: Record<Mood, Shape> = {
  neutral: { open: 1, tall: 1, arc: 0, browLift: 0, browTilt: 0, smileW: 1, smileCurve: 1, mouthO: 0 },
  curious: { open: 1, tall: 1.04, arc: 0, browLift: 0.6, browTilt: -0.15, smileW: 0.85, smileCurve: 0.7, mouthO: 0 },
  happy: { open: 1, tall: 1, arc: 1, browLift: 0.35, browTilt: 0, smileW: 1.35, smileCurve: 1.4, mouthO: 0 },
  surprised: { open: 1, tall: 1.16, arc: 0, browLift: 1, browTilt: 0, smileW: 0.6, smileCurve: 0, mouthO: 1 },
  focused: { open: 0.62, tall: 1, arc: 0, browLift: -0.2, browTilt: 1, smileW: 0.7, smileCurve: 0.55, mouthO: 0 },
  sleepy: { open: 0.42, tall: 1, arc: 0, browLift: -0.45, browTilt: -0.3, smileW: 0.9, smileCurve: 0.8, mouthO: 0 },
};

const hash = (a: number, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const CYAN = '#69c5d0', BG = '#07121d';

export function createFace(mat: MeshStandardMaterial) {
  const S = 320;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4;
  const prev = { map: mat.map as Texture | null, emissiveMap: mat.emissiveMap as Texture | null, transparent: mat.transparent, depthWrite: mat.depthWrite, emissive: mat.emissive.getHex(), emissiveIntensity: mat.emissiveIntensity, roughness: mat.roughness };
  // A built-in display: opaque, self-lit, slightly glossy
  mat.map = tex; mat.emissiveMap = tex; mat.emissive.set('#ffffff'); mat.emissiveIntensity = 0.85; mat.roughness = 0.35;
  mat.transparent = false; mat.depthWrite = true; mat.needsUpdate = true;

  // Current (smoothed) and target shape
  const cur: Shape & { gx: number; gy: number; blink: number; glow: number } = { ...MOODS.neutral, gx: 0, gy: 0, blink: 1, glow: 0 };
  let mood: Mood = 'neutral', moodUntil = 0, moodSource: 'reactor' | 'idle' | 'pointer' = 'idle';
  const gaze = { x: 0, y: 0, until: 0 };
  let nextBlink = 2.5, blinkStart = -1, blinkDouble = false;
  let prevT = -1, lastDraw = -1, seed = 1, dirty = true;
  let pointer: { x: number; y: number } | null = null, hoverHappy = false, wasOver = false;
  let pointerMovedAt = -1, lastPx = 0, lastPy = 0; // stop staring once the pointer rests
  let lastPhase = '', lastDischargeSeen = 1e9;

  const rnd = () => hash(seed++ * 0.917, 3.3);
  function setMood(m: Mood, until: number, source: typeof moodSource) {
    // one mood at a time; reactor moods win over idle ones, and a mood never re-triggers itself
    if (source === 'idle' && moodSource === 'reactor' && mood !== 'neutral') return;
    mood = m; moodUntil = until; moodSource = source;
  }
  function blink(t: number, double = false) { if (blinkStart >= 0) return; blinkStart = t; blinkDouble = double; }

  /** Draw the face from the current shape. */
  function draw() {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, S, S);
    const v = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.75); // faint screen falloff
    v.addColorStop(0, `rgba(105,197,208,${0.05 + cur.glow * 0.08})`); v.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, S, S);
    ctx.save();
    ctx.shadowColor = 'rgba(105,197,208,0.55)'; ctx.shadowBlur = S * (0.02 + cur.glow * 0.03);
    ctx.fillStyle = CYAN; ctx.strokeStyle = CYAN; ctx.lineCap = 'round';
    const gx = cur.gx * S * 0.07, gy = cur.gy * S * 0.055; // small range: the eyes never leave the screen
    const eyeY = S * 0.5 + gy, rx = S * 0.125, ryBase = S * 0.15 * cur.tall;
    const open = clamp(cur.open * cur.blink, 0.05, 1.2);
    for (const side of [-1, 1]) {
      const ex = S / 2 + side * S * 0.235 + gx;
      // Eye: an egg-shaped oval that squashes vertically (blink / sleepy / focused); below ~15% it becomes a soft curved line
      const ry = ryBase * open, h = cur.arc;
      if (h < 0.98) {
        ctx.globalAlpha = 1 - h;
        if (open > 0.15) {
          ctx.beginPath();
          ctx.ellipse(ex, eyeY + ryBase * (1 - open) * 0.35, rx, ry, 0, Math.PI, 0); // top half
          ctx.ellipse(ex, eyeY + ryBase * (1 - open) * 0.35, rx, ry * 1.06, 0, 0, Math.PI); // slightly fuller bottom, like the reference
          ctx.fill();
        } else {
          ctx.lineWidth = S * 0.028; ctx.beginPath(); ctx.moveTo(ex - rx * 0.95, eyeY + ryBase * 0.25); ctx.quadraticCurveTo(ex, eyeY + ryBase * 0.25 + S * 0.035, ex + rx * 0.95, eyeY + ryBase * 0.25); ctx.stroke();
        }
      }
      if (h > 0.02) { // happy: eyes become upward curves (∩)
        ctx.globalAlpha = h; ctx.lineWidth = S * 0.04; ctx.beginPath();
        ctx.moveTo(ex - rx * 0.9, eyeY + S * 0.035); ctx.quadraticCurveTo(ex, eyeY - S * 0.1, ex + rx * 0.9, eyeY + S * 0.035); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Brow: a short curved stroke that lifts, and tilts inward when focused
      const by = S * 0.285 + gy * 0.6 - cur.browLift * S * 0.04, bx = ex - gx * 0.4;
      const tilt = cur.browTilt * side * S * 0.025; // focused: inner ends lower
      ctx.globalAlpha = 0.75; ctx.lineWidth = S * 0.026; ctx.beginPath();
      ctx.moveTo(bx - S * 0.095, by + 4 + tilt * -1); ctx.quadraticCurveTo(bx, by - S * 0.022, bx + S * 0.095, by + 4 + tilt);
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // Mouth: a small smile that widens (happy) or becomes a small "o" (surprised)
    const my = S * 0.76 + gy * 0.4, mx = S / 2 + gx * 0.5, mw = S * 0.12 * cur.smileW;
    if (cur.mouthO < 0.98) {
      ctx.globalAlpha = 1 - cur.mouthO; ctx.lineWidth = S * 0.026; ctx.beginPath();
      ctx.moveTo(mx - mw, my - S * 0.01); ctx.quadraticCurveTo(mx, my + S * 0.055 * cur.smileCurve, mx + mw, my - S * 0.01); ctx.stroke();
    }
    if (cur.mouthO > 0.02) {
      ctx.globalAlpha = cur.mouthO; ctx.lineWidth = S * 0.024; ctx.beginPath(); ctx.ellipse(mx, my + S * 0.01, S * 0.032, S * 0.038, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    tex.needsUpdate = true;
  }

  function update(t: number, still: boolean, rs: ReactorSignal) {
    if (still) { // reduced motion / paused: the neutral smiling face, drawn once
      if (mood !== 'neutral' || dirty || cur.blink !== 1 || cur.gx !== 0 || cur.gy !== 0) {
        Object.assign(cur, MOODS.neutral, { gx: 0, gy: 0, blink: 1, glow: 0 }); mood = 'neutral'; blinkStart = -1; draw(); dirty = false;
      }
      prevT = t; return;
    }
    const dt = prevT < 0 || t < prevT ? 0 : Math.min(0.1, t - prevT); prevT = t;

    /* Reactor-driven moods (edges detected from the reactor's own phase and discharge clock) */
    if (rs.phase !== lastPhase) {
      if (rs.phase === 'charging') setMood('curious', t + 1.2, 'reactor');
      if (rs.phase === 'recovery') { blink(t, true); setMood('happy', t + 1.4, 'reactor'); }
      lastPhase = rs.phase;
    }
    if (rs.phase === 'charging' && mood === 'curious' && t > moodUntil - 0.05) setMood('focused', t + 1, 'reactor');
    if (rs.sinceDischarge < lastDischargeSeen && rs.sinceDischarge < 0.2) setMood('surprised', t + 0.75, 'reactor');
    lastDischargeSeen = rs.sinceDischarge;

    /* Temporary moods return to neutral; occasional idle moods during stable operation */
    if (mood !== 'neutral' && t > moodUntil) { mood = 'neutral'; moodSource = 'idle'; }
    if (mood === 'neutral' && rs.phase === 'stable' && !pointer && rnd() < dt * 0.06) setMood(rnd() < 0.5 ? 'sleepy' : 'curious', t + 1.4 + rnd(), 'idle');

    /* Pointer: gentle follow when near; a happy blink when it arrives on the machine */
    if (pointer && hoverHappy && !wasOver) { blink(t); setMood('happy', t + 1.5, 'pointer'); }
    wasOver = !!pointer && hoverHappy;

    /* Gaze: a moving pointer > charging (look up at the orb) > idle look-around */
    if (pointer && (Math.abs(pointer.x - lastPx) + Math.abs(pointer.y - lastPy) > 0.02 || pointerMovedAt < 0)) { pointerMovedAt = t; lastPx = pointer.x; lastPy = pointer.y; }
    const following = !!pointer && t - pointerMovedAt < 2.5; // after ~2.5 s of a resting pointer it looks around on its own again
    if (following && pointer) { gaze.x = clamp(pointer.x, -1, 1) * 0.8; gaze.y = clamp(pointer.y, -1, 1) * 0.7; gaze.until = t + 1.5; }
    else if (rs.phase === 'charging' || rs.phase === 'discharge') { gaze.x = 0; gaze.y = -0.95; gaze.until = t + 0.6; }
    else if (t > gaze.until) {
      const r = rnd();
      const [x, y] = r < 0.35 ? [0, 0] : r < 0.55 ? [-0.8, 0.05] : r < 0.75 ? [0.8, -0.05] : r < 0.88 ? [0.1, -0.7] : [-0.1, 0.6];
      gaze.x = x + (rnd() - 0.5) * 0.25; gaze.y = y + (rnd() - 0.5) * 0.2; gaze.until = t + 2 + rnd() * 3;
      if (rnd() < 0.3) blink(t); // a glance often comes with a blink
    }

    /* Blink: 3–7 s apart, sometimes double; never restarts while closed */
    if (blinkStart < 0 && t > nextBlink) { blink(t, rnd() < 0.18); }
    let blinkOpen = 1;
    if (blinkStart >= 0) {
      const d = 0.16, b = t - blinkStart, total = blinkDouble ? d * 2 + 0.1 : d;
      const local = blinkDouble && b > d + 0.1 ? b - d - 0.1 : b;
      blinkOpen = local < d ? 1 - Math.sin((local / d) * Math.PI) * 0.95 : 1;
      if (blinkDouble && b > d && b < d + 0.1) blinkOpen = 1;
      if (b > total) { blinkStart = -1; nextBlink = t + 3 + rnd() * 4; }
    }

    /* Smooth everything toward the target (transitions ~200–450 ms) */
    const target = MOODS[mood];
    const k = (rate: number) => 1 - Math.exp(-dt * rate);
    let changed = false;
    for (const key of Object.keys(target) as (keyof Shape)[]) {
      const nv = cur[key] + (target[key] - cur[key]) * k(9);
      if (Math.abs(nv - cur[key]) > 0.002) changed = true; cur[key] = nv;
    }
    const ngx = cur.gx + (gaze.x - cur.gx) * k(following ? 6 : 8), ngy = cur.gy + (gaze.y - cur.gy) * k(following ? 6 : 8);
    if (Math.abs(ngx - cur.gx) + Math.abs(ngy - cur.gy) > 0.002) changed = true;
    cur.gx = ngx; cur.gy = ngy;
    if (Math.abs(blinkOpen - cur.blink) > 0.002) changed = true;
    cur.blink = blinkOpen;
    const glow = Math.max(rs.flash, (rs.energy - 0.2) * 0.5);
    if (Math.abs(glow - cur.glow) > 0.01) changed = true;
    cur.glow = glow;
    mat.emissiveIntensity = 0.8 + 0.35 * rs.flash; // the display brightens subtly on discharge

    if ((changed || dirty) && (t - lastDraw >= 1 / 30 || t < lastDraw || blinkStart >= 0)) { draw(); lastDraw = t; dirty = false; }
  }

  draw();
  return {
    update,
    /** Pointer offset from the face in screen space (≈ −1..1 each way), or null when not near; `over` = on the machine. */
    setPointer(p: { x: number; y: number } | null, over: boolean) { if (!p) pointerMovedAt = -1; pointer = p; hoverHappy = over; },
    get mood() { return mood; },
    dispose() {
      Object.assign(mat, { map: prev.map, emissiveMap: prev.emissiveMap, transparent: prev.transparent, depthWrite: prev.depthWrite, emissiveIntensity: prev.emissiveIntensity, roughness: prev.roughness });
      mat.emissive.setHex(prev.emissive); mat.needsUpdate = true; tex.dispose();
    },
  };
}
