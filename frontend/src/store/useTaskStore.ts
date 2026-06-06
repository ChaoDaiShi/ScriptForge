import { create } from "zustand";

export interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  type: "convert" | "export" | "polish";
  status: "queued" | "running" | "review" | "done" | "failed";
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: TaskItem[];
  addTask: (task: TaskItem) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
}));
