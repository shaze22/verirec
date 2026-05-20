import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';
import { CONFIG } from '../config.js';

const planOrder = CONFIG.planOrder;

export const useBillingStore = create((set, get) => ({
  subscription: null,
  loading: true,

  fetchSubscription: async (userId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      set({ subscription: data, loading: false });
    } catch (err) {
      console.error('fetchSubscription error:', err);
      set({ loading: false });
    }
  },

  canStartSession: () => {
    const sub = get().subscription;
    if (!sub) return false;
    return sub.sessions_limit === -1 || sub.sessions_used < sub.sessions_limit;
  },

  hasFeature: (plan) => {
    const sub = get().subscription;
    if (!sub) return false;
    return (planOrder[sub.plan] || 0) >= (planOrder[plan] || 0);
  },

  incrementUsage: async () => {
    const sub = get().subscription;
    if (!sub) return { error: 'no_subscription' };

    // Optimistic check before hitting server
    if (sub.sessions_limit !== -1 && sub.sessions_used >= sub.sessions_limit) {
      return { error: 'limit_reached', used: sub.sessions_used, limit: sub.sessions_limit };
    }

    const { data, error } = await supabase.rpc('increment_sessions', { uid: sub.user_id });
    if (error) return { error: error.message };

    if (data?.ok) {
      // Use server-returned value, not our local guess
      set({ subscription: { ...sub, sessions_used: data.used } });
    }

    return data;
  },
}));
