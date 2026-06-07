import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileJson,
  FileText,
  Film,
  Globe,
  Loader2,
  MonitorPlay,
  Music,
  RefreshCw,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Video,
  WandSparkles,
  Zap,
} from "lucide-react";
import {
  createDistributionJob,
  createProjectExport,
  dispatchDistributionJob,
  fetchDistributionJobs,
  fetchProjectExports,
  type DistributionJob,
  type DistributionPlatform,
} from "@/lib/api";
import { useProjectStore } from "@/store/useProjectStore";
import { useScriptStore } from "@/store/useScriptStore";
import { useToastStore } from "@/store/useToastStore";
import { useAuthStore } from "@/store/useAuthStore";

type DistributeStep = "select" | "generate" | "distribute" | "complete";
type DeliveryAsset = "yaml" | "pdf" | "json" | "share";
type AsyncStatus = "idle" | "running" | "success" | "error";

interface DramaConfig {
  title: string;
  description: string;
  resolution: string;
  ratio: string;
  duration: number;
  watermark: boolean;
  generateAudio: boolean;
}

type PlatformStatus = Record<DistributionPlatform, AsyncStatus>;
type AssetStatus = Record<DeliveryAsset, AsyncStatus>;

interface DeliveryAssetOption {
  key: DeliveryAsset;
  label: string;
  desc: string;
  accent: string;
  icon: typeof FileText;
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

const platformOptions: Array<{
  key: DistributionPlatform;
  name: string;
  desc: string;
  accent: string;
  bg: string;
  icon: typeof Smartphone;
  steps: string[];
}> = [
  {
    key: "wechat",
    name: "微信视频号",
    desc: "短剧媒资管理 API",
    accent: "text-green-600",
    bg: "bg-[rgba(16,185,129,0.1)]",
    icon: Smartphone,
    steps: ["媒资上传", "提审配置", "版权确认"],
  },
  {
    key: "douyin",
    name: "抖音",
    desc: "抖音云媒资管理",
    accent: "text-fuchsia-600",
    bg: "bg-[rgba(217,70,239,0.1)]",
    icon: Share2,
    steps: ["视频上传", "自动转码", "内容库送审"],
  },
];

const deliveryAssetOptions: DeliveryAssetOption[] = [
  {
    key: "yaml",
    label: "YAML 模型包",
    desc: "给 AI 工具流或技术团队的结构化脚本交付物",
    accent: "text-sky-600",
    icon: FileJson,
  },
  {
    key: "pdf",
    label: "PDF 水印稿",
    desc: "用于制片、片场或外部合作方查阅的版式稿",
    accent: "text-rose-600",
    icon: FileText,
  },
  {
    key: "json",
    label: "JSON 数据包",
    desc: "标准化接口数据，可直接给下游系统消费",
    accent: "text-emerald-600",
    icon: FileJson,
  },
  {
    key: "share",
    label: "协作分享链接",
    desc: "给团队成员在线预览与审批的轻量链接",
    accent: "text-violet-600",
    icon: Globe,
  },
];

const defaultConfig: DramaConfig = {
  title: "",
  description: "",
  resolution: "1080p",
  ratio: "9:16",
  duration: 60,
  watermark: true,
  generateAudio: true,
};

const defaultPlatformStatus: PlatformStatus = {
  wechat: "idle",
  douyin: "idle",
};

const defaultAssetStatus: AssetStatus = {
  yaml: "idle",
  pdf: "idle",
  json: "idle",
  share: "idle",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StepIndicator({ current }: { current: DistributeStep }) {
  const steps: { key: DistributeStep; label: string }[] = [
    { key: "select", label: "准备" },
    { key: "generate", label: "生成" },
    { key: "distribute", label: "分发" },
    { key: "complete", label: "完成" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const isActive = index === currentIdx;
        const isDone = index < currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-500 ${
                  isDone
                    ? "bg-green-100 text-green-600"
                    : isActive
                      ? "bg-[oklch(from var(--accent-soft) l c h / 0.12)] text-[var(--accent-soft)] ring-2 ring-[oklch(from var(--accent-soft) l c h / 0.2)]"
                      : "bg-[var(--muted)] text-[var(--text-faint)]"
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.label.slice(0, 1)
                )}
              </div>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  isActive
                    ? "text-[hsl(var(--foreground))]"
                    : isDone
                      ? "text-green-600"
                      : "text-[var(--text-faint)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-3 h-px w-9 ${
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

function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-green-100 text-green-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-[var(--muted)] text-[var(--text-subtle)]";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--line-soft)] bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-surface)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-[hsl(var(--foreground))]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SelectStep({
  config,
  setConfig,
  currentScript,
  currentProjectTitle,
  credits,
  selectedPlatforms,
  selectedAssets,
  showConfig,
  setShowConfig,
  togglePlatform,
  toggleAsset,
  onStart,
}: {
  config: DramaConfig;
  setConfig: (next: DramaConfig) => void;
  currentScript:
    | ReturnType<typeof useScriptStore.getState>["scripts"][number]
    | undefined;
  currentProjectTitle?: string;
  credits: number;
  selectedPlatforms: DistributionPlatform[];
  selectedAssets: DeliveryAsset[];
  showConfig: boolean;
  setShowConfig: (next: boolean) => void;
  togglePlatform: (platform: DistributionPlatform) => void;
  toggleAsset: (asset: DeliveryAsset) => void;
  onStart: () => void;
}) {
  const canStart = Boolean(currentScript && selectedPlatforms.length > 0);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <SectionCard
          title="分发对象与视频配置"
          description="先确定要生成的交付版本，再决定同步到哪些平台。"
          action={
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--text-subtle)] transition-colors hover:border-[var(--line-medium)] hover:text-[hsl(var(--foreground))]"
            >
              <Settings2 className="h-4 w-4" />
              {showConfig ? "收起配置" : "展开配置"}
            </button>
          }
        >
          <div className="mb-5 rounded-2xl border border-[var(--line-soft)] bg-[linear-gradient(135deg,oklch(from var(--accent-soft) l c h / 0.10),rgba(255,255,255,0.95))] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-faint)]">
                  当前项目
                </p>
                <p className="mt-1 text-base font-medium text-[hsl(var(--foreground))]">
                  {currentProjectTitle ?? "尚未绑定项目"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-subtle)]">
                  {currentScript
                    ? `${currentScript.title} · ${currentScript.episodes.length} 集可用于分发`
                    : "请先在导入文本中完成剧本生成，再来这里做制作与交付。"}
                </p>
              </div>
              {currentScript ? (
                <StatusChip label="已就绪" tone="success" />
              ) : (
                <StatusChip label="待剧本生成" tone="warning" />
              )}
            </div>
          </div>

          {showConfig && (
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[hsl(var(--foreground))]">
                  短剧名称
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(event) =>
                    setConfig({ ...config, title: event.target.value })
                  }
                  placeholder="输入最终交付片名"
                  className="w-full rounded-xl border border-[var(--line-medium)] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--accent-soft)] focus:ring-2 focus:ring-[oklch(from var(--accent-soft) l c h / 0.12)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[hsl(var(--foreground))]">
                  时长（秒）
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={config.duration}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      duration: parseInt(event.target.value, 10) || 60,
                    })
                  }
                  className="w-full rounded-xl border border-[var(--line-medium)] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--accent-soft)] focus:ring-2 focus:ring-[oklch(from var(--accent-soft) l c h / 0.12)]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-[hsl(var(--foreground))]">
                  分发说明
                </label>
                <textarea
                  rows={3}
                  value={config.description}
                  onChange={(event) =>
                    setConfig({ ...config, description: event.target.value })
                  }
                  placeholder="填写给平台运营、外部协作方或 AI 生成链路的备注说明"
                  className="w-full rounded-xl border border-[var(--line-medium)] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--accent-soft)] focus:ring-2 focus:ring-[oklch(from var(--accent-soft) l c h / 0.12)]"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-[hsl(var(--foreground))]">
                  分辨率
                </p>
                <div className="flex flex-wrap gap-2">
                  {resolutionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setConfig({ ...config, resolution: option.value })
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        config.resolution === option.value
                          ? "border-[var(--accent-soft)] bg-[oklch(from var(--accent-soft) l c h / 0.08)] text-[var(--accent-soft)]"
                          : "border-[var(--line-soft)] text-[var(--text-subtle)] hover:border-[var(--line-medium)] hover:text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-[hsl(var(--foreground))]">
                  画面比例
                </p>
                <div className="flex flex-wrap gap-2">
                  {ratioOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setConfig({ ...config, ratio: option.value })
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        config.ratio === option.value
                          ? "border-[var(--accent-soft)] bg-[oklch(from var(--accent-soft) l c h / 0.08)] text-[var(--accent-soft)]"
                          : "border-[var(--line-soft)] text-[var(--text-subtle)] hover:border-[var(--line-medium)] hover:text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text-subtle)]">
                <input
                  type="checkbox"
                  checked={config.watermark}
                  onChange={(event) =>
                    setConfig({ ...config, watermark: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-[var(--line-medium)] text-[var(--accent-soft)]"
                />
                添加专属水印
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text-subtle)]">
                <input
                  type="checkbox"
                  checked={config.generateAudio}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      generateAudio: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-[var(--line-medium)] text-[var(--accent-soft)]"
                />
                <Music className="h-4 w-4" />
                生成同步音频
              </label>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/55 p-4">
              <p className="mb-3 text-sm font-medium text-[hsl(var(--foreground))]">
                选择分发平台
              </p>
              <div className="space-y-3">
                {platformOptions.map((platform) => {
                  const PlatformIcon = platform.icon;
                  const selected = selectedPlatforms.includes(platform.key);
                  return (
                    <button
                      key={platform.key}
                      type="button"
                      onClick={() => togglePlatform(platform.key)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                        selected
                          ? "border-[var(--accent-soft)] bg-white shadow-[var(--shadow-card)]"
                          : "border-transparent bg-white/70 hover:border-[var(--line-medium)]"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${platform.bg}`}
                      >
                        <PlatformIcon
                          className={`h-5 w-5 ${platform.accent}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {platform.name}
                          </p>
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--accent-soft)]" />
                          ) : (
                            <Circle className="h-4 w-4 text-[var(--text-faint)]" />
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                          {platform.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/55 p-4">
              <p className="mb-3 text-sm font-medium text-[hsl(var(--foreground))]">
                选择并行交付物
              </p>
              <div className="space-y-3">
                {deliveryAssetOptions.map((asset) => {
                  const AssetIcon = asset.icon;
                  const selected = selectedAssets.includes(asset.key);
                  return (
                    <button
                      key={asset.key}
                      type="button"
                      onClick={() => toggleAsset(asset.key)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                        selected
                          ? "border-[var(--accent-soft)] bg-white shadow-[var(--shadow-card)]"
                          : "border-transparent bg-white/70 hover:border-[var(--line-medium)]"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                        <AssetIcon className={`h-5 w-5 ${asset.accent}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {asset.label}
                          </p>
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--accent-soft)]" />
                          ) : (
                            <Circle className="h-4 w-4 text-[var(--text-faint)]" />
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                          {asset.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="分发摘要"
          description="确认这次分发的体量、资源消耗和交付边界。"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">
                计划生成
              </p>
              <p className="mt-2 text-3xl font-semibold text-[hsl(var(--foreground))]">
                {selectedPlatforms.length + selectedAssets.length}
              </p>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">
                {selectedPlatforms.length} 个平台 + {selectedAssets.length}{" "}
                项交付物
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">
                剩余额度
              </p>
              <p className="mt-2 text-3xl font-semibold text-[hsl(var(--foreground))]">
                {credits}
              </p>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">
                当前账号可继续发起的视频生成次数
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--line-soft)] bg-white p-4">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              本次流程会自动完成
            </p>
            <div className="mt-3 space-y-2 text-sm text-[var(--text-subtle)]">
              <div className="flex items-start gap-2">
                <WandSparkles className="mt-0.5 h-4 w-4 text-[var(--accent-soft)]" />
                Seedance 生成视频，并保留可回放的任务记录。
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                为平台分发和外部交付物分别写入状态回执。
              </div>
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 text-amber-500" />
                完成后可继续前往任务中心查看审核与下载状态。
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--accent-soft)] px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-[oklch(from var(--accent-soft) l c h / 0.25)] transition-all hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-5 w-5" />
            开始生成并准备分发
          </button>
        </SectionCard>
      </div>
    </div>
  );
}

function GenerateStep({
  generateProgress,
  generating,
  selectedPlatforms,
  selectedAssets,
}: {
  generateProgress: number;
  generating: boolean;
  selectedPlatforms: DistributionPlatform[];
  selectedAssets: DeliveryAsset[];
}) {
  const isComplete = generateProgress >= 100;

  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-full max-w-3xl animate-fade-in-up">
        <div className="rounded-[32px] border border-[var(--line-soft)] bg-white p-8 text-center shadow-[var(--shadow-surface)]">
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full transition-all duration-700 ${
                isComplete
                  ? "scale-100 bg-green-50"
                  : "animate-pulse bg-[oklch(from var(--accent-soft) l c h / 0.08)]"
              }`}
            />
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-full ${
                isComplete ? "bg-green-100" : "bg-[oklch(from var(--accent-soft) l c h / 0.12)]"
              }`}
            >
              <span className="inline-flex">
                {generating ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-soft)]" />
                ) : isComplete ? (
                  <Check className="h-8 w-8 text-green-500" />
                ) : (
                  <Film className="h-8 w-8 text-[var(--accent-soft)]" />
                )}
              </span>
            </div>
          </div>

          <h2 className="font-serif text-3xl font-semibold text-[hsl(var(--foreground))]">
            {isComplete ? "视频生成完成" : "Seedance 正在准备交付主片"}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--text-subtle)]">
            {isComplete
              ? "主视频已经生成完成，接下来会进入平台分发与导出物交付阶段。"
              : `正在合成主视频，并为 ${selectedPlatforms.length} 个平台和 ${selectedAssets.length} 项交付物准备元数据。`}
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-subtle)]">
              <span>生成进度</span>
              <span className="font-medium tabular-nums">
                {Math.round(generateProgress)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-linear-to-r from-[var(--accent-soft)] via-sky-400 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(generateProgress, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              "解析剧本结构与镜头节拍",
              "根据比例与分辨率渲染画面",
              "同步音频与片头水印策略",
              "写入分发元数据与导出队列",
            ].map((item, index) => {
              const done = generateProgress >= (index + 1) * 25;
              return (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                    done
                      ? "border-green-100 bg-green-50/60"
                      : "border-[var(--line-soft)] bg-[var(--muted)]/40"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      done
                        ? "bg-green-100 text-green-600"
                        : "bg-white text-[var(--text-faint)]"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                  </div>
                  <span className="text-sm text-[var(--text-subtle)]">
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DistributeStepView({
  config,
  videoUrl,
  selectedPlatforms,
  selectedAssets,
  platformStatus,
  assetStatus,
  history,
  onDistributePlatform,
  onDistributeAll,
  onExportAsset,
  onComplete,
}: {
  config: DramaConfig;
  videoUrl: string | null;
  selectedPlatforms: DistributionPlatform[];
  selectedAssets: DeliveryAsset[];
  platformStatus: PlatformStatus;
  assetStatus: AssetStatus;
  history: DistributionJob[];
  onDistributePlatform: (platform: DistributionPlatform) => void;
  onDistributeAll: () => void;
  onExportAsset: (asset: DeliveryAsset) => void;
  onComplete: () => void;
}) {
  const platformDone = selectedPlatforms.every(
    (platform) => platformStatus[platform] === "success",
  );
  const assetDone =
    selectedAssets.length === 0 ||
    selectedAssets.every((asset) => assetStatus[asset] === "success");
  const canComplete = platformDone && assetDone;

  const visiblePlatforms = platformOptions.filter((item) =>
    selectedPlatforms.includes(item.key),
  );
  const visibleAssets = deliveryAssetOptions.filter((item) =>
    selectedAssets.includes(item.key),
  );

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
        <SectionCard
          title="主片与平台分发"
          description="先确认生成结果，再并行把同一主片推送到目标平台。"
        >
          <div className="mb-5 rounded-[28px] border border-[var(--line-soft)] bg-[linear-gradient(135deg,oklch(from var(--accent-soft) l c h / 0.10),rgba(255,255,255,1))] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-card)]">
                <MonitorPlay className="h-8 w-8 text-[var(--accent-soft)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium text-[hsl(var(--foreground))]">
                  {config.title || "未命名短剧交付片"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-subtle)]">
                  {config.resolution} · {config.ratio} · {config.duration} 秒
                  {config.generateAudio ? " · 含音频" : ""}
                  {config.watermark ? " · 含水印" : ""}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                  {config.description ||
                    "未填写分发说明，将按默认交付文案执行。"}
                </p>
              </div>
              <a
                href={videoUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  videoUrl
                    ? "border-[var(--line-medium)] text-[hsl(var(--foreground))] hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)]"
                    : "cursor-not-allowed border-[var(--line-soft)] text-[var(--text-faint)]"
                }`}
              >
                <ExternalLink className="h-4 w-4" />
                打开预览
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {visiblePlatforms.map((platform) => {
              const PlatformIcon = platform.icon;
              const status = platformStatus[platform.key];
              const success = status === "success";
              const running = status === "running";
              const failed = status === "error";
              return (
                <div
                  key={platform.key}
                  className={`rounded-[26px] border p-5 transition-all ${
                    success
                      ? "border-green-200 bg-green-50/50"
                      : failed
                        ? "border-rose-200 bg-rose-50/50"
                        : running
                          ? "border-[var(--accent-soft)]/30 bg-[oklch(from var(--accent-soft) l c h / 0.04)]"
                          : "border-[var(--line-soft)] bg-white"
                  }`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${platform.bg}`}
                    >
                      <PlatformIcon className={`h-5 w-5 ${platform.accent}`} />
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
                  <div className="mb-5 space-y-2">
                    {platform.steps.map((item, index) => {
                      const done = success ? true : index === 0 || running;
                      return (
                        <div
                          key={item}
                          className="flex items-center gap-2 text-xs text-[var(--text-subtle)]"
                        >
                          {done ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                          )}
                          {item}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDistributePlatform(platform.key)}
                    disabled={running || success}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: success
                        ? "rgba(16,185,129,0.12)"
                        : failed
                          ? "rgba(244,63,94,0.12)"
                          : running
                            ? "var(--muted)"
                            : "var(--accent-light)",
                      color: success
                        ? "#16a34a"
                        : failed
                          ? "#e11d48"
                          : running
                            ? "var(--text-subtle)"
                            : "var(--accent-soft)",
                    }}
                  >
                    {status === "idle" && (
                      <>
                        <Send className="h-4 w-4" />
                        分发到{platform.name}
                      </>
                    )}
                    {status === "running" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在分发...
                      </>
                    )}
                    {status === "success" && (
                      <>
                        <Check className="h-4 w-4" />
                        分发完成
                      </>
                    )}
                    {status === "error" && (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        重试分发
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onDistributeAll}
            disabled={
              selectedPlatforms.length === 0 ||
              visiblePlatforms.some(
                (platform) => platformStatus[platform.key] === "running",
              )
            }
            className="mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--accent-soft)] px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-[oklch(from var(--accent-soft) l c h / 0.25)] transition-all hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Video className="h-5 w-5" />
            一键并行分发到全部平台
          </button>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title="交付物导出"
            description="按设计文档要求，把结构化内容并行发给外部协作链路。"
          >
            <div className="space-y-3">
              {visibleAssets.length > 0 ? (
                visibleAssets.map((asset) => {
                  const AssetIcon = asset.icon;
                  const status = assetStatus[asset.key];
                  return (
                    <div
                      key={asset.key}
                      className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/35 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                          <AssetIcon className={`h-5 w-5 ${asset.accent}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {asset.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                            {asset.desc}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onExportAsset(asset.key)}
                        disabled={status === "running" || status === "success"}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-soft)] bg-white px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {status === "idle" && "生成交付物"}
                        {status === "running" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            正在导出...
                          </>
                        )}
                        {status === "success" && (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            导出完成
                          </>
                        )}
                        {status === "error" && (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            重试导出
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--muted)]/40 p-4 text-sm text-[var(--text-subtle)]">
                  当前没有选择额外导出物，本次只执行平台分发。
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="最近分发回执"
            description="保留最近的分发任务，方便快速回看与对照。"
          >
            <div className="space-y-3">
              {history.length > 0 ? (
                history.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {job.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-subtle)]">
                          {job.platforms.join(" / ")} ·{" "}
                          {formatTime(job.updated_at)}
                        </p>
                      </div>
                      <StatusChip
                        label={
                          job.status === "completed" ? "已完成" : job.status
                        }
                        tone={
                          job.status === "completed" ? "success" : "neutral"
                        }
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      {job.description || "未填写备注。"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--muted)]/35 p-4 text-sm text-[var(--text-subtle)]">
                  还没有历史回执，完成本次分发后会自动记录。
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {canComplete && (
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-[rgba(16,185,129,0.25)] transition-all hover:bg-green-600"
        >
          <CheckCircle2 className="h-5 w-5" />
          全部交付完成，查看结果
        </button>
      )}
    </div>
  );
}

function CompleteStep({
  selectedPlatforms,
  selectedAssets,
  onReset,
  onOpenTasks,
  onOpenAssets,
}: {
  selectedPlatforms: DistributionPlatform[];
  selectedAssets: DeliveryAsset[];
  onReset: () => void;
  onOpenTasks: () => void;
  onOpenAssets: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-full max-w-3xl animate-fade-in-up">
        <div className="rounded-[32px] border border-[var(--line-soft)] bg-white p-8 text-center shadow-[var(--shadow-surface)]">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full bg-green-50" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <h2 className="font-serif text-3xl font-semibold text-[hsl(var(--foreground))]">
            分发与交付已完成
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--text-subtle)]">
            已完成 {selectedPlatforms.length} 个平台分发，并生成{" "}
            {selectedAssets.length} 项交付物。
            现在可以前往任务中心看审核状态，或去资产页管理导出结果。
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/40 p-5">
              <Video className="mx-auto h-6 w-6 text-[var(--accent-soft)]" />
              <p className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {selectedPlatforms.length}
              </p>
              <p className="text-xs text-[var(--text-subtle)]">平台回执完成</p>
            </div>
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/40 p-5">
              <FileJson className="mx-auto h-6 w-6 text-emerald-500" />
              <p className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {selectedAssets.length}
              </p>
              <p className="text-xs text-[var(--text-subtle)]">导出物已交付</p>
            </div>
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--muted)]/40 p-5">
              <ShieldCheck className="mx-auto h-6 w-6 text-green-500" />
              <p className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                100%
              </p>
              <p className="text-xs text-[var(--text-subtle)]">流程完成率</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onOpenTasks}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--line-medium)] px-5 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)]"
            >
              查看任务中心
            </button>
            <button
              type="button"
              onClick={onOpenAssets}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--line-medium)] px-5 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)]"
            >
              前往资产页
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-soft)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-soft)]"
            >
              <RefreshCw className="h-4 w-4" />
              继续分发下一部
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkbenchDistributeSection() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const scripts = useScriptStore((state) => state.scripts);
  const currentScriptId = useScriptStore((state) => state.currentScriptId);
  const projects = useProjectStore((state) => state.projects);
  const credits = useAuthStore((state) => state.credits);

  const currentScript = useMemo(
    () => scripts.find((script) => script.id === currentScriptId),
    [scripts, currentScriptId],
  );
  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentScript?.projectId),
    [projects, currentScript?.projectId],
  );

  const [step, setStep] = useState<DistributeStep>("select");
  const [config, setConfig] = useState<DramaConfig>(defaultConfig);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(true);
  const [distributionJobId, setDistributionJobId] = useState<string | null>(
    null,
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    DistributionPlatform[]
  >(["wechat", "douyin"]);
  const [selectedAssets, setSelectedAssets] = useState<DeliveryAsset[]>([
    "yaml",
    "pdf",
  ]);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>(
    defaultPlatformStatus,
  );
  const [assetStatus, setAssetStatus] =
    useState<AssetStatus>(defaultAssetStatus);
  const [history, setHistory] = useState<DistributionJob[]>([]);

  useEffect(() => {
    if (!currentScript?.projectId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const jobs = await fetchDistributionJobs(currentScript.projectId);
        if (!cancelled) {
          setHistory(jobs);
        }
      } catch {
        if (!cancelled) {
          setHistory([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentScript?.projectId]);

  const togglePlatform = (platform: DistributionPlatform) => {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  const toggleAsset = (asset: DeliveryAsset) => {
    setSelectedAssets((current) =>
      current.includes(asset)
        ? current.filter((item) => item !== asset)
        : [...current, asset],
    );
  };

  const refreshHistory = async () => {
    if (!currentScript?.projectId) return;
    try {
      const jobs = await fetchDistributionJobs(currentScript.projectId);
      setHistory(jobs);
    } catch {
      // keep current history
    }
  };

  const handleGenerateVideo = async () => {
    if (!currentScript?.projectId) {
      addToast({
        type: "warning",
        title: "当前剧本未绑定项目",
        message: "请先完成导入与剧本生成，再进入一键分发页面。",
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      addToast({
        type: "warning",
        title: "至少选择一个分发平台",
      });
      return;
    }

    setGenerating(true);
    setStep("generate");
    setGenerateProgress(0);

    const interval = window.setInterval(() => {
      setGenerateProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(prev + Math.random() * 18, 92);
      });
    }, 1200);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 3200));
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
        platforms: selectedPlatforms,
      });

      window.clearInterval(interval);
      setGenerateProgress(100);
      setDistributionJobId(job.id);
      setVideoUrl(
        job.video_url ?? "https://example.com/generated-drama-video.mp4",
      );
      setPlatformStatus(defaultPlatformStatus);
      setAssetStatus(defaultAssetStatus);
      setHistory((prev) => [job, ...prev].slice(0, 8));
      setStep("distribute");
      addToast({
        type: "success",
        title: "视频主片已生成",
        message: "可以开始平台分发与导出物交付。",
      });
    } catch (error) {
      window.clearInterval(interval);
      setStep("select");
      addToast({
        type: "error",
        title: "创建分发任务失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setGenerating(false);
      setGenerateProgress(100);
    }
  };

  const handleDistributePlatform = async (platform: DistributionPlatform) => {
    if (!currentScript?.projectId || !distributionJobId) {
      addToast({
        type: "warning",
        title: "缺少分发任务",
        message: "请先完成主片生成。",
      });
      return;
    }

    setPlatformStatus((current) => ({ ...current, [platform]: "running" }));
    try {
      await dispatchDistributionJob(
        currentScript.projectId,
        distributionJobId,
        [platform],
      );
      setPlatformStatus((current) => ({ ...current, [platform]: "success" }));
      addToast({
        type: "success",
        title: `${platform === "wechat" ? "微信视频号" : "抖音"}分发完成`,
      });
      await refreshHistory();
    } catch (error) {
      setPlatformStatus((current) => ({ ...current, [platform]: "error" }));
      addToast({
        type: "error",
        title: "平台分发失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const handleDistributeAll = async () => {
    await Promise.all(
      selectedPlatforms.map(async (platform) => {
        if (platformStatus[platform] !== "success") {
          await handleDistributePlatform(platform);
        }
      }),
    );
  };

  const handleExportAsset = async (asset: DeliveryAsset) => {
    if (!currentScript?.projectId) {
      addToast({
        type: "warning",
        title: "当前项目不可导出",
      });
      return;
    }

    setAssetStatus((current) => ({ ...current, [asset]: "running" }));
    try {
      await createProjectExport(
        currentScript.projectId,
        asset,
        currentScript.id,
      );
      await fetchProjectExports(currentScript.projectId);
      setAssetStatus((current) => ({ ...current, [asset]: "success" }));
      addToast({
        type: "success",
        title: `${deliveryAssetOptions.find((item) => item.key === asset)?.label ?? asset}已生成`,
      });
    } catch (error) {
      setAssetStatus((current) => ({ ...current, [asset]: "error" }));
      addToast({
        type: "error",
        title: "交付物导出失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const resetFlow = () => {
    setStep("select");
    setConfig(defaultConfig);
    setGenerating(false);
    setGenerateProgress(0);
    setVideoUrl(null);
    setDistributionJobId(null);
    setPlatformStatus(defaultPlatformStatus);
    setAssetStatus(defaultAssetStatus);
    setShowConfig(true);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6 rounded-[32px] border border-[var(--line-soft)] bg-[linear-gradient(135deg,oklch(from var(--accent-soft) l c h / 0.13),rgba(255,255,255,0.95))] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)]">
              <span className="inline-flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-[var(--accent-soft)]" />
                一键分发
              </span>
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              短剧交付与平台分发控制台
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-subtle)]">
              把视频主片、平台投放和结构化交付物放在同一条流水线上处理。
              先生成，再并行分发，再导出给外部协作团队。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">
                平台
              </p>
              <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {selectedPlatforms.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">
                导出物
              </p>
              <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {selectedAssets.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">
                任务回执
              </p>
              <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {history.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <StepIndicator current={step} />

      {step === "select" && (
        <SelectStep
          config={config}
          setConfig={setConfig}
          currentScript={currentScript}
          currentProjectTitle={currentProject?.title}
          credits={credits}
          selectedPlatforms={selectedPlatforms}
          selectedAssets={selectedAssets}
          showConfig={showConfig}
          setShowConfig={setShowConfig}
          togglePlatform={togglePlatform}
          toggleAsset={toggleAsset}
          onStart={handleGenerateVideo}
        />
      )}

      {step === "generate" && (
        <GenerateStep
          generateProgress={generateProgress}
          generating={generating}
          selectedPlatforms={selectedPlatforms}
          selectedAssets={selectedAssets}
        />
      )}

      {step === "distribute" && (
        <DistributeStepView
          config={config}
          videoUrl={videoUrl}
          selectedPlatforms={selectedPlatforms}
          selectedAssets={selectedAssets}
          platformStatus={platformStatus}
          assetStatus={assetStatus}
          history={currentScript?.projectId ? history : []}
          onDistributePlatform={handleDistributePlatform}
          onDistributeAll={handleDistributeAll}
          onExportAsset={handleExportAsset}
          onComplete={() => setStep("complete")}
        />
      )}

      {step === "complete" && (
        <CompleteStep
          selectedPlatforms={selectedPlatforms}
          selectedAssets={selectedAssets}
          onReset={resetFlow}
          onOpenTasks={() => navigate("/tasks")}
          onOpenAssets={() => navigate("/assets")}
        />
      )}

      {!currentScript && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            当前还没有可分发的剧本。请先前往导入文本或工作台完成剧本生成。
          </div>
        </div>
      )}
    </div>
  );
}
