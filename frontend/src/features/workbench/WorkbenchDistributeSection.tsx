import { useState } from "react";
import {
  Sparkles,
  Video,
  Globe,
  Send,
  Check,
  Loader2,
  ArrowRight,
  ExternalLink,
  Settings2,
  FileVideo,
  Smartphone,
  Share2,
  AlertCircle,
  Music,
  ChevronDown,
  ChevronUp,
  Film,
  CheckCircle2,
  Circle,
  RefreshCw,
} from "lucide-react";
import { useScriptStore } from "@/store/useScriptStore";
import { createDistributionJob, dispatchDistributionJob } from "@/lib/api";
import { useToastStore } from "@/store/useToastStore";

type DistributeStep = "select" | "generate" | "distribute" | "complete";

interface DramaConfig {
  title: string;
  description: string;
  resolution: string;
  ratio: string;
  duration: number;
  watermark: boolean;
  generateAudio: boolean;
}

interface PlatformStatus {
  wechat: "idle" | "uploading" | "success" | "error";
  douyin: "idle" | "uploading" | "success" | "error";
}

const ratioOptions = [
  { value: "9:16", label: "9:16 竖屏" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "1:1", label: "1:1 方形" },
  { value: "4:3", label: "4:3 经典" },
];

const resolutionOptions = [
  { value: "480p", label: "480p 标清" },
  { value: "720p", label: "720p 高清" },
  { value: "1080p", label: "1080p 全高清" },
  { value: "4K", label: "4K 超清" },
];

function StepIndicator({ current }: { current: DistributeStep }) {
  const steps: { key: DistributeStep; label: string }[] = [
    { key: "select", label: "配置" },
    { key: "generate", label: "生成" },
    { key: "distribute", label: "分发" },
    { key: "complete", label: "完成" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-500 ${
                  isDone
                    ? "bg-green-100 text-green-600"
                    : isActive
                      ? "bg-[rgba(123,184,232,0.12)] text-[#7bb8e8] ring-2 ring-[rgba(123,184,232,0.25)]"
                      : "bg-[var(--muted)] text-[var(--text-faint)]"
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  s.label.slice(0, 1)
                )}
              </div>
              <span
                className={`hidden text-xs font-medium transition-colors sm:inline ${
                  isActive
                    ? "text-[hsl(var(--foreground))]"
                    : isDone
                      ? "text-green-600"
                      : "text-[var(--text-faint)]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-3 h-px w-8 transition-colors duration-500 ${
                  isDone ? "bg-green-300" : "bg-[var(--line-soft)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Select Step ──────────────────────────────────────────

function SelectStep({
  config,
  setConfig,
  currentScript,
  showConfig,
  setShowConfig,
  onStart,
}: {
  config: DramaConfig;
  setConfig: (c: DramaConfig) => void;
  currentScript: ReturnType<typeof useScriptStore.getState>["scripts"][number] | undefined;
  showConfig: boolean;
  setShowConfig: (v: boolean) => void;
  onStart: () => void;
}) {
  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Script Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-white transition-all duration-300 hover:border-[var(--line-medium)] hover:shadow-[var(--shadow-surface)]">
        <div className="absolute inset-0 bg-linear-to-br from-[rgba(123,184,232,0.03)] to-transparent pointer-events-none" />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-faint)] mb-1.5">
                选择剧本
              </p>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                {currentScript
                  ? currentScript.title
                  : "请先选择一个已完成的剧本"}
              </p>
              {currentScript && (
                <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                  {currentScript.episodes.length} 集 · 已就绪
                </p>
              )}
            </div>
            {currentScript && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.1)] px-3 py-1 text-xs font-medium text-green-600">
                <Check className="h-3 w-3" />
                {currentScript.episodes.length} 集
              </span>
            )}
          </div>

          {!currentScript && (
            <div className="mt-4 rounded-xl bg-[var(--muted)] border border-[var(--line-soft)] p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-[var(--text-subtle)] leading-6">
                  请先在"导入文本"中完成剧本导入和 AI
                  转换，再回到此处进行视频生成与分发。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config Section */}
      <div className="overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-white transition-all duration-300">
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="flex w-full items-center justify-between p-5 hover:bg-[var(--muted)]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(123,184,232,0.08)]">
              <Settings2 className="h-4 w-4 text-[#7bb8e8]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                视频生成配置
              </p>
              <p className="text-xs text-[var(--text-subtle)]">
                分辨率、比例、水印等参数
              </p>
            </div>
          </div>
          {showConfig ? (
            <ChevronUp className="h-4 w-4 text-[var(--text-faint)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--text-faint)]" />
          )}
        </button>

        {showConfig && (
          <div className="animate-fade-in border-t border-[var(--line-soft)] px-5 pb-5 pt-4 space-y-5">
            {/* Title & Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                  短剧名称
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) =>
                    setConfig({ ...config, title: e.target.value })
                  }
                  placeholder="输入短剧名称"
                  className="w-full rounded-xl border border-[var(--line-medium)] bg-white px-4 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[var(--text-subtle)] outline-none transition-all focus:border-[#7bb8e8] focus:ring-2 focus:ring-[rgba(123,184,232,0.12)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                  时长（秒）
                </label>
                <input
                  type="number"
                  value={config.duration}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      duration: parseInt(e.target.value) || 60,
                    })
                  }
                  min={5}
                  max={300}
                  className="w-full rounded-xl border border-[var(--line-medium)] bg-white px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none transition-all focus:border-[#7bb8e8] focus:ring-2 focus:ring-[rgba(123,184,232,0.12)]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                短剧描述
              </label>
              <textarea
                value={config.description}
                onChange={(e) =>
                  setConfig({ ...config, description: e.target.value })
                }
                placeholder="输入短剧简介，将作为视频生成 prompt 的一部分"
                rows={2}
                className="w-full rounded-xl border border-[var(--line-medium)] bg-white px-4 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[var(--text-subtle)] outline-none transition-all focus:border-[#7bb8e8] focus:ring-2 focus:ring-[rgba(123,184,232,0.12)] resize-y"
              />
            </div>

            {/* Resolution & Ratio */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-2">
                  分辨率
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {resolutionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setConfig({ ...config, resolution: opt.value })
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        config.resolution === opt.value
                          ? "border-[#7bb8e8] bg-[rgba(123,184,232,0.08)] text-[#7bb8e8] shadow-sm"
                          : "border-[var(--line-soft)] text-[var(--text-subtle)] hover:border-[var(--line-medium)] hover:text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-2">
                  画面比例
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ratioOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setConfig({ ...config, ratio: opt.value })
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        config.ratio === opt.value
                          ? "border-[#7bb8e8] bg-[rgba(123,184,232,0.08)] text-[#7bb8e8] shadow-sm"
                          : "border-[var(--line-soft)] text-[var(--text-subtle)] hover:border-[var(--line-medium)] hover:text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.watermark}
                  onChange={(e) =>
                    setConfig({ ...config, watermark: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-[var(--line-medium)] text-[#7bb8e8] focus:ring-[rgba(123,184,232,0.2)]"
                />
                <span className="text-sm text-[var(--text-subtle)] group-hover:text-[hsl(var(--foreground))] transition-colors">
                  添加水印
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.generateAudio}
                  onChange={(e) =>
                    setConfig({ ...config, generateAudio: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-[var(--line-medium)] text-[#7bb8e8] focus:ring-[rgba(123,184,232,0.2)]"
                />
                <span className="text-sm text-[var(--text-subtle)] group-hover:text-[hsl(var(--foreground))] transition-colors">
                  <Music className="mr-1 inline h-3.5 w-3.5" />
                  生成同步音频
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={onStart}
        disabled={!currentScript}
        className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-[#7bb8e8] px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-[rgba(123,184,232,0.25)] transition-all hover:bg-[#6aadd8] hover:shadow-xl hover:shadow-[rgba(123,184,232,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg"
      >
        <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 disabled:hidden" />
        <Sparkles className="h-5 w-5" />
        开始制作短剧视频
      </button>

      {/* Platform Info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: <Sparkles className="h-5 w-5 text-[#7bb8e8]" />,
            bg: "bg-[rgba(123,184,232,0.08)]",
            title: "火山方舟",
            desc: "Seedance 视频生成",
          },
          {
            icon: <Smartphone className="h-5 w-5 text-green-500" />,
            bg: "bg-[rgba(16,185,129,0.08)]",
            title: "微信视频号",
            desc: "短剧媒资管理分发",
          },
          {
            icon: <Share2 className="h-5 w-5 text-purple-500" />,
            bg: "bg-[rgba(168,85,247,0.08)]",
            title: "抖音",
            desc: "抖音云媒资托管分发",
          },
        ].map((p, i) => (
          <div
            key={i}
            className="group rounded-xl border border-[var(--line-soft)] bg-white p-4 text-center transition-all duration-300 hover:border-[var(--line-medium)] hover:shadow-[var(--shadow-surface)] hover:-translate-y-0.5"
          >
            <div
              className={`mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full ${p.bg} transition-transform duration-300 group-hover:scale-110`}
            >
              {p.icon}
            </div>
            <p className="text-xs font-medium text-[hsl(var(--foreground))]">
              {p.title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-subtle)]">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generate Step ────────────────────────────────────────

function GenerateStep({
  generateProgress,
  generating,
}: {
  generateProgress: number;
  generating: boolean;
}) {
  const isComplete = generateProgress >= 100;

  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="rounded-2xl border border-[var(--line-soft)] bg-white p-8 text-center shadow-[var(--shadow-surface)]">
          {/* Animated Icon */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full transition-all duration-700 ${
                isComplete
                  ? "bg-green-50 scale-100"
                  : "bg-[rgba(123,184,232,0.08)] animate-pulse"
              }`}
            />
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ${
                isComplete
                  ? "bg-green-100"
                  : "bg-[rgba(123,184,232,0.12)]"
              }`}
            >
              {generating ? (
                <Loader2 className="h-8 w-8 animate-spin text-[#7bb8e8]" />
              ) : isComplete ? (
                <Check className="h-8 w-8 text-green-500 animate-scale-in" />
              ) : (
                <Film className="h-8 w-8 text-[#7bb8e8]" />
              )}
            </div>
          </div>

          <h2 className="font-serif text-2xl font-semibold text-[hsl(var(--foreground))] mb-2">
            {isComplete
              ? "视频生成完成！"
              : "火山方舟 Seedance 正在生成..."}
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm leading-6 text-[var(--text-subtle)]">
            {isComplete
              ? "短剧视频已成功生成，即将进入分发环节。"
              : "正在将剧本逐场景转化为视频画面，基于 Seedance 2.0 模型进行多模态生成。"}
          </p>

          {/* Progress Bar */}
          <div className="mx-auto max-w-xs mb-8">
            <div className="flex items-center justify-between text-xs text-[var(--text-subtle)] mb-2">
              <span>生成进度</span>
              <span className="font-medium tabular-nums">
                {Math.round(generateProgress)}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-linear-to-r from-[#7bb8e8] to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(generateProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Generation Steps */}
          <div className="mx-auto max-w-sm space-y-2.5">
            {[
              { label: "解析剧本结构", threshold: 10 },
              { label: "生成场景分镜", threshold: 30 },
              { label: "多模态视频合成", threshold: 60 },
              { label: "音频同步处理", threshold: 85 },
              { label: "视频封装输出", threshold: 100 },
            ].map((step, i) => {
              const done = generateProgress >= step.threshold;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-500 ${
                    done
                      ? "bg-[rgba(16,185,129,0.04)]"
                      : "bg-transparent opacity-50"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                      done
                        ? "bg-green-100 text-green-600"
                        : "bg-[var(--muted)] text-[var(--text-faint)]"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-sm transition-colors duration-500 ${
                      done
                        ? "text-[hsl(var(--foreground))]"
                        : "text-[var(--text-subtle)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {done && !isComplete && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#7bb8e8] animate-pulse" />
                      <span className="text-xs text-[#7bb8e8]">处理中</span>
                    </div>
                  )}
                  {done && isComplete && (
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Distribute Step ──────────────────────────────────────

function DistributeStepView({
  config,
  videoUrl,
  platformStatus,
  onDistributeWechat,
  onDistributeDouyin,
  onDistributeAll,
  onComplete,
}: {
  config: DramaConfig;
  videoUrl: string | null;
  platformStatus: PlatformStatus;
  onDistributeWechat: () => void;
  onDistributeDouyin: () => void;
  onDistributeAll: () => void;
  onComplete: () => void;
}) {
  const allDone =
    platformStatus.wechat === "success" &&
    platformStatus.douyin === "success";

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Video Preview */}
      {videoUrl && (
        <div className="group overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-white transition-all duration-300 hover:border-[var(--line-medium)] hover:shadow-[var(--shadow-surface)]">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[rgba(123,184,232,0.08)] transition-transform duration-300 group-hover:scale-105">
                <FileVideo className="h-7 w-7 text-[#7bb8e8]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                  {config.title || "短剧视频"}
                </p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  {config.resolution} · {config.ratio} · {config.duration}秒
                  {config.generateAudio ? " · 含音频" : ""}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[var(--line-medium)] px-4 py-2 text-xs font-medium text-[var(--text-subtle)] transition-all hover:border-[#7bb8e8] hover:text-[#7bb8e8] hover:bg-[rgba(123,184,232,0.04)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                预览
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            key: "wechat" as const,
            name: "微信视频号",
            desc: "短剧媒资管理 API",
            icon: <Smartphone className="h-5 w-5 text-green-500" />,
            bg: "bg-[rgba(16,185,129,0.08)]",
            steps: ["媒资上传", "剧目提审", "剧目授权"],
            status: platformStatus.wechat,
            onDistribute: onDistributeWechat,
            successColor: "#10b981",
          },
          {
            key: "douyin" as const,
            name: "抖音",
            desc: "抖音云媒资管理",
            icon: <Share2 className="h-5 w-5 text-purple-500" />,
            bg: "bg-[rgba(168,85,247,0.08)]",
            steps: ["视频上传", "自动转码", "内容库送审"],
            status: platformStatus.douyin,
            onDistribute: onDistributeDouyin,
            successColor: "#a855f7",
          },
        ].map((platform) => (
          <div
            key={platform.key}
            className={`group overflow-hidden rounded-2xl border transition-all duration-300 ${
              platform.status === "success"
                ? "border-green-200 bg-[rgba(16,185,129,0.02)]"
                : platform.status === "uploading"
                  ? "border-[#7bb8e8]/30 bg-[rgba(123,184,232,0.02)]"
                  : "border-[var(--line-soft)] bg-white hover:border-[var(--line-medium)] hover:shadow-[var(--shadow-surface)]"
            }`}
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${platform.bg} transition-transform duration-300 group-hover:scale-110`}
                >
                  {platform.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {platform.name}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {platform.desc}
                  </p>
                </div>
              </div>

              <div className="mb-5 space-y-1.5">
                {platform.steps.map((step, i) => {
                  const isThirdStep = i === 2;
                  const isStepDone =
                    platform.status === "success"
                      ? true
                      : !isThirdStep;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-[var(--text-subtle)]"
                    >
                      {isStepDone ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
                      )}
                      {step}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={platform.onDistribute}
                disabled={platform.status !== "idle"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor:
                    platform.status === "success"
                      ? `${platform.successColor}12`
                      : platform.status === "uploading"
                        ? "var(--muted)"
                        : "var(--accent-light)",
                  color:
                    platform.status === "success"
                      ? platform.successColor
                      : platform.status === "uploading"
                        ? "var(--text-subtle)"
                        : "#7bb8e8",
                }}
              >
                {platform.status === "idle" && (
                  <>
                    <Send className="h-4 w-4" />
                    分发到{platform.name}
                  </>
                )}
                {platform.status === "uploading" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在分发...
                  </>
                )}
                {platform.status === "success" && (
                  <>
                    <Check className="h-4 w-4" />
                    分发完成
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {!allDone && (
        <button
          type="button"
          onClick={onDistributeAll}
          disabled={
            platformStatus.wechat === "uploading" ||
            platformStatus.douyin === "uploading"
          }
          className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-[#7bb8e8] px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-[rgba(123,184,232,0.25)] transition-all hover:bg-[#6aadd8] hover:shadow-xl hover:shadow-[rgba(123,184,232,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 disabled:hidden" />
          <Globe className="h-5 w-5" />
          一键全平台分发
        </button>
      )}

      {allDone && (
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-[rgba(16,185,129,0.25)] transition-all hover:bg-green-600 hover:shadow-xl"
        >
          <CheckCircle2 className="h-5 w-5" />
          完成，查看结果
        </button>
      )}
    </div>
  );
}

// ── Complete Step ────────────────────────────────────────

function CompleteStep({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="rounded-2xl border border-[var(--line-soft)] bg-white p-8 text-center shadow-[var(--shadow-surface)]">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full bg-green-50 animate-scale-in" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <h2 className="font-serif text-2xl font-semibold text-[hsl(var(--foreground))] mb-2">
            制作与分发完成！
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm leading-6 text-[var(--text-subtle)]">
            短剧视频已成功生成并分发至微信视频号和抖音平台。
            请前往各平台查看审核状态。
          </p>

          <div className="mx-auto mb-8 grid max-w-xs grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--line-soft)] bg-white p-5 text-center transition-all hover:border-green-200 hover:shadow-sm">
              <Smartphone className="mx-auto mb-2 h-6 w-6 text-green-500" />
              <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                微信
              </p>
              <p className="text-xs text-green-500 mt-0.5">分发成功</p>
            </div>
            <div className="rounded-xl border border-[var(--line-soft)] bg-white p-5 text-center transition-all hover:border-purple-200 hover:shadow-sm">
              <Share2 className="mx-auto mb-2 h-6 w-6 text-purple-500" />
              <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                抖音
              </p>
              <p className="text-xs text-purple-500 mt-0.5">分发成功</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#7bb8e8] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[rgba(123,184,232,0.25)] transition-all hover:bg-[#6aadd8] hover:shadow-xl"
          >
            <RefreshCw className="h-4 w-4" />
            制作下一部短剧
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

export default function WorkbenchDistributeSection() {
  const [step, setStep] = useState<DistributeStep>("select");
  const [config, setConfig] = useState<DramaConfig>({
    title: "",
    description: "",
    resolution: "1080p",
    ratio: "9:16",
    duration: 60,
    watermark: true,
    generateAudio: true,
  });
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({
    wechat: "idle",
    douyin: "idle",
  });
  const [showConfig, setShowConfig] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const [distributionJobId, setDistributionJobId] = useState<string | null>(null);

  const scripts = useScriptStore((s) => s.scripts);
  const currentScriptId = useScriptStore((s) => s.currentScriptId);
  const currentScript = scripts.find((s) => s.id === currentScriptId);

  const handleGenerateVideo = async () => {
    if (!currentScript?.projectId) {
      addToast({ type: "warning", title: "当前剧本未绑定项目" });
      return;
    }
    setGenerating(true);
    setStep("generate");
    setGenerateProgress(0);

    const interval = setInterval(() => {
      setGenerateProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 2000);

    setTimeout(async () => {
      clearInterval(interval);
      setGenerateProgress(100);
      setGenerating(false);
      try {
        const job = await createDistributionJob({
          project_id: currentScript.projectId,
          script_id: currentScript.id,
          title: config.title || currentScript.title,
          description: config.description,
          resolution: config.resolution,
          ratio: config.ratio,
          duration: config.duration,
          watermark: config.watermark,
          generate_audio: config.generateAudio,
          platforms: ["wechat", "douyin"],
        });
        setDistributionJobId(job.id);
        setVideoUrl(job.video_url ?? "https://example.com/generated-drama-video.mp4");
      } catch (error) {
        addToast({
          type: "error",
          title: "创建分发任务失败",
          message: error instanceof Error ? error.message : "未知错误",
        });
      }
      setStep("distribute");
    }, 15000);
  };

  const handleDistributeToWechat = async () => {
    setPlatformStatus((prev) => ({ ...prev, wechat: "uploading" }));
    if (currentScript?.projectId && distributionJobId) {
      await dispatchDistributionJob(currentScript.projectId, distributionJobId, ["wechat"]);
    }
    await new Promise((r) => setTimeout(r, 1000));
    setPlatformStatus((prev) => ({ ...prev, wechat: "success" }));
  };

  const handleDistributeToDouyin = async () => {
    setPlatformStatus((prev) => ({ ...prev, douyin: "uploading" }));
    if (currentScript?.projectId && distributionJobId) {
      await dispatchDistributionJob(currentScript.projectId, distributionJobId, ["douyin"]);
    }
    await new Promise((r) => setTimeout(r, 1000));
    setPlatformStatus((prev) => ({ ...prev, douyin: "success" }));
  };

  const handleDistributeAll = async () => {
    await Promise.all([handleDistributeToWechat(), handleDistributeToDouyin()]);
    setStep("complete");
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)] mb-1.5">
          <span className="inline-flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 text-[#7bb8e8]" />
            一键分发
          </span>
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
          一键制作短剧
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--text-subtle)]">
          基于火山方舟 Seedance 视频生成模型，将结构化剧本转化为竖屏短剧视频，
          一键分发至抖音和微信视频号。
        </p>
      </div>

      {/* Step Progress */}
      <StepIndicator current={step} />

      {/* Step Content */}
      {step === "select" && (
        <SelectStep
          config={config}
          setConfig={setConfig}
          currentScript={currentScript}
          showConfig={showConfig}
          setShowConfig={setShowConfig}
          onStart={handleGenerateVideo}
        />
      )}

      {step === "generate" && (
        <GenerateStep
          generateProgress={generateProgress}
          generating={generating}
        />
      )}

      {step === "distribute" && (
        <DistributeStepView
          config={config}
          videoUrl={videoUrl}
          platformStatus={platformStatus}
          onDistributeWechat={handleDistributeToWechat}
          onDistributeDouyin={handleDistributeToDouyin}
          onDistributeAll={handleDistributeAll}
          onComplete={() => setStep("complete")}
        />
      )}

      {step === "complete" && (
        <CompleteStep onReset={() => {
          setStep("select");
          setConfig({
            title: "",
            description: "",
            resolution: "1080p",
            ratio: "9:16",
            duration: 60,
            watermark: true,
            generateAudio: true,
          });
          setVideoUrl(null);
          setPlatformStatus({ wechat: "idle", douyin: "idle" });
          setShowConfig(false);
        }} />
      )}
    </div>
  );
}
