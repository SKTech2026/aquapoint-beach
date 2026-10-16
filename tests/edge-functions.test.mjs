import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

function loadFunction(name, { createClient, fetch, env }) {
  let handler;
  const code = transformSync(readFileSync(`supabase/functions/${name}/index.ts`, 'utf8'),
    { loader: 'ts', format: 'cjs' }).code;
  vm.runInNewContext(code, {
    Deno: { env: { get: key => env[key] }, serve: callback => { handler = callback; } },
    require: () => ({ createClient }), fetch, Response, TextEncoder, crypto,
    exports: {}, module: { exports: {} }, console
  });
  return handler;
}

const booking = () => ({
  requestId: crypto.randomUUID(), roomSlug: 'premier-deluxe', checkIn: '2026-10-25',
  checkOut: '2026-10-28', adults: 2, children: 0, guestFullName: 'Test Guest',
  guestEmail: 'guest@example.com', guestPhone: '+639000000000', guestAddress: 'Palawan',
  paymentMethod: 'pay_at_resort', termsAccepted: true, estimatedTotal: 1
});

test('public Edge booking stores trusted rate and returns database number', async () => {
  let inserted;
  const room = { slug: 'premier-deluxe', name: 'Premier Deluxe', capacity: 4,
    pricing_type: 'fixed', nightly_rate: 7000, visible: true, booking_enabled: true };
  const client = { from(table) {
    if (table === 'rooms') return { select: () => ({ eq: () => ({ single: async () => ({ data: room, error: null }) }) }) };
    if (table === 'reservations') return { insert(row) { inserted = row; return { select: () => ({
      single: async () => ({ data: { ...row, reservation_number: 'AQP-2026-00055', status: 'pending' }, error: null })
    }) }; } };
    throw Error(table);
  } };
  const handler = loadFunction('create-reservation', {
    createClient: () => client, fetch: () => { throw Error('unexpected fetch'); },
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'secret' }
  });
  const response = await handler(new Request('https://example.test', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(booking()) }));
  assert.equal(response.status, 201);
  assert.equal(inserted.nightly_rate, 7000);
  assert.equal(inserted.estimated_total, 21000);
  assert.equal(inserted.status, undefined);
  assert.equal((await response.json()).reservation.reservationNumber, 'AQP-2026-00055');
});

function emailFixture({ accepted = true, claimResponse = true } = {}) {
  const row = { id: '11111111-1111-4111-8111-111111111111', status: 'confirmed',
    guest_email: 'authoritative@example.com', guest_full_name: 'Actual Guest',
    reservation_number: 'AQP-2026-00055', room_name: 'Premier Deluxe',
    check_in: '2026-10-25', check_out: '2026-10-28', adults: 2, children: 0,
    estimated_total: 21000 };
  let emailPayload;
  let update;
  const client = { from(table) {
    assert.equal(table, 'reservations');
    return {
      select() { return { eq() { return { eq() { return { single: async () => ({ data: row, error: null }) }; } }; } }; },
      update(value) { update = value; return { eq() { return { eq: async () => ({ error: null }) }; } }; }
    };
  } };
  const fetch = async (url, options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'staff' });
    if (url.endsWith('/rest/v1/rpc/claim_reservation_email')) return Response.json(claimResponse ? '22222222-2222-4222-8222-222222222222' : null);
    if (url === 'https://api.resend.com/emails') {
      emailPayload = JSON.parse(options.body);
      return accepted ? Response.json({ id: 'provider-id' }) : Response.json({ error: 'rejected' }, { status: 500 });
    }
    throw Error(url);
  };
  const handler = loadFunction('reservation-email', { createClient: () => client, fetch,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public',
      SUPABASE_SECRET_KEY: 'secret', RESEND_API_KEY: 'key', RESERVATION_EMAIL_FROM: 'Resort <resort@example.com>' } });
  const request = () => new Request('https://example.test', { method: 'POST',
    headers: { authorization: 'Bearer user-token' },
    body: JSON.stringify({ reservationId: row.id, guestEmail: 'attacker@example.com' }) });
  return { handler, request, get: () => ({ emailPayload, update }) };
}

test('decision email uses authoritative row and records accepted provider delivery', async () => {
  const fixture = emailFixture();
  const response = await fixture.handler(fixture.request());
  assert.equal(response.status, 200);
  assert.deepEqual(fixture.get().emailPayload.to, ['authoritative@example.com']);
  assert.match(fixture.get().emailPayload.html, /AQP-2026-00055/);
  assert.equal(fixture.get().update.decision_email_status, 'sent');
});

test('provider failure records failed delivery without changing reservation status', async () => {
  const fixture = emailFixture({ accepted: false });
  const response = await fixture.handler(fixture.request());
  assert.equal(response.status, 502);
  assert.equal(fixture.get().update.decision_email_status, 'failed');
  assert.equal('status' in fixture.get().update, false);
});

test('email cannot send when database claim fails', async () => {
  const fixture = emailFixture({ claimResponse: false });
  const response = await fixture.handler(fixture.request());
  assert.equal(response.status, 409);
  assert.equal(fixture.get().emailPayload, undefined);
});
