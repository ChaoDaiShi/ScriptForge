import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BackendTask } from "@/lib/api";

export type TaskItem = BackendTask;

interface TaskState {
  tasks: TaskItem[];
  setTasks: (tasks: TaskItem[]) => void;
  addTask: (task: TaskItem) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
    }),
    {
      name: "task-storage",
    }
  )
);
