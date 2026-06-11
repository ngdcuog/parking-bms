import { create } from 'zustand';

export interface UserProfile {
  userId: number;
  username: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'Staff' | 'ParkingUser';
  buildingId?: number;
  buildingName?: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (user: UserProfile | null, accessToken: string | null) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  setAuth: (user, accessToken) => set({ user, accessToken, isLoading: false }),
  clearAuth: () => set({ user: null, accessToken: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
