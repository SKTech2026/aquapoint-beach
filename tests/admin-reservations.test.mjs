import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservationAdmin } from '../src/admin-reservations.js';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

function fixture(overrides = {}) {
  const calls = [];
  const rows = overrides.rows || [{ id: 'id-1', reservation_number: 'AQP-2026-00001',
    guest_full_name: 'Guest One', status: 'pending', estimated_total: 21000 }];
  const db = {
    from(table) {
      assert.equal(table, 'reservations');
      return { select() { return { order(column, options) {
        assert.equal(column, 'created_at');
        assert.equal(options.ascending, false);
        return { async range(start, end) {
          assert.equal(end - start, 499);
          return { data: rows.slice(start, end + 1), error: overrides.listError || null };
        } };
      } }; } };
    },
    async rpc(name, args) { calls.push({ name, args }); return overrides.rpc || { data: 'updated', error: null }; },
    functions: { async invoke(name, args) { calls.push({ name, args }); return overrides.email || { data: { status: 'sent' }, error: null }; } },
    channel(name) { calls.push({ name }); return {
      on(event, filter, callback) { calls.push({ event, filter }); this.refresh = callback; return this; },
      subscribe() { return this; }
    }; }
  };
  return { api: createReservationAdmin(db), calls };
}

test('admin loads database reservations newest first with no local fallback', async () => {
  const { api } = fixture();
  const rows = await api.list();
  assert.equal(rows[0].reservationNumber, 'AQP-2026-00001');
  assert.equal(rows[0].estimatedTotal, 21000);
});

test('database failure propagates instead of showing mock reservations', async () => {
  await assert.rejects(fixture({ listError: Error('Database unavailable') }).api.list());
});

test('confirm and not-available decisions use the checked database RPC', async () => {
  const { api, calls } = fixture();
  assert.equal(await api.decide('id-1', 'confirmed'), 'updated');
  assert.equal(await api.decide('id-2', 'not_available'), 'updated');
  assert.deepEqual(calls, [
    { name: 'decide_reservation', args: { p_reservation_id: 'id-1', p_decision: 'confirmed' } },
    { name: 'decide_reservation', args: { p_reservation_id: 'id-2', p_decision: 'not_available' } }
  ]);
  await assert.rejects(api.decide('id-1', 'cancelled'), /Invalid decision/);
});

test('decision conflict and permission failures are not treated as success', async () => {
  assert.equal(await fixture({ rpc: { data: 'conflict', error: null } }).api.decide('id-1', 'confirmed'), 'conflict');
  await assert.rejects(fixture({ rpc: { data: null, error: Error('denied') } }).api.decide('id-1', 'confirmed'));
});

test('email invocation supplies only the reservation ID', async () => {
  const { api, calls } = fixture();
  await api.email('id-1');
  assert.deepEqual(calls[0], { name: 'reservation-email', args: { body: { reservationId: 'id-1' } } });
  await assert.rejects(fixture({ email: { data: null, error: Error('delivery failed') } }).api.email('id-1'));
});

test('realtime subscription refreshes list instead of appending duplicate events', () => {
  const { api, calls } = fixture();
  const channel = api.subscribe(() => {});
  assert.equal(channel.refresh instanceof Function, true);
  assert.equal(calls[1].event, 'postgres_changes');
});

test('migration keeps decisions atomic and reserves updates for RPC', () => {
  const sql = readFileSync('supabase/migrations/20261017010000_reservation_decisions.sql', 'utf8');
  assert.match(sql, /where id = p_reservation_id and status = 'pending'/);
  assert.match(sql, /decision_by = auth\.uid\(\)/);
  assert.match(sql, /private\.can_review_reservations\(\)/);
  assert.match(sql, /role in \('administrator','reservation_staff'\)/);
  assert.doesNotMatch(sql, /grant update on public\.reservations to authenticated/i);
});

test('Edge functions parse and Render loader remains intact', () => {
  for (const name of ['create-reservation', 'reservation-email']) {
    const code = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    assert.doesNotThrow(() => transformSync(code, { loader: 'ts' }));
  }
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /import "\/supabase-client\.js"; import "\/admin-auth\.js"; import "\/app\.js";/);
});
