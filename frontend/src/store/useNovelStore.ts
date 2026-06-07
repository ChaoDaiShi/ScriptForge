import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NovelChapter {
  index: number;
  title: string;
  wordCount: number;
  content?: string; // 章节内容
  startPos?: number; // 在原文中的起始位置
  endPos?: number; // 在原文中的结束位置
}

export interface NovelData {
  id: string;
  projectId: string;
  title: string; // 小说标题
  author?: string; // 作者
  totalChapters: number; // 总章节数
  totalWordCount: number; // 总字数
  chapters: NovelChapter[]; // 章节列表
  fullText: string; // 完整文本
  createdAt: string; // 创建时间
}

interface NovelState {
  novels: NovelData[];
  currentNovelId: string | null;
  selectedChapterIndex: number | null;
  setCurrentNovel: (id: string | null) => void;
  setSelectedChapter: (index: number | null) => void;
  addNovel: (novel: NovelData) => void;
  updateNovel: (id: string, updates: Partial<NovelData>) => void;
  getChapterContent: (novelId: string, chapterIndex: number) => string | null;
}

export const useNovelStore = create<NovelState>()(
  persist(
    (set, get) => ({
      novels: [],
      currentNovelId: null,
      selectedChapterIndex: null,
      setCurrentNovel: (id) => set({ currentNovelId: id }),
      setSelectedChapter: (index) => set({ selectedChapterIndex: index }),
      addNovel: (novel) =>
        set((state) => ({ novels: [...state.novels, novel] })),
      updateNovel: (id, updates) =>
        set((state) => ({
          novels: state.novels.map((novel) =>
            novel.id === id ? { ...novel, ...updates } : novel,
          ),
        })),
      getChapterContent: (novelId, chapterIndex) => {
        const novel = get().novels.find((n) => n.id === novelId);
        if (!novel) return null;
        const chapter = novel.chapters.find((c) => c.index === chapterIndex);
        return chapter?.content || null;
      },
    }),
    {
      name: "novel-storage",
      onRehydrateStorage: () => () => {
        try {
          const keys = Object.keys(localStorage);
          const novelKeys = keys.filter(key => key.startsWith("novel-storage"));
          if (novelKeys.length > 0) {
            const totalSize = novelKeys.reduce((acc, key) => {
              const value = localStorage.getItem(key);
              return acc + (value ? value.length : 0);
            }, 0);
            if (totalSize > 3 * 1024 * 1024) {
              novelKeys.forEach(key => localStorage.removeItem(key));
            }
          }
        } catch (e) {
          console.warn("Failed to clean up localStorage:", e);
        }
      },
    }
  )
);