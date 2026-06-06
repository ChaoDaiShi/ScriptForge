import { useState } from "react";
import type { ReactNode } from "react";
import {
  Sparkles,
  FileText,
  Users,
  ListTree,
  WandSparkles,
  Bot,
  Code2,
  History,
  MessageSquareText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type AssistantTab = "chat" | "yaml" | "history";

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-2"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {title}
        </span>
      </button>
      {open && children}
    </div>
  );
}

export default function Workbench() {
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("chat");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="border-b border-(--line-soft) px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] text-(--text-faint)">
              <Sparkles className="h-3 w-3 text-(--accent-soft)" />
              AI 剧本工作台
            </p>
            <h1 className="mt-1 font-serif text-2xl text-foreground">
              Episode 01 · 潮汐以下
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-primary">Cold Open</span>
            <span className="badge badge-muted">0 / 3 场景</span>
          </div>
        </div>
      </div>

      {/* 3-Panel Grid */}
      <div className="flex min-h-0 flex-1 gap-px bg-(--line-soft)">
        {/* Left Panel - Context */}
        <div className="flex w-72 flex-col overflow-y-auto bg-white p-4">
          <CollapsibleSection title="原著对照" icon={<FileText className="h-3 w-3" />}>
            <p className="text-sm leading-6 text-(--text-subtle)">
              导入小说源文本后，此处将显示原始章节内容。当前无活跃项目。
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="人物档案" icon={<Users className="h-3 w-3" />}>
            <p className="text-sm leading-6 text-(--text-subtle)">
              AI 将从文本中自动提取人物角色及其关系。暂无数据。
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="故事大纲" icon={<ListTree className="h-3 w-3" />}>
            <div className="space-y-3">
              {["Cold Open", "Act 1", "Act 2", "Act 3"].map((step, i) => (
                <div key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        i === 0 ? "bg-(--accent-soft)" : "bg-(--line-medium)"
                      }`}
                    />
                    {i < 3 && <span className="mt-1.5 h-8 w-px bg-(--line-soft)" />}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{step}</p>
                    <p className="text-xs text-(--text-subtle)">等待 AI 分析</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* Center Panel - Editor */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-white p-4">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-1">
              Visual Editor
            </p>
            <h2 className="font-serif text-xl text-foreground">可视化编剧台</h2>
            <p className="mt-0.5 text-sm text-(--text-subtle)">
              以剧本原子化结构编辑集、场景与节拍。
            </p>
          </div>

          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                  Episode Container
                </p>
                <p className="mt-1 text-sm text-foreground">
                  冷开场 · 让危险先于答案出现
                </p>
              </div>
              <span className="badge badge-primary">已启用</span>
            </div>
            <p className="text-sm text-(--text-subtle) leading-6">
              完成文本导入和 AI 转换后，场景结构将在此展示。你可以对每个场景进行编辑、润色和重新排序。
            </p>
          </div>

          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-(--line-soft) p-8">
            <div className="text-center">
              <WandSparkles className="mx-auto h-8 w-8 text-(--text-faint)" />
              <p className="mt-3 text-sm text-(--text-subtle)">
                暂无场景数据
              </p>
              <p className="mt-1 text-xs text-(--text-faint)">
                通过"导入文本"开始新项目，或从已有项目继续编辑
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Assistant */}
        <div className="flex w-72 flex-col overflow-y-auto bg-white p-4">
          <div className="mb-4 flex rounded-lg bg-(--muted) p-0.5">
            {[
              { key: "chat", icon: <MessageSquareText className="h-3.5 w-3.5" />, label: "AI" },
              { key: "yaml", icon: <Code2 className="h-3.5 w-3.5" />, label: "YAML" },
              { key: "history", icon: <History className="h-3.5 w-3.5" />, label: "历史" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAssistantTab(tab.key as AssistantTab)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  assistantTab === tab.key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-(--text-subtle) hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {assistantTab === "chat" && (
            <div className="flex flex-1 flex-col">
              <p className="text-xs text-(--text-subtle) leading-5">
                AI 编剧助手将在此提供场景改写建议、情绪增强和结构优化。开始导入文本以启用协作。
              </p>
            </div>
          )}

          {assistantTab === "yaml" && (
            <div className="flex flex-1 flex-col">
              <p className="text-xs text-(--text-subtle) leading-5">
                YAML 结构源代码视图。完成 AI 转换后，剧本的底层数据结构将在此展示，支持手动编辑与 Schema 校验。
              </p>
            </div>
          )}

          {assistantTab === "history" && (
            <div className="flex flex-1 flex-col">
              <p className="text-xs text-(--text-subtle) leading-5">
                版本历史将追踪你对剧本的每一次修改，支持 Diff 对比与一键回退。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkbenchOverviewCard() {
  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
          导向入口
        </p>
        <h3 className="mt-2 font-serif text-xl text-foreground">
          继续推进当前工作台
        </h3>
        <p className="mt-1 max-w-xl text-sm text-(--text-subtle)">
          进入沉浸式工作台，处理 AI 回写、YAML 校验与节拍润色。
        </p>
      </div>
      <Sparkles className="hidden h-8 w-8 text-(--accent-soft) md:block" />
    </div>
  );
}
