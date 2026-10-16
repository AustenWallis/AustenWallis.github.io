const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const bootstrap = html.match(/<script id="aw-initial-page">([\s\S]*?)<\/script>/)[1];

test('deep links select their first visible section before external scripts load', () => {
  for (const [hash, page, title] of [
    ['#about', 'about', 'Computational Astrophysicist'],
    ['#publications', 'publications', 'Publications'],
    ['#papers', 'publications', 'Publications'],
    ['#places', 'places', 'Places'],
    ['#cv', 'cv', 'Curriculum vitae'],
    ['#CV', 'cv', 'Curriculum vitae']
  ]) {
    const document = { documentElement: { dataset: {} }, title: '' };
    vm.runInNewContext(bootstrap, { document, window: { location: { hash } } });
    assert.equal(document.documentElement.dataset.initialPage, page);
    assert.equal(document.title, `Austen Wallis | ${title}`);
  }
});

test('empty and unrecognised hashes retain the About landing page', () => {
  for (const hash of ['', '#', '#unknown', '#constructor', '#main-content']) {
    const document = { documentElement: { dataset: {} }, title: '' };
    vm.runInNewContext(bootstrap, { document, window: { location: { hash } } });
    assert.equal(document.documentElement.dataset.initialPage, 'about');
  }
});
