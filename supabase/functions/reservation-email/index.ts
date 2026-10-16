import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store',
    'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info' }
});
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204,
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info' } });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const publishable = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') ||
    JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default;
  const secret = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESERVATION_EMAIL_FROM');
  if (!url || !publishable || !secret || !resendKey || !from) return reply({ error: 'Email service is not configured.' }, 503);
  const bearer = request.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ')) return reply({ error: 'Unauthorized' }, 401);
  let reservationId: unknown;
  try { reservationId = (await request.json()).reservationId; } catch { return reply({ error: 'Invalid request' }, 400); }
  if (typeof reservationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId)) {
    return reply({ error: 'Invalid reservation ID' }, 400);
  }

  const identityResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishable, authorization: bearer }
  });
  if (!identityResponse.ok) return reply({ error: 'Unauthorized' }, 401);
  // The RPC checks active staff role from auth.uid() and claims only a decided row.
  const claimResponse = await fetch(`${url}/rest/v1/rpc/claim_reservation_email`, {
    method: 'POST', headers: { apikey: publishable, authorization: bearer, 'content-type': 'application/json' },
    body: JSON.stringify({ p_reservation_id: reservationId })
  });
  if (!claimResponse.ok) return reply({ error: 'Reservation access denied or unavailable.' }, 403);
  const claim = await claimResponse.json();
  if (!claim) return reply({ error: 'Email is already sent or being processed.' }, 409);

  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { data: row, error: rowError } = await admin.from('reservations').select('*')
    .eq('id', reservationId).eq('decision_email_claim', claim).single();
  if (rowError || !row) return reply({ error: 'Reservation unavailable.' }, 503);

  const confirmed = row.status === 'confirmed';
  const title = confirmed ? 'Reservation Confirmed' : 'Reservation Update';
  const guestCount = Number(row.adults || 0) + Number(row.children || 0);
  const message = confirmed
    ? 'Your reservation has been confirmed. We look forward to welcoming you.'
    : 'Thank you for choosing Aquapoint Beach Resort. Unfortunately, we are unable to confirm your requested reservation for the selected dates. Please contact us or submit another booking request for alternative dates or accommodation options.';
  const lines = [
    ['Guest', row.guest_full_name], ['Reservation number', row.reservation_number],
    ['Accommodation', row.room_name], ['Check-in', row.check_in], ['Check-out', row.check_out],
    ['Guests', guestCount], ...(confirmed && row.estimated_total != null ? [['Estimated total', `PHP ${Number(row.estimated_total).toLocaleString('en-PH')}`]] : [])
  ];
  const html = `<h1>Aquapoint Beach Resort</h1><h2>${title}</h2><p>${escape(message)}</p><dl>${lines.map(([key, value]) => `<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`).join('')}</dl>`;
  let accepted = false;
  let errorMessage = '';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json',
        'Idempotency-Key': `aquapoint-decision-${row.id}-${row.status}` },
      body: JSON.stringify({ from, to: [row.guest_email], subject: `Aquapoint Beach Resort — ${title}`, html })
    });
    const result = await response.json().catch(() => ({}));
    accepted = response.ok && typeof result.id === 'string' && !!result.id;
    if (!accepted) errorMessage = `Provider rejected email (${response.status}).`;
  } catch { errorMessage = 'Email provider could not be reached.'; }

  const { error: saveError } = await admin.from('reservations').update({
    decision_email_status: accepted ? 'sent' : 'failed',
    decision_email_sent_at: accepted ? new Date().toISOString() : null,
    decision_email_error: accepted ? null : errorMessage,
    decision_email_claim: null, decision_email_claimed_at: null
  }).eq('id', reservationId).eq('decision_email_claim', claim);
  if (saveError) return reply({ error: 'Email delivery result could not be recorded.' }, 503);
  return accepted ? reply({ status: 'sent' }) : reply({ error: 'Reservation updated, but the guest email could not be sent.' }, 502);
});
