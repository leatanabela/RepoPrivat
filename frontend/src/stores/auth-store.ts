import { create } from 'zustand';
import type { Profile } from '@/lib/types';

interface AuthState {
  user: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  setUser: (user) =>
    set({
      user,
      isAdmin: user?.roles?.name === 'admin',
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, isAdmin: false, loading: false }),
}));
