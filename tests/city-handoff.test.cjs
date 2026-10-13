const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// The homepage → /platform-city handoff contract must equal what both scenes actually do.
const S = path.join(__dirname, '..', 'app/components/landing/sections');
const H = require(path.join(S, 'cityHandoff.ts'));
const { composeCity } = require(path.join(S, 'cyfro-city/registry/chunks.ts'));
const { TEASERS } = require(path.join(S, 'cyfro-city/registry/teasers.ts'));
const L = require(path.join(S, 'cyfro-city/registry/grid.ts'));
const read = (f) => fs.readFileSync(path.join(S, f), 'utf8');

test('the handoff shot is the city Engine chunk\'s own camera', () => {
  const eng = composeCity(TEASERS).chunks.find((c) => c.id === 'cyfro-ai-engine');
  assert.deepEqual(H.HANDOFF.target, eng.camera.target);
  assert.equal(H.HANDOFF.azimuthDeg, eng.camera.azimuth);
  assert.equal(H.HANDOFF.elevationDeg, eng.camera.elevation);
  assert.equal(H.HANDOFF.distance, eng.camera.distance);
  assert.equal(H.ENGINE_DECK, L.FOOT);
});

test('the Engine sits at the same place in both scenes (the frame offset, reversed)', () => {
  const m = /ENGINE_FRAME_OFFSET: \[number, number, number\] = \[([-\d.]+), ([-\d.]+), ([-\d.]+)\]/.exec(read('cyfro-city/chunks/cyfroAiEngine.ts'));
  assert.ok(m, 'ENGINE_FRAME_OFFSET found');
  assert.deepEqual(H.HOME_ENGINE_CHUNK_ORIGIN, [-Number(m[1]), -Number(m[2]), -Number(m[3])].map((v) => v + 0));
});

test('both scenes use the same camera model: field of view, portrait push-back and placement', () => {
  const city = read('cyfro-city/engine/createCity.ts'), home = read('platform-architecture-3d/CinematicScene.tsx');
  for (const src of [city, home]) assert.ok(src.includes('camera.fov = width < 600 ? 50 : 34'), 'fov rule');
  assert.equal(H.HANDOFF.fov(1200), 34); assert.equal(H.HANDOFF.fov(500), 50);
  assert.ok(city.includes('(camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1)') && home.includes('camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1'), 'portrait push-back');
  assert.equal(H.HANDOFF.narrow(0.5), 1 + 0.5 * 1.15); assert.equal(H.HANDOFF.narrow(1.6), 1);
  const placement = 'camera.position.set(cur.target[0] + Math.sin(cur.theta) * h, cur.target[1] + Math.sin(cur.elev) * d, cur.target[2] + Math.cos(cur.theta) * h);';
  for (const f of ['cyfro-city/engine/orbit.ts', 'platform-architecture-3d/orbit.ts']) assert.ok(read(f).includes(placement), f);
  const o = H.homeHandoffOrbit();
  assert.deepEqual(o.target.map((v) => +v.toFixed(6)), [0, 1.5, 0.4]);
});
