import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import worker from '../dist/server/index.js';

const source = readFileSync('dist/app.js', 'utf8');

const loadApp = (overrides = {}) => {
  const local = new Map();
  const storage = {
    getItem(key) { return local.has(key) ? local.get(key) : null; },
    setItem(key, value) { local.set(key, String(value)); },
    removeItem(key) { local.delete(key); },
    clear() { local.clear(); }
  };
  const context = {
    localStorage: storage,
    sessionStorage: storage,
    location: { pathname: '/', search: '', hash: '' },
    document: { querySelector: () => null, querySelectorAll: () => [], body: { classList: { remove() {}, add() {} } }, documentElement: { classList: { add() {} } }, onkeydown: null },
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {}, scrollY: 0 },
    navigator: { clipboard: { writeText: async () => {} } },
    history: { replaceState() {} },
    fetch: async () => ({ ok: true, json: async () => ({ reservation: { reservationNumber: 'AQP-2026-00001', guestFullName: 'Test Guest', roomName: 'Premier Deluxe', checkIn: '2026-10-20', checkOut: '2026-10-23', nights: 3, adults: 2, children: 0, estimatedTotal: 21000, status: 'pending' } }) }),
    crypto: { randomUUID: () => 'test-id-1', subtle: { digest: async () => new Uint8Array(32).fill(1) } },
    URLSearchParams,
    Response,
    console,
    ...overrides
  };
  vm.runInNewContext(`${source}\nthis.__aquapoint = { getSiteConfig, saveSiteConfig, getReservations, upsertReservation, confirmReservation, resetDemoData };`, context);
  return context.__aquapoint;
};

test('dist app parses cleanly in Node module mode', () => {
  execFileSync('node', ['--check', 'dist/app.js'], { stdio: 'pipe' });
});

test('admin and cms routes fall back to the app shell instead of a server 404', async () => {
  const dashboard = await worker.fetch(new Request('http://127.0.0.1/admin/dashboard'));
  const website = await worker.fetch(new Request('http://127.0.0.1/admin/website/homepage'));
  assert.equal(dashboard.status, 200);
  assert.equal(website.status, 200);
  assert.match(dashboard.headers.get('content-type') || '', /text\/html/i);
  assert.match(await dashboard.text(), /AQUAPOINT|Local Admin|admin/i);
});

test('site config loads defaults and saves homepage headline', () => {
  const api = loadApp();
  const config = api.getSiteConfig();
  assert.equal(config.hero.headline, 'Make room for the coast.');
  api.saveSiteConfig({ ...config, hero: { ...config.hero, headline: 'Make room for paradise.' } });
  assert.equal(api.getSiteConfig().hero.headline, 'Make room for paradise.');
});

test('reservations can be seeded and confirmed locally', () => {
  const api = loadApp();
  api.resetDemoData();
  const reservations = api.getReservations();
  assert.ok(Array.isArray(reservations));
  assert.ok(reservations.some(r => r.status === 'pending'));
  const id = reservations[0].id;
  api.confirmReservation(id);
  assert.equal(api.getReservations().find(r => r.id === id).status, 'confirmed');
});
