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
  Clock,
} from "lucide-react";
import { useScriptStore } from "@/store/useScriptStore";

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

  const scripts = useScriptStore((s) => s.scripts);
  const currentScriptId = useScriptStore((s) => s.currentScriptId);
  const currentScript = scripts.find((s) => s.id === currentScriptId);

  const handleGenerateVideo = async () => {
    setGenerating(true);
    setStep("generate");
    setGenerateProgress(0);

    // Simulate Volcengine video generation progress
    const interval = setInterval(() => {
      setGenerateProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 2000);

    // Simulate API call completion after ~15 seconds
    setTimeout(() => {
      clearInterval(interval);
      setGenerateProgress(100);
      setGenerating(false);
      setVideoUrl("https://example.com/generated-drama-video.mp4");
      setStep("distribute");
    }, 15000);
  };

  const handleDistributeToWechat = async () => {
    setPlatformStatus((prev) => ({ ...prev, wechat: "uploading" }));
    // Simulate WeChat distribution
    await new Promise((r) => setTimeout(r, 3000));
    setPlatformStatus((prev) => ({ ...prev, wechat: "success" }));
  };

  const handleDistributeToDouyin = async () => {
    setPlatformStatus((prev) => ({ ...prev, douyin: "uploading" }));
    // Simulate Douyin distribution
    await new Promise((r) => setTimeout(r, 3000));
    setPlatformStatus((prev) => ({ ...prev, douyin: "success" }));
  };

  const handleDistributeAll = async () => {
    await Promise.all([handleDistributeToWechat(), handleDistributeToDouyin()]);
    setStep("complete");
  };

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
  ];

  if (step === "select") {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="page-header">
          <p className="page-header-eyebrow">
            <span className="inline-flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-(--accent-soft)" />
              一键分发
            </span>
          </p>
          <h1 className="page-header-title">一键制作短剧</h1>
          <p className="page-header-description">
            基于火山方舟 Seedance 视频生成模型，将结构化剧本转化为竖屏短剧视频，
            一键分发至抖音和微信视频号。
          </p>
        </div>

        {/* Current Script */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                选择剧本
              </p>
              <p className="mt-1 text-sm text-foreground">
                {currentScript
                  ? `当前剧本：${currentScript.title}`
                  : "请先选择一个已完成的剧本"}
              </p>
            </div>
            {currentScript && (
              <span className="badge badge-success">
                <Check className="h-3 w-3" />
                {currentScript.episodes.length} 集
              </span>
            )}
          </div>

          {!currentScript && (
            <div className="rounded-xl border border-(--line-soft) bg-(--muted) p-4">
              <p className="text-sm text-(--text-subtle) leading-6">
                请先在"导入文本"中完成剧本导入和 AI
                转换，再回到此处进行视频生成与分发。
              </p>
            </div>
          )}
        </div>

        {/* Config Section */}
        <div className="card mb-6">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-(--text-faint)" />
              <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                视频生成配置
              </p>
            </div>
            <ArrowRight
              className={`h-4 w-4 text-(--text-faint) transition-transform ${showConfig ? "rotate-90" : ""}`}
            />
          </button>

          {showConfig && (
            <div className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  短剧名称
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) =>
                    setConfig({ ...config, title: e.target.value })
                  }
                  placeholder="输入短剧名称"
                  className="w-full rounded-xl border border-(--line-medium) bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft)"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  短剧描述
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) =>
                    setConfig({ ...config, description: e.target.value })
                  }
                  placeholder="输入短剧简介，将作为视频生成 prompt 的一部分"
                  rows={3}
                  className="w-full rounded-xl border border-(--line-medium) bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft) resize-y"
                />
              </div>

              {/* Resolution & Ratio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    分辨率
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {resolutionOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setConfig({ ...config, resolution: opt.value })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                          config.resolution === opt.value
                            ? "border-(--accent-soft) bg-(--accent-light) text-(--accent-soft)"
                            : "border-(--line-soft) text-(--text-subtle) hover:border-(--accent-soft)/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    画面比例
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ratioOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setConfig({ ...config, ratio: opt.value })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                          config.ratio === opt.value
                            ? "border-(--accent-soft) bg-(--accent-light) text-(--accent-soft)"
                            : "border-(--line-soft) text-(--text-subtle) hover:border-(--accent-soft)/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duration & Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <Clock className="mr-1 inline h-3.5 w-3.5" />
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
                    className="w-full rounded-xl border border-(--line-medium) bg-white px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft)"
                  />
                </div>
                <div className="space-y-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.watermark}
                      onChange={(e) =>
                        setConfig({ ...config, watermark: e.target.checked })
                      }
                      className="rounded border-(--line-medium) text-(--accent-soft) focus:ring-(--accent-soft)/30"
                    />
                    <span className="text-sm text-foreground">添加水印</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.generateAudio}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          generateAudio: e.target.checked,
                        })
                      }
                      className="rounded border-(--line-medium) text-(--accent-soft) focus:ring-(--accent-soft)/30"
                    />
                    <span className="text-sm text-foreground">
                      <Music className="mr-1 inline h-3.5 w-3.5" />
                      生成同步音频
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Start Button */}
        <button
          type="button"
          onClick={handleGenerateVideo}
          disabled={!currentScript || generating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-(--accent-soft) px-6 py-3 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-5 w-5" />
          开始制作短剧视频
        </button>

        {/* Platform Info */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-(--accent-light)">
              <Sparkles className="h-5 w-5 text-(--accent-soft)" />
            </div>
            <p className="text-xs font-medium text-foreground">火山方舟</p>
            <p className="mt-1 text-xs text-(--text-subtle)">
              Seedance 视频生成
            </p>
          </div>
          <div className="card p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <Smartphone className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs font-medium text-foreground">微信视频号</p>
            <p className="mt-1 text-xs text-(--text-subtle)">
              短剧媒资管理分发
            </p>
          </div>
          <div className="card p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
              <Share2 className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-xs font-medium text-foreground">抖音</p>
            <p className="mt-1 text-xs text-(--text-subtle)">
              抖音云媒资托管分发
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "generate") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="card w-full max-w-lg text-center py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-(--accent-light)">
            {generating ? (
              <Loader2 className="h-8 w-8 animate-spin text-(--accent-soft)" />
            ) : (
              <Check className="h-8 w-8 text-green-500" />
            )}
          </div>

          <h2 className="font-serif text-2xl text-foreground mb-2">
            {generateProgress < 100
              ? "火山方舟 Seedance 正在生成..."
              : "视频生成完成！"}
          </h2>
          <p className="text-sm text-(--text-subtle) mb-8 max-w-md mx-auto leading-6">
            {generateProgress < 100
              ? "正在将剧本逐场景转化为视频画面，基于 Seedance 2.0 模型进行多模态生成。"
              : "短剧视频已成功生成，可进行多平台分发。"}
          </p>

          {/* Progress */}
          <div className="mx-auto max-w-xs">
            <div className="flex items-center justify-between text-xs text-(--text-subtle) mb-2">
              <span>生成进度</span>
              <span>{Math.round(generateProgress)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-(--muted)">
              <div
                className="h-full rounded-full bg-linear-to-r from-(--accent-soft) to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(generateProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Generation Steps */}
          <div className="mt-8 space-y-3 max-w-sm mx-auto text-left">
            {[
              { label: "解析剧本结构", done: generateProgress > 10 },
              { label: "生成场景分镜", done: generateProgress > 30 },
              { label: "多模态视频合成", done: generateProgress > 60 },
              { label: "音频同步处理", done: generateProgress > 85 },
              { label: "视频封装输出", done: generateProgress >= 100 },
            ].map((step_, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    step_.done
                      ? "bg-green-100 text-green-600"
                      : "bg-(--muted) text-(--text-faint)"
                  }`}
                >
                  {step_.done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`${
                    step_.done ? "text-foreground" : "text-(--text-subtle)"
                  }`}
                >
                  {step_.label}
                </span>
                {step_.done && generateProgress < 100 && (
                  <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-(--accent-soft)" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "distribute") {
    const allDone =
      platformStatus.wechat === "success" &&
      platformStatus.douyin === "success";

    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="page-header">
          <p className="page-header-eyebrow">
            <span className="inline-flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-(--accent-soft)" />
              多平台分发
            </span>
          </p>
          <h1 className="page-header-title">分发短剧</h1>
          <p className="page-header-description">
            将已生成的短剧视频分发至微信视频号和抖音平台。
          </p>
        </div>

        {/* Video Preview */}
        {videoUrl && (
          <div className="card mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-(--muted)">
                <FileVideo className="h-8 w-8 text-(--accent-soft)" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {config.title || "短剧视频"}
                </p>
                <p className="text-xs text-(--text-subtle)">
                  {config.resolution} · {config.ratio} · {config.duration}秒
                  {config.generateAudio ? " · 含音频" : ""}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--line-medium) px-3 py-2 text-xs text-(--text-subtle) hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                预览视频
              </button>
            </div>
          </div>
        )}

        {/* Platform Distribution Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* WeChat */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <Smartphone className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  微信视频号
                </p>
                <p className="text-xs text-(--text-subtle)">短剧媒资管理 API</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-(--text-subtle) mb-4">
              <p className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                媒资上传
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                剧目提审
              </p>
              <p className="flex items-center gap-2">
                {platformStatus.wechat === "success" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-(--text-faint)" />
                )}
                剧目授权
              </p>
            </div>

            <button
              type="button"
              onClick={handleDistributeToWechat}
              disabled={platformStatus.wechat !== "idle"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor:
                  platformStatus.wechat === "success"
                    ? "rgba(16, 185, 129, 0.1)"
                    : platformStatus.wechat === "uploading"
                      ? "var(--muted)"
                      : "var(--accent-light)",
                color:
                  platformStatus.wechat === "success"
                    ? "#10b981"
                    : platformStatus.wechat === "uploading"
                      ? "var(--text-subtle)"
                      : "var(--accent-soft)",
              }}
            >
              {platformStatus.wechat === "idle" && (
                <>
                  <Send className="h-4 w-4" />
                  分发到微信
                </>
              )}
              {platformStatus.wechat === "uploading" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在分发...
                </>
              )}
              {platformStatus.wechat === "success" && (
                <>
                  <Check className="h-4 w-4" />
                  微信分发完成
                </>
              )}
            </button>
          </div>

          {/* Douyin */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <Share2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">抖音</p>
                <p className="text-xs text-(--text-subtle)">抖音云媒资管理</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-(--text-subtle) mb-4">
              <p className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                视频上传
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                自动转码
              </p>
              <p className="flex items-center gap-2">
                {platformStatus.douyin === "success" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-(--text-faint)" />
                )}
                内容库送审
              </p>
            </div>

            <button
              type="button"
              onClick={handleDistributeToDouyin}
              disabled={platformStatus.douyin !== "idle"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor:
                  platformStatus.douyin === "success"
                    ? "rgba(16, 185, 129, 0.1)"
                    : platformStatus.douyin === "uploading"
                      ? "var(--muted)"
                      : "var(--accent-light)",
                color:
                  platformStatus.douyin === "success"
                    ? "#10b981"
                    : platformStatus.douyin === "uploading"
                      ? "var(--text-subtle)"
                      : "var(--accent-soft)",
              }}
            >
              {platformStatus.douyin === "idle" && (
                <>
                  <Send className="h-4 w-4" />
                  分发到抖音
                </>
              )}
              {platformStatus.douyin === "uploading" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在分发...
                </>
              )}
              {platformStatus.douyin === "success" && (
                <>
                  <Check className="h-4 w-4" />
                  抖音分发完成
                </>
              )}
            </button>
          </div>
        </div>

        {/* Distribute All Button */}
        {!allDone && (
          <button
            type="button"
            onClick={handleDistributeAll}
            disabled={
              platformStatus.wechat === "uploading" ||
              platformStatus.douyin === "uploading"
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-(--accent-soft) px-6 py-3 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Globe className="h-5 w-5" />
            一键全平台分发
          </button>
        )}

        {allDone && (
          <button
            type="button"
            onClick={() => setStep("complete")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-medium text-white hover:bg-green-600 transition-colors"
          >
            <Check className="h-5 w-5" />
            完成
          </button>
        )}
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="card w-full max-w-lg text-center py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <Check className="h-8 w-8 text-green-500" />
          </div>

          <h2 className="font-serif text-2xl text-foreground mb-2">
            制作与分发完成！
          </h2>
          <p className="text-sm text-(--text-subtle) mb-8 max-w-md mx-auto leading-6">
            短剧视频已成功生成并分发至微信视频号和抖音平台。
            请前往各平台查看审核状态。
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
            <div className="rounded-xl border border-(--line-soft) p-4">
              <Smartphone className="mx-auto mb-2 h-6 w-6 text-green-500" />
              <p className="text-xs font-medium text-foreground">微信</p>
              <p className="text-xs text-(--text-subtle)">分发成功</p>
            </div>
            <div className="rounded-xl border border-(--line-soft) p-4">
              <Share2 className="mx-auto mb-2 h-6 w-6 text-purple-500" />
              <p className="text-xs font-medium text-foreground">抖音</p>
              <p className="text-xs text-(--text-subtle)">分发成功</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep("select")}
            className="inline-flex items-center gap-2 rounded-xl bg-(--accent-soft) px-6 py-3 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
          >
            制作下一部短剧
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
