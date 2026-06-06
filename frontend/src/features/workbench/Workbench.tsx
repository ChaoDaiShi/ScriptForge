import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  History,
  MessageSquareText,
  Play,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/store/useAIStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useScriptStore } from "@/store/useScriptStore";
import { scenes } from "./workbench-data";

type InspectorTab = "assistant" | "yaml" | "history";

const sourceParagraphs = [
  "凌晨四点，海港的雾把整座城压成一张未显影的底片。林澈抱着旧录音机站在第七码头尽头，像在等一个早已错过的人。",
  "她知道今晚会有人来取走录音带，但那卷磁带里除了父亲留下的交易名单，还藏着一段被剪掉的求救。",
  "码头广播在头顶沙沙作响，集装箱之间的脚步声越来越近。她抬头，看见巡逻灯切过海面，像一把迟到的刀。",
];

const characterCards = [
  { name: "林澈", role: "女主 / 调查记者", trait: "克制、敏锐、善于逼近真相" },
  { name: "周放", role: "刑警队长", trait: "理性、迟疑、与女主互信未明" },
  { name: "裴竞", role: "反派代理人", trait: "优雅、危险、情绪难以预测" },
];

const outlineSteps = [
  { label: "Cold Open", detail: "海港录音带交接失败", current: true },
  { label: "Act 1", detail: "林澈确认泄密名单" },
  { label: "Act 2", detail: "周放追查港口监控" },
  { label: "Act 3", detail: "裴竞反向布局" },
];

const assistantSuggestions = [
  "增强 Scene 01 的听觉焦虑，但保留女主的职业冷静。",
  "把 Scene 02 的信息揭示改成更影视化的动作，而不是口头解释。",
  "给裴竞增加一次不露脸的威胁性出场，放在 Cold Open 尾部。",
];

const yamlSnippet = `episode:
  id: ep-01
  title: 潮汐以下
  cold_open:
    objective: 让危险先于答案出现
  scenes:
    - id: scene-01
      heading: EXT. 第七码头 - 黎明前
      hook: 探照灯切开海面，反派抵达
    - id: scene-02
      heading: INT. 港务档案室 - 清晨
      reveal: 名单被人为擦除`;

const revisions = [
  { time: "2 分钟前", title: "接受 AI 对 Scene 01 的情绪增强", status: "saved" },
  { time: "11 分钟前", title: "手动调整 Cold Open 节奏", status: "saved" },
  { time: "24 分钟前", title: "YAML 自动修复缩进错误", status: "warning" },
];

export default function Workbench() {
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("assistant");
  const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState(assistantSuggestions[0]);

  const { isGenerating, setGenerating } = useAIStore();
  const {
    setLeftPaneWidth,
    setCenterPaneWidth,
    setRightPaneWidth,
  } = useLayoutStore();
  const { selectedSceneId, setSelectedSceneId } = useScriptStore();

  const currentScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <section className="border-b border-[rgba(94,72,58,0.08)] bg-gradient-to-b from-white/40 to-transparent px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-soft)] bg-white/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.20em] text-[--text-subtle]">
              <Sparkles className="h-3.5 w-3.5 text-[--accent-soft]" />
              AI 剧本工作台
            </div>
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-foreground">
                Episode 01 · 潮汐以下
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[--text-subtle]">
                三栏联动编辑当前冷开场与前两场戏，左侧参考原著上下文，中间打磨节拍，右侧接管 AI 协作、YAML 结构与版本回溯。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <WorkbenchMetric label="解析进度" value="68%" hint="9 / 13 场已结构化" accent />
            <WorkbenchMetric label="版本快照" value="10" hint="自动保留最近编辑记录" />
            <Button
              className="h-10 rounded-full bg-[--accent-soft] px-5 text-white shadow-[0_8px_20px_rgba(185,125,92,0.30)] hover:bg-[--accent-soft]/90 hover:shadow-[0_12px_28px_rgba(185,125,92,0.35)] transition-all duration-200"
              onClick={() => setGenerating(!isGenerating)}
            >
              {isGenerating ? (
                <>
                  <Clock3 className="h-4 w-4" />
                  生成中
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  继续流式生成
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      <div className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
        <div className="h-full overflow-hidden rounded-2xl border border-[var(--line-medium)] bg-white/60 shadow-[var(--shadow-surface)]">
          <Group orientation="horizontal" className="flex h-full">
            <Panel
              defaultSize={33.3}
              minSize={18}
              maxSize={45}
              onResize={(size) => setLeftPaneWidth(Number(size))}
            >
              <div className="pane-shell">
                <PaneTitle
                  icon={<FileText className="h-4 w-4" />}
                  eyebrow="Context"
                  title="原著与世界观"
                  description="只读参考区，维持信息完整与情绪一致。"
                />

                <div className="space-y-4">
                  <section className="pane-card">
                    <SectionLabel label="原著映射" action="自动高亮" />
                    <div className="space-y-3 text-sm leading-7 text-[--text-subtle]">
                      {sourceParagraphs.map((paragraph, index) => (
                        <p
                          key={paragraph}
                          className={cn(
                            "rounded-2xl border px-4 py-3 transition-colors",
                            index === 1
                              ? "border-[--accent-soft]/26 bg-[rgba(185,125,92,0.08)] text-foreground"
                              : "border-[rgba(94,72,58,0.08)] bg-white/38 text-foreground",
                          )}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </section>

                  <section className="pane-card">
                    <SectionLabel label="人物档案" action="3 角色在线" />
                    <div className="space-y-3">
                      {characterCards.map((character) => (
                        <div
                          key={character.name}
                          className="rounded-2xl border border-[rgba(94,72,58,0.08)] bg-white/38 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-semibold text-foreground">
                                {character.name}
                              </h3>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[--text-faint]">
                                {character.role}
                              </p>
                            </div>
                            <Users className="h-4 w-4 text-[--accent-soft]" />
                          </div>
                          <p className="mt-3 text-sm text-[--text-subtle]">
                            {character.trait}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="pane-card">
                    <SectionLabel label="四幕进度" action="Cold Open 进行中" />
                    <div className="space-y-3">
                      {outlineSteps.map((step, index) => (
                        <div key={step.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "mt-1 h-3 w-3 rounded-full",
                                step.current
                                  ? "bg-[--accent-soft] shadow-[0_0_20px_rgba(154,245,214,0.55)]"
                                  : "bg-white/20",
                              )}
                            />
                            {index !== outlineSteps.length - 1 ? (
                              <span className="mt-2 h-10 w-px bg-white/10" />
                            ) : null}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium text-foreground">
                              {step.label}
                            </p>
                            <p className="mt-1 text-sm text-[--text-subtle]">
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </Panel>

            <Separator className="resize-handle" />

            <Panel
              defaultSize={33.3}
              minSize={18}
              maxSize={45}
              onResize={(size) => setCenterPaneWidth(Number(size))}
            >
              <div className="pane-shell">
                <PaneTitle
                  icon={<WandSparkles className="h-4 w-4" />}
                  eyebrow="Visual Editor"
                  title="可视化编剧台"
                  description="以剧本原子化结构编辑集、场景与节拍。"
                />

                <section className="pane-card mb-5 overflow-hidden">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[--text-faint]">
                        Episode Container
                      </p>
                      <h2 className="mt-2 font-serif text-2xl text-foreground">
                        冷开场 · 让危险先于答案出现
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm text-[--text-subtle]">
                        片头目标是让观众先被环境威胁抓住，再通过录音带信息抛出“删除名单”的核心悬念。
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Pill text="Cold Open 已启用" accent />
                      <Pill text="悬念扣子密度：高" />
                    </div>
                  </div>
                </section>

                <div className="space-y-4">
                  {scenes.map((scene) => {
                    const isSelected = currentScene.id === scene.id;
                    const isHovered = hoveredSceneId === scene.id;

                    return (
                      <article
                        key={scene.id}
                        className={cn("scene-card", isSelected && "scene-card-active")}
                        onClick={() => setSelectedSceneId(scene.id)}
                        onMouseEnter={() => setHoveredSceneId(scene.id)}
                        onMouseLeave={() => setHoveredSceneId(null)}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[--text-faint]">
                                {scene.code}
                              </span>
                              <span className="text-xs text-[--text-subtle]">
                                {scene.location}
                              </span>
                            </div>
                            <h3 className="font-serif text-2xl text-foreground">
                              {scene.title}
                            </h3>
                            <p className="max-w-2xl text-sm text-[--text-subtle]">
                              {scene.intent}
                            </p>
                          </div>

                          <div
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-opacity",
                              isHovered || isSelected
                                ? "border-[--accent-soft]/32 bg-[rgba(185,125,92,0.08)] text-[--accent-soft]"
                                : "border-[rgba(94,72,58,0.08)] bg-white/36 text-[--text-faint]",
                            )}
                          >
                            <Bot className="h-3.5 w-3.5" />
                            Inline Action 已就绪
                          </div>
                        </div>

                        <div className="mt-6 space-y-3">
                          {scene.beats.map((beat, index) => (
                            <div
                              key={`${scene.id}-${index}`}
                              className={cn(
                                "rounded-2xl border px-4 py-4 transition-colors",
                                index === 1
                                  ? "border-[--accent-soft]/24 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(240,223,211,0.54))]"
                                  : "border-[rgba(94,72,58,0.08)] bg-white/42",
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] uppercase tracking-[0.24em] text-[--text-faint]">
                                  Beat {index + 1}
                                </span>
                                {(isHovered || isSelected) && index === 1 ? (
                                  <div className="inline-flex items-center gap-2 text-xs text-[--accent-soft]">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI 增写剧烈情绪
                                  </div>
                                ) : null}
                              </div>
                              <p
                                className={cn(
                                  "mt-3 text-sm leading-7",
                                  index === 1 ? "text-foreground" : "text-[--text-subtle]",
                                )}
                              >
                                {beat}
                              </p>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <Separator className="resize-handle" />

            <Panel
              defaultSize={33.4}
              minSize={18}
              maxSize={45}
              onResize={(size) => setRightPaneWidth(Number(size))}
            >
              <div className="pane-shell">
                <PaneTitle
                  icon={<MessageSquareText className="h-4 w-4" />}
                  eyebrow="Inspector"
                  title="AI 协作与追溯"
                  description="切换 AI 对话、底层结构与版本历史。"
                />

                <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-[rgba(94,72,58,0.08)] bg-white/44 p-1.5">
                  <InspectorTabButton
                    active={inspectorTab === "assistant"}
                    icon={<Bot className="h-4 w-4" />}
                    label="AI"
                    onClick={() => setInspectorTab("assistant")}
                  />
                  <InspectorTabButton
                    active={inspectorTab === "yaml"}
                    icon={<Code2 className="h-4 w-4" />}
                    label="YAML"
                    onClick={() => setInspectorTab("yaml")}
                  />
                  <InspectorTabButton
                    active={inspectorTab === "history"}
                    icon={<History className="h-4 w-4" />}
                    label="历史"
                    onClick={() => setInspectorTab("history")}
                  />
                </div>

                {inspectorTab === "assistant" ? (
                  <div className="space-y-4">
                    <section className="pane-card">
                      <SectionLabel label="协同副驾" action={isGenerating ? "流式生成中" : "已待命"} />
                      <div className="rounded-2xl border border-[--accent-soft]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(240,223,211,0.44))] p-4">
                        <p className="text-sm leading-7 text-foreground">
                          我建议先强化 Scene 01 中“脚步声靠近”的听觉焦虑，再把裴竞的登场压到最后一拍，这样悬念扣子会更利落。
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" className="rounded-full bg-[--accent-soft] text-[#091018] hover:bg-[--accent-strong]">
                            接受改写
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-white/12 bg-transparent text-slate-200 hover:bg-white/8"
                          >
                            生成替代版本
                          </Button>
                        </div>
                      </div>
                    </section>

                    <section className="pane-card">
                      <SectionLabel label="局部修改建议" action="点击即用" />
                      <div className="space-y-2.5">
                        {assistantSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className={cn(
                              "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                              activePrompt === suggestion
                                ? "border-[--accent-soft]/32 bg-[rgba(185,125,92,0.08)] text-foreground"
                                : "border-[rgba(94,72,58,0.08)] bg-white/38 text-[--text-subtle] hover:border-[rgba(94,72,58,0.14)] hover:bg-white/56",
                            )}
                            onClick={() => setActivePrompt(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="pane-card">
                      <SectionLabel label="Schema 校验" action="自动修复开启" />
                      <div className="space-y-3 text-sm">
                        <StatusRow
                          icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                          title="当前片段结构有效"
                          detail="Scene 01 和 Scene 02 均通过节拍字段校验。"
                        />
                        <StatusRow
                          icon={<AlertCircle className="h-4 w-4 text-amber-300" />}
                          title="发现 1 处命名可优化"
                          detail="建议把 cold_open.objective 压缩为更可执行的拍摄目标。"
                        />
                      </div>
                    </section>
                  </div>
                ) : null}

                {inspectorTab === "yaml" ? (
                  <div className="space-y-4">
                    <section className="pane-card">
                      <SectionLabel label="底层结构源" action="只展示当前集" />
                      <pre className="overflow-x-auto rounded-2xl border border-[rgba(94,72,58,0.08)] bg-[rgba(255,255,255,0.62)] p-4 text-xs leading-6 text-foreground">
                        <code>{yamlSnippet}</code>
                      </pre>
                    </section>

                    <section className="pane-card">
                      <SectionLabel label="编译提示" action="JSON Schema" />
                      <div className="rounded-2xl border border-amber-500/24 bg-amber-100/70 p-4 text-sm text-amber-900">
                        若手动编辑 YAML 出现缩进或字段缺失，右侧将即时标记并尝试自动修正，再同步回可视化卡片。
                      </div>
                    </section>
                  </div>
                ) : null}

                {inspectorTab === "history" ? (
                  <div className="space-y-4">
                    <section className="pane-card">
                      <SectionLabel label="最近 10 步" action="Diff 可回退" />
                      <div className="space-y-3">
                        {revisions.map((revision) => (
                          <div
                            key={revision.title}
                            className="rounded-2xl border border-[rgba(94,72,58,0.08)] bg-white/38 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">
                                {revision.title}
                              </p>
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.22em]",
                                  revision.status === "saved"
                                    ? "bg-emerald-300/10 text-emerald-200"
                                    : "bg-amber-300/10 text-amber-100",
                                )}
                              >
                                {revision.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-[--text-subtle]">
                              {revision.time}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : null}
              </div>
            </Panel>
          </Group>
        </div>
      </div>
    </div>
  );
}

function PaneTitle({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[--text-faint]">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(94,72,58,0.08)] bg-white/52 text-[--accent-soft]">
          {icon}
        </span>
        {eyebrow}
      </div>
      <h2 className="mt-3 font-serif text-2xl text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-[--text-subtle]">{description}</p>
    </header>
  );
}

function SectionLabel({ label, action }: { label: string; action: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="text-xs uppercase tracking-[0.22em] text-[--text-faint]">
        {label}
      </p>
      <p className="text-xs text-[--text-subtle]">{action}</p>
    </div>
  );
}

function WorkbenchMetric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        accent ? "border-[--accent-soft]/25 bg-[--accent-soft]/10" : "border-white/10 bg-white/[0.03]",
        accent ? "border-[--accent-soft]/25 bg-[rgba(185,125,92,0.08)]" : "border-[rgba(94,72,58,0.08)] bg-white/42",
      )}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-[--text-faint]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-[--text-subtle]">{hint}</p>
    </div>
  );
}

function Pill({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-medium",
        accent
          ? "border-[--accent-soft]/30 bg-[rgba(185,125,92,0.08)] text-[--accent-soft]"
          : "border-[rgba(94,72,58,0.08)] bg-white/42 text-[--text-subtle]",
      )}
    >
      {text}
    </span>
  );
}

function InspectorTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "bg-[rgba(185,125,92,0.12)] text-foreground" : "text-[--text-subtle] hover:bg-white/60 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusRow({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[rgba(94,72,58,0.08)] bg-white/38 p-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-[--text-subtle]">{detail}</p>
      </div>
    </div>
  );
}

export function WorkbenchOverviewCard() {
  return (
    <div className="rounded-[28px] border border-[rgba(94,72,58,0.08)] bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(244,230,220,0.56))] p-6 shadow-[0_24px_60px_rgba(94,72,58,0.12)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[--text-faint]">
            导向入口
          </p>
          <h3 className="mt-2 font-serif text-3xl text-foreground">
            继续推进当前工作台
          </h3>
          <p className="mt-2 max-w-xl text-sm text-[--text-subtle]">
            当前集已完成 68% 结构化。继续进入三栏沉浸式工作台，处理 AI 回写、YAML 校验与节拍润色。
          </p>
        </div>
        <ArrowRight className="hidden h-10 w-10 text-[--accent-soft] md:block" />
      </div>
    </div>
  );
}
