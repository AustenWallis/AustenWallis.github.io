const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('../assets/js/systems-physics.js');

// Exercise the production clock and renderer without a browser dependency.
// Only this test adds a private inspection hook; the public site has none.
function harness(width = 1176, height = 440, reducedMotion = false) {
  const source = fs.readFileSync(require.resolve('../assets/js/systems.js'), 'utf8');
  const listeners = {}, nodes = {}, frames = new Map(), alphaStack = [];
  let nextFrame = 0, paintCalls = 0, timestamp = 0;
  const context = new Proxy({ globalAlpha: 1 }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'save') return () => alphaStack.push(target.globalAlpha);
      if (key === 'restore') return () => { target.globalAlpha = alphaStack.pop(); };
      if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return (...args) => {
        paintCalls++;
        for (const v of args) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(key)} received ${v}`);
        if (key === 'arc') assert.ok(args[2] >= 0);
      };
    }
  });
  function node() {
    return { style: {}, attributes: {}, listeners: {}, children: [], disabled: false,
      offsetTop: width < 780 ? 24 : 40, offsetHeight: width < 300 ? 150 : 175,
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute(name, value) { this.attributes[name] = value; },
      replaceChildren(...children) { this.children = children; },
      append(child) { this.children.push(child); },
      click() { if (!this.disabled) this.listeners.click?.({}); },
      getBoundingClientRect: () => ({ width, height }), getContext: () => context
    };
  }
  const media = { matches: reducedMotion, addEventListener(name, fn) { this.change = fn; } };
  const root = { dataset: { activePage: 'about' }, querySelector: s => nodes[s] ||= node(), addEventListener: (name, fn) => listeners[name] = fn };
  const document = { hidden: false, getElementById: () => root, createTextNode: text => ({ textContent: text }), createElement: node, addEventListener: (name, fn) => listeners[name] = fn, fonts: { ready: { then() {} } } };
  const sandbox = {
    document, window: { AWPhysics: P, matchMedia: () => media, devicePixelRatio: 2 },
    getComputedStyle: () => ({ fontSize: '13.6667', getPropertyValue: () => '#b9ebf0' }),
    requestAnimationFrame: cb => { const id = ++nextFrame; frames.set(id, cb); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { observe() {} }, IntersectionObserver: class { observe() {} },
    sessionStorage: { getItem: () => 'seen', setItem() {} }
  };
  const hook = 'globalThis.inspect = { state: () => ({ scene, time, cycleElapsed, intro, transition, paused }), render: (index, t) => drawScene(index, view(), t), introFrame: t => computeIntro(view(), t), withoutDrawing: () => { draw = () => {}; }, resize, move, settle };';
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, hook + '\n})();'), sandbox);
  function advance(seconds) {
    for (let n = 0; n < Math.ceil(seconds * 60); n++) {
      timestamp += 1000 / 60;
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb(timestamp));
    }
  }
  return { nodes, document, media, listeners, frames, advance, api: sandbox.inspect, paintCalls: () => paintCalls, alphaStack };
}

test('all six scenes and the intro render finite geometry at phone, tablet and desktop sizes', () => {
  for (const [width, height] of [[195, 510], [280, 510], [500, 640], [1176, 440]]) {
    const h = harness(width, height);
    for (let scene = 0; scene < 6; scene++) for (const t of [0, 2.6, 7.5, 12]) h.api.render(scene, t);
    for (const t of [0, 1, 2.6, 3.3, 4.3, 4.8]) h.api.introFrame(t);
    assert.equal(h.alphaStack.length, 0, 'Canvas saves and restores stay balanced');
    assert.ok(h.paintCalls() > 10000);
  }
});

test('Pause freezes motion and cycling; a manual selection still settles while paused', () => {
  const h = harness(); h.api.withoutDrawing(); h.advance(.1);
  h.nodes['.bp-motion'].click(); const before = h.api.state(); h.advance(20);
  assert.equal(h.api.state().time, before.time); assert.equal(h.api.state().scene, 0);
  assert.equal(h.frames.size, 0);
  h.nodes['.bp-next'].click(); h.advance(.65);
  assert.equal(h.api.state().scene, 1); assert.equal(h.api.state().transition, null);
  assert.equal(h.api.state().paused, true); assert.equal(h.frames.size, 0);
});

test('automatic advance uses 15 seconds and Resume starts a fresh interval', () => {
  const h = harness(); h.api.withoutDrawing(); h.advance(14.8); assert.equal(h.api.state().scene, 0);
  h.nodes['.bp-motion'].click(); h.nodes['.bp-motion'].click(); h.advance(.5);
  assert.equal(h.api.state().scene, 0); assert.ok(h.api.state().cycleElapsed < .6);
  h.advance(14.5); h.advance(.7); assert.equal(h.api.state().scene, 1);
});

test('hidden pages suspend the clock without jumping the intro or orbit on return', () => {
  const h = harness(); h.api.withoutDrawing(); h.nodes['.bp-replay'].click(); h.advance(1);
  const elapsed = h.api.state().intro.elapsed;
  h.document.hidden = true; h.listeners.visibilitychange(); h.advance(60);
  near(h.api.state().intro.elapsed, elapsed);
  h.document.hidden = false; h.listeners.visibilitychange(); h.advance(.1);
  assert.ok(h.api.state().intro.elapsed < elapsed + .11);
  h.nodes['.bp-skip'].click(); assert.equal(h.api.state().intro, null);
  assert.equal(h.nodes['.bp-name'].style.opacity, '');
});

test('other sections keep the About canvas idle, including resize and visibility callbacks', () => {
  const h = harness(); h.advance(.1);
  const before = h.api.state(), painted = h.paintCalls();
  h.listeners['aw:pagechange']({ detail: { page: 'cv' } });
  h.advance(90);
  h.api.resize();
  h.document.hidden = true; h.listeners.visibilitychange();
  h.document.hidden = false; h.listeners.visibilitychange();
  assert.equal(h.frames.size, 0);
  assert.equal(h.paintCalls(), painted, 'a hidden About canvas must not be repainted');
  assert.equal(h.api.state().scene, before.scene);
  assert.equal(h.api.state().time, before.time);
  h.listeners['aw:pagechange']({ detail: { page: 'about' } });
  h.advance(.1);
  assert.ok(h.paintCalls() > painted);
  assert.ok(h.api.state().time > before.time);
});

test('reduced motion disables automatic movement but retains manual scene selection', () => {
  const h = harness(1176, 440, true);
  assert.equal(h.frames.size, 0); assert.equal(h.nodes['.bp-replay'].disabled, true);
  assert.equal(h.nodes['.bp-motion'].disabled, true);
  h.nodes['.bp-next'].click(); assert.equal(h.api.state().scene, 1);
  assert.equal(h.api.state().transition, null); assert.equal(h.frames.size, 0);
});
function near(a, b) { assert.ok(Math.abs(a - b) < 1e-9); }
