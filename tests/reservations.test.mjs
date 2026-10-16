import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { normalize, philippinesToday } from '../dist/server/index.js';

const today = philippinesToday();
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const valid = (roomSlug = 'annex-room', overrides = {}) => ({
  requestId: crypto.randomUUID(), roomSlug, checkIn: addDays(today, 2), checkOut: addDays(today, 5), adults: 2, children: 0,
  guestFullName: 'Juan Dela Cruz', guestEmail: 'juan@example.com', guestPhone: '+63 900 000 0000', termsAccepted: true, ...overrides
});

for (const [slug, expected] of [['annex-room', 16500], ['premier-room', 18000], ['premier-deluxe', 21000], ['dormitory-room', 45000], ['aquapoint-luxury-villa', null]]) {
  test(`trusted calculation: ${slug}`, () => {
    const result = normalize(valid(slug));
    assert.equal(result.errors, undefined);
    assert.equal(result.values.estimated_total, expected);
    assert.equal(result.values.nights, 3);
    assert.equal(result.values.status, undefined);
    assert.equal(result.values.reservation_number, undefined);
  });
}

test('capacity boundary and overflow', () => {
  assert.equal(normalize(valid('premier-deluxe', { adults: 4 })).errors, undefined);
  assert.match(normalize(valid('premier-deluxe', { adults: 5 })).errors.guests, /up to 4/);
  assert.equal(normalize(valid('aquapoint-luxury-villa', { adults: 30 })).errors, undefined);
});

test('date and guest validation', () => {
  assert.ok(normalize(valid('annex-room', { checkIn: addDays(today, -1) })).errors.checkIn);
  assert.ok(normalize(valid('annex-room', { checkOut: addDays(today, 1) })).errors.checkOut);
  assert.ok(normalize(valid('annex-room', { guestFullName: '', guestEmail: 'bad', guestPhone: '', termsAccepted: false })).errors.termsAccepted);
  assert.ok(normalize(valid('annex-room', { adults: 0, children: -1 })).errors.adults);
});

test('submission gets database-generated number and pending status', async () => {
  const originalFetch = globalThis.fetch;
  let saved;
  globalThis.fetch = async (_url, options) => {
    saved = JSON.parse(options.body);
    return Response.json([{ ...saved, reservation_number: 'AQP-2026-00001', status: 'pending' }]);
  };
  try {
    const request = new Request('https://example.test/api/reservations', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify(valid()) });
    const response = await worker.fetch(request, { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' });
    const data = await response.json();
    assert.equal(response.status, 201);
    assert.equal(data.reservation.reservationNumber, 'AQP-2026-00001');
    assert.equal(data.reservation.status, 'pending');
    assert.equal(saved.estimated_total, 16500);
    assert.equal(saved.status, undefined);
    assert.equal(saved.reservation_number, undefined);
  } finally { globalThis.fetch = originalFetch; }
});

test('retry with same request ID returns existing reservation', async () => {
  const originalFetch = globalThis.fetch;
  const payload = valid();
  let saved;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    if (calls === 1) { saved = JSON.parse(options.body); return Response.json({ code: '23505' }, { status: 409 }); }
    return Response.json([{ ...saved, reservation_number: 'AQP-2026-00002', status: 'pending' }]);
  };
  try {
    const response = await worker.fetch(new Request('https://example.test/api/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reservation.reservationNumber, 'AQP-2026-00002');
    assert.equal(calls, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('database outage returns a guest-safe error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw Error('database secrets and internal stack'); };
  try {
    const response = await worker.fetch(new Request('https://example.test/api/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid()) }), { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' });
    assert.equal(response.status, 503);
    assert.doesNotMatch(JSON.stringify(await response.json()), /database secrets|stack/);
  } finally { globalThis.fetch = originalFetch; }
});

test('static site remains available', async () => {
  const response = await worker.fetch(new Request('https://example.test/rooms/premier-deluxe/'), {});
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Aquapoint Beach Resort/);
});
