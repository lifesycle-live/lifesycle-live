import { create } from "zustand";
import { Broadcast, EngagementEvent } from "../types/models";

/**
 * Fast-changing in-flight live-session UI state — deliberately separate
 * from React Query's server-state cache since this updates far more often
 * (per plan: "a small local store for in-flight live-session UI state").
 */
interface LiveSessionState {
  activeBroadcast: Broadcast | null;
  engagementQueue: EngagementEvent[];
  setActiveBroadcast: (broadcast: Broadcast | null) => void;
  setEngagementQueue: (events: EngagementEvent[]) => void;
  removeFromQueue: (eventId: string) => void;
}

export const useLiveSessionStore = create<LiveSessionState>((set) => ({
  activeBroadcast: null,
  engagementQueue: [],
  setActiveBroadcast: (broadcast) => set({ activeBroadcast: broadcast }),
  setEngagementQueue: (events) => set({ engagementQueue: events }),
  removeFromQueue: (eventId) =>
    set((state) => ({ engagementQueue: state.engagementQueue.filter((e) => e.id !== eventId) })),
}));
