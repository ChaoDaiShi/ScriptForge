import { useState, useRef, useEffect } from "react";
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
  Send,
  Lightbulb,
  RotateCcw,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import { useScriptStore } from "@/store/useScriptStore";
import { useProjectStore } from "@/store/useProjectStore";

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
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {title}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// AI Chat Message type
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Workbench() {
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentScript = useScriptStore((s) =>
    s.scripts.find((scr) => scr.id === s.currentScriptId),
  );
  const projects = useProjectStore((s) => s.projects);
  const activeProject = projects.find((p) => p.id === currentScript?.projectId);

  const hasData = !!currentScript && currentScript.episodes.length > 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || isAiTyping) return;
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: chatInput.trim(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAiTyping(true);

    // Simulate AI response
    const responses = [
      "我建议在冷开场部分增加一个悬念钩子，比如让主角在开头发现一个异常信号，为后续情节埋下伏笔。",
      "第三场景的情绪张力可以再强化一些。当前的对白偏叙述性，建议转换为更具冲突感的对话。",
      "已分析当前节拍结构。检测到 Act 1 和 Act 2 之间的节奏过渡偏快，建议在中间增加一个过渡场景。",
      "根据当前人物档案，反派的动机线尚未充分展开。建议在 Scene 4 增加一段内心独白来丰富角色层次。",
    ];
    setTimeout(
      () => {
        const aiMsg: ChatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
        };
        setChatMessages((prev) => [...prev, aiMsg]);
        setIsAiTyping(false);
      },
      1200 + Math.random() * 1000,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const demoYaml = `# Episode 01 · 潮汐以下
episode:
  id: ep_01
  title: "潮汐以下"
  cold_open:
    intent: "让危险先于答案出现"
    scenes:
      - id: sc_001
        type: INT.
        location: "深海勘探站 · 主控室"
        time: "夜晚"
        summary: "主角发现异常信号"
        beats:
          - type: action
            description: "监控屏幕闪烁，警报灯旋转"
          - type: dialogue
            character: "林深"
            line: "这个频率...不像是已知的海洋生物。"
`;

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
              {activeProject?.title ?? "Episode 01 · 潮汐以下"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {hasData ? (
              <>
                <span className="badge badge-primary">Cold Open</span>
                <span className="badge badge-muted">
                  {currentScript.episodes.reduce(
                    (acc, ep) => acc + ep.scenes.length,
                    0,
                  )}{" "}
                  场景
                </span>
              </>
            ) : (
              <>
                <span className="badge badge-muted">等待导入</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3-Panel Grid */}
      <div className="flex min-h-0 flex-1 gap-px bg-(--line-soft)">
        {/* ===== Left Panel - Context ===== */}
        <div className="flex w-72 flex-col overflow-y-auto bg-white p-4">
          <CollapsibleSection
            title="原著对照"
            icon={<FileText className="h-3 w-3" />}
          >
            {hasData ? (
              <div className="text-sm leading-6 text-(--text-subtle)">
                <p className="text-foreground mb-2 font-medium">原著选段</p>
                <p>
                  "深海勘探站收到一组异常的声纳信号，频率模式不在任何已知数据库中。林深盯着屏幕，眉头紧锁。"
                </p>
              </div>
            ) : (
              <p className="text-sm leading-6 text-(--text-subtle)">
                导入小说源文本后，此处将显示原始章节内容。
              </p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="人物档案"
            icon={<Users className="h-3 w-3" />}
          >
            {hasData ? (
              <div className="space-y-2">
                {[
                  "林深 · 海洋声呐工程师",
                  "苏晚晴 · 深海生物学家",
                  "陈默 · 勘探站站长",
                ].map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 rounded-lg border border-(--line-soft) px-3 py-2 text-sm"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-(--accent-light) text-xs text-(--accent-soft)">
                      {name[0]}
                    </div>
                    <span className="text-xs text-foreground">{name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-(--text-subtle)">
                AI 将从文本中自动提取人物角色及其关系。
              </p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="故事大纲"
            icon={<ListTree className="h-3 w-3" />}
          >
            <div className="space-y-3">
              {["Cold Open", "Act 1", "Act 2", "Act 3"].map((step, i) => (
                <div key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        i === 0 && hasData
                          ? "bg-(--accent-soft)"
                          : "bg-(--line-medium)"
                      }`}
                    />
                    {i < 3 && (
                      <span className="mt-1.5 h-8 w-px bg-(--line-soft)" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{step}</p>
                    <p className="text-xs text-(--text-subtle)">
                      {hasData && i === 0 ? "3 场景" : "等待 AI 分析"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* ===== Center Panel - Editor ===== */}
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

          {/* Episode Card */}
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                  Episode Container
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {hasData ? "冷开场 · 让危险先于答案出现" : "暂无活跃项目"}
                </p>
              </div>
              <span
                className={`badge ${hasData ? "badge-primary" : "badge-muted"}`}
              >
                {hasData ? "已启用" : "等待导入"}
              </span>
            </div>

            {hasData ? (
              <div className="space-y-3 mt-4">
                {["监控室异常信号", "深海取样遭遇", "通信中断危机"].map(
                  (scene, i) => (
                    <div
                      key={scene}
                      className="group flex items-start gap-3 rounded-xl border border-(--line-soft) px-4 py-3 hover:bg-(--muted) transition-colors cursor-pointer"
                    >
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-(--accent-light) text-xs text-(--accent-soft)">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{scene}</p>
                        <p className="mt-0.5 text-xs text-(--text-subtle)">
                          INT. 勘探站 · 3 节拍 · {120 + i * 30}s
                        </p>
                      </div>
                      <button
                        type="button"
                        className="mt-0.5 rounded-md p-1 text-(--text-faint) opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-white transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-(--text-subtle) leading-6">
                完成文本导入和 AI 转换后，场景结构将在此展示。
              </p>
            )}
          </div>

          {/* Empty or Scene Detail */}
          {hasData ? (
            <div className="flex-1 space-y-3">
              {/* Current Scene Detail */}
              <div className="rounded-xl border border-(--accent-soft)/30 bg-(--accent-light) px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-(--accent-soft)">
                    INT. 深海勘探站 · 主控室
                  </span>
                  <span className="text-xs text-(--text-faint)">夜晚</span>
                </div>
                <p className="text-sm text-foreground leading-6">
                  林深盯着屏幕上跳动的波形，瞳孔微缩。这种频率...不像是已知的海洋生物。
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-(--line-soft) px-2.5 py-1 text-xs text-(--text-subtle) hover:text-foreground hover:bg-white transition-colors"
                  >
                    <WandSparkles className="h-3 w-3" />
                    AI 润色
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-(--line-soft) px-2.5 py-1 text-xs text-(--text-subtle) hover:text-foreground hover:bg-white transition-colors"
                  >
                    <Lightbulb className="h-3 w-3" />
                    建议情绪
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* ===== Right Panel - Assistant ===== */}
        <div className="flex w-72 flex-col overflow-y-auto bg-white p-4">
          {/* Tabs */}
          <div className="mb-4 flex rounded-lg bg-(--muted) p-0.5">
            {[
              {
                key: "chat" as const,
                icon: <MessageSquareText className="h-3.5 w-3.5" />,
                label: "AI",
              },
              {
                key: "yaml" as const,
                icon: <Code2 className="h-3.5 w-3.5" />,
                label: "YAML",
              },
              {
                key: "history" as const,
                icon: <History className="h-3.5 w-3.5" />,
                label: "历史",
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAssistantTab(tab.key)}
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

          {/* AI Chat Tab */}
          {assistantTab === "chat" && (
            <div className="flex flex-1 flex-col min-h-0">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bot className="h-8 w-8 text-(--text-faint) mb-2" />
                    <p className="text-xs text-(--text-subtle) leading-5">
                      AI 编剧助手将在此提供场景改写建议、情绪增强和结构优化。
                    </p>
                    {/* Suggested prompts */}
                    <div className="mt-4 space-y-1.5 w-full">
                      {[
                        "分析当前场景节奏",
                        "建议情绪增强点",
                        "检查对白自然度",
                      ].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setChatMessages([
                              {
                                id: `msg_${Date.now()}`,
                                role: "user",
                                content: p,
                              },
                            ]);
                            setIsAiTyping(true);
                            setTimeout(() => {
                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  id: `msg_${Date.now()}_ai`,
                                  role: "assistant",
                                  content: `好的，我来${p.toLowerCase()}。根据当前剧本结构，建议在关键情节点增加视觉化的动作描写来替代部分内心独白，以增强画面感。`,
                                },
                              ]);
                              setIsAiTyping(false);
                            }, 1000);
                          }}
                          className="w-full rounded-lg border border-(--line-soft) px-3 py-2 text-xs text-(--text-subtle) hover:text-foreground hover:bg-(--muted) transition-colors text-left"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 ${
                          msg.role === "user"
                            ? "bg-(--accent-soft) text-white"
                            : "bg-(--muted) text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isAiTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="rounded-xl bg-(--muted) px-3 py-2 text-xs">
                      <div className="flex gap-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-(--text-faint) animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-(--text-faint) animate-bounce"
                          style={{ animationDelay: "200ms" }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-(--text-faint) animate-bounce"
                          style={{ animationDelay: "400ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="mt-3 flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入指令..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-(--line-medium) bg-white px-3 py-2 text-xs text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft)"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isAiTyping}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-soft) text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* YAML Tab */}
          {assistantTab === "yaml" && (
            <div className="flex flex-1 flex-col min-h-0">
              {hasData ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-(--text-subtle)">
                      episode_01.yaml
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(demoYaml);
                        setCopiedYaml(true);
                        setTimeout(() => setCopiedYaml(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--text-subtle) hover:text-foreground hover:bg-(--muted) transition-colors"
                    >
                      {copiedYaml ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedYaml ? "已复制" : "复制"}
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto rounded-xl bg-[#0d1117] p-4 text-xs leading-5">
                    <code className="text-[#e6edf3] font-mono">{demoYaml}</code>
                  </pre>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-(--text-subtle) leading-5">
                    YAML 结构源代码视图。完成 AI
                    转换后，剧本的底层数据结构将在此展示。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {assistantTab === "history" && (
            <div className="flex flex-1 flex-col min-h-0">
              {hasData ? (
                <div className="space-y-2">
                  {[
                    {
                      version: "v1.3",
                      time: "10 分钟前",
                      desc: "Scene 3 情绪基调调整",
                    },
                    {
                      version: "v1.2",
                      time: "25 分钟前",
                      desc: "Act 1 对白润色",
                    },
                    {
                      version: "v1.1",
                      time: "1 小时前",
                      desc: "Cold Open 节拍重组",
                    },
                  ].map((v) => (
                    <div
                      key={v.version}
                      className="flex items-center gap-3 rounded-xl border border-(--line-soft) px-3 py-2.5 hover:bg-(--muted) transition-colors cursor-pointer"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-(--accent-light) text-xs text-(--accent-soft) font-mono">
                        {v.version}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {v.desc}
                        </p>
                        <p className="text-xs text-(--text-faint)">{v.time}</p>
                      </div>
                      <RotateCcw className="h-3 w-3 shrink-0 text-(--text-faint)" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-(--text-subtle) leading-5">
                    版本历史将追踪你对剧本的每一次修改，支持 Diff
                    对比与一键回退。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkbenchOverviewCard() {
  return (
    <div className="card flex items-center justify-between gap-4 p-5 card-hover cursor-pointer">
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
