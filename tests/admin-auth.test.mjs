import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createAdminAuthController, isAuthorizedStaffProfile } from '../src/admin-auth.js';
import worker from '../dist/server/index.js';

const adminSession = { access_token: 'access-token', user: { id: 'staff-1' } };
const activeAdministrator = { id: 'staff-1', role: 'administrator', active: true };

function createHarness({ session = null, profile = null, signInError = null, profileError = null } = {}) {
  const states = [];
  const redirects = [];
  const calls = { listeners: 0, signsOut: 0, signIns: 0, profiles: 0 };
  let authListener;
  const supabase = {
    auth: {
      onAuthStateChange(callback) {
        calls.listeners += 1;
        authListener = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async getSession() { return { data: { session }, error: null }; },
      async signInWithPassword() {
        calls.signIns += 1;
        return signInError ? { data: { session: null }, error: signInError } : { data: { session: adminSession }, error: null };
      },
      async signOut() {
        calls.signsOut += 1;
        authListener?.('SIGNED_OUT', null);
        return { error: null };
      }
    },
    from(table) {
      assert.equal(table, 'staff_profiles');
      return {
        select(columns) {
          assert.equal(columns, 'id, role, active');
          return { eq(column, id) {
            assert.equal(column, 'id');
            assert.equal(id, adminSession.user.id);
            return { async maybeSingle() {
              calls.profiles += 1;
              return { data: profile, error: profileError };
            } };
          } };
        }
      };
    }
  };
  const controller = createAdminAuthController({
    supabase,
    onStateChange: (state) => states.push(state),
    onRedirect: (destination) => redirects.push(destination)
  });
  return { controller, states, redirects, calls };
}

test('unauthenticated admin visit stays on login state', async () => {
  const { controller } = createHarness();
  await controller.start('/admin/dashboard');
  assert.equal(controller.getState().status, 'unauthenticated');
});

test('invalid password remains denied without querying staff profiles', async () => {
  const { controller, calls } = createHarness({ signInError: new Error('invalid') });
  await controller.start('/admin');
  const result = await controller.signIn('staff@example.test', 'wrong-password');
  assert.equal(result.ok, false);
  assert.equal(controller.getState().status, 'unauthenticated');
  assert.equal(calls.profiles, 0);
});

test('active administrator gains access and deep destination is preserved', async () => {
  const { controller, redirects } = createHarness({ profile: activeAdministrator });
  await controller.start('/admin/reservations?status=pending');
  const result = await controller.signIn('staff@example.test', 'correct-password');
  assert.equal(result.ok, true);
  assert.equal(controller.getState().status, 'authorized');
  assert.deepEqual(redirects, ['/admin/reservations?status=pending']);
});

test('missing staff profile denies and signs out', async () => {
  const { controller, calls } = createHarness({ session: adminSession });
  await controller.start('/admin/dashboard');
  assert.equal(controller.getState().status, 'denied');
  assert.equal(calls.signsOut, 1);
});

test('inactive staff profile denies and signs out', async () => {
  const { controller, calls } = createHarness({ session: adminSession, profile: { ...activeAdministrator, active: false } });
  await controller.start('/admin/dashboard');
  assert.equal(controller.getState().status, 'denied');
  assert.equal(calls.signsOut, 1);
});

test('invalid staff role denies access', async () => {
  const { controller } = createHarness({ session: adminSession, profile: { ...activeAdministrator, role: 'owner' } });
  await controller.start('/admin/dashboard');
  assert.equal(controller.getState().status, 'denied');
  assert.match(controller.getState().message, /does not have access/);
});

test('logout clears authorization and renders login state', async () => {
  const { controller } = createHarness({ session: adminSession, profile: activeAdministrator });
  await controller.start('/admin/settings');
  assert.equal(controller.getState().status, 'authorized');
  await controller.signOut();
  assert.equal(controller.getState().status, 'unauthenticated');
});

test('session restoration remains pending until profile authorization completes', async () => {
  const states = [];
  let releaseProfile;
  const supabase = {
    auth: {
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { return { data: { session: adminSession }, error: null }; },
      async signOut() { return { error: null }; }
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return new Promise((resolve) => { releaseProfile = () => resolve({ data: activeAdministrator, error: null }); });
                }
              };
            }
          };
        }
      };
    }
  };
  const controller = createAdminAuthController({ supabase, onStateChange: (state) => states.push(state) });
  const start = controller.start('/admin/reservations/123');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.getState().status, 'checking');
  assert.equal(states.some((item) => item.status === 'authorized'), false);
  releaseProfile();
  await start;
  assert.equal(controller.getState().status, 'authorized');
});

test('repeated start calls do not install duplicate auth listeners', async () => {
  const { controller, calls } = createHarness({ session: adminSession, profile: activeAdministrator });
  await controller.start('/admin/dashboard');
  await controller.start('/admin/reports');
  assert.equal(calls.listeners, 1);
});

test('only active recognized roles are authorized', () => {
  assert.equal(isAuthorizedStaffProfile(activeAdministrator), true);
  assert.equal(isAuthorizedStaffProfile({ ...activeAdministrator, role: 'reservation_staff' }), true);
  assert.equal(isAuthorizedStaffProfile({ ...activeAdministrator, role: 'content_manager' }), true);
  assert.equal(isAuthorizedStaffProfile({ ...activeAdministrator, role: 'owner' }), false);
  assert.equal(isAuthorizedStaffProfile({ ...activeAdministrator, active: false }), false);
});

test('admin route boot renders login, never protected content, and keeps deep destination', () => {
  const source = readFileSync('dist/app.js', 'utf8');
  for (const route of ['/admin', '/admin/reservations?status=pending']) {
    const app = { innerHTML: '', querySelector: () => null };
    let destination = '';
    const context = {
      document: {
        querySelector: (selector) => selector === '#app' ? app : null,
        addEventListener() {},
        querySelectorAll: () => [],
        body: { classList: { add() {}, remove() {} } },
        documentElement: { classList: { add() {} } }
      },
      location: {
        pathname: route.split('?')[0],
        search: route.includes('?') ? `?${route.split('?')[1]}` : '',
        hash: '',
        replace() {}
      },
      window: { matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {}, scrollY: 0 },
      __aquapointSupabase: {},
      __aquapointAdminAuth: {
        createAdminAuthController: () => ({ start: (value) => { destination = value; }, signIn: async () => ({ ok: false }), signOut: async () => {} })
      }
    };
    vm.runInNewContext(source, context);
    assert.match(app.innerHTML, /Admin Sign In/);
    assert.match(app.innerHTML, /name="email"/);
    assert.match(app.innerHTML, /name="password"/);
    assert.doesNotMatch(app.innerHTML, /class="admin-shell"/);
    assert.equal(destination, route);
  }
  assert.doesNotMatch(source, /function adminAccess|Enter Admin Preview|Development Admin Access/);
});

test('built app imports the browser client and auth gate before protected app code', async () => {
  const response = await worker.fetch(new Request('http://127.0.0.1/admin/reservations'));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /import "\/supabase-client\.js"; import "\/admin-auth\.js"; import "\/app\.js";/);
  const clientResponse = await worker.fetch(new Request('http://127.0.0.1/supabase-client.js'));
  assert.equal(clientResponse.status, 200);
});

test('admin deep routes load the root stylesheets containing the admin design', async () => {
  const page = await worker.fetch(new Request('http://127.0.0.1/admin/website/homepage'));
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /href="\/style\.css"/);
  assert.match(html, /href="\/upgrade\.css"/);

  const [baseResponse, upgradeResponse] = await Promise.all([
    worker.fetch(new Request('http://127.0.0.1/style.css')),
    worker.fetch(new Request('http://127.0.0.1/upgrade.css'))
  ]);
  assert.equal(baseResponse.status, 200);
  assert.equal(upgradeResponse.status, 200);
  assert.match(baseResponse.headers.get('content-type') || '', /^text\/css/i);
  assert.match(upgradeResponse.headers.get('content-type') || '', /^text\/css/i);
  const adminCss = await upgradeResponse.text();
  assert.match(adminCss, /\.admin-shell\{/);
  assert.match(adminCss, /\.admin-access-card\{/);
  assert.match(adminCss, /\.admin-main \.stat-card\{/);
});