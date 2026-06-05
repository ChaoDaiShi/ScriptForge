import { create } from "zustand";

interface ScriptState {
  scriptData: Record<string, unknown> | null; // 将在后续阶段完善类型定义
  setScriptData: (data: Record<string, unknown> | null) => void;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
}

export const useScriptStore = create<ScriptState>((set) => ({
  scriptData: null,
  setScriptData: (data) => set({ scriptData: data }),
  selectedSceneId: null,
  setSelectedSceneId: (id) => set({ selectedSceneId: id }),
}));
