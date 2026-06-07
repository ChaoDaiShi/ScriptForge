import {
  Library,
  FileText,
  Download,
  Search,
  Plus,
  MoreHorizontal,
  Check,
  Loader2,
  FileDown,
  FileJson,
  File,
  Share2,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useToastStore } from "@/store/useToastStore";
import { useState } from "react";
import { createProjectExport, fetchProjectExports } from "@/lib/api";

type ExportFormat = "yaml" | "pdf" | "json" | "share";
type ExportStatus = "idle" | "preparing" | "exporting" | "done" | "error";

interface ExportItem {
  format: ExportFormat;
  label: string;
  desc: string;
  icon: typeof FileText;
  color: string;
}

const exportFormats: ExportItem[] = [
  {
    format: "yaml",
    label: "YAML 模型",
    desc: "结构化剧本数据，含完整 Schema 注释",
    icon: FileJson,
    color: "text-blue-500",
  },
  {
    format: "pdf",
    label: "PDF 排版稿",
    desc: "剧本格式分页排版，含版权水印与页眉",
    icon: File,
    color: "text-red-500",
  },
  {
    format: "json",
    label: "JSON 数据",
    desc: "标准化数据结构，可直接接入 API 下游",
    icon: FileDown,
    color: "text-emerald-500",
  },
  {
    format: "share",
    label: "协作分享",
    desc: "生成分享链接，团队成员可在线查阅",
    icon: Share2,
    color: "text-purple-500",
  },
];

export default function AssetsPage() {
  const projects = useProjectStore((s) => s.projects);
  const addToast = useToastStore((s) => s.addToast);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null,
  );
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [recentExports, setRecentExports] = useState<
    { format: ExportFormat; projectTitle: string; time: string }[]
  >([]);

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const readyProjects = projects.filter((p) => p.status === "ready");

  const statusBadge = (status: string) => {
    switch (status) {
      case "converting":
        return <span className="badge badge-primary">转换中</span>;
      case "ready":
        return <span className="badge badge-success">已完成</span>;
      case "importing":
        return <span className="badge badge-warning">导入中</span>;
      default:
        return <span className="badge badge-muted">待处理</span>;
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!selectedProject) {
      addToast({
        type: "warning",
        title: "请先选择一个剧本项目",
        message: "从上方列表点击选择要导出的项目",
      });
      return;
    }
    if (exportStatus === "exporting") return;

    setExportingFormat(format);
    setExportStatus("preparing");
    setExportProgress(0);

    addToast({
      type: "info",
      title: `正在准备导出 ${exportFormats.find((f) => f.format === format)?.label}...`,
    });

    setTimeout(async () => {
      setExportStatus("exporting");
      setExportProgress(10);

      const interval = setInterval(() => {
        let shouldPersist = false;
        setExportProgress((prev) => {
          const next = prev + Math.random() * 15 + 5;
          if (next >= 100) {
            clearInterval(interval);
            shouldPersist = true;
            setExportStatus("done");
            setExportProgress(100);

            const fmtLabel =
              exportFormats.find((f) => f.format === format)?.label ?? "";
            setRecentExports((prev) => [
              {
                format,
                projectTitle: selectedProject.title,
                time: new Date().toLocaleTimeString("zh-CN"),
              },
              ...prev.slice(0, 4),
            ]);

            addToast({
              type: "success",
              title: `${fmtLabel} 导出完成`,
              message: `「${selectedProject.title}」已成功导出`,
            });

            // Reset after a delay
            setTimeout(() => {
              setExportStatus("idle");
              setExportingFormat(null);
              setExportProgress(0);
            }, 3000);
            return 100;
          }
          return Math.min(next, 100);
        });
        if (shouldPersist) {
          void (async () => {
            try {
              await createProjectExport(
                selectedProject.id,
                format,
                selectedProject.scriptId,
              );
              await fetchProjectExports(selectedProject.id);
            } catch (error) {
              addToast({
                type: "error",
                title: "导出记录保存失败",
                message: error instanceof Error ? error.message : "未知错误",
              });
            }
          })();
        }
      }, 200);
    }, 800);
  };

  const formatIcon = (format: ExportFormat) => {
    const found = exportFormats.find((f) => f.format === format);
    const Icon = found?.icon ?? FileText;
    return <Icon className={`h-4 w-4 ${found?.color}`} />;
  };

  return (
    <div className="page-container animate-fade-in max-w-5xl">
      <header className="page-header">
        <p className="page-header-eyebrow">Assets</p>
        <h1 className="page-header-title">剧本库与导出资产</h1>
        <p className="page-header-description">
          统一管理结构化剧本，支持多格式导出与协作分发。
          {readyProjects.length > 0 && ` ${readyProjects.length} 个项目可导出`}
        </p>
      </header>

      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-faint)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索剧本..."
            className="w-full rounded-xl border border-(--line-medium) bg-white py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft) transition-shadow"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新建项目
        </button>
      </div>

      {/* Project Cards */}
      {filteredProjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {filteredProjects.map((project, i) => {
            const isSelected = project.id === selectedProjectId;
            return (
              <div
                key={project.id}
                onClick={() => {
                  if (project.status === "ready") {
                    setSelectedProjectId(isSelected ? null : project.id);
                  }
                }}
                className={`card card-hover animate-fade-in-up cursor-pointer transition-all ${
                  isSelected
                    ? "ring-2 ring-(--accent-soft) bg-(--accent-light)"
                    : ""
                } ${project.status !== "ready" ? "opacity-70" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isSelected
                          ? "bg-(--accent-soft) text-white"
                          : "bg-(--accent-light) text-(--accent-soft)"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {project.title}
                      </p>
                      {statusBadge(project.status)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="rounded-md p-1 text-(--text-faint) hover:text-foreground hover:bg-(--muted) transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-xs text-(--text-subtle) leading-5">
                  作者：{project.sourceAuthor} · {project.sourceNovel}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-(--text-faint)">
                  <span>{project.chapterCount} 章节</span>
                  <span>
                    {new Date(project.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state animate-fade-in mb-8">
          <Library className="empty-state-icon" />
          <h2 className="empty-state-title">暂无剧本项目</h2>
          <p className="empty-state-description">
            导入小说源文本并开始 AI 转换后，剧本将自动生成在此。
          </p>
        </div>
      )}

      {/* ===== Export Section ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
              导出与分发
            </p>
            <p className="mt-1 text-sm text-foreground">
              {selectedProject
                ? `已选择：${selectedProject.title}`
                : "选择一个已完成项目开始导出"}
            </p>
          </div>
          {selectedProject && (
            <span className="badge badge-success">
              <Check className="h-3 w-3" />
              已选择
            </span>
          )}
        </div>

        {/* Format Grid */}
        <div className="grid gap-4 md:grid-cols-4 mb-5">
          {exportFormats.map((fmt) => {
            const Icon = fmt.icon;
            const isExporting =
              exportingFormat === fmt.format &&
              (exportStatus === "exporting" || exportStatus === "preparing");
            const isDone =
              exportingFormat === fmt.format && exportStatus === "done";

            return (
              <button
                key={fmt.format}
                type="button"
                onClick={() => handleExport(fmt.format)}
                disabled={exportStatus === "exporting"}
                className={`group relative flex flex-col items-center gap-2.5 rounded-xl border-2 px-4 py-5 text-center transition-all ${
                  isDone
                    ? "border-green-300 bg-green-50"
                    : isExporting
                      ? "border-(--accent-soft) bg-(--accent-light)"
                      : "border-(--line-soft) hover:border-(--accent-soft) hover:bg-(--accent-light) hover:shadow-sm"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isExporting ? (
                  <Loader2 className={`h-7 w-7 animate-spin ${fmt.color}`} />
                ) : isDone ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <Icon
                    className={`h-7 w-7 ${fmt.color} group-hover:scale-110 transition-transform`}
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {fmt.label}
                  </p>
                  <p className="mt-1 text-xs text-(--text-subtle) leading-4">
                    {fmt.desc}
                  </p>
                </div>

                {isExporting && exportProgress > 0 && (
                  <div className="absolute bottom-2 left-3 right-3">
                    <div className="h-1 overflow-hidden rounded-full bg-(--muted)">
                      <div
                        className="h-full rounded-full bg-(--accent-soft) transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-(--text-subtle)">
                      {Math.round(exportProgress)}%
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Export Status Bar */}
        {exportStatus !== "idle" && (
          <div className="mb-4 rounded-xl border border-(--line-soft) bg-(--muted) px-4 py-3 animate-fade-in">
            <div className="flex items-center gap-3">
              {exportStatus === "preparing" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-(--accent-soft)" />
                  <p className="text-sm text-foreground">正在准备导出文件...</p>
                </>
              )}
              {exportStatus === "exporting" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-(--accent-soft)" />
                  <p className="text-sm text-foreground">
                    正在导出{" "}
                    {
                      exportFormats.find((f) => f.format === exportingFormat)
                        ?.label
                    }
                    ...
                    <span className="text-(--text-subtle) ml-1">
                      {Math.round(exportProgress)}%
                    </span>
                  </p>
                </>
              )}
              {exportStatus === "done" && (
                <>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <p className="text-sm text-green-600">
                    导出完成！文件准备就绪
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Recent Exports */}
        {recentExports.length > 0 && (
          <div className="border-t border-(--line-soft) pt-4">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-3">
              最近导出
            </p>
            <div className="space-y-2">
              {recentExports.map((exp, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-(--line-soft) px-4 py-2.5 text-sm"
                >
                  {formatIcon(exp.format)}
                  <span className="flex-1 text-foreground">
                    {exp.projectTitle}
                  </span>
                  <span className="text-xs text-(--text-faint)">
                    {exp.time}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--accent-soft) hover:bg-(--accent-light) transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    下载
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
