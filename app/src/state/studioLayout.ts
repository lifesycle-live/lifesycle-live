import { create } from 'zustand';
export const useStudioLayout = create<{ landscape: boolean; setLandscape: (value: boolean) => void }>(set => ({ landscape: false, setLandscape: landscape => set({ landscape }) }));
