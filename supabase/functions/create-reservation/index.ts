import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info' };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' }
});
const trim = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const choices = (value: unknown) => Array.isArray(value) ? value.slice(0, 20)
  .filter(item => typeof item === 'string').map(item => trim(item, 120)).filter(Boolean) : [];
const day = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
};
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const confirmation = (row: Record<string, unknown>) => ({
  reservationNumber: row.reservation_number, guestFullName: row.guest_full_name,
  roomName: row.room_name, checkIn: row.check_in, checkOut: row.check_out,
  nights: row.nights, adults: row.adults, children: row.children,
  estimatedTotal: row.estimated_total, status: row.status
});

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (Number(request.headers.get('content-length')) > 16384) return reply({ error: 'Please shorten your booking details.' }, 413);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return reply({ error: 'Invalid booking details.' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ error: 'Invalid booking details.' }, 400);
  const checkIn = day(input.checkIn), checkOut = day(input.checkOut);
  const nights = checkIn && checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000) : 0;
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const name = trim(input.guestFullName, 150), email = trim(input.guestEmail, 254).toLowerCase();
  const phone = trim(input.guestPhone, 40), address = trim(input.guestAddress, 300);
  if (!uuid(input.requestId) || !checkIn || !checkOut || String(input.checkIn) < today || nights < 1 || nights > 365 ||
      name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 5 ||
      !Number.isInteger(input.adults) || Number(input.adults) < 1 || !Number.isInteger(input.children) || Number(input.children) < 0 ||
      input.termsAccepted !== true || !['gcash', 'bank_transfer', 'pay_at_resort'].includes(String(input.paymentMethod)) ||
      !/^[a-z0-9-]{2,80}$/.test(String(input.roomSlug))) return reply({ error: 'Please check your booking details.' }, 422);

  const url = Deno.env.get('SUPABASE_URL');
  const secret = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
  if (!url || !secret) return reply({ error: 'Booking is temporarily unavailable.' }, 503);
  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { data: room, error: roomError } = await admin.from('rooms')
    .select('slug,name,capacity,pricing_type,nightly_rate,visible,booking_enabled')
    .eq('slug', input.roomSlug).single();
  if (roomError || !room || !room.visible || room.booking_enabled === false) return reply({ error: 'This accommodation is unavailable.' }, 422);
  if (room.capacity && Number(input.adults) + Number(input.children) > room.capacity) return reply({ error: 'Too many guests for this accommodation.' }, 422);

  const row: Record<string, unknown> = {
    request_id: input.requestId, guest_full_name: name, guest_email: email,
    guest_phone: phone, guest_address: address,
    guest_country: trim(input.guestCountry, 100) || null,
    room_slug: room.slug, room_name: room.name,
    booking_type: 'overnight', check_in: input.checkIn, check_out: input.checkOut,
    nights, adults: input.adults, children: input.children,
    activities: choices(input.activities), amenities: choices(input.amenities),
    payment_method: input.paymentMethod, transaction_reference: trim(input.transactionReference, 120) || null,
    special_occasion: trim(input.specialOccasion, 120) || null,
    special_requests: trim(input.specialRequests, 2000) || null,
    nightly_rate: room.nightly_rate,
    estimated_total: room.pricing_type === 'on_request' || room.nightly_rate == null ? null : Number(room.nightly_rate) * nights,
    terms_accepted: true
  };
  const { room_name: _roomName, nightly_rate: _nightlyRate, estimated_total: _estimatedTotal, ...requestFields } = row;
  const bytes = new TextEncoder().encode(JSON.stringify(requestFields));
  row.request_fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(value => value.toString(16).padStart(2, '0')).join('');
  const { data, error } = await admin.from('reservations').insert(row).select().single();
  if (!error && data) return reply({ reservation: confirmation(data) }, 201);
  if (error?.code === '23505') {
    const prior = await admin.from('reservations').select('*').eq('request_id', input.requestId).maybeSingle();
    if (prior.data?.request_fingerprint === row.request_fingerprint) return reply({ reservation: confirmation(prior.data) });
    if (prior.data) return reply({ error: 'This booking request was already used with different details.' }, 409);
  }
  return reply({ error: 'Booking is temporarily unavailable. Please try again.' }, 503);
});
