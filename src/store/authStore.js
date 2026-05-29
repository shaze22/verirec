import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

async function acceptPendingTeamInvites() {
  try {
    await supabase.rpc('accept_team_invite');
  } catch { /* non-critical — never crash auth flow */ }
}

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  init: () => {
    let authStateSettled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authStateSettled = true;
      set({ session, user: session?.user ?? null, loading: false });

      if (event === 'SIGNED_IN' && session?.user) {
        acceptPendingTeamInvites();
      }
    });

    // Fallback: resolves loading if onAuthStateChange never fires (e.g. cold start race)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authStateSettled) {
        set({ session, user: session?.user ?? null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  },
}));
