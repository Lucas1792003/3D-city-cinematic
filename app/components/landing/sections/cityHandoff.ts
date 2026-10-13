/**
 * The homepage → /platform-city handoff contract. Shared by the homepage architecture scene (its outro) and the
 * city page (its first frame), so the visitor sees one continuous shot: the homepage camera ends exactly where
 * the city's assembly cinematic begins.
 *
 * Both scenes use the same camera model (orbit: target + azimuth/elevation/distance, the same field of view and
 * the same portrait push-back) and the same world units. The CyfroAI Engine is placed identically: the city's
 * Engine chunk is the homepage Processing zone moved by ENGINE_FRAME_OFFSET (−0.3, 0, +0.6), so the Engine
 * chunk's origin is the homepage point HOME_ENGINE_CHUNK_ORIGIN.
 *
 * Import-free (no three.js, no registry) so the homepage does not download the city; a test keeps these numbers
 * equal to the registry's Engine camera (registry/chunks.ts) and the Engine frame offset.
 */
export const HANDOFF = {
  /** the city's opening shot of the Engine, relative to the Engine chunk's origin (registry: cyfro-ai-engine.camera) */
  target: [-0.3, 1.5, 1.0] as [number, number, number],
  azimuthDeg: 14.5,
  elevationDeg: 31.7,
  distance: 7.23,
  /** vertical field of view: 34°, or 50° on stages narrower than 600 px (both scenes) */
  fov: (stageWidth: number) => (stageWidth < 600 ? 50 : 34),
  /** portrait screens push the camera back by the same factor in both scenes */
  narrow: (aspect: number) => (aspect < 1 ? 1 + (1 - aspect) * 1.15 : 1),
} as const;
/** the city Engine chunk's origin, in homepage world coordinates */
export const HOME_ENGINE_CHUNK_ORIGIN: [number, number, number] = [0.3, 0, -0.6];
/** the Engine chunk's square deck (FOOT) */
export const ENGINE_DECK = 5.4;

/** the homepage camera pose that equals the city's first frame */
export function homeHandoffOrbit() {
  const [ox, oy, oz] = HOME_ENGINE_CHUNK_ORIGIN, [tx, ty, tz] = HANDOFF.target;
  return { target: [ox + tx, oy + ty, oz + tz] as [number, number, number], theta: (HANDOFF.azimuthDeg * Math.PI) / 180, elev: (HANDOFF.elevationDeg * Math.PI) / 180, dist: HANDOFF.distance };
}

/** window event: detail `true` asks the site nav for its full-width top state (during the outro), `false` releases it */
export const NAV_TOP_EVENT = 'cyfro:nav-top';

/* ── the handoff itself: a one-shot record in sessionStorage ── */
const KEY = 'cyfro-city-handoff';
const STAGE_KEY = 'cyfro-city-stage';
/** how long a handoff stays valid (covers a slow route load; a later reload never replays it) */
const FRESH_MS = 20000;
/** `to`: which page continues the shot. `rect`: where the city stage was (home-bound: the homepage stage starts there). */
export type Handoff = { t: number; img: string | null; dark: boolean; to: 'city' | 'home'; rect?: StageRect };

export function writeHandoff(img: string | null, dark: boolean, to: 'city' | 'home' = 'city', rect?: StageRect) {
  const rec: Handoff = { t: Date.now(), img, dark, to, rect };
  try { sessionStorage.setItem(KEY, JSON.stringify(rec)); }
  catch { try { sessionStorage.setItem(KEY, JSON.stringify({ ...rec, img: null })); } catch { /* storage unavailable: plain navigation */ } }
}
/** read (the city page clears it with clearHandoff once its first frame is showing) */
export function readHandoff(to: 'city' | 'home'): Handoff | null {
  try {
    const raw = sessionStorage.getItem(KEY); if (!raw) return null;
    const h = JSON.parse(raw) as Handoff;
    return (h.to ?? 'city') === to && Date.now() - h.t < FRESH_MS ? h : null;
  } catch { return null; }
}
export function clearHandoff() { try { sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ } }

/** where the city page's 3D stage sits for a viewport size (measured by the city page itself, for the next handoff) */
export type StageRect = { top: number; left: number; width: number; height: number };
const vpKey = (w: number, h: number) => `${w}x${h}`;
export function rememberCityStage(r: StageRect) {
  try { const all = JSON.parse(sessionStorage.getItem(STAGE_KEY) || '{}'); all[vpKey(window.innerWidth, window.innerHeight)] = r; sessionStorage.setItem(STAGE_KEY, JSON.stringify(all)); } catch { /* optional */ }
}
/** the city stage rect for this viewport: measured if the city page has been seen at this size, else its CSS rule */
export function expectedCityStage(): StageRect {
  try { const r = JSON.parse(sessionStorage.getItem(STAGE_KEY) || '{}')[vpKey(window.innerWidth, window.innerHeight)]; if (r) return r; } catch { /* estimate below */ }
  const width = document.documentElement.clientWidth, height = Math.max(440, window.innerHeight - 226); // City.module.css: .pageStage
  return { top: width < 700 ? 250 : width < 1100 ? 243 : width < 1400 ? 229 : 218, left: 0, width, height };
}

/* ── the way back: /platform-city → the homepage's Platform Architecture section ── */
/** the homepage section the city returns to (PlatformArchitectureDetail → ArchitectureCinematic) */
export const ARCH_SECTION_ID = 'architecture-detail';
export const HOME_RETURN_URL = `/#${ARCH_SECTION_ID}`;
/** scroll position that centres an element of the homepage in the viewport, below the fixed site nav */
export function centredScrollTop(el: Element, navBottom = 88) {
  const r = el.getBoundingClientRect(), top = r.top + window.scrollY, room = window.innerHeight - navBottom;
  return Math.max(0, Math.round(top - navBottom - Math.max(0, (room - r.height) / 2)));
}
