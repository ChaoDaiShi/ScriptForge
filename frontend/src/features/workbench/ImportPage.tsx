import { useState, type ReactNode } from "react";
import { Sparkles, Upload, FileText, Check, ArrowRight } from "lucide-react";

type ImportStep = "upload" | "preview" | "configure";

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = () => {
    setStep("preview");
  };

  return (
    <div className="page-container max-w-3xl">
      <header className="page-header">
        <p className="page-header-eyebrow">
          <span className="inline-flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5 text-(--accent-soft)" />
            文本导入
          </span>
        </p>
        <h1 className="page-header-title">导入小说源文本</h1>
        <p className="page-header-description">
          支持 TXT 文件上传或直接粘贴小说内容。系统将自动识别章节结构，最少需要 3 个章节才能进行转换。
        </p>
      </header>

      {step === "upload" && (
        <div className="space-y-6">
          <div
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors ${
              dragOver
                ? "border-(--accent-soft) bg-(--accent-light)"
                : "border-(--line-medium) hover:border-(--accent-soft)/50 hover:bg-(--accent-light)"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile();
            }}
            onClick={() => handleFile()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--accent-light) text-(--accent-soft)">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              点击上传或拖拽文件到此区域
            </p>
            <p className="mt-1 text-xs text-(--text-subtle)">
              支持 TXT、EPUB 格式，最大 500KB
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-(--line-soft)" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-(--text-subtle)">或者</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              粘贴小说内容
            </label>
            <textarea
              className="w-full min-h-[200px] rounded-xl border border-(--line-medium) bg-white p-4 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft) resize-y"
              placeholder="将你的小说段落粘贴在此处，至少包含 3 个章节..."
            />
            <div className="mt-2 flex justify-between items-center">
              <span className="text-xs text-(--text-subtle)">检测到 0 个章节</span>
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
              >
                识别章节
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                  章节预览
                </p>
                <p className="mt-1 text-sm text-foreground">
                  已识别 12 个章节，请确认章节划分是否正确
                </p>
              </div>
              <span className="badge badge-primary">12 章节</span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-(--line-soft) px-4 py-3 text-sm"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-(--muted) text-xs text-(--text-subtle)">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-foreground">
                    第 {i + 1} 章
                  </span>
                  <span className="text-xs text-(--text-subtle)">
                    {Math.floor(800 + Math.random() * 1200)} 字
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-4">
              改编配置
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-2">
                  改编形式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["竖屏短剧", "悬疑长剧"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className="rounded-xl border border-(--line-soft) px-4 py-3 text-sm text-foreground hover:border-(--accent-soft) hover:bg-(--accent-light) transition-colors text-left"
                    >
                      <p className="font-medium">{type}</p>
                      <p className="mt-1 text-xs text-(--text-subtle)">
                        {type === "竖屏短剧" ? "快节奏、强冲突、每集 1-3 分钟" : "多线叙事、人物关系复杂、每集 10-15 分钟"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="rounded-lg border border-(--line-medium) px-4 py-2 text-sm text-foreground hover:bg-(--muted) transition-colors"
            >
              返回修改
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-5 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              开始 AI 转换
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
