import { create } from "zustand";

export interface Project {
  id: string;
  scriptId?: string;
  taskId?: string;
  title: string;
  sourceNovel: string;
  sourceAuthor: string;
  chapterCount: number;
  status: "idle" | "importing" | "converting" | "ready";
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  setCurrentProject: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProjectId: null,
  setCurrentProject: (id) => set({ currentProjectId: id }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updates } : project,
      ),
    })),
}));
