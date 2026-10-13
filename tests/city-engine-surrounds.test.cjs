const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

// CyfroAI Engine platform surrounds (chunks/engineSurroundsPlan.ts): layout, activity, and the Engine left untouched.
const C = path.join(__dirname, '..', 'app/components/landing/sections/cyfro-city');
const P = require(path.join(C, 'chunks/engineSurroundsPlan.ts'));
const { STORY } = require(path.join(C, 'registry/story.ts'));
const { FLOWS } = require(path.join(C, 'registry/flows.ts'));
const { composeCity } = require(path.join(C, 'registry/chunks.ts'));
const { TEASERS } = require(path.join(C, 'registry/teasers.ts'));
const ENGINE = composeCity(TEASERS).chunks.find((c) => c.id === 'cyfro-ai-engine');
const sideOf = Object.fromEntries(ENGINE.ports.map((p) => [p.id, p.side]));

// rectangles on the deck (x0, x1, z0, z1)
const inDevice = (x, z) => x > P.DEVICE.x0 && x < P.DEVICE.x1 && z > P.DEVICE.z0 && z < P.DEVICE.z1;
const rect = (x, z, w, d) => [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];
const DEV = [P.DEVICE.x0, P.DEVICE.x1, P.DEVICE.z0, P.DEVICE.z1];
const inside = (r) => r[0] >= -P.HALF + 0.05 && r[1] <= P.HALF - 0.05 && r[2] >= -P.HALF + 0.05 && r[3] <= P.HALF - 0.05;

test('the CyfroAI Engine builder is byte-for-byte the approved file', () => {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(C, 'chunks/cyfroAiEngine.ts'))).digest('hex');
  assert.equal(h, 'bc4abfcb57425fb2d4cfbcbddc0614cbe4c22969e32154fa42edcae76d2df706', 'chunks/cyfroAiEngine.ts changed — the Engine is a protected asset');
  const idx = fs.readFileSync(path.join(C, 'chunks/index.ts'), 'utf8');
  assert.ok(idx.includes('cyfroAiEngine: withEngineSurrounds(buildCyfroAiEngine)'), 'surrounds wrap the unchanged builder');
});

test('every new detail stays on the Engine chunk, off the device, and lower than the Engine', () => {
  const boxes = [
    ...P.AUX.map((a) => ['aux ' + a.id, rect(a.x, a.z, a.w, a.d)]),
    ...P.HATCHES.map((h) => ['hatch', rect(h.x, h.z, h.s, h.s)]),
    ['terminal', rect(P.TERMINAL.x, P.TERMINAL.z, 0.7, 0.55)],
  ];
  for (const [n, r] of boxes) { assert.ok(inside(r), n + ' inside the chunk'); assert.ok(!overlaps(r, DEV), n + ' clear of the Engine device'); }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlaps(boxes[i][1], boxes[j][1]), boxes[i][0] + ' / ' + boxes[j][0]);
  for (const a of P.AUX) assert.ok(a.h + 0.06 < P.MAX_HEIGHT && a.z < P.DEVICE.z0, 'cooling modules are low and behind the Engine');
  assert.ok(P.TERMINAL.base + 0.08 + P.TERMINAL.h / 2 + 0.04 < P.MAX_HEIGHT && P.TERMINAL.z > P.DEVICE.z1 && Math.abs(P.TERMINAL.x) > P.DEVICE.x1, 'terminal is small, in a front corner');
  for (const path_ of P.TRACES) for (const [x, z] of path_) { assert.ok(!inDevice(x, z), 'trace point off the device'); assert.ok(Math.abs(x) < P.HALF && Math.abs(z) < P.HALF); }
  for (const [side, c] of Object.entries(P.CONDUITS)) { for (const [x, z] of [c.from, c.to]) assert.ok(!inDevice(x, z) && Math.abs(x) <= P.HALF && Math.abs(z) <= P.HALF, 'conduit ' + side); }
});

test('conduits serve only the Engine’s four verified AI ports and end where those ports dock', () => {
  assert.deepEqual(Object.keys(P.CONDUITS).sort(), ['e', 'n', 's', 'w']);
  assert.deepEqual(Object.values(sideOf).sort(), ['e', 'n', 's', 'w']);
  for (const p of ENGINE.ports) {
    const [x, z] = P.CONDUITS[p.side].to, o = (p.offset ?? 0) * 2 * P.HALF;
    if (p.side === 'n' || p.side === 's') assert.ok(Math.abs(x - o) < 1e-9, p.id); else assert.ok(Math.abs(z - o) < 0.01, p.id);
  }
});

test('activity follows the story: the right conduits light, and the terminal runs Ready → received → processing → response → Ready', () => {
  const W = P.engineWindows(STORY, FLOWS, sideOf);
  assert.deepEqual(Object.keys(W).sort(), ['c-draft', 'i-ask', 'i-insights']);
  assert.deepEqual([...new Set(W['i-insights'].map((w) => w.side))].sort(), ['n', 's']);
  assert.deepEqual([...new Set(W['c-draft'].map((w) => w.side))].sort(), ['n', 'w']);
  assert.deepEqual([...new Set(W['i-ask'].map((w) => w.side))], ['e']);
  for (const id of ['i-insights', 'c-draft']) {
    const seen = [];
    for (let p = 0; p < 1; p += 0.005) { const st = P.surroundState({ still: false, beats: [id], progress: p }, W).diag; if (seen[seen.length - 1] !== st) seen.push(st); }
    assert.deepEqual(seen, ['ready', 'received', 'processing', 'response'], id);
  }
  assert.equal(P.surroundState({ still: false, beats: [], progress: 0.5 }, W).diag, 'ready', 'returns to Ready between steps');
  assert.equal(P.surroundState({ still: true, beats: ['i-insights'], progress: 0.5 }, W).diag, 'ready', 'paused: Ready');
  const other = STORY.find((s) => !W[s.id]);
  assert.equal(P.surroundState({ still: false, beats: [other.id], progress: 0.5 }, W).busy, 0, 'no motion for steps that do not touch the Engine');
});

test('the Engine\'s support details reveal in stages during its opening, and are simply there without an intro', () => {
  const { OPENING } = require(path.join(C, 'registry/assembly.ts'));
  const order = ['floor', 'panels', 'terminal', 'modules', 'lights'];
  for (let i = 1; i < order.length; i++) assert.ok(P.REVEAL[order[i]][0] > P.REVEAL[order[i - 1]][0], `${order[i]} starts after ${order[i - 1]}`);
  for (const [k, [a, b]] of Object.entries(P.REVEAL)) { assert.ok(a >= 0.4, `${k}: the Engine holds alone first`); assert.ok(b <= OPENING - 0.3, `${k}: done before the first platform rises`); assert.ok(b > a); }
  assert.ok(P.REVEAL.boot[0] >= P.REVEAL.terminal[0], 'the screen boots once the monitor is rising');
  for (const v of Object.values(P.revealAt(0))) assert.equal(v, 0, 'nothing but the Engine at the start');
  for (const v of Object.values(P.revealAt(null))) assert.equal(v, 1, 'no intro (skip / reduced motion / prototype): everything in place');
  for (const v of Object.values(P.revealAt(OPENING))) assert.equal(v, 1, 'all in place when the first platform arrives');
  // monotone: never disappears again while the intro advances
  let prev = P.revealAt(0); for (let t = 0; t <= OPENING; t += 0.05) { const r = P.revealAt(t); for (const k of Object.keys(r)) assert.ok(r[k] >= prev[k] - 1e-9, k); prev = r; }
});
