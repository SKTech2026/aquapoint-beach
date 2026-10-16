import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('confirmation renders the real number and copies it without changing the URL to guest data', async () => {
  const source = readFileSync('dist/app.js', 'utf8');
  const start = source.indexOf('function showConfirmation(');
  const end = source.indexOf('\nlet path=', start);
  assert.ok(start >= 0 && end > start);
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { textContent: '', onclick: null });
    return elements.get(selector);
  };
  let html = '', route = '', copied = '';
  const context = {
    shell: value => { html = value; },
    $: element,
    svg: () => '',
    peso: value => `₱${value.toLocaleString('en-PH')}`,
    history: { replaceState: (_state, _title, value) => { route = value; } },
    navigator: { clipboard: { writeText: async value => { copied = value; } } }
  };
  vm.runInNewContext(`${source.slice(start, end)}\nthis.confirm = showConfirmation`, context);
  context.confirm({ reservationNumber: 'AQP-2026-00123', guestFullName: 'Juan Dela Cruz', roomName: 'Premier Deluxe', checkIn: '2026-10-20', checkOut: '2026-10-23', nights: 3, adults: 2, children: 1, estimatedTotal: 21000, status: 'pending' });
  assert.match(html, /Booking Request<br><em>Received/);
  assert.equal(element('#confirmation-number').textContent, 'AQP-2026-00123');
  assert.equal(element('#confirmation-7').textContent, '₱21,000');
  assert.equal(route, '/booking/');
  await element('#copy-confirmation').onclick();
  assert.match(copied, /Reservation: AQP-2026-00123/);
  assert.match(copied, /Status: Pending Confirmation/);
  assert.doesNotMatch(copied, /test@example.com|0917/);
});
