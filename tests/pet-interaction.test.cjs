const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('../assets/js/pet-physics.js');

function harness({ reduced = false, saved = null, storageBlocked = false, width = 1200, height = 800 } = {}) {
  const frames = new Map(); let serial = 0, now = 1000, stored = saved, mutation;
  function node() {
    return { style: {}, dataset: {}, attributes: {}, listeners: {}, hidden: true, captured: null,
      addEventListener(type, fn) { this.listeners[type] = fn; },
      setAttribute(key, value) { this.attributes[key] = value; },
      setPointerCapture(id) { this.captured = id; }, hasPointerCapture(id) { return this.captured === id; },
      releasePointerCapture() { this.captured = null; }, focus() { this.focused = true; },
      fire(type, data = {}) { this.listeners[type]?.({ preventDefault() {}, button: 0, isPrimary: true, pointerId: 1, timeStamp: now, ...data }); }
    };
  }
  const toggle = node(), pet = node(), layer = node(), sprite = node(), state = node();
  let clears = 0, drawing = 0;
  const ctx = new Proxy({}, { get(_, name) {
    if (name === 'createRadialGradient') return () => ({ addColorStop() {} });
    return (...args) => {
      if (name === 'clearRect') clears++; else drawing++;
      args.filter(a => typeof a === 'number').forEach(a => assert.ok(Number.isFinite(a), name));
    };
  }, set() { return true; } });
  const canvas = { getContext: () => ctx };
  layer.querySelector = s => ({ '.bp-pet': pet, '.bp-pet-body': sprite, canvas })[s];
  toggle.querySelector = () => state;
  const root = { querySelector: s => ({ '[data-pet-toggle]': toggle, '.bp-pet-layer': layer,
    '.bp-side': { getBoundingClientRect: () => ({ right: width <= 640 ? 80 : 220 }) } })[s] };
  const docEvents = {}, winEvents = {};
  const doc = { hidden: false, documentElement: { clientWidth: width }, getElementById: () => root,
    body: { gallery: false, classList: { contains: () => doc.body.gallery } },
    addEventListener: (key, fn) => docEvents[key] = fn };
  const media = { matches: reduced, addEventListener: (_, fn) => media.change = fn };
  const win = { AWPetPhysics: P, innerWidth: width, innerHeight: height, devicePixelRatio: 2,
    matchMedia: () => media, addEventListener: (key, fn) => winEvents[key] = fn };
  const sandbox = { document: doc, window: win, performance: { now: () => now },
    localStorage: { getItem() { if (storageBlocked) throw Error('blocked'); return stored; },
      setItem(_, value) { if (storageBlocked) throw Error('blocked'); stored = value; } },
    requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; }, cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} } };
  const source = fs.readFileSync(require.resolve('../assets/js/pet.js'), 'utf8');
  const hook = 'globalThis.inspect = { body, get: () => ({ active, enabled, pointer, particles: particles.length, trail: trail.length }) };';
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, hook + '\n})();'), sandbox);
  function advance(ms) {
    for (let t = 0; t < ms; t += 1000 / 60) {
      now += 1000 / 60; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now));
    }
  }
  return { pet, toggle, layer, state, media, doc, docEvents, win, winEvents, frames,
    api: sandbox.inspect, advance, mutation: () => mutation(), stored: () => JSON.parse(stored), clears: () => clears, drawing: () => drawing };
}

test('on/off cancels work, clears trails and persists across visits', () => {
  const h = harness();
  assert.equal(h.toggle.hidden, false); assert.equal(h.layer.hidden, false);
  h.pet.fire('keydown', { key: 'ArrowLeft', shiftKey: true }); h.advance(200);
  assert.ok(h.api.get().particles > 0);
  h.toggle.fire('click');
  assert.equal(h.layer.hidden, true); assert.equal(h.frames.size, 0); assert.equal(h.api.get().particles, 0);
  assert.equal(h.api.body.flying, false); assert.equal(h.stored().enabled, false);
  const next = harness({ saved: JSON.stringify(h.stored()) });
  assert.equal(next.layer.hidden, true); assert.equal(next.frames.size, 0);
  next.toggle.fire('click'); assert.equal(next.layer.hidden, false); assert.equal(next.frames.size, 1);
});

test('pointer dragging, slow placement, throwing and cancellation remain distinct', () => {
  const h = harness(), b = h.api.body;
  const drag = () => h.pet.fire('pointerdown', { clientX: b.x, clientY: b.y });
  drag(); h.advance(40);
  h.pet.fire('pointermove', { clientX: b.x - 80, clientY: b.y - 40 });
  h.advance(20); h.pet.fire('pointerup');
  assert.equal(b.flying, true); assert.ok(b.vx < -500);
  drag(); h.advance(40); h.pet.fire('pointermove', { clientX: b.x - 20, clientY: b.y });
  h.advance(150); h.pet.fire('pointerup');
  assert.equal(b.flying, false); assert.ok(b.sy < 0, 'Placement still squishes');
  drag(); h.pet.fire('pointermove', { clientX: 500, clientY: 200 }); h.pet.fire('pointercancel');
  assert.equal(b.flying, false); assert.equal(h.api.get().pointer, null); assert.equal(h.pet.captured, null);
});

test('a short touch flick includes the final finger position on release', () => {
  const h = harness({ width: 390, height: 844 }), b = h.api.body;
  const x = b.x, y = b.y;
  h.pet.fire('pointerdown', { pointerType: 'touch', clientX: x, clientY: y });
  h.advance(50);
  h.pet.fire('pointerup', { pointerType: 'touch', clientX: x - 65, clientY: y - 60 });
  assert.equal(b.flying, true);
  assert.ok(b.vx < -500 && b.vy < -500);
  assert.equal(h.pet.captured, null);
  const before = b.y;
  h.advance(100);
  assert.ok(b.y < before && h.api.get().particles > 0);
});

test('batched touch movement uses input timestamps rather than callback timing', () => {
  const h = harness({ width: 390, height: 844 }), b = h.api.body;
  const x = b.x, y = b.y;
  h.pet.fire('pointerdown', { pointerType: 'touch', clientX: x, clientY: y, timeStamp: 1000 });
  h.advance(160);
  // A busy frame can receive a whole gesture together, with older hardware samples.
  h.pet.fire('pointermove', { pointerType: 'touch', clientX: x - 65, clientY: y - 40, timeStamp: 1122,
    getCoalescedEvents: () => [
      { clientX: x - 20, clientY: y - 10, timeStamp: 1090 },
      { clientX: x - 40, clientY: y - 25, timeStamp: 1106 },
      { clientX: x - 65, clientY: y - 40, timeStamp: 1122 }
    ] });
  h.pet.fire('pointerup', { pointerType: 'touch', clientX: x - 85, clientY: y - 55, timeStamp: 1138 });
  assert.equal(b.flying, true);
  assert.ok(b.vx < -1000 && b.vy < -600);
});

test('a finger moving past the pet boundary still throws and rebounds on a narrow screen', () => {
  const h = harness({ width: 320, height: 700 }), b = h.api.body, y = b.y;
  h.pet.fire('pointerdown', { pointerType: 'touch', clientX: b.x, clientY: y });
  for (const x of [280, 302, 318]) {
    h.advance(50);
    h.pet.fire('pointermove', { pointerType: 'touch', clientX: x, clientY: y });
  }
  h.advance(16);
  h.pet.fire('pointerup', { pointerType: 'touch', clientX: 320, clientY: y });
  assert.equal(b.flying, true);
  assert.ok(b.vx > 200);
  assert.ok(b.x <= 320 - 37.968);
  h.advance(50);
  assert.ok(b.vx < 0, 'The outgoing throw rebounds from the edge');
});

test('touch placement, taps and interrupted gestures do not cause accidental throws', () => {
  const h = harness({ width: 390, height: 844 }), b = h.api.body;
  const x = b.x, y = b.y;
  h.pet.fire('pointerdown', { pointerType: 'touch', clientX: x, clientY: y });
  h.advance(40);
  h.pet.fire('pointermove', { pointerType: 'touch', clientX: x - 40, clientY: y });
  h.advance(84);
  h.pet.fire('pointerup', { pointerType: 'touch', clientX: x - 40, clientY: y });
  assert.equal(b.flying, false, 'Holding still before release places the pet');
  h.pet.fire('pointerdown', { pointerType: 'touch', clientX: b.x, clientY: b.y });
  h.pet.fire('pointerup', { pointerType: 'touch', clientX: b.x + 1, clientY: b.y, timeStamp: 1135 });
  assert.equal(b.flying, false, 'Minor tap jitter is not a throw');
  h.pet.fire('pointerdown', { pointerType: 'touch', clientX: b.x, clientY: b.y });
  h.advance(40);
  h.pet.fire('pointermove', { pointerType: 'touch', clientX: b.x - 40, clientY: b.y - 30 });
  h.pet.fire('pointercancel', { pointerType: 'touch' });
  assert.equal(b.flying, false);
  assert.equal(h.pet.captured, null);
});

test('hidden tabs and photo dialogs suspend work and resume without a time jump', () => {
  const h = harness(); h.pet.fire('keydown', { key: 'ArrowUp', shiftKey: true }); h.advance(100);
  h.doc.hidden = true; h.docEvents.visibilitychange();
  const y = h.api.body.y; h.advance(30000);
  assert.equal(h.frames.size, 0); assert.equal(h.api.body.y, y);
  h.doc.hidden = false; h.docEvents.visibilitychange(); h.advance(50);
  assert.equal(h.api.body.y, y);
  h.doc.body.gallery = true; h.mutation(); assert.equal(h.layer.hidden, true); assert.equal(h.frames.size, 0);
  h.doc.body.gallery = false; h.mutation(); assert.equal(h.layer.hidden, false);
});

test('reduced motion retains direct keyboard and drag control without momentum or effects', () => {
  const h = harness({ reduced: true, storageBlocked: true }), x = h.api.body.x;
  h.pet.fire('keydown', { key: 'ArrowLeft', shiftKey: true });
  assert.equal(h.api.body.x, x - 24); assert.equal(h.api.body.flying, false); assert.equal(h.frames.size, 0);
  const y = h.api.body.y;
  h.pet.fire('pointerdown', { pointerType: 'touch', clientX: h.api.body.x, clientY: y });
  h.advance(50);
  h.pet.fire('pointerup', { pointerType: 'touch', clientX: h.api.body.x - 60, clientY: y - 60 });
  assert.equal(h.api.body.y, y - 60);
  assert.equal(h.api.body.flying, false); assert.equal(h.frames.size, 0);
  h.pet.fire('click'); assert.equal(h.api.get().particles, 0);
  h.media.change({ matches: false }); assert.equal(h.frames.size, 1);
  h.pet.fire('keydown', { key: 'ArrowUp', shiftKey: true }); h.advance(100);
  h.media.change({ matches: true }); assert.equal(h.frames.size, 0); assert.equal(h.api.body.flying, false);
  h.pet.fire('keydown', { key: 'Escape' }); assert.equal(h.layer.hidden, true); assert.equal(h.toggle.focused, true);
});

test('malformed storage and a narrow resize keep the pet and its controls reachable', () => {
  for (const saved of ['{broken', '42', '{"x":99,"y":-1}', '[]']) {
    const h = harness({ saved });
    h.win.innerWidth = 320; h.doc.documentElement.clientWidth = 303; h.win.innerHeight = 630;
    h.winEvents.resize();
    assert.ok(h.api.body.x <= 303 - 37.968 && h.api.body.y <= 630 - 37.968);
    assert.equal(h.layer.hidden, false);
  }
});
