import { create } from "zustand";

interface AIState {
  isGenerating: boolean;
  setGenerating: (status: boolean) => void;
  taskQueue: unknown[];
}

export const useAIStore = create<AIState>((set) => ({
  isGenerating: false,
  setGenerating: (status) => set({ isGenerating: status }),
  taskQueue: [],
}));
