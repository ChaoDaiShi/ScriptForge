import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BackendScript } from "@/lib/api";

export interface Beat {
  id: string;
  description: string;
  dialogue?: string;
  character?: string;
}

export interface Scene {
  id: string;
  code: string;
  title: string;
  location: string;
  intent: string;
  beats: Beat[];
  status: "draft" | "review" | "done";
}

export interface Episode {
  id: string;
  title: string;
  coldOpen?: string;
  scenes: Scene[];
}

export interface ScriptData {
  id: string;
  projectId: string;
  title: string;
  episodes: Episode[];
  sourceText?: string;
  backend?: BackendScript;
}

interface ScriptState {
  scripts: ScriptData[];
  currentScriptId: string | null;
  selectedSceneId: string | null;
  setCurrentScript: (id: string) => void;
  setSelectedSceneId: (id: string | null) => void;
  addScript: (script: ScriptData) => void;
  upsertScript: (script: ScriptData) => void;
}

export const useScriptStore = create<ScriptState>()(
  persist(
    (set) => ({
      scripts: [],
      currentScriptId: null,
      selectedSceneId: null,
      setCurrentScript: (id) => set({ currentScriptId: id }),
      setSelectedSceneId: (id) => set({ selectedSceneId: id }),
      addScript: (script) =>
        set((state) => ({ scripts: [...state.scripts, script] })),
      upsertScript: (script) =>
        set((state) => {
          const exists = state.scripts.some((item) => item.id === script.id);
          if (!exists) {
            return { scripts: [...state.scripts, script] };
          }

          return {
            scripts: state.scripts.map((item) =>
              item.id === script.id ? { ...item, ...script } : item,
            ),
          };
        }),
    }),
    {
      name: "script-storage",
      onRehydrateStorage: () => () => {
        try {
          const keys = Object.keys(localStorage);
          const scriptKeys = keys.filter(key => key.startsWith("script-storage"));
          if (scriptKeys.length > 0) {
            const totalSize = scriptKeys.reduce((acc, key) => {
              const value = localStorage.getItem(key);
              return acc + (value ? value.length : 0);
            }, 0);
            if (totalSize > 3 * 1024 * 1024) {
              scriptKeys.forEach(key => localStorage.removeItem(key));
            }
          }
        } catch (e) {
          console.warn("Failed to clean up localStorage:", e);
        }
      },
    }
  )
);
