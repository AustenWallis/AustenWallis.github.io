const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync(require.resolve('../assets/js/script.js'), 'utf8');
const galleryScript = script.slice(script.indexOf('  // Photographs remain normal links'), script.indexOf('  const ORCID_ID'));

function galleryHarness() {
  let focused = null;
  const pending = [];
  function element(properties = {}) {
    const events = new Map(), attributes = new Map();
    return {
      dataset: {}, style: { setProperty() {} },
      addEventListener(type, handler) { events.set(type, handler); },
      emit(type, overrides = {}) {
        const event = { button: 0, prevented: false, preventDefault() { this.prevented = true; }, ...overrides };
        events.get(type)?.(event);
        return event;
      },
      setAttribute(name, value) { attributes.set(name, value); },
      getAttribute(name) { return attributes.get(name); },
      focus() { focused = this; },
      ...properties
    };
  }
  const image = element(), title = element(), caption = element(), count = element();
  const close = element(), previous = element(), next = element();
  const children = new Map([
    ['.bp-lightbox-image', image], ['#gallery-title', title], ['.bp-gallery-caption', caption], ['.bp-gallery-count', count],
    ['[data-gallery-close]', close], ['[data-gallery-previous]', previous], ['[data-gallery-next]', next]
  ]);
  const gallery = element({
    open: false, querySelector: selector => children.get(selector),
    showModal() { this.open = true; },
    close() { this.open = false; this.emit('close'); }
  });
  const links = ['one', 'two', 'three'].map(name => {
    const preview = element({ src: `${name}-480.webp`, currentSrc: `${name}-800.webp`, alt: `Photo ${name}` });
    preview.setAttribute('width', '1400'); preview.setAttribute('height', '900');
    const figure = { querySelector: selector => ({ img: preview, h3: { textContent: name }, 'figcaption p': { textContent: `Caption ${name}` } })[selector] };
    return element({ href: `${name}.jpg`, closest: () => figure });
  });
  const classes = new Set();
  const document = { body: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } } };
  class DeferredImage {
    constructor() {
      this.promise = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
      pending.push(this);
    }
    decode() { return this.promise; }
    removeAttribute(name) { if (name === 'src') { this.src = ''; this.cancelled = true; } }
  }
  const root = { querySelectorAll: () => links, querySelector: () => gallery };
  vm.runInNewContext(galleryScript, { root, document, Image: DeferredImage });
  return { links, pending, gallery, image, title, count, close, previous, next, classes, focused: () => focused };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('full photos load only when selected, with the preview retained until decoding finishes', async () => {
  const h = galleryHarness();
  assert.equal(h.pending.length, 0);
  assert.equal(h.links[0].emit('click').prevented, true);
  assert.equal(h.gallery.open, true);
  assert.equal(h.focused(), h.close);
  assert.equal(h.image.src, 'one-800.webp');
  assert.equal(h.image.getAttribute('aria-busy'), 'true');
  assert.equal(h.pending.length, 1);
  assert.equal(h.pending[0].src, 'one.jpg');
  h.pending[0].resolve();
  await settle();
  assert.equal(h.image.src, 'one.jpg');
  assert.equal(h.image.dataset.resolution, 'full');
  assert.equal(h.image.getAttribute('aria-busy'), 'false');
});

test('rapid next/previous selections cannot be overwritten by an older, slower request', async () => {
  const h = galleryHarness();
  h.links[0].emit('click');
  h.next.emit('click');
  assert.equal(h.pending[0].cancelled, true);
  assert.equal(h.image.src, 'two-800.webp');
  h.pending[1].resolve();
  await settle();
  h.pending[0].resolve();
  await settle();
  assert.equal(h.image.src, 'two.jpg');
  assert.equal(h.title.textContent, 'two');
  h.previous.emit('click');
  h.gallery.emit('keydown', { key: 'ArrowLeft' });
  assert.equal(h.image.src, 'three-800.webp');
  assert.equal(h.count.textContent, '03 / 03');
  h.pending[3].resolve();
  h.pending[2].resolve();
  await settle();
  assert.equal(h.image.src, 'three.jpg');
});

test('closing cancels a pending photo and restores thumbnail focus', async () => {
  const h = galleryHarness();
  h.links[1].emit('click');
  h.close.emit('click');
  assert.equal(h.pending[0].cancelled, true);
  assert.equal(h.gallery.open, false);
  assert.equal(h.focused(), h.links[1]);
  assert.equal(h.classes.has('bp-gallery-open'), false);
  h.pending[0].resolve();
  await settle();
  assert.equal(h.image.src, 'two-800.webp');
  assert.equal(h.image.getAttribute('aria-busy'), 'false');
});

test('a failed full photo leaves the preview usable; modified clicks retain normal links', async () => {
  const h = galleryHarness();
  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    assert.equal(h.links[0].emit('click', { [modifier]: true }).prevented, false);
  }
  assert.equal(h.pending.length, 0);
  h.links[0].emit('click');
  h.pending[0].reject(new Error('Offline'));
  await settle();
  assert.equal(h.image.src, 'one-800.webp');
  assert.equal(h.image.dataset.resolution, 'preview');
  assert.equal(h.image.getAttribute('aria-busy'), 'false');
  assert.equal(h.gallery.open, true);
});
