const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../assets/js/pet-physics.js');
const bounds = { minX: 140, maxX: 900, minY: 50, maxY: 700 };

test('fast throws remain bounded, rebound and eventually settle', () => {
  for (const velocity of [[2200, 1800], [-2200, -1600], [0, 2200], [1e9, -1e9]]) {
    const b = P.create(600, 400);
    P.launch(b, ...velocity);
    assert.ok(Math.hypot(b.vx, b.vy) <= 2200.001);
    let hits = 0;
    for (let i = 0; i < 1800; i++) {
      hits += P.step(b, 1 / 60, bounds).length;
      for (const value of Object.values(b)) assert.ok(typeof value !== 'number' || Number.isFinite(value));
      assert.ok(b.x >= bounds.minX && b.x <= bounds.maxX);
      assert.ok(b.y >= bounds.minY && b.y <= bounds.maxY);
      assert.ok(1 + b.sx > 0.5 && 1 + b.sy > 0.5);
    }
    assert.ok(hits > 0);
    assert.equal(b.flying, false);
    assert.ok(Math.abs(b.sx) < 0.001 && Math.abs(b.sy) < 0.001);
  }
});

test('compression follows the contact axis, scales with force and springs back', () => {
  const gentle = P.create(500, 400), hard = P.create(500, 400), wall = P.create(500, 400);
  P.squash(gentle, 0, -1, 150); P.squash(hard, 0, -1, 1400); P.squash(wall, 1, 0, 1400);
  assert.ok(hard.sy < gentle.sy && hard.sx > gentle.sx);
  assert.ok(wall.sx < 0 && wall.sy > 0);
  const first = hard.sy;
  let overshoot = false;
  for (let i = 0; i < 180; i++) { P.step(hard, 1 / 60, bounds); overshoot ||= hard.sy > 0; }
  assert.ok(first < -0.2 && overshoot, 'A hard impact compresses then elastically overshoots');
  assert.equal(hard.sy, 0);
  assert.equal(hard.y, 400, 'A gentle placement does not start a fall');
});

test('flight and elastic response are stable across display frame rates', () => {
  const results = [30, 60, 120].map(hz => {
    const b = P.create(500, 200); P.launch(b, 650, 180);
    for (let i = 0; i < hz * 2; i++) P.step(b, 1 / hz, bounds);
    return b;
  });
  for (const b of results) {
    assert.ok(Math.abs(b.x - results[0].x) < 0.01);
    assert.ok(Math.abs(b.y - results[0].y) < 0.01);
  }
});

test('release velocity distinguishes a quick throw from a paused placement', () => {
  const samples = [{ x: 300, y: 200, t: 1000 }, { x: 350, y: 220, t: 1050 }, { x: 400, y: 240, t: 1100 }];
  const quick = P.releaseVelocity(samples, 1110);
  assert.equal(quick.vx, 1000); assert.equal(quick.vy, 400);
  assert.deepEqual(P.releaseVelocity(samples, 1200), { vx: 0, vy: 0 });
  assert.deepEqual(P.releaseVelocity(samples.slice(-1), 1100), { vx: 0, vy: 0 });
});

test('a flick sampled within one high-refresh frame keeps its release velocity', () => {
  assert.deepEqual(P.releaseVelocity([{ x: 300, y: 200, t: 1000 }, { x: 292, y: 192, t: 1008 }], 1008), { vx: -1000, vy: -1000 });
  assert.deepEqual(P.releaseVelocity([{ x: 300, y: 200, t: 1000 }, { x: 292, y: 192, t: 1000 }], 1000), { vx: 0, vy: 0 });
});

test('resizing and invalid saved coordinates cannot strand the pet outside the viewport', () => {
  const b = P.create(Infinity, NaN);
  P.constrain(b, bounds);
  assert.equal(b.x, bounds.minX); assert.equal(b.y, bounds.minY);
  P.launch(b, NaN, Infinity); P.step(b, NaN, bounds);
  assert.equal(b.flying, false);
  const narrow = { minX: 125, maxX: 270, minY: 45, maxY: 300 };
  b.x = 900; b.y = 700; P.constrain(b, narrow);
  assert.equal(b.x, 270); assert.equal(b.y, 300);
});
