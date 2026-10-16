import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('dist/app.js', 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test('homepage keeps the CTA and poster behind a muted looping video', () => {
  const app = { innerHTML: '' };
  const context = {
    app,
    rooms: Array(9).fill({}),
    getConfiguredRooms: () => [{ slug: 'aquapoint-luxury-villa', image: 'luxury-villa.webp' }],
    getSiteConfig: () => ({ hero: {}, intro: {}, sections: {}, experiences: [], amenities: [], gallery: [], featuredRoomSlugs: [] }),
    img: () => '/images/rooms/luxury-villa.webp',
    card: () => '',
    svg: () => ''
  };
  vm.runInNewContext(`${extract('function shell(', '\nfunction home(')}\n${extract('function home(', '\nfunction listing(')}\nhome();`, context);
  assert.match(app.innerHTML, /<video[^>]*autoplay[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="metadata"/);
  assert.match(app.innerHTML, /poster="\/images\/rooms\/luxury-villa.webp"/);
  assert.doesNotMatch(app.innerHTML, /<video[^>]*controls/);
  assert.match(app.innerHTML, /Make room for<br><em>the coast/);
  assert.match(app.innerHTML, /href="\/rooms\/">EXPLORE OUR STAYS/);
  assert.match(app.innerHTML, /<img class="brand-logo"[^>]*alt="Aquapoint Beach Resort"/);
  assert.match(app.innerHTML, /<a class="brand" href="\/"/);
});

test('reduced motion keeps the static poster without loading video', async () => {
  const video = { src: '', played: false, events: {}, classList: { add() {}, remove() {} }, addEventListener(name, callback) { this.events[name] = callback; }, load() {}, play() { this.played = true; return Promise.resolve(); } };
  const context = { document: { querySelector: () => video }, window: { matchMedia: () => ({ matches: true }) } };
  vm.runInNewContext(`${extract('function setupHeroVideo()', '\nlet path=')}\nsetupHeroVideo();`, context);
  assert.equal(video.src, '');
  assert.equal(video.played, false);
});

test('normal motion starts the local MP4 muted and inline', async () => {
  const video = { src: '', played: false, events: {}, classList: { add() {}, remove() {} }, addEventListener(name, callback) { this.events[name] = callback; }, load() {}, play() { this.played = true; return Promise.resolve(); } };
  const context = { document: { querySelector: () => video }, window: { matchMedia: () => ({ matches: false }) } };
  vm.runInNewContext(`${extract('function setupHeroVideo()', '\nlet path=')}\nsetupHeroVideo();`, context);
  assert.equal(video.src, '/videos/aquapoint-drone-hero.mp4');
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
  assert.equal(video.played, true);
});
