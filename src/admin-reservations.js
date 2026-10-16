export const mapReservation = (row) => ({
  id: row.id, reservationNumber: row.reservation_number, status: row.status,
  guestFullName: row.guest_full_name, guestEmail: row.guest_email,
  guestPhone: row.guest_phone, guestAddress: row.guest_address,
  guestCountry: row.guest_country, roomSlug: row.room_slug, roomName: row.room_name,
  checkIn: row.check_in, checkOut: row.check_out, nights: row.nights,
  adults: row.adults, children: row.children, nightlyRate: row.nightly_rate,
  estimatedTotal: row.estimated_total, paymentMethod: row.payment_method,
  transactionReference: row.transaction_reference, specialOccasion: row.special_occasion,
  specialRequests: row.special_requests, createdAt: row.created_at,
  updatedAt: row.updated_at, decisionAt: row.decision_at, decisionBy: row.decision_by,
  decisionEmailStatus: row.decision_email_status,
  decisionEmailClaimedAt: row.decision_email_claimed_at
});

export function createReservationAdmin(supabase) {
  async function list() {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('reservations').select('*')
        .order('created_at', { ascending: false }).range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    return rows.map(mapReservation);
  }
  async function decide(id, decision) {
    if (!['confirmed', 'not_available'].includes(decision)) throw Error('Invalid decision');
    const { data, error } = await supabase.rpc('decide_reservation', {
      p_reservation_id: id, p_decision: decision
    });
    if (error) throw error;
    return data;
  }
  async function email(id) {
    const { data, error } = await supabase.functions.invoke('reservation-email', {
      body: { reservationId: id }
    });
    if (error || data?.status !== 'sent') throw error || Error(data?.error || 'Email was not sent');
    return data;
  }
  function subscribe(refresh) {
    return supabase.channel('admin-reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, refresh)
      .subscribe();
  }
  return { list, decide, email, subscribe };
}

globalThis.__aquapointReservationAdmin = { createReservationAdmin };
