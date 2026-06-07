import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Project {
  id: string;
  scriptId?: string;
  taskId?: string;
  title: string;
  sourceNovel: string;
  sourceAuthor: string;
  chapterCount: number;
  status: "idle" | "importing" | "converting" | "ready" | "distributing" | "failed";
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  setCurrentProject: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: "project-storage",
      onRehydrateStorage: () => () => {
        try {
          const keys = Object.keys(localStorage);
          const projectKeys = keys.filter(key => key.startsWith("project-storage"));
          if (projectKeys.length > 0) {
            const totalSize = projectKeys.reduce((acc, key) => {
              const value = localStorage.getItem(key);
              return acc + (value ? value.length : 0);
            }, 0);
            if (totalSize > 4 * 1024 * 1024) {
              projectKeys.forEach(key => localStorage.removeItem(key));
            }
          }
        } catch (e) {
          console.warn("Failed to clean up localStorage:", e);
        }
      },
    }
  )
);
