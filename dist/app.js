const defaultRooms = [
  { slug: 'annex-room', name: 'Annex Room', category: 'Intimate stay', capacity: 2, price: 5500, image: 'annex-room.webp', description: 'A simple and comfortable retreat for couples or two guests looking for an easy beach escape with essential resort comfort.', cta: 'View Room', reserve: 'Reserve Annex Room', tags: ['Couples'] },
  { slug: 'premier-room', name: 'Premier Room', category: 'Premier stay', capacity: 3, price: 6000, image: 'premier-room.webp', description: 'A polished premier room for small families or friends, balancing resort comfort with a calm tropical atmosphere.', cta: 'View Premier Room', reserve: 'Reserve This Room', tags: ['Couples', 'Families'] },
  { slug: 'premier-deluxe', name: 'Premier Deluxe', category: 'Premier stay', capacity: 4, price: 7000, image: 'premier-deluxe.webp', description: 'A spacious upgraded room designed for families and small groups, combining resort comfort with a warm and relaxing atmosphere.', cta: 'Explore Premier Deluxe', reserve: 'Reserve This Room', tags: ['Families'] },
  { slug: 'cabin-1', name: 'Cabin 1', category: 'Private cabin', capacity: 3, price: 6000, image: 'cabin-1.webp', description: 'A cozy cabin-style accommodation perfect for couples or small groups looking for a more private and relaxed beach stay.', cta: 'View Cabin', reserve: 'Reserve Cabin 1', tags: ['Couples', 'Families'] },
  { slug: 'annex-dorm', name: 'Annex Dorm', category: 'Shared stay', capacity: 6, price: 8000, image: 'annex-dorm.webp', description: 'A practical shared accommodation for barkadas, families, and small groups who want to stay together during their beach getaway.', cta: 'Explore Annex Dorm', reserve: 'Reserve This Room', tags: ['Families', 'Groups'] },
  { slug: 'annex-loft-room', name: 'Annex Loft Room', category: 'Loft stay', capacity: 8, price: 10000, image: 'annex-loft.webp', description: 'A roomy loft-style accommodation ideal for larger families and groups looking for flexible sleeping space near the resort experience.', cta: 'View Annex Loft', reserve: 'Reserve This Room', tags: ['Families', 'Groups'] },
  { slug: 'premier-loft-room', name: 'Premier Loft Room', category: 'Loft stay', capacity: 10, price: 12000, image: 'premier-loft.webp', description: 'A premium loft-style accommodation offering additional space and flexible sleeping arrangements for families and groups.', cta: 'Explore Premier Loft', reserve: 'Reserve This Room', tags: ['Groups', 'Large Groups'] },
  { slug: 'dormitory-room', name: 'Dormitory Room', category: 'Group stay', capacity: 15, price: 15000, image: 'dormitory.webp', description: 'A spacious group accommodation designed for retreats, barkadas, student groups, family gatherings, and team outings.', cta: 'View Dormitory', reserve: 'Reserve Dormitory', tags: ['Groups', 'Large Groups'] },
  { slug: 'aquapoint-luxury-villa', name: 'Aquapoint Luxury Villa', category: 'Private villa', capacity: null, price: null, image: 'luxury-villa.webp', description: 'A spacious private retreat designed for families, celebrations, and group escapes, offering generous sleeping space and the comfort of a private resort stay.', cta: 'Explore Villa', reserve: 'Reserve Villa', tags: ['Families', 'Groups', 'Large Groups'] }
];

const rooms = [...defaultRooms];
const $ = (selector) => (typeof document !== 'undefined' ? document.querySelector(selector) : null);
const app = typeof document !== 'undefined' ? document.querySelector('#app') : null;
const peso = (value) => value === null || value === undefined ? 'On Request' : `₱${Number(value).toLocaleString('en-PH')}`;
const img = (room) => `/images/rooms/${room.image}`;
const href = (room) => `/rooms/${room.slug}/`;
const book = (room) => {
  const params = new URLSearchParams({ room: room.slug });
  if (typeof location !== 'undefined' && location.pathname.replace(/\/+$/, '') === '/rooms') {
    const q = new URLSearchParams(location.search);
    for (const key of ['checkin', 'checkout', 'adults', 'children']) if (q.has(key)) params.set(key, q.get(key));
  }
  return `/booking/?${params}`;
};

const icon = (name) => ({
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/>',
  arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  check: '<path d="m4 12 5 5L20 6"/>'
})[name];

const svg = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon(name)}</svg>`;

const lineIcon = (name) => {
  const paths = {
    pool: '<path d="M3 17c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1M3 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1M12 16V4h5a3 3 0 0 1 0 6h-5"/>',
    cottage: '<path d="m3 11 9-7 9 7M5 10v10h14V10M9 20v-6h6v6"/>',
    shower: '<path d="M6 20V8a4 4 0 0 1 8 0v1M10 11h8M10 11c0-2 2-3 4-3s4 1 4 3M12 15v1m4-1v1m4-1v1M12 19v1m4-1v1m4-1v1"/>',
    picnic: '<path d="M4 12h16M6 12l2 8m10-8-2 8M8 12l4-8 4 8M5 20h14"/>',
    restaurant: '<path d="M5 3v8m3-8v8M5 7h3m-1.5 4v10M16 3c3 2 4 5 4 8h-4V3Zm0 8v10"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
};

function getStorage() {
  if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  const globalStore = globalThis.__aquapointStore || (globalThis.__aquapointStore = new Map());
  return {
    getItem(key) { return globalStore.has(key) ? globalStore.get(key) : null; },
    setItem(key, value) { globalStore.set(key, String(value)); },
    removeItem(key) { globalStore.delete(key); },
    clear() { globalStore.clear(); }
  };
}

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return patch ?? base;
  const output = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    output[key] = value && typeof value === 'object' && !Array.isArray(value) && value !== null && typeof output[key] === 'object' && !Array.isArray(output[key]) ? deepMerge(output[key], value) : value;
  }
  return output;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function safeUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^(https?:\/\/|\/|#)/i.test(text)) return text;
  return text;
}

function defaultSiteConfig() {
  return {
    brand: { name: 'Aquapoint Beach Resort', tagline: 'Your Relaxing Escape by the Sea.', logo: '/images/aquapoint-logo.webp', favicon: '/images/aquapoint-logo.webp' },
    hero: { eyebrow: 'AQUAPOINT BEACH RESORT', headline: 'Make room for the coast.', supportingText: 'Your relaxing escape by the sea. Find the space that fits your kind of getaway.', primaryCtaLabel: 'BOOK YOUR STAY', primaryCtaDestination: '/booking/', secondaryCtaLabel: 'EXPLORE OUR STAYS', secondaryCtaDestination: '/rooms/', mediaType: 'video', mediaId: 'aquapoint-drone', overlay: 'dark' },
    intro: { eyebrow: 'WELCOME TO AQUAPOINT', heading: 'Where the sea slows everything down.', description: 'Settle into the rhythm of the coast. Whether you are planning a quiet stay for two or bringing everyone together, Aquapoint offers room to pause, connect, and enjoy the water.', image: '/images/resort-aerial.webp' },
    sections: { bookingSearch: true, welcome: true, featuredRooms: true, resortStory: true, experiences: true, amenities: true, gallery: true, bookingCta: true },
    featuredRoomSlugs: ['premier-deluxe', 'annex-loft-room', 'aquapoint-luxury-villa'],
    rooms: {},
    experiences: [
      { id: 'swimming', name: 'Swimming', description: 'Find time in the water and enjoy the resort at your own pace.', visible: true, sortOrder: 1 },
      { id: 'kayaking', name: 'Kayaking', description: 'Explore the coastal setting from the water.', visible: true, sortOrder: 2 },
      { id: 'snorkeling', name: 'Snorkeling', description: 'Make the most of a day by the sea.', visible: true, sortOrder: 3 },
      { id: 'beach-volleyball', name: 'Beach Volleyball', description: 'Bring the group together for a game on the sand.', visible: true, sortOrder: 4 },
      { id: 'beach-time', name: 'Relaxing at the Beach', description: 'Slow down, settle in, and enjoy the shoreline.', visible: true, sortOrder: 5 }
    ],
    amenities: [
      { id: 'pool', name: 'Swimming Pool', description: 'A place to cool off and unwind.', icon: 'pool', visible: true, sortOrder: 1 },
      { id: 'cottage', name: 'Beach Cottage', description: 'A comfortable spot near the shore.', icon: 'cottage', visible: true, sortOrder: 2 },
      { id: 'shower', name: 'Shower Room', description: 'Freshen up after a day outdoors.', icon: 'shower', visible: true, sortOrder: 3 },
      { id: 'picnic', name: 'Picnic Area', description: 'Space to gather and share a meal.', icon: 'picnic', visible: true, sortOrder: 4 },
      { id: 'restaurant', name: 'Resort Restaurant', description: 'Enjoy food during your stay.', icon: 'restaurant', visible: true, sortOrder: 5 }
    ],
    gallery: [
      { id: 'resort-aerial', mediaUrl: '/images/resort-aerial.webp', altText: 'Aquapoint beachfront aerial view', caption: 'Aquapoint beachfront aerial view', category: 'resort', visible: true, sortOrder: 1 },
      { id: 'premier-deluxe', mediaUrl: '/images/rooms/premier-deluxe.webp', altText: 'Premier Deluxe room', caption: 'Premier Deluxe room', category: 'room', visible: true, sortOrder: 2 },
      { id: 'luxury-villa', mediaUrl: '/images/rooms/luxury-villa.webp', altText: 'Aquapoint Luxury Villa', caption: 'Aquapoint Luxury Villa', category: 'room', visible: true, sortOrder: 3 },
      { id: 'cabin-1', mediaUrl: '/images/rooms/cabin-1.webp', altText: 'Cabin 1 accommodation', caption: 'Cabin 1 accommodation', category: 'room', visible: true, sortOrder: 4 },
      { id: 'dormitory-room', mediaUrl: '/images/rooms/dormitory.webp', altText: 'Dormitory Room', caption: 'Dormitory Room', category: 'room', visible: true, sortOrder: 5 }
    ],
    contact: { phone: '', email: '', address: '', mapLink: '', businessHours: '' },
    social: { facebook: '', instagram: '', tiktok: '', youtube: '' },
    announcement: { enabled: false, message: '', ctaLabel: '', ctaUrl: '' },
    policies: { terms: '', cancellation: '', privacy: '', houseRules: '' },
    seo: { siteTitle: 'Aquapoint Beach Resort — Your Relaxing Escape by the Sea', metaDescription: 'Luxury coastal resort booking experience for Aquapoint Beach Resort.', socialTitle: 'Aquapoint Beach Resort', socialDescription: 'Your relaxing escape by the sea.', socialImage: '/images/resort-aerial.webp' },
    websiteStatus: 'normal',
    navigation: ['Home', 'Rooms & Stays', 'Experiences', 'Amenities', 'Gallery', 'Reservations'],
    footer: { tagline: 'Your Relaxing Escape by the Sea.', copyright: 'Aquapoint Beach Resort', showContact: true, showSocial: false },
    bookingSettings: { bookingRequestEnabled: true, minNights: 1, maxNights: null, defaultAdults: 2, defaultChildren: 0, checkinInfo: '', checkoutInfo: '', confirmationMessage: 'This is a booking request and is not yet a confirmed reservation.' },
    paymentMethods: { gcash: true, bank_transfer: true, pay_at_resort: true },
    specialOccasions: ['Birthday', 'Anniversary', 'Family Gathering', 'None', 'Other']
  };
}

function getSiteConfig() {
  try {
    const raw = getStorage().getItem('aquapoint-site-config');
    const parsed = raw ? JSON.parse(raw) : null;
    return deepMerge(defaultSiteConfig(), parsed || {});
  } catch (error) {
    getStorage().removeItem('aquapoint-site-config');
    return defaultSiteConfig();
  }
}

function saveSiteConfig(nextConfig) {
  const payload = deepMerge(defaultSiteConfig(), nextConfig || {});
  getStorage().setItem('aquapoint-site-config', JSON.stringify(payload));
  return payload;
}

function getConfiguredRooms() {
  const config = getSiteConfig();
  const overrides = config.rooms || {};
  return rooms.map((room) => {
    const override = overrides[room.slug] || {};
    const next = { ...room };
    if (override.name) next.name = override.name;
    if (override.description) next.description = override.description;
    if (override.image) next.image = override.image;
    if (override.capacity !== undefined) next.capacity = override.capacity;
    if (override.price !== undefined) next.price = override.price;
    next.visible = override.visible !== undefined ? override.visible : room.visible !== false;
    next.featured = override.featured !== undefined ? override.featured : room.featured || false;
    next.bookingEnabled = override.bookingEnabled !== undefined ? override.bookingEnabled : room.bookingEnabled !== false;
    next.sortOrder = override.sortOrder !== undefined ? override.sortOrder : room.sortOrder || 0;
    return next;
  }).filter((room) => room.visible !== false);
}

function getConfiguredExperiences() {
  const config = getSiteConfig();
  const items = Array.isArray(config.experiences) ? config.experiences : [];
  return items.filter((item) => item.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function getConfiguredAmenities() {
  const config = getSiteConfig();
  const items = Array.isArray(config.amenities) ? config.amenities : [];
  return items.filter((item) => item.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function getConfiguredGallery() {
  const config = getSiteConfig();
  const items = Array.isArray(config.gallery) ? config.gallery : [];
  return items.filter((item) => item.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function getReservations() {
  const raw = getStorage().getItem('aquapoint-reservations');
  const data = raw ? JSON.parse(raw) : null;
  if (!Array.isArray(data) || data.length === 0) {
    const seeded = [
      { id: 'res-1', reservationNumber: 'AQP-2026-00001', status: 'pending', guestFullName: 'Juan Dela Cruz', guestEmail: 'juan@example.com', guestPhone: '+63 900 000 0000', guestAddress: 'San Vicente, Palawan', roomSlug: 'premier-deluxe', roomName: 'Premier Deluxe', checkIn: '2026-10-20', checkOut: '2026-10-23', nights: 3, adults: 2, children: 0, estimatedTotal: 21000, nightlyRate: 7000, paymentMethod: 'pay_at_resort', activities: ['Swimming'], amenities: ['Beach Cottage'], specialOccasion: 'Birthday', specialRequests: 'Quiet room with a good view.', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z' },
      { id: 'res-2', reservationNumber: 'AQP-2026-00002', status: 'confirmed', guestFullName: 'Mia Santos', guestEmail: 'mia@example.com', guestPhone: '+63 917 222 3333', guestAddress: 'Cebu City', roomSlug: 'annex-room', roomName: 'Annex Room', checkIn: '2026-10-18', checkOut: '2026-10-20', nights: 2, adults: 2, children: 0, estimatedTotal: 11000, nightlyRate: 5500, paymentMethod: 'gcash', activities: ['Relaxing at the Beach'], amenities: ['Swimming Pool'], specialOccasion: 'None', specialRequests: 'Early check-in if possible.', createdAt: '2026-10-05T08:10:00.000Z', updatedAt: '2026-10-05T09:00:00.000Z' }
    ];
    getStorage().setItem('aquapoint-reservations', JSON.stringify(seeded));
    return seeded;
  }
  return data.sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
}

function saveReservations(list) {
  getStorage().setItem('aquapoint-reservations', JSON.stringify(list));
  return list;
}

function makeReservationNumber() {
  const list = getReservations();
  const last = Number((list.at(-1)?.reservationNumber || 'AQP-2026-00000').match(/(\d+)$/)?.[1] || 0);
  return `AQP-2026-${String(last + 1).padStart(5, '0')}`;
}

function normalizeReservationRecord(record) {
  const room = getConfiguredRooms().find((item) => item.slug === record.roomSlug || item.name === record.roomName) || getConfiguredRooms()[0];
  const nights = Number(record.nights) || Math.max(1, Math.round((new Date(record.checkOut) - new Date(record.checkIn)) / 86400000));
  const nightlyRate = record.nightlyRate ?? room?.price ?? null;
  const estimatedTotal = record.estimatedTotal ?? (nightlyRate === null ? null : nightlyRate * nights);
  return {
    id: record.id || record.requestId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    reservationNumber: record.reservationNumber || makeReservationNumber(),
    status: record.status || 'pending',
    guestFullName: record.guestFullName || '',
    guestEmail: record.guestEmail || '',
    guestPhone: record.guestPhone || '',
    guestAddress: record.guestAddress || '',
    roomSlug: record.roomSlug || room.slug,
    roomName: record.roomName || room.name,
    checkIn: record.checkIn || '',
    checkOut: record.checkOut || '',
    nights,
    adults: Number(record.adults || 1),
    children: Number(record.children || 0),
    estimatedTotal: estimatedTotal === null ? null : Number(estimatedTotal),
    nightlyRate: nightlyRate === null ? null : Number(nightlyRate),
    paymentMethod: record.paymentMethod || 'pay_at_resort',
    activities: Array.isArray(record.activities) ? record.activities : [],
    amenities: Array.isArray(record.amenities) ? record.amenities : [],
    specialOccasion: record.specialOccasion || '',
    specialRequests: record.specialRequests || '',
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
    requestId: record.requestId || record.id || null,
    notes: record.notes || ''
  };
}

function upsertReservation(record) {
  const next = normalizeReservationRecord(record);
  const list = getReservations();
  const index = list.findIndex((item) => item.id === next.id || item.requestId === next.requestId || item.reservationNumber === next.reservationNumber);
  if (index >= 0) {
    list[index] = { ...list[index], ...next, updatedAt: new Date().toISOString() };
  } else {
    list.unshift(next);
  }
  saveReservations(list);
  return next;
}

function confirmReservation(id) {
  const list = getReservations().map((item) => item.id === id || item.reservationNumber === id ? { ...item, status: 'confirmed', updatedAt: new Date().toISOString() } : item);
  saveReservations(list);
  return list.find((item) => item.id === id || item.reservationNumber === id);
}

function cancelReservation(id) {
  const list = getReservations().map((item) => item.id === id || item.reservationNumber === id ? { ...item, status: 'cancelled', updatedAt: new Date().toISOString() } : item);
  saveReservations(list);
  return list.find((item) => item.id === id || item.reservationNumber === id);
}

function completeReservation(id) {
  const list = getReservations().map((item) => item.id === id || item.reservationNumber === id ? { ...item, status: 'completed', updatedAt: new Date().toISOString() } : item);
  saveReservations(list);
  return list.find((item) => item.id === id || item.reservationNumber === id);
}

function resetDemoData() {
  getStorage().removeItem('aquapoint-site-config');
  getStorage().removeItem('aquapoint-reservations');
  const seeded = getReservations();
  saveSiteConfig(defaultSiteConfig());
  return { site: getSiteConfig(), reservations: seeded };
}

function getDashboardStats() {
  const items = getReservations();
  const today = new Date().toISOString().slice(0, 10);
  return {
    pending: items.filter((i) => i.status === 'pending').length,
    confirmed: items.filter((i) => i.status === 'confirmed').length,
    arrivalsToday: items.filter((item) => item.checkIn === today).length,
    departuresToday: items.filter((item) => item.checkOut === today).length,
    bookingValue: items.filter((i) => ['pending', 'confirmed', 'completed'].includes(i.status)).reduce((sum, item) => sum + Number(item.estimatedTotal || 0), 0)
  };
}

function routePrefix(path) {
  return typeof path === 'string' ? path.replace(/\/+$/, '') || '/' : '';
}

function adminShell(title, activeKey, content) {
  const nav = [
    ['Overview', '/admin/dashboard'],
    ['Reservations', '/admin/reservations'],
    ['Calendar', '/admin/calendar'],
    ['Guests', '/admin/guests'],
    ['Payments', '/admin/payments'],
    ['Reports', '/admin/reports'],
    ['Website Overview', '/admin/website'],
    ['Media Library', '/admin/media'],
    ['Settings', '/admin/settings']
  ];
  const inner = nav.map(([label, href]) => `<a class="admin-side-link ${activeKey === href ? 'active' : ''}" href="${href}">${label}</a>`).join('');
  return `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><span class="admin-brand-mark">A</span><div><strong>Aquapoint</strong><small>Staff Workspace</small></div></div><nav>${inner}</nav><div class="admin-sidebar-actions"><a href="/" class="admin-side-link">View Resort Website</a><button type="button" class="admin-side-ghost" data-admin-logout>Sign Out</button></div></aside><main class="admin-main"><header class="admin-topbar"><div><span class="eyebrow admin-eyebrow">STAFF ADMINISTRATION</span><h1>${title}</h1></div><div class="admin-top-actions"><a class="button dark small" href="/">View Live Preview</a></div></header>${content}</main></div>`;
}

function renderAdminLogin(authState = {}) {
  const checking = authState.status === 'checking';
  const unavailable = authState.status === 'unconfigured';
  const disabled = checking || unavailable;
  const message = authState.message || (checking ? 'Checking your administrator session…' : '');
  return `<section class="admin-access"><div class="admin-access-card"><span class="eyebrow">AQUAPOINT STAFF</span><h1>Admin Sign In</h1><form class="cms-form" data-admin-login><label>Email<input type="email" name="email" autocomplete="username" required ${disabled ? 'disabled' : ''}></label><label>Password<input type="password" name="password" autocomplete="current-password" required ${disabled ? 'disabled' : ''}></label><div class="admin-login-message" data-admin-message role="status" aria-live="polite">${escapeHtml(message)}</div><button class="button dark" type="submit" ${disabled ? 'disabled' : ''}>${checking ? 'Checking Session…' : 'Sign In'}</button></form><div class="admin-access-actions"><a class="button cream" href="/">Return to Public Website</a></div></div></section>`;
}

let adminAuthController;
let adminAuthEventsInstalled = false;

function installAdminAuthEvents() {
  if (adminAuthEventsInstalled || typeof document === 'undefined') return;
  adminAuthEventsInstalled = true;
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-admin-login]');
    if (!form) return;
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    const result = await adminAuthController.signIn(email, password);
    form.elements.password.value = '';
    if (!result.ok && submit?.isConnected) submit.disabled = false;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-admin-logout]')) return;
    event.preventDefault();
    void adminAuthController.signOut();
  });
}

function startAdminRoute(path) {
  const authModule = globalThis.__aquapointAdminAuth;
  if (!authModule) {
    app.innerHTML = renderAdminLogin({ status: 'unconfigured', message: 'Admin sign-in is unavailable. Please contact the site administrator.' });
    return;
  }

  const destination = `${location.pathname}${location.search || ''}${location.hash || ''}`;
  adminAuthController ||= authModule.createAdminAuthController({
    supabase: globalThis.__aquapointSupabase,
    onStateChange(state) {
      if (state.status === 'authorized') {
        app.innerHTML = renderAdminPage(path === '/admin' || path === '/admin/' ? '/admin/dashboard' : path);
        return;
      }
      if (state.status === 'checking' && app.querySelector('[data-admin-login]')) {
        const submit = app.querySelector('[data-admin-login] button[type="submit"]');
        if (submit) submit.disabled = true;
        return;
      }
      app.innerHTML = renderAdminLogin(state);
    },
    onRedirect: (target) => location.replace(target)
  });
  installAdminAuthEvents();
  app.innerHTML = renderAdminLogin({ status: 'checking' });
  void adminAuthController.start(destination);
}

function renderDashboard() {
  const stats = getDashboardStats();
  const reservations = getReservations().slice(0, 6);
  const rows = reservations.map((item) => `<tr><td>${item.reservationNumber}</td><td>${item.guestFullName}</td><td>${item.roomName}</td><td>${item.checkIn}</td><td>${item.checkOut}</td><td>${item.adults + item.children}</td><td>${item.estimatedTotal === null ? 'On Request' : peso(item.estimatedTotal)}</td><td><span class="status-badge status-${item.status}">${item.status}</span></td></tr>`).join('');
  return adminShell('Dashboard', '/admin/dashboard', `<div class="stats-grid"><div class="stat-card"><span>Pending Requests</span><strong>${stats.pending}</strong></div><div class="stat-card"><span>Confirmed Bookings</span><strong>${stats.confirmed}</strong></div><div class="stat-card"><span>Arrivals Today</span><strong>${stats.arrivalsToday}</strong></div><div class="stat-card"><span>Departures Today</span><strong>${stats.departuresToday}</strong></div><div class="stat-card wide"><span>Mock Booking Value</span><strong>${peso(stats.bookingValue)}</strong></div></div><div class="admin-panel"><div class="panel-head"><h2>Recent Reservations</h2><a href="/admin/reservations">Open full list</a></div><table class="admin-table"><thead><tr><th>Reservation #</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Guests</th><th>Estimated Total</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><div class="quick-actions"><button class="button dark" type="button" data-route="/admin/reservations/new">New Reservation</button><button class="button cream" type="button" data-route="/admin/website/rooms">Manage Rooms</button><button class="button cream" type="button" data-route="/admin/website/homepage">Edit Homepage</button><button class="button cream" type="button" data-route="/admin/media">Upload Media</button><button class="button cream" type="button" data-route="/">View Website</button></div>`);
}

function renderReservations() {
  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const query = (params.get('q') || '').toLowerCase();
  const status = params.get('status') || 'all';
  const room = params.get('room') || 'all';
  const date = params.get('date') || 'all';
  let list = getReservations().filter((row) => {
    const matchesQuery = !query || row.reservationNumber.toLowerCase().includes(query) || row.guestFullName.toLowerCase().includes(query) || row.guestEmail.toLowerCase().includes(query) || row.guestPhone.toLowerCase().includes(query);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesRoom = room === 'all' || row.roomSlug === room;
    const today = new Date().toISOString().slice(0, 10);
    const matchesDate = date === 'all' || (date === 'today' && row.checkIn === today) || (date === 'upcoming' && row.checkIn > today) || (date === 'past' && row.checkOut < today);
    return matchesQuery && matchesStatus && matchesRoom && matchesDate;
  });
  const roomOptions = rooms.map((item) => `<option value="${item.slug}" ${room === item.slug ? 'selected' : ''}>${item.name}</option>`).join('');
  const rows = list.map((item) => `<tr data-id="${item.id}"><td><a href="/admin/reservations/${item.id}">${item.reservationNumber}</a></td><td>${item.guestFullName}</td><td>${item.roomName}</td><td>${item.checkIn}</td><td>${item.checkOut}</td><td>${item.adults + item.children}</td><td>${item.estimatedTotal === null ? 'On Request' : peso(item.estimatedTotal)}</td><td>${item.paymentMethod || 'pay_at_resort'}</td><td><span class="status-badge status-${item.status}">${item.status}</span></td><td>${new Date(item.createdAt).toLocaleDateString('en-PH')}</td><td><a href="/admin/reservations/${item.id}">Open</a></td></tr>`).join('');
  const filters = `<form class="filter-form" method="get"><div class="filter-row"><input name="q" value="${params.get('q') || ''}" placeholder="Search by reservation, guest, email, phone" /><select name="status"><option value="all" ${status === 'all' ? 'selected' : ''}>All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmed</option><option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option><option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option></select><select name="room"><option value="all">All Rooms</option>${roomOptions}</select><select name="date"><option value="all" ${date === 'all' ? 'selected' : ''}>All</option><option value="today" ${date === 'today' ? 'selected' : ''}>Today</option><option value="upcoming" ${date === 'upcoming' ? 'selected' : ''}>Upcoming</option><option value="past" ${date === 'past' ? 'selected' : ''}>Past</option></select><button class="button dark small" type="submit">Apply</button><a class="button cream small" href="/admin/reservations">Clear Filters</a></div></form>`;
  return adminShell('Reservations', '/admin/reservations', `<div class="admin-panel"><div class="panel-head"><h2>Search & filter</h2></div>${filters}</div><div class="admin-panel"><table class="admin-table"><thead><tr><th>Reservation #</th><th>Guest</th><th>Accommodation</th><th>Check-in</th><th>Check-out</th><th>Guests</th><th>Estimated Total</th><th>Payment Preference</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="11">No reservations match the current filters.</td></tr>'}</tbody></table></div>`);
}

function renderReservationDetail(id) {
  const item = getReservations().find((row) => row.id === id || row.reservationNumber === id);
  if (!item) return adminShell('Reservation Not Found', '/admin/reservations', '<div class="admin-panel"><h2>Reservation not found</h2></div>');
  return adminShell(`Reservation: ${item.reservationNumber}`, '/admin/reservations', `<div class="reservation-detail-grid"><section class="admin-panel"><h2>Reservation</h2><dl class="detail-list"><div><dt>Reservation Number</dt><dd>${item.reservationNumber}</dd></div><div><dt>Status</dt><dd>${item.status}</dd></div><div><dt>Created</dt><dd>${new Date(item.createdAt).toLocaleString('en-PH')}</dd></div><div><dt>Updated</dt><dd>${new Date(item.updatedAt).toLocaleString('en-PH')}</dd></div></dl></section><section class="admin-panel"><h2>Guest</h2><dl class="detail-list"><div><dt>Full Name</dt><dd>${item.guestFullName}</dd></div><div><dt>Email</dt><dd>${item.guestEmail}</dd></div><div><dt>Phone</dt><dd>${item.guestPhone}</dd></div><div><dt>Address</dt><dd>${item.guestAddress || 'Not supplied'}</dd></div></dl></section><section class="admin-panel"><h2>Stay</h2><dl class="detail-list"><div><dt>Room</dt><dd>${item.roomName}</dd></div><div><dt>Check-in</dt><dd>${item.checkIn}</dd></div><div><dt>Check-out</dt><dd>${item.checkOut}</dd></div><div><dt>Nights</dt><dd>${item.nights}</dd></div><div><dt>Adults</dt><dd>${item.adults}</dd></div><div><dt>Children</dt><dd>${item.children}</dd></div></dl></section><section class="admin-panel"><h2>Pricing</h2><dl class="detail-list"><div><dt>Nightly Rate</dt><dd>${item.nightlyRate === null ? 'On Request' : peso(item.nightlyRate)}</dd></div><div><dt>Estimated Total</dt><dd>${item.estimatedTotal === null ? 'On Request' : peso(item.estimatedTotal)}</dd></div></dl></section></div>`);
}

function renderWebsiteOverview() {
  const config = getSiteConfig();
  const cards = [
    ['Homepage', '/admin/website/homepage', config.hero.headline],
    ['Rooms & Rates', '/admin/website/rooms', `${getConfiguredRooms().filter((r) => r.visible !== false).length} rooms`],
    ['Experiences', '/admin/website/experiences', 'Visible list'],
    ['Amenities', '/admin/website/amenities', 'Visible list'],
    ['Gallery', '/admin/website/gallery', 'Active gallery'],
    ['Booking Settings', '/admin/website/booking', config.bookingSettings.bookingRequestEnabled ? 'Enabled' : 'Disabled'],
    ['Contact Information', '/admin/website/contact', config.contact.phone || config.contact.email ? 'Configured' : 'Open'],
    ['Policies', '/admin/website/policies', 'Policy set'],
    ['SEO', '/admin/website/seo', config.seo.siteTitle]
  ];
  return adminShell('Website Overview', '/admin/website', `<div class="cms-grid">${cards.map(([title, href, meta]) => `<article class="cms-card"><span>${title}</span><strong>${meta}</strong><a href="${href}">Edit</a></article>`).join('')}</div>`);
}

function renderHomepageEditor() {
  const config = getSiteConfig();
  return adminShell('Homepage', '/admin/website/homepage', `<form class="cms-form" id="homepage-form"><div class="form-grid two"><label>Eyebrow<input name="heroEyebrow" value="${config.hero.eyebrow}"></label><label>Hero Headline<input name="heroHeadline" value="${config.hero.headline}"></label></div><div class="form-grid"><label>Supporting Text<textarea name="heroText">${config.hero.supportingText}</textarea></label></div><div class="form-grid two"><label>Primary CTA Label<input name="primaryCtaLabel" value="${config.hero.primaryCtaLabel}"></label><label>Primary CTA Destination<input name="primaryCtaDestination" value="${config.hero.primaryCtaDestination}"></label></div><div class="form-grid two"><label>Secondary CTA Label<input name="secondaryCtaLabel" value="${config.hero.secondaryCtaLabel}"></label><label>Secondary CTA Destination<input name="secondaryCtaDestination" value="${config.hero.secondaryCtaDestination}"></label></div><div class="form-grid two"><label>Hero Media Type<select name="mediaType"><option value="video" ${config.hero.mediaType === 'video' ? 'selected' : ''}>Video</option><option value="image" ${config.hero.mediaType === 'image' ? 'selected' : ''}>Image</option></select></label><label>Overlay<select name="overlay"><option value="light" ${config.hero.overlay === 'light' ? 'selected' : ''}>Light</option><option value="medium" ${config.hero.overlay === 'medium' ? 'selected' : ''}>Medium</option><option value="dark" ${config.hero.overlay === 'dark' ? 'selected' : ''}>Dark</option></select></label></div><div class="cms-actions"><button class="button dark" type="submit">Save Changes</button><button class="button cream" type="button">Reset Section to Default</button></div></form>`);
}

function renderRoomsManager() {
  const roomList = getConfiguredRooms().map((room) => `<article class="cms-room-card"><img src="${img(room)}" alt="${room.name}"><div><h3>${room.name}</h3><p>${room.capacity ? `Up to ${room.capacity} guests` : 'Capacity on request'}</p><p>${room.price === null ? 'On Request' : `${peso(room.price)} / night`}</p><small>${room.visible === false ? 'Hidden' : 'Visible'}</small><div class="mini-actions"><a href="/admin/website/rooms/${room.slug}">Edit</a></div></div></article>`).join('');
  return adminShell('Rooms & Rates', '/admin/website/rooms', `<div class="admin-panel"><div class="panel-head"><h2>Public Room Catalog</h2><a href="/admin/website/rooms/new">Add Room</a></div><div class="room-list-grid">${roomList}</div></div>`);
}

function renderExperiencesManager() {
  const config = getSiteConfig();
  const items = Array.isArray(config.experiences) ? config.experiences : defaultSiteConfig().experiences;
  const rows = items.map((item) => `<li><strong>${escapeHtml(item.name || '')}</strong><span>${escapeHtml(item.description || '')}</span><label><input type="checkbox" data-experience-visibility="${escapeHtml(item.id || '')}" ${item.visible === false ? '' : 'checked'} /> Visible</label></li>`).join('');
  return adminShell('Experiences', '/admin/website/experiences', `<div class="admin-panel"><h2>Current Activities</h2><ul class="cms-list">${rows}</ul></div>`);
}

function renderAmenitiesManager() {
  const config = getSiteConfig();
  const items = Array.isArray(config.amenities) ? config.amenities : defaultSiteConfig().amenities;
  const rows = items.map((item) => `<li><strong>${escapeHtml(item.name || '')}</strong><span>${escapeHtml(item.description || '')}</span><label><input type="checkbox" data-amenity-visibility="${escapeHtml(item.id || '')}" ${item.visible === false ? '' : 'checked'} /> Visible</label></li>`).join('');
  return adminShell('Amenities', '/admin/website/amenities', `<div class="admin-panel"><h2>Verified Amenities</h2><ul class="cms-list">${rows}</ul></div>`);
}

function renderGalleryManager() {
  const config = getSiteConfig();
  const items = Array.isArray(config.gallery) ? config.gallery : defaultSiteConfig().gallery;
  const rows = items.map((item) => `<li><img src="${safeUrl(item.mediaUrl || '')}" alt="${escapeHtml(item.altText || item.caption || '')}" /><strong>${escapeHtml(item.caption || item.altText || '')}</strong><label><input type="checkbox" data-gallery-visibility="${escapeHtml(item.id || '')}" ${item.visible === false ? '' : 'checked'} /> Visible</label></li>`).join('');
  return adminShell('Gallery', '/admin/website/gallery', `<div class="admin-panel"><h2>Gallery Configuration</h2><ul class="cms-list">${rows}</ul></div>`);
}

function renderBookingSettings() {
  const config = getSiteConfig();
  return adminShell('Booking Settings', '/admin/website/booking', `<form class="cms-form" id="booking-settings-form"><div class="form-grid two"><label><input type="checkbox" name="bookingRequestEnabled" ${config.bookingSettings.bookingRequestEnabled ? 'checked' : ''}> Booking Request Enabled</label><label>Minimum Nights<input type="number" name="minNights" value="${config.bookingSettings.minNights}"></label></div><div class="form-grid two"><label>Default Adults<input type="number" name="defaultAdults" value="${config.bookingSettings.defaultAdults}"></label><label>Default Children<input type="number" name="defaultChildren" value="${config.bookingSettings.defaultChildren}"></label></div><div class="form-grid"><label>Confirmation Message<textarea name="confirmationMessage">${config.bookingSettings.confirmationMessage}</textarea></label></div><div class="cms-actions"><button class="button dark" type="submit">Save Changes</button></div></form>`);
}

function renderContactEditor() {
  const config = getSiteConfig();
  return adminShell('Contact & Social', '/admin/website/contact', `<form class="cms-form" id="contact-form"><div class="form-grid two"><label>Phone<input name="phone" value="${config.contact.phone}"></label><label>Email<input name="email" value="${config.contact.email}"></label></div><div class="form-grid"><label>Address<textarea name="address">${config.contact.address}</textarea></label></div><div class="form-grid two"><label>Facebook<input name="facebook" value="${config.social.facebook}"></label><label>Instagram<input name="instagram" value="${config.social.instagram}"></label></div><div class="form-grid two"><label>TikTok<input name="tiktok" value="${config.social.tiktok}"></label><label>YouTube<input name="youtube" value="${config.social.youtube}"></label></div><div class="cms-actions"><button class="button dark" type="submit">Save Changes</button></div></form>`);
}

function renderPoliciesEditor() {
  const config = getSiteConfig();
  return adminShell('Policies', '/admin/website/policies', `<form class="cms-form" id="policies-form"><div class="form-grid"><label>Reservation Terms<textarea name="terms">${config.policies.terms}</textarea></label></div><div class="form-grid"><label>Cancellation Policy<textarea name="cancellation">${config.policies.cancellation}</textarea></label></div><div class="form-grid"><label>Privacy Notice<textarea name="privacy">${config.policies.privacy}</textarea></label></div><div class="form-grid"><label>House Rules<textarea name="houseRules">${config.policies.houseRules}</textarea></label></div><div class="cms-actions"><button class="button dark" type="submit">Save Changes</button></div></form>`);
}

function renderSeoEditor() {
  const config = getSiteConfig();
  return adminShell('SEO', '/admin/website/seo', `<form class="cms-form" id="seo-form"><div class="form-grid two"><label>Site Title<input name="siteTitle" value="${config.seo.siteTitle}"></label><label>Meta Description<input name="metaDescription" value="${config.seo.metaDescription}"></label></div><div class="form-grid two"><label>Social Share Title<input name="socialTitle" value="${config.seo.socialTitle}"></label><label>Social Share Description<input name="socialDescription" value="${config.seo.socialDescription}"></label></div><div class="form-grid"><label>Social Share Image<input name="socialImage" value="${config.seo.socialImage}"></label></div><p class="muted-note">Production SEO settings are not active until deployment.</p><div class="cms-actions"><button class="button dark" type="submit">Save Changes</button></div></form>`);
}

function renderMediaLibrary() {
  const media = JSON.parse(getStorage().getItem('aquapoint-media') || '[]');
  const items = media.length ? media.map((file) => `<tr><td><img src="${file.url}" alt="${file.alt || file.name}" /></td><td>${file.name}</td><td>${file.type}</td><td>${file.usage || 'Unused'}</td><td>${file.alt || ''}</td><td><button type="button">Delete</button></td></tr>`).join('') : '<tr><td colspan="6">No media uploaded yet.</td></tr>';
  return adminShell('Media Library', '/admin/media', `<div class="admin-panel"><div class="panel-head"><h2>Mock Media Library</h2><a href="/admin/media/upload">Upload Media</a></div><table class="admin-table"><thead><tr><th>Thumbnail</th><th>Filename</th><th>Media Type</th><th>Usage</th><th>Alt Text</th><th>Actions</th></tr></thead><tbody>${items}</tbody></table></div>`);
}

function renderSettingsPage() {
  return adminShell('Settings', '/admin/settings', '<div class="admin-panel"><h2>Environment</h2><ul class="cms-list"><li>Environment: Local</li><li>Database: Not Connected</li><li>Authentication: Supabase Auth</li><li>Storage: Local / Mock</li><li>Website: Local Preview</li></ul><div class="cms-actions"><button class="button dark" type="button" data-action="reset-site">Restore Default Demo Website</button></div></div>');
}

function renderCalendar() {
  const items = getReservations();
  const rows = Array.from({ length: 35 }, (_, index) => {
    const base = Date.UTC(2026, 9, 1);
    const day = new Date(base + index * 86400000);
    const date = day.toISOString().slice(0, 10);
    const stays = items.filter((item) => item.checkIn <= date && item.checkOut >= date).slice(0, 3);
    return `<div class="calendar-day ${stays.length ? 'has-stays' : ''}"><span>${day.getUTCDate()}</span>${stays.map((s) => `<small class="calendar-tag status-${s.status}">${s.reservationNumber}</small>`).join('')}</div>`;
  }).join('');
  return adminShell('Calendar', '/admin/calendar', `<div class="admin-panel"><h2>Reservation calendar</h2><div class="calendar-grid">${rows}</div></div>`);
}

function renderGuests() {
  const items = getReservations();
  const grouped = Object.values(items.reduce((map, item) => {
    const key = item.guestEmail || item.guestPhone || item.guestFullName;
    map[key] = map[key] || { guestFullName: item.guestFullName, email: item.guestEmail, phone: item.guestPhone, reservations: [] };
    map[key].reservations.push(item);
    return map;
  }, {}));
  const rows = grouped.map((item) => `<tr><td>${item.guestFullName}</td><td>${item.email}</td><td>${item.phone}</td><td>${item.reservations.length}</td><td>${item.reservations[0]?.checkIn || '—'}</td><td>${item.reservations.map((r) => `<a href="/admin/reservations/${r.id}">${r.reservationNumber}</a>`).join(', ')}</td></tr>`).join('');
  return adminShell('Guests', '/admin/guests', `<div class="admin-panel"><table class="admin-table"><thead><tr><th>Guest</th><th>Email</th><th>Phone</th><th>Reservations</th><th>Most Recent Booking</th><th>Associated reservations</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No guest records available.</td></tr>'}</tbody></table></div>`);
}

function renderPayments() {
  const items = getReservations().map((row) => `<tr><td>${row.reservationNumber}</td><td>${row.guestFullName}</td><td>${row.roomName}</td><td>${row.paymentMethod || 'pay_at_resort'}</td><td>Unverified</td><td>${row.estimatedTotal === null ? 'On Request' : peso(row.estimatedTotal)}</td></tr>`).join('');
  return adminShell('Payments', '/admin/payments', `<div class="admin-panel"><table class="admin-table"><thead><tr><th>Reservation</th><th>Guest</th><th>Accommodation</th><th>Preference</th><th>Status</th><th>Estimated Amount</th></tr></thead><tbody>${items}</tbody></table></div>`);
}

function renderReports() {
  const items = getReservations();
  const byStatus = ['pending', 'confirmed', 'cancelled', 'completed'].map((status) => `${status}: ${items.filter((item) => item.status === status).length}`).join(', ');
  return adminShell('Reports', '/admin/reports', `<div class="stats-grid"><div class="stat-card"><span>Reservations by Status</span><strong>${byStatus}</strong></div><div class="stat-card"><span>Bookings by Room</span><strong>${rooms.length} room types</strong></div><div class="stat-card"><span>Upcoming Stays</span><strong>${items.filter((item) => item.status !== 'cancelled' && item.checkIn >= new Date().toISOString().slice(0, 10)).length}</strong></div><div class="stat-card"><span>Estimated Booking Value</span><strong>${peso(items.reduce((sum, item) => sum + Number(item.estimatedTotal || 0), 0))}</strong></div></div>`);
}

function renderRoomEditor(slug) {
  const room = getConfiguredRooms().find((item) => item.slug === slug) || rooms.find((item) => item.slug === slug);
  if (!room) return adminShell('Room Not Found', '/admin/website/rooms', '<div class="admin-panel"><h2>Room not found</h2></div>');
  const config = getSiteConfig();
  const current = room.price === null || room.price === undefined ? 'On Request' : `${peso(room.price)} / night`;
  return adminShell(`Edit ${room.name}`, '/admin/website/rooms', `<div class="admin-panel"><form class="cms-form" data-room-editor="${room.slug}"><div class="form-grid two"><label>Name<input name="name" value="${escapeHtml(room.name)}" /></label><label>Slug<input name="slug" value="${escapeHtml(room.slug)}" readonly /></label></div><div class="form-grid"><label>Primary Description<textarea name="description">${escapeHtml(room.description || '')}</textarea></label></div><div class="form-grid two"><label>Capacity<input type="number" name="capacity" value="${room.capacity === null || room.capacity === undefined ? '' : room.capacity}" /></label><label>Rate<input type="number" name="rate" value="${room.price === null || room.price === undefined ? '' : room.price}" /></label></div><div class="form-grid two"><label>Pricing Type<select name="pricingType"><option value="fixed" ${room.price !== null && room.price !== undefined ? 'selected' : ''}>Fixed</option><option value="on_request" ${room.price === null || room.price === undefined ? 'selected' : ''}>On Request</option></select></label><label>Main Image<input name="image" value="${escapeHtml(room.image || '')}" /></label></div><div class="form-grid two"><label><input type="checkbox" name="visible" ${room.visible === false ? '' : 'checked'} /> Visible</label><label><input type="checkbox" name="featured" ${room.featured ? 'checked' : ''} /> Featured</label></div><div class="form-grid two"><label><input type="checkbox" name="bookingEnabled" ${room.bookingEnabled === false ? '' : 'checked'} /> Booking Enabled</label><label>Sort Order<input type="number" name="sortOrder" value="${room.sortOrder || 0}" /></label></div><div class="form-grid"><p>Current Rate: ${escapeHtml(current)}</p><p>New Rate: <strong>${escapeHtml(room.price === null || room.price === undefined ? 'On Request' : `${peso(room.price)} / night`)}</strong></p></div><div class="cms-actions"><button class="button dark" type="submit">Save Changes</button><a class="button cream" href="/admin/website/rooms">Back</a></div></form></div>`);
}

function renderAdminPage(path) {
  if (path === '/admin' || path === '/admin/') return renderDashboard();
  const page = routePrefix(path);
  if (page === '/admin/dashboard' || page === '/admin/overview') return renderDashboard();
  if (page === '/admin/reservations') return renderReservations();
  if (page === '/admin/calendar') return renderCalendar();
  if (page === '/admin/guests') return renderGuests();
  if (page === '/admin/payments') return renderPayments();
  if (page === '/admin/reports') return renderReports();
  if (page === '/admin/website') return renderWebsiteOverview();
  if (page === '/admin/website/homepage') return renderHomepageEditor();
  if (page === '/admin/website/rooms') return renderRoomsManager();
  if (page.startsWith('/admin/website/rooms/')) return renderRoomEditor(page.split('/').pop());
  if (page === '/admin/website/experiences') return renderExperiencesManager();
  if (page === '/admin/website/amenities') return renderAmenitiesManager();
  if (page === '/admin/website/gallery') return renderGalleryManager();
  if (page === '/admin/website/booking') return renderBookingSettings();
  if (page === '/admin/website/contact') return renderContactEditor();
  if (page === '/admin/website/policies') return renderPoliciesEditor();
  if (page === '/admin/website/seo') return renderSeoEditor();
  if (page === '/admin/media') return renderMediaLibrary();
  if (page === '/admin/settings') return renderSettingsPage();
  if (page.startsWith('/admin/reservations/')) return renderReservationDetail(page.split('/').pop());
  return adminShell('Dashboard', '/admin/dashboard', '<div class="admin-panel"><h2>Page not found</h2></div>');
}

function card(r) {
  return `<article class="room-card"><a class="card-image" href="${href(r)}"><img src="${img(r)}" alt="${r.name} accommodation at Aquapoint Beach Resort" loading="lazy"></a><div class="card-body"><div class="card-top"><span class="eyebrow">${r.category}</span><span class="capacity">${svg('users')}${r.capacity ? `Up to ${r.capacity} Guests` : 'Capacity on request'}</span></div><h3><a href="${href(r)}">${r.name}</a></h3><p>${r.description}</p><div class="card-bottom"><span>${r.price ? `<b>${peso(r.price)}</b> / night` : 'On Request'}</span></div><div class="card-actions"><a href="${href(r)}" aria-label="View ${r.name}">VIEW ROOM ${svg('arrow')}</a><a class="reserve-link" href="${book(r)}" aria-label="Book ${r.name}">BOOK THIS ROOM ${svg('arrow')}</a></div></div></article>`;
}

function shell(content) {
  const currentPath = typeof location !== 'undefined' ? location.pathname.replace(/\/+$/, '') || '/' : '/';
  if (app) {
    app.innerHTML = `<header class="site-header ${currentPath === '/' ? 'is-home' : ''}"><a class="brand" href="/" aria-label="Aquapoint Beach Resort home"><img class="brand-logo" src="/images/aquapoint-logo.webp" alt="Aquapoint Beach Resort"></a><nav id="main-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/rooms/">Rooms & Stays</a><a href="/#experiences">Experiences</a><a href="/#amenities">Amenities</a><a href="/#gallery">Gallery</a><a href="/booking/">Reservations</a></nav><a class="header-cta" href="/booking/">BOOK YOUR STAY ${svg('arrow')}</a><button class="nav-toggle" type="button" aria-label="Open menu" aria-controls="main-nav" aria-expanded="false"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button></header><div class="nav-backdrop" aria-hidden="true"></div><main>${content}</main><footer><div class="footer-main"><div class="footer-brand"><a href="/" aria-label="Aquapoint Beach Resort home"><img src="/images/aquapoint-logo.webp" alt="Aquapoint Beach Resort" loading="lazy"></a><p>Your Relaxing Escape<br>by the Sea.</p><span class="footer-note">Find a stay that fits your getaway. Availability and reservation details are confirmed by resort staff.</span></div><div class="footer-links"><h3>EXPLORE</h3><a href="/rooms/">Rooms & Stays</a><a href="/#experiences">Experiences</a><a href="/#amenities">Amenities</a><a href="/#gallery">Gallery</a></div><div class="footer-links"><h3>PLAN YOUR STAY</h3><a href="/booking/">Reservations</a><a href="/rooms/">Compare accommodations</a><span class="footer-note">Rates shown are estimates until your request is confirmed.</span></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Aquapoint Beach Resort</span><span>Your Relaxing Escape by the Sea.</span></div></footer>`;
  }
  if (typeof document !== 'undefined') {
    const footerBottom = document.querySelector('.footer-bottom');
    if (footerBottom && !footerBottom.querySelector('.footer-staff-link')) {
      const staffLink = document.createElement('a');
      staffLink.href = '/admin';
      staffLink.className = 'footer-staff-link';
      staffLink.setAttribute('aria-label', 'Staff sign in');
      staffLink.textContent = 'STAFF';
      footerBottom.append(staffLink);
    }
  }
  if (typeof document === 'undefined') return;
  const header = $('.site-header');
  const toggle = $('.nav-toggle');
  const nav = $('#main-nav');
  const backdrop = $('.nav-backdrop');
  if (!header || !toggle || !nav || !backdrop) return;
  const close = () => {
    nav.classList.remove('open');
    backdrop.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
  };
  toggle.onclick = () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
  };
  backdrop.onclick = close;
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.onkeydown = (e) => { if (e.key === 'Escape') close(); };
  if (window.aqpHeaderScroll) window.removeEventListener('scroll', window.aqpHeaderScroll);
  window.aqpHeaderScroll = () => header.classList.toggle('scrolled', window.scrollY > 35);
  window.addEventListener('scroll', window.aqpHeaderScroll, { passive: true });
  window.aqpHeaderScroll();
}

function home() {
  const roomCatalog = getConfiguredRooms();
  const config = getSiteConfig();
  const hero = config.hero || {};
  const experiences = (Array.isArray(config.experiences) ? config.experiences : []).filter((item) => item.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const amenities = (Array.isArray(config.amenities) ? config.amenities : []).filter((item) => item.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const gallery = (Array.isArray(config.gallery) ? config.gallery : []).filter((item) => item.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const featured = (config.featuredRoomSlugs || []).map((slug) => roomCatalog.find((room) => room.slug === slug)).filter(Boolean);
  const featuredRooms = featured.length ? featured : roomCatalog.slice(0, 3);
  const heroHeadline = hero.headline || 'Make room for the coast.';
  const splitHeadline = heroHeadline.includes('the coast') ? ['Make room for', 'the coast'] : heroHeadline.split(/[,.]/).filter(Boolean);
  const heroPrimary = `${hero.primaryCtaLabel || 'BOOK YOUR STAY'} ${svg('arrow')}`;
  const heroSecondary = `${hero.secondaryCtaLabel || 'EXPLORE OUR STAYS'} ${svg('arrow')}`;
  const heroImage = config.intro.image || '/images/resort-aerial.webp';
  const brandName = config.brand && config.brand.name ? config.brand.name : 'Aquapoint Beach Resort';
  const announcement = config.announcement && config.announcement.enabled && config.announcement.message ? `<div class="announcement-bar"><span>${config.announcement.message}</span>${config.announcement.ctaLabel && config.announcement.ctaUrl ? `<a href="${config.announcement.ctaUrl}">${config.announcement.ctaLabel}</a>` : ''}</div>` : '';
  const sections = config.sections || {};
  const sectionMarkup = [];
  if (sections.bookingSearch !== false) sectionMarkup.push(`<div class="search-shell"><form class="booking-search" id="home-search"><label class="search-field"><span>CHECK-IN</span><input type="date" name="checkin" required aria-label="Check-in date"><span class="field-icon">${svg('calendar')}</span></label><label class="search-field"><span>CHECK-OUT</span><input type="date" name="checkout" required aria-label="Check-out date"><span class="field-icon">${svg('calendar')}</span></label><div class="search-field"><span>GUESTS</span><div class="guest-inline"><label>Adults<input type="number" name="adults" value="2" min="1" aria-label="Adults"></label><label>Children<input type="number" name="children" value="0" min="0" aria-label="Children"></label></div></div><label class="search-field"><span>ACCOMMODATION</span><select name="room" aria-label="Accommodation"><option value="">All Rooms</option>${roomCatalog.map((r) => `<option value="${r.slug}">${r.name}</option>`).join('')}</select></label><button class="search-submit" type="submit">CHECK AVAILABILITY ${svg('arrow')}</button><div id="search-error" class="search-error" role="alert"></div></form><p class="search-note">Search continues to a booking request. Availability is confirmed by resort staff.</p></div>`);
  if (sections.bookingSearch !== false) sectionMarkup.push(`<section class="booking-reassurance" aria-label="Reservation request information"><div><span>01</span><strong>RESERVATION REQUEST</strong><p>Submitting your details does not confirm a stay.</p></div><div><span>02</span><strong>STAFF CONFIRMATION</strong><p>Resort staff confirm availability and final details.</p></div><div><span>03</span><strong>PAYMENT PREFERENCE</strong><p>This form records a preference; it does not process payment.</p></div></section>`);
  if (sections.welcome !== false) sectionMarkup.push(`<section class="intro welcome reveal" id="welcome"><div class="welcome-copy"><span class="eyebrow">${config.intro.eyebrow || 'WELCOME TO AQUAPOINT'}</span><h2>${config.intro.heading || 'Where the sea slows everything down.'}</h2><p>${config.intro.description || ''}</p><a class="text-link" href="/rooms/">DISCOVER YOUR STAY ${svg('arrow')}</a></div><figure class="welcome-photo"><img src="${heroImage}" alt="Aerial view of Aquapoint Beach Resort and shoreline" loading="lazy" width="1280" height="720"><figcaption class="welcome-caption">THE COAST AT AQUAPOINT</figcaption></figure></section>`);
  if (sections.featuredRooms !== false) sectionMarkup.push(`<section class="featured reveal" id="stays"><div class="featured-intro"><div><span class="eyebrow">STAY AT AQUAPOINT</span><h2>Find Your Space by the Sea</h2></div><p>From intimate coastal rooms to spacious group accommodations, find the space made for your getaway.</p></div><div class="featured-scroll">${featuredRooms.map(card).join('')}</div><div class="center"><a class="button dark" href="/rooms/">EXPLORE ALL ROOMS ${svg('arrow')}</a></div></section>`);
  if (sections.resortStory !== false) sectionMarkup.push(`<section class="resort-story reveal"><img src="/images/resort-shore.webp" alt="Aquapoint beachfront and sea from above" loading="lazy"><div class="story-content"><span class="eyebrow">THE COAST IS CALLING</span><h2>Wake up closer<br>to the water.</h2><p>Make space for easy mornings, long afternoons, and time together by the sea.</p><a class="button outline-light" href="/booking/">PLAN YOUR STAY ${svg('arrow')}</a></div></section>`);
  if (sections.experiences !== false && experiences.length) sectionMarkup.push(`<section class="experiences" id="experiences"><div class="section-wrap"><div class="section-title reveal"><div><span class="eyebrow">DO MORE, OR LESS</span><h2>Experience Aquapoint</h2></div><p>Choose the pace that suits your getaway. Activities and arrangements are confirmed with the resort.</p></div><div class="experience-layout"><figure class="experience-photo"><img src="/images/resort-shore.webp" alt="Aquapoint beachfront and sea" loading="lazy" width="1280" height="720"><figcaption>THE SHORELINE AT AQUAPOINT</figcaption></figure><div class="experience-grid">${experiences.map((item, index) => `<article class="experience-card reveal"><span class="experience-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${item.name}</h3><p>${item.description}</p></div></article>`).join('')}</div></div></div></section>`);
  if (sections.amenities !== false && amenities.length) sectionMarkup.push(`<section class="amenities" id="amenities"><div class="section-wrap"><div class="section-title reveal"><div><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>Resort Amenities</h2></div><p>Thoughtful spaces for your day by the coast. Ask the resort about access and arrangements for your visit.</p></div><div class="amenity-grid reveal">${amenities.map((item) => `<div class="amenity"><span class="amenity-mark">${lineIcon(item.icon)}</span><h3>${item.name}</h3><p>${item.description}</p></div>`).join('')}</div></div></section>`);
  if (sections.gallery !== false && gallery.length) sectionMarkup.push(`<section class="gallery-section" id="gallery"><div class="section-wrap"><div class="section-title reveal"><div><span class="eyebrow">A LOOK INSIDE</span><h2>The Aquapoint Gallery</h2></div><p>Real views of the resort and the accommodations that welcome every kind of stay.</p></div><div class="gallery-grid reveal">${gallery.map((item, index) => `<button class="gallery-item" type="button" data-gallery="${index}" aria-label="View photo: ${item.caption || item.altText || ''}"><img src="${item.mediaUrl || ''}" alt="${item.altText || item.caption || ''}" loading="lazy"><span>VIEW PHOTO ${svg('arrow')}</span></button>`).join('')}</div></div></section>`);
  if (sections.bookingCta !== false) sectionMarkup.push(`<section class="closing"><span class="eyebrow light">YOUR STAY, YOUR WAY</span><h2>Gather together.<br><em>Settle in by the sea.</em></h2><p>From a quiet stay for two to room for the whole group.</p><a class="button cream" href="/booking/">BOOK YOUR STAY ${svg('arrow')}</a></section>`);
  shell(`${announcement}<section class="home-hero"><img src="${heroImage}" alt="Aquapoint Beach Resort beachfront and shoreline" class="hero-photo" width="1280" height="720" fetchpriority="high"><video class="hero-video" autoplay muted loop playsinline preload="metadata" poster="${heroImage}" aria-hidden="true"></video><div class="hero-shade"></div><div class="hero-copy"><span class="eyebrow light">${hero.eyebrow || 'AQUAPOINT BEACH RESORT'}</span><h1>${splitHeadline[0] || 'Make room'}<br><em>${splitHeadline[1] || 'the coast'}</em></h1><p>${hero.supportingText || 'Your relaxing escape by the sea. Find the space that fits your kind of getaway.'}</p><div class="hero-actions"><a class="button gold" href="${hero.primaryCtaDestination || '/booking/'}">${heroPrimary}</a><a class="button outline-light" href="${hero.secondaryCtaDestination || '/rooms/'}">${heroSecondary}</a></div></div><a class="hero-scroll" href="#welcome">SCROLL TO EXPLORE</a></section>${sectionMarkup.join('')}<dialog class="gallery-dialog" aria-label="${brandName} photo gallery"><div class="gallery-dialog-inner"><button type="button" class="gallery-dialog-close" aria-label="Close gallery">×</button><button type="button" class="gallery-dialog-prev" aria-label="Previous photo">‹</button><img alt=""><button type="button" class="gallery-dialog-next" aria-label="Next photo">›</button><div class="gallery-dialog-caption" aria-live="polite"></div></div></dialog>`);
  if (typeof setupHomeSearch === 'function') setupHomeSearch();
  if (typeof setupGallery === 'function') setupGallery(gallery);
  if (typeof setupReveals === 'function') setupReveals();
}

function listing() {
  const roomCatalog = getConfiguredRooms();
  const search = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const party = Number(search.get('adults') || 0) + Number(search.get('children') || 0);
  shell(`<section class="page-hero"><span class="eyebrow">ROOMS & ACCOMMODATIONS</span><h1>A Stay for<br><em>Every Escape</em></h1><p>Whether you're traveling as a couple, family, barkada, or large group, find a comfortable space to call your own at Aquapoint Beach Resort.</p></section><section class="listing"><div class="list-toolbar"><div><span class="eyebrow">EXPLORE THE COLLECTION</span><p>${party > 0 ? `Choose a stay for ${party} ${party === 1 ? 'guest' : 'guests'}. Your dates and guest counts will carry into your booking request.` : 'Find the space that feels right for you.'}</p></div><div class="filters" role="group" aria-label="Filter stays">${['All Stays', 'Couples', 'Families', 'Groups', 'Large Groups'].map((filter, index) => `<button type="button" data-filter="${filter}" class="${index === 0 ? 'active' : ''}">${filter}</button>`).join('')}</div></div><div class="room-grid" id="room-grid">${roomCatalog.map(card).join('')}</div><div class="compare" id="compare"><div><span class="eyebrow">FIND YOUR FIT</span><h2>Compare Your Stay</h2><p>Choose two or three accommodations to see their details side by side.</p></div><div class="compare-controls">${roomCatalog.map((r) => `<label><input type="checkbox" value="${r.slug}"><span>${r.name}</span></label>`).join('')}</div><div id="comparison" aria-live="polite"><p class="hint">Select at least two stays to compare.</p></div></div></section><button type="button" id="compare-fab" class="compare-fab" hidden>COMPARE (0) ${svg('arrow')}</button>`);
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.onclick = () => {
      document.querySelector('.filters .active')?.classList.remove('active');
      button.classList.add('active');
      const filter = button.dataset.filter;
      $('#room-grid').innerHTML = roomCatalog.filter((r) => filter === 'All Stays' || (r.tags || []).includes(filter)).map(card).join('');
    };
  });
  $('#compare-fab').onclick = () => $('#compare').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  document.querySelectorAll('.compare-controls input').forEach((input) => {
    input.onchange = () => {
      let chosen = [...document.querySelectorAll('.compare-controls input:checked')];
      if (chosen.length > 3) {
        input.checked = false;
        chosen = chosen.filter((item) => item !== input);
      }
      const fab = $('#compare-fab');
      fab.hidden = chosen.length < 2;
      fab.innerHTML = `COMPARE (${chosen.length}) ${svg('arrow')}`;
      $('#comparison').innerHTML = chosen.length < 2 ? '<p class="hint">Select at least two stays to compare.</p>' : `<div class="comparison-grid">${chosen.map((item) => { const r = roomCatalog.find((room) => room.slug === item.value); return `<div><img src="${img(r)}" alt="${r.name}"><h3>${r.name}</h3><p>${r.category}</p><p>${r.capacity ? `Up to ${r.capacity} guests` : 'Capacity on request'}</p><p>${r.price ? `${peso(r.price)} / night` : 'Rate on request'}</p><div class="comparison-actions"><a class="text-link" href="${href(r)}">VIEW ROOM ${svg('arrow')}</a><a class="text-link" href="${book(r)}">RESERVE ${svg('arrow')}</a></div></div>`; }).join('')}</div>`;
    };
  });
  setupReveals();
}

function detail(r) {
  document.title = `${r.name} | Aquapoint Beach Resort`;
  shell(`<div class="breadcrumbs"><a href="/">Home</a><span>/</span><a href="/rooms/">Rooms</a><span>/</span>${r.name}</div><section class="detail-image"><img src="${img(r)}" alt="${r.name} accommodation at Aquapoint Beach Resort"><a href="${img(r)}" target="_blank" rel="noopener" class="photo-link">VIEW PHOTO ${svg('arrow')}</a></section><section class="detail-layout"><div class="detail-copy"><span class="eyebrow">AQUAPOINT BEACH RESORT · ${r.category.toUpperCase()}</span><h1>${r.name}</h1><p class="detail-capacity">${svg('users')} ${r.capacity ? `Up to ${r.capacity} Guests` : 'Capacity available on request'}</p><p class="description">${r.description}</p><div class="detail-divider"></div><h2>About this stay</h2><p>Make this space your home base for a relaxing escape by the sea. Contact the resort to confirm availability and the amenities for your dates.</p><div class="detail-divider"></div><h2>Good to know</h2><p>Accommodation rates are shown per night. Amenities and availability are confirmed during reservation.</p></div><aside class="booking-panel"><span class="eyebrow">PLAN YOUR STAY</span><div class="panel-price">${r.price ? `<strong>${peso(r.price)}</strong><span> / night</span>` : '<strong>Rate on request</strong>'}</div><p>${r.capacity ? `Designed for up to ${r.capacity} guests.` : 'Please inquire for the villa’s guest capacity and rate.'}</p><form id="quick-form"><div class="date-pair"><label>CHECK-IN<input type="date" name="checkin" required></label><label>CHECK-OUT<input type="date" name="checkout" required></label></div><label class="guest-count">GUESTS<input type="number" name="guests" min="1" ${r.capacity ? `max="${r.capacity}"` : ''} value="${Math.min(r.capacity || 2, 2)}" required></label><div class="detail-estimate" aria-live="polite" id="detail-estimate">Select your dates to view an estimated stay.</div><button class="button dark full" type="submit">CONTINUE TO BOOKING ${svg('arrow')}</button></form><a class="text-link panel-link" href="${book(r)}">Reserve ${r.name} ${svg('arrow')}</a></aside></section>`);
  const photoDialog = document.createElement('dialog');
  photoDialog.className = 'gallery-dialog';
  photoDialog.setAttribute('aria-label', `${r.name} photo gallery`);
  photoDialog.innerHTML = `<div class="gallery-dialog-inner"><button type="button" class="gallery-dialog-close" aria-label="Close gallery">×</button><button type="button" class="gallery-dialog-prev" aria-label="Previous photo">‹</button><img alt=""><button type="button" class="gallery-dialog-next" aria-label="Next photo">›</button><div class="gallery-dialog-caption" aria-live="polite"></div></div>`;
  app.querySelector('main')?.append(photoDialog);
  $('.photo-link')?.setAttribute('data-gallery', '0');
  setupGallery([{ mediaUrl: img(r), altText: `${r.name} accommodation at Aquapoint Beach Resort` }]);
  const mobileCta = document.createElement('a');
  mobileCta.className = 'detail-mobile-cta';
  mobileCta.href = book(r);
  mobileCta.setAttribute('aria-label', `Book ${r.name}`);
  mobileCta.innerHTML = `BOOK YOUR STAY ${svg('arrow')}`;
  app.querySelector('main')?.append(mobileCta);
  const form = $('#quick-form');
  if (!form) return;
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  form.elements.checkin.min = today;
  form.elements.checkout.min = today;
  function estimate() {
    const start = form.elements.checkin.value;
    const end = form.elements.checkout.value;
    if (start) form.elements.checkout.min = start;
    const nights = Math.round((new Date(end) - new Date(start)) / 86400000);
    $('#detail-estimate').innerHTML = Number.isFinite(nights) && nights > 0 ? (r.price ? `${nights} ${nights === 1 ? 'night' : 'nights'} × ${peso(r.price)}<strong>${peso(nights * r.price)}</strong><span>Estimated accommodation total</span>` : `${nights} ${nights === 1 ? 'night' : 'nights'}<strong>On Request</strong><span>Estimated total confirmed by resort staff</span>`) : 'Select your dates to view an estimated stay.';
  }
  form.addEventListener('input', estimate);
  form.addEventListener('change', estimate);
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const guests = Number(data.get('guests'));
    if (data.get('checkout') <= data.get('checkin')) {
      form.elements.checkout.setCustomValidity('Check-out must be after check-in.');
      form.reportValidity();
      return;
    }
    form.elements.checkout.setCustomValidity('');
    const params = new URLSearchParams({ room: r.slug, checkin: data.get('checkin'), checkout: data.get('checkout'), adults: String(guests), children: '0' });
    location.href = `/booking/?${params}`;
  };
  setupReveals();
}

function booking() {
  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const roomCatalog = getConfiguredRooms();
  const selected = roomCatalog.find((r) => r.slug === params.get('room')) || roomCatalog[0];
  const dateValue = (name) => /^\d{4}-\d{2}-\d{2}$/.test(params.get(name) || '') ? params.get(name) : '';
  const countValue = (name, fallback) => { const value = Number(params.get(name)); return Number.isInteger(value) && value >= (name === 'adults' ? 1 : 0) ? value : fallback; };
  const activities = [['swimming', 'Swimming'], ['kayaking', 'Kayaking'], ['snorkeling', 'Snorkeling'], ['beach_volleyball', 'Beach Volleyball'], ['beach_time', 'Relaxing at the Beach']];
  const amenitiesList = [['swimming_pool', 'Swimming Pool'], ['beach_cottage', 'Beach Cottage'], ['shower_room', 'Shower Room'], ['picnic_area', 'Picnic Area'], ['resort_restaurant', 'Resort Restaurant']];
  shell(`<section class="page-hero booking-hero"><span class="eyebrow">PLAN YOUR ESCAPE</span><h1>Reservation<br><em>Details</em></h1><p>Tell us about your preferred stay. Aquapoint staff will review your request and confirm availability.</p></section><section class="booking-layout"><form id="booking-form" class="reservation-form"><section class="booking-step"><div class="booking-step-head"><span class="step-number">01</span><div><h2>Your stay</h2><p>Choose your accommodation, dates, and guests.</p></div></div><div class="form-grid"><label class="wide">ACCOMMODATION<select name="room">${roomCatalog.map((r) => `<option value="${r.slug}" ${r.slug === selected.slug ? 'selected' : ''}>${r.name}</option>`).join('')}</select></label><label>CHECK-IN<input type="date" name="checkin" value="${dateValue('checkin')}" required></label><label>CHECK-OUT<input type="date" name="checkout" value="${dateValue('checkout')}" required></label><label>ADULTS<input type="number" name="adults" min="1" value="${countValue('adults', 2)}" required></label><label>CHILDREN<input type="number" name="children" min="0" value="${countValue('children', 0)}" required></label></div><div id="capacity-message" aria-live="polite"></div></section><section class="booking-step guest-section"><div class="booking-step-head"><span class="step-number">02</span><div><h2>Guest details</h2><p>How can the resort reach you about your request?</p></div></div><div class="form-grid"><label class="wide">FULL NAME<input name="guestFullName" autocomplete="name" maxlength="150" required></label><label>EMAIL ADDRESS<input type="email" name="guestEmail" autocomplete="email" maxlength="254" required></label><label>CONTACT NUMBER<input type="tel" name="guestPhone" autocomplete="tel" maxlength="40" required></label><label class="wide">ADDRESS <span class="optional">OPTIONAL</span><input name="guestAddress" autocomplete="street-address" maxlength="300"></label></div></section><section class="booking-step"><div class="booking-step-head"><span class="step-number">03</span><div><h2>Preferences</h2><p>Optional interests help staff prepare your stay.</p></div></div><p class="preference-label">ACTIVITIES</p><div class="preference-grid">${activities.map(([value, label]) => `<label class="choice"><input type="checkbox" name="activities" value="${value}">${label}</label>`).join('')}</div><p class="preference-label">RESORT AMENITIES</p><div class="preference-grid">${amenitiesList.map(([value, label]) => `<label class="choice"><input type="checkbox" name="amenities" value="${value}">${label}</label>`).join('')}</div><div class="form-grid preferences-extra"><label class="wide">SPECIAL OCCASION <span class="optional">OPTIONAL</span><input name="specialOccasion" maxlength="120" placeholder="If you are celebrating something"></label><label class="wide">SPECIAL REQUESTS <span class="optional">OPTIONAL</span><textarea name="specialRequests" maxlength="2000" rows="3" placeholder="Anything you would like staff to know?"></textarea></label></div></section><section class="booking-step"><div class="booking-step-head"><span class="step-number">04</span><div><h2>Payment preference</h2><p>No payment is collected on this website.</p></div></div><div class="payment-options"><label class="choice"><input type="radio" name="paymentMethod" value="pay_at_resort" checked>Pay at Resort</label><label class="choice"><input type="radio" name="paymentMethod" value="gcash">GCash</label><label class="choice"><input type="radio" name="paymentMethod" value="bank_transfer">Bank Transfer</label></div><p class="form-note">Your preference is for staff review only. Payment instructions are confirmed separately.</p></section><section class="booking-step"><div class="booking-step-head"><span class="step-number">05</span><div><h2>Review your request</h2><p>Check the estimate before you submit.</p></div></div><div class="review-note">This is a booking request, not a confirmed reservation. Availability, amenities, activities, and final details are reviewed by Aquapoint Beach Resort.</div><label class="terms"><input type="checkbox" name="termsAccepted" required><span>I understand this is a booking request and my reservation is subject to confirmation by Aquapoint Beach Resort.</span></label><div id="form-errors" role="alert" aria-live="assertive"></div><p class="form-note">The amount shown is an estimated accommodation total. No payment is processed here.</p><div class="form-actions"><button type="submit" id="submit-booking" class="button dark">SUBMIT BOOKING REQUEST ${svg('arrow')}</button><button type="button" id="copy-request" class="copy-button">COPY RESERVATION DETAILS ${svg('arrow')}</button></div><span id="copy-status" role="status"></span></section></form><aside class="summary"><span class="eyebrow">YOUR ESTIMATE</span><h2>Stay Summary</h2><img id="summary-image" src="${img(selected)}" alt="${selected.name}"><dl><div><dt>Selected Accommodation</dt><dd id="s-room"></dd></div><div><dt>Check-in</dt><dd id="s-in">—</dd></div><div><dt>Check-out</dt><dd id="s-out">—</dd></div><div><dt>Number of Nights</dt><dd id="s-nights">—</dd></div><div><dt>Adults</dt><dd id="s-adults">2</dd></div><div><dt>Children</dt><dd id="s-children">0</dd></div><div><dt>Room Rate</dt><dd id="s-rate"></dd></div></dl><div class="summary-total"><span>Estimated Total</span><strong id="s-total"></strong></div><small>Availability and final details are confirmed by resort staff.</small></aside></section><details class="mobile-summary"><summary>ESTIMATED TOTAL <strong id="mobile-total">On Request</strong></summary><div><span id="mobile-room"></span><span id="mobile-dates"></span><span>Availability is confirmed by resort staff.</span></div></details>`);
  const bookingMobileCta = document.createElement('button');
  bookingMobileCta.type = 'submit';
  bookingMobileCta.setAttribute('form', 'booking-form');
  bookingMobileCta.className = 'booking-mobile-cta';
  bookingMobileCta.innerHTML = `SUBMIT BOOKING REQUEST ${svg('arrow')}`;
  app.querySelector('main')?.append(bookingMobileCta);
  const form = $('#booking-form');
  if (!form) return;
  let requestId = crypto.randomUUID();
  let submitting = false;
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  form.elements.checkin.min = today;
  form.elements.checkout.min = today;
  function update() {
    const d = new FormData(form);
    const r = roomCatalog.find((x) => x.slug === d.get('room'));
    const a = Number(d.get('adults'));
    const c = Number(d.get('children'));
    const n = Math.round((new Date(d.get('checkout')) - new Date(d.get('checkin'))) / 86400000);
    const valid = Number.isFinite(n) && n > 0;
    if (d.get('checkin')) form.elements.checkout.min = d.get('checkin');
    $('#s-room').textContent = r.name;
    $('#summary-image').src = img(r);
    $('#summary-image').alt = r.name;
    $('#s-in').textContent = d.get('checkin') || '—';
    $('#s-out').textContent = d.get('checkout') || '—';
    $('#s-nights').textContent = valid ? n : '—';
    $('#s-adults').textContent = a;
    $('#s-children').textContent = c;
    $('#s-rate').textContent = r.price ? `${peso(r.price)} / night` : 'On request';
    const total = r.price && valid ? peso(r.price * n) : 'On Request';
    $('#s-total').textContent = total;
    $('#mobile-total').textContent = total;
    $('#mobile-room').textContent = r.name;
    $('#mobile-dates').textContent = valid ? `${d.get('checkin')} — ${d.get('checkout')} · ${n} ${n === 1 ? 'night' : 'nights'}` : 'Select dates for an estimate';
    const msg = $('#capacity-message');
    if (r.capacity && a + c > r.capacity) {
      const options = roomCatalog.filter((x) => x.capacity && x.capacity >= a + c && x.slug !== r.slug).sort((x, y) => x.capacity - y.capacity);
      msg.innerHTML = `<div class="capacity-warning"><strong>This room accommodates up to ${r.capacity} guests.</strong><p>${options.length ? 'View larger rooms suited to your party:' : 'Please contact the resort about a larger group stay.'}</p>${options.map((x) => `<a href="${href(x)}">${x.name} · up to ${x.capacity} guests ${svg('arrow')}</a>`).join('')}${!options.length ? `<a href="${href(roomCatalog[8])}">Ask about the Luxury Villa ${svg('arrow')}</a>` : ''}</div>`;
    } else {
      msg.innerHTML = '';
    }
    return { d, r, a, c, n, valid, over: !!(r.capacity && a + c > r.capacity) };
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
  $('#copy-request').onclick = async () => {
    const x = update();
    if (!x.valid) { $('#copy-status').textContent = 'Enter a check-in and later check-out date first.'; return; }
    if (x.over) { $('#copy-status').textContent = 'Choose a room that fits your group first.'; return; }
    const details = `Aquapoint Beach Resort reservation inquiry\nAccommodation: ${x.r.name}\nCheck-in: ${x.d.get('checkin')}\nCheck-out: ${x.d.get('checkout')}\nNights: ${x.n}\nAdults: ${x.a}\nChildren: ${x.c}\nRoom rate: ${x.r.price ? `${peso(x.r.price)} / night` : 'On request'}\nEstimated total: ${x.r.price ? peso(x.r.price * x.n) : 'On request'}\nPlease confirm availability and final details.`;
    try { await navigator.clipboard.writeText(details); $('#copy-status').textContent = 'Reservation details copied.'; }
    catch { $('#copy-status').textContent = 'Copy is unavailable in this browser.'; }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const x = update();
    const error = $('#form-errors');
    error.textContent = '';
    if (!form.reportValidity()) return;
    if (x.d.get('checkin') < today) { error.textContent = 'Check-in cannot be in the past.'; return; }
    if (!x.valid) { error.textContent = 'Check-out must be after check-in.'; return; }
    if (x.over) { error.textContent = `This accommodation allows up to ${x.r.capacity} guests. Please reduce the number of guests or select a larger room.`; return; }
    const payload = { requestId, roomSlug: x.r.slug, checkIn: x.d.get('checkin'), checkOut: x.d.get('checkout'), adults: x.a, children: x.c, guestFullName: x.d.get('guestFullName'), guestEmail: x.d.get('guestEmail'), guestPhone: x.d.get('guestPhone'), guestAddress: x.d.get('guestAddress'), activities: x.d.getAll('activities'), amenities: x.d.getAll('amenities'), specialOccasion: x.d.get('specialOccasion'), specialRequests: x.d.get('specialRequests'), paymentMethod: x.d.get('paymentMethod'), termsAccepted: x.d.get('termsAccepted') === 'on' };
    const button = $('#submit-booking');
    submitting = true;
    button.disabled = true;
    button.textContent = 'Submitting booking request…';
    try {
      const response = await fetch('/api/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        error.textContent = result.fields ? Object.values(result.fields).join(' ') : result.error || 'Unable to submit your booking request right now. Please try again.';
        if (response.status === 409) requestId = crypto.randomUUID();
        return;
      }
      showConfirmation(result.reservation);
    } catch {
      error.textContent = 'Unable to submit your booking request right now. Please try again.';
    } finally {
      submitting = false;
      button.disabled = false;
      button.innerHTML = `SUBMIT BOOKING REQUEST ${svg('arrow')}`;
    }
  };
}

function showConfirmation(reservation) {
  const r = reservation;
  shell(`<section class="page-hero booking-hero"><span class="eyebrow">AQUAPOINT BEACH RESORT</span><h1>Booking Request<br><em>Received</em></h1><p>Thank you for choosing Aquapoint Beach Resort. Your booking request has been received and our resort staff will review your preferred dates and accommodation.</p></section><section class="confirmation"><span class="eyebrow">RESERVATION NUMBER</span><h2 id="confirmation-number"></h2><p class="pending-label">Pending Confirmation</p><p class="confirmation-note">Your reservation is not yet confirmed. Please wait for confirmation from Aquapoint Beach Resort.</p><dl>${[['Guest Name', r.guestFullName], ['Selected Accommodation', r.roomName], ['Check-in', r.checkIn], ['Check-out', r.checkOut], ['Number of Nights', r.nights], ['Adults', r.adults], ['Children', r.children], ['Estimated Total', r.estimatedTotal === null ? 'On Request' : peso(r.estimatedTotal)], ['Reservation Status', 'Pending Confirmation']].map(([label, value], i) => `<div><dt>${label}</dt><dd id="confirmation-${i}"></dd></div>`).join('')}</dl><button type="button" id="copy-confirmation" class="button dark">COPY RESERVATION DETAILS ${svg('arrow')}</button><span id="copy-status" role="status"></span><a class="text-link" href="/rooms/">EXPLORE ROOMS ${svg('arrow')}</a></section>`);
  $('#confirmation-number').textContent = r.reservationNumber;
  [r.guestFullName, r.roomName, r.checkIn, r.checkOut, r.nights, r.adults, r.children, r.estimatedTotal === null ? 'On Request' : peso(r.estimatedTotal), 'Pending Confirmation'].forEach((value, i) => $(`#confirmation-${i}`).textContent = value);
  if (typeof history !== 'undefined') history.replaceState(null, '', '/booking/');
  $('#copy-confirmation').onclick = async () => {
    const details = `AQUAPOINT BEACH RESORT\nBooking Request\n\nReservation: ${r.reservationNumber}\nStatus: Pending Confirmation\nGuest: ${r.guestFullName}\nRoom: ${r.roomName}\nCheck-in: ${r.checkIn}\nCheck-out: ${r.checkOut}\nNights: ${r.nights}\nAdults: ${r.adults}\nChildren: ${r.children}\nEstimated Total: ${r.estimatedTotal === null ? 'On Request' : peso(r.estimatedTotal)}`;
    try { await navigator.clipboard.writeText(details); $('#copy-status').textContent = 'Reservation details copied.'; }
    catch { $('#copy-status').textContent = 'Copy is unavailable in this browser.'; }
  };
}

function setupHomeSearch() {
  const form = $('#home-search');
  if (!form) return;
  const checkin = form.elements.checkin;
  const checkout = form.elements.checkout;
  const error = $('#search-error');
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  checkin.min = today;
  checkout.min = today;
  checkin.onchange = () => { checkout.min = checkin.value || today; if (checkout.value && checkout.value <= checkin.value) checkout.value = ''; };
  form.onsubmit = (e) => {
    e.preventDefault();
    error.textContent = '';
    if (!form.reportValidity()) return;
    const d = new FormData(form);
    const start = d.get('checkin');
    const end = d.get('checkout');
    const adults = Number(d.get('adults'));
    const children = Number(d.get('children'));
    if (start < today) { error.textContent = 'Choose a check-in date from today onward.'; return; }
    if (end <= start) { error.textContent = 'Check-out must be after check-in.'; return; }
    if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) { error.textContent = 'Enter a valid number of adults and children.'; return; }
    const room = rooms.find((r) => r.slug === d.get('room'));
    if (room?.capacity && adults + children > room.capacity) { error.textContent = `${room.name} accommodates up to ${room.capacity} guests. Choose a larger stay or adjust your group.`; return; }
    const params = new URLSearchParams({ checkin: start, checkout: end, adults: String(adults), children: String(children) });
    if (room) params.set('room', room.slug);
    location.href = room ? `/booking/?${params}` : `/rooms/?${params}`;
  };
}

function setupGallery(items) {
  const photos = items.map((item) => Array.isArray(item)
    ? item
    : [item.mediaUrl || item.url || '', item.altText || item.caption || 'Aquapoint Beach Resort']);
  const dialog = $('.gallery-dialog');
  if (!dialog || !photos.length) return;
  let index = 0;
  let lastTrigger = null;
  let startX = 0;
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('.gallery-dialog-caption');
  const show = (nextIndex) => {
    index = (nextIndex + photos.length) % photos.length;
    image.src = photos[index][0];
    image.alt = photos[index][1];
    caption.textContent = `${photos[index][1]} · ${index + 1} of ${photos.length}`;
  };
  document.querySelectorAll('[data-gallery]').forEach((button) => {
    button.onclick = (event) => { event.preventDefault(); lastTrigger = button; show(Number(button.dataset.gallery)); dialog.showModal(); };
  });
  dialog.querySelector('.gallery-dialog-close').onclick = () => dialog.close();
  dialog.querySelector('.gallery-dialog-prev').onclick = () => show(index - 1);
  dialog.querySelector('.gallery-dialog-next').onclick = () => show(index + 1);
  dialog.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); } });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => lastTrigger?.focus());
  dialog.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].screenX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => { const delta = e.changedTouches[0].screenX - startX; if (Math.abs(delta) > 50) show(index + (delta < 0 ? 1 : -1)); }, { passive: true });
}

function setupReveals() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;
  document.documentElement.classList.add('reveal-ready');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
  }, { threshold: 0.12 });
  targets.forEach((target) => observer.observe(target));
}

function setupHeroVideo() {
  const video = document.querySelector('.hero-video');
  if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  video.addEventListener('playing', () => video.classList.add('is-playing'));
  video.addEventListener('error', () => video.classList.remove('is-playing'));
  video.muted = true;
  video.playsInline = true;
  video.src = '/videos/aquapoint-drone-hero.mp4';
  video.load();
  video.play().catch(() => video.classList.remove('is-playing'));
}

let path= typeof location !== 'undefined' ? location.pathname.replace(/\/+$/, '') || '/' : '/';
if (typeof location !== 'undefined') {
  path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') {
    home();
    setupHeroVideo();
  } else if (path === '/rooms') {
    listing();
  } else if (path === '/booking') {
    booking();
  } else if (path.startsWith('/admin')) {
    startAdminRoute(path);
  } else {
    const match = path.match(/^\/rooms\/([^/]+)$/);
    const room = match && rooms.find((r) => r.slug === match[1]);
    if (room) detail(room);
    else shell('<section class="page-hero"><h1>Page not found</h1><a class="button dark" href="/rooms/">EXPLORE ROOMS</a></section>');
  }
}

globalThis.__aquapoint = { getSiteConfig, saveSiteConfig, getReservations, upsertReservation, confirmReservation, cancelReservation, completeReservation, resetDemoData, renderAdminPage };
