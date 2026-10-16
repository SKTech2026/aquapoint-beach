const STAFF_ROLES = new Set(['administrator', 'reservation_staff', 'content_manager']);
const ACCESS_DENIED = 'Your account does not have access to the Aquapoint administration system.';
const SIGN_IN_FAILED = 'Sign-in failed. Check your email and password, then try again.';

function safeDestination(value) {
  if (typeof value !== 'string' || !/^\/admin(?:\/[^?#]*)?(?:[?#].*)?$/.test(value) || value.startsWith('//') || value.includes('\\')) {
    return '/admin/dashboard';
  }
  return value === '/admin' || value === '/admin/' ? '/admin/dashboard' : value;
}

export function isAuthorizedStaffProfile(profile) {
  return Boolean(profile && profile.active === true && STAFF_ROLES.has(profile.role));
}

export function createAdminAuthController({ supabase, onStateChange, onRedirect }) {
  let started = false;
  let subscription;
  let initialLoad;
  let destination = '/admin/dashboard';
  let validationVersion = 0;
  let validationKey = '';
  let validationPromise = null;
  let denialMessage = '';
  let state = { status: 'checking', message: '' };

  const publish = (status, message = '', profile = null) => {
    state = { status, message, profile };
    onStateChange?.(state);
  };

  const invalidateValidation = () => {
    validationVersion += 1;
    validationKey = '';
    validationPromise = null;
  };

  const validateSession = (session) => {
    const userId = session?.user?.id;
    if (!userId) {
      invalidateValidation();
      publish('unauthenticated', denialMessage);
      return Promise.resolve(false);
    }

    const key = `${userId}:${session.access_token || ''}`;
    if (key === validationKey && validationPromise) return validationPromise;

    const version = ++validationVersion;
    validationKey = key;
    publish('checking');
    validationPromise = (async () => {
      let result;
      try {
        result = await supabase.from('staff_profiles')
          .select('id, role, active')
          .eq('id', userId)
          .maybeSingle();
      } catch {
        result = { data: null, error: true };
      }

      if (version !== validationVersion) return false;
      if (result.error || !result.data || result.data.id !== userId || !isAuthorizedStaffProfile(result.data)) {
        denialMessage = ACCESS_DENIED;
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // The protected UI remains closed even if sign-out cannot reach Auth.
        }
        if (version === validationVersion) publish('denied', ACCESS_DENIED);
        return false;
      }

      denialMessage = '';
      publish('authorized', '', result.data);
      return true;
    })();
    return validationPromise;
  };

  const handleAuthEvent = (event, session) => {
    if (event === 'SIGNED_OUT') {
      invalidateValidation();
      publish(denialMessage ? 'denied' : 'unauthenticated', denialMessage);
      return;
    }
    if (!session) return;
    queueMicrotask(() => { void validateSession(session); });
  };

  function start(returnTo) {
    destination = safeDestination(returnTo || destination);
    if (started) return initialLoad || Promise.resolve(state);
    started = true;

    if (!supabase) {
      publish('unconfigured', 'Admin sign-in is not configured for this build.');
      return Promise.resolve(state);
    }

    const listener = supabase.auth.onAuthStateChange(handleAuthEvent);
    subscription = listener?.data?.subscription;
    publish('checking');
    initialLoad = (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          publish('unauthenticated', 'Unable to restore your session. Please sign in again.');
          return state;
        }
        await validateSession(data?.session || null);
      } catch {
        publish('unauthenticated', 'Unable to restore your session. Please sign in again.');
      }
      return state;
    })();
    return initialLoad;
  }

  async function signIn(email, password) {
    if (!supabase) {
      publish('unconfigured', 'Admin sign-in is not configured for this build.');
      return { ok: false, message: state.message };
    }

    denialMessage = '';
    publish('checking');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.session) {
        publish('unauthenticated', SIGN_IN_FAILED);
        return { ok: false, message: SIGN_IN_FAILED };
      }

      const authorized = await validateSession(data.session);
      if (!authorized) return { ok: false, message: ACCESS_DENIED };
      onRedirect?.(destination);
      return { ok: true, message: '' };
    } catch {
      publish('unauthenticated', SIGN_IN_FAILED);
      return { ok: false, message: SIGN_IN_FAILED };
    }
  }

  async function signOut() {
    denialMessage = '';
    invalidateValidation();
    publish('unauthenticated');
    if (!supabase) return;
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      publish('unauthenticated', 'You have been signed out of this admin view.');
    }
  }

  return {
    start,
    signIn,
    signOut,
    getState: () => state,
    getDestination: () => destination,
    unsubscribe: () => subscription?.unsubscribe()
  };
}

globalThis.__aquapointAdminAuth = { createAdminAuthController };