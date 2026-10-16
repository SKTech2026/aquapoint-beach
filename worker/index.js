// Build injects the static site and the shared room catalog into this module.
const ASSETS = __AQUAPOINT_ASSETS__;
const ROOMS = __AQUAPOINT_ROOMS__;
const roomBySlug = new Map(ROOMS.map(room => [room.slug, room]));

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function text(value, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function philippinesToday(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10);
}

function normalize(payload, now = Date.now()) {
  const errors = {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { errors: { form: 'Please check your booking details.' } };
  const guestFullName = text(payload.guestFullName, 150);
  const guestEmail = text(payload.guestEmail, 254).toLowerCase();
  const guestPhone = text(payload.guestPhone, 40);
  const guestAddress = text(payload.guestAddress, 300);
  const room = roomBySlug.get(payload.roomSlug);
  const checkIn = dateValue(payload.checkIn);
  const checkOut = dateValue(payload.checkOut);
  const adults = payload.adults;
  const children = payload.children;
  if (guestFullName.length < 2) errors.guestFullName = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errors.guestEmail = 'Enter a valid email address.';
  if (guestPhone.length < 5) errors.guestPhone = 'Enter a contact number.';
  if (!room) errors.roomSlug = 'Choose an accommodation.';
  if (!checkIn) errors.checkIn = 'Choose a valid check-in date.';
  else if (payload.checkIn < philippinesToday(now)) errors.checkIn = 'Check-in cannot be in the past.';
  if (!checkOut) errors.checkOut = 'Choose a valid check-out date.';
  else if (checkIn && checkOut <= checkIn) errors.checkOut = 'Check-out must be after check-in.';
  if (!Number.isInteger(adults) || adults < 1) errors.adults = 'Enter at least one adult.';
  if (!Number.isInteger(children) || children < 0) errors.children = 'Children cannot be negative.';
  if (payload.termsAccepted !== true) errors.termsAccepted = 'Please accept the reservation terms.';
  if (payload.bookingType !== undefined && payload.bookingType !== 'overnight') errors.bookingType = 'This booking type is unavailable.';
  if (payload.paymentMethod && !['pay_at_resort', 'bank_transfer', 'gcash'].includes(payload.paymentMethod)) errors.paymentMethod = 'Choose a valid payment method.';
  if (room?.capacity && Number.isInteger(adults) && Number.isInteger(children) && adults + children > room.capacity) errors.guests = `This accommodation allows up to ${room.capacity} guests. Please reduce the number of guests or select a larger room.`;
  if (Object.keys(errors).length) return { errors };
  const nights = Math.round((checkOut - checkIn) / 86400000);
  if (nights > 365) return { errors: { checkOut: 'Please choose a stay of 365 nights or fewer.' } };
  const values = {
    guest_full_name: guestFullName,
    guest_email: guestEmail,
    guest_phone: guestPhone,
    guest_address: guestAddress || null,
    room_slug: room.slug,
    room_name: room.name,
    booking_type: 'overnight',
    check_in: payload.checkIn,
    check_out: payload.checkOut,
    nights,
    adults,
    children,
    activities: [],
    amenities: [],
    payment_method: payload.paymentMethod || null,
    transaction_reference: text(payload.transactionReference, 120) || null,
    special_occasion: text(payload.specialOccasion, 120) || null,
    special_requests: text(payload.specialRequests, 2000) || null,
    estimated_total: room.price === null ? null : room.price * nights,
    terms_accepted: true
  };
  return { values };
}

async function fingerprint(values) {
  const bytes = new TextEncoder().encode(JSON.stringify(values));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function supabaseHeaders(secret, extra = {}) {
  return {
    apikey: secret,
    ...(secret.startsWith('sb_secret_') ? {} : { authorization: `Bearer ${secret}` }),
    ...extra
  };
}

function confirmation(row) {
  return {
    reservationNumber: row.reservation_number,
    guestFullName: row.guest_full_name,
    roomName: row.room_name,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    adults: row.adults,
    children: row.children,
    estimatedTotal: row.estimated_total === null ? null : Number(row.estimated_total),
    status: 'pending'
  };
}

async function submit(request, env) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'This request could not be submitted.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Please check your booking details.' }, 415);
  let payload;
  try {
    if (Number(request.headers.get('content-length')) > 16384) return json({ error: 'Please shorten your booking details.' }, 413);
    payload = await request.json();
  } catch {
    return json({ error: 'Please check your booking details.' }, 400);
  }
  const { values, errors } = normalize(payload);
  if (errors) return json({ error: 'Please correct the highlighted fields.', fields: errors }, 422);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId || '')) return json({ error: 'Please retry your booking request.' }, 422);
  const url = env.SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return json({ error: 'Unable to submit your booking request right now. Please try again.' }, 503);
  const digest = await fingerprint(values);
  const row = { ...values, request_id: payload.requestId, request_fingerprint: digest };
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/reservations`;
  const columns = 'reservation_number,guest_full_name,room_name,check_in,check_out,nights,adults,children,estimated_total,status,request_fingerprint';
  try {
    const result = await fetch(`${endpoint}?select=${columns}`, {
      method: 'POST',
      headers: supabaseHeaders(secret, { 'content-type': 'application/json', prefer: 'return=representation' }),
      body: JSON.stringify(row)
    });
    if (result.ok) {
      const rows = await result.json();
      return json({ reservation: confirmation(rows[0]) }, 201);
    }
    if (result.status === 409) {
      const previous = await fetch(`${endpoint}?request_id=eq.${encodeURIComponent(payload.requestId)}&select=${columns}&limit=1`, {
        headers: supabaseHeaders(secret)
      });
      if (previous.ok) {
        const rows = await previous.json();
        if (rows[0]?.request_fingerprint === digest) return json({ reservation: confirmation(rows[0]) });
        if (rows[0]) return json({ error: 'This booking request has already been submitted with different details.' }, 409);
      }
    }
    return json({ error: 'Unable to submit your booking request right now. Please try again.' }, 503);
  } catch {
    return json({ error: 'Unable to submit your booking request right now. Please try again.' }, 503);
  }
}

function staticAsset(path) {
  let name = path === '/' ? '/index.html' : path;
  if (name.endsWith('/')) name += 'index.html';
  let asset = ASSETS[name];
  if (!asset && !name.includes('.')) asset = ASSETS[`${name}/index.html`];
  if (!asset && !name.includes('.') && !path.startsWith('/api/')) asset = ASSETS['/index.html'];
  if (!asset) return new Response('Not found', { status: 404 });
  const body = Uint8Array.from(atob(asset.base64), char => char.charCodeAt(0));
  return new Response(body, { headers: { 'content-type': asset.type, 'cache-control': asset.type.startsWith('image/') ? 'public, max-age=86400' : 'public, max-age=300' } });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/videos/aquapoint-drone-hero.mp4') {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }
    if (path === '/api/reservations') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
      return submit(request, env);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const response = staticAsset(path);
    return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
  }
};

export { normalize, confirmation, philippinesToday };
