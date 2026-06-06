import { BarChart3, TrendingUp, Users, Zap, Lightbulb } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

const metrics = [
  { label: "冲突密度", value: "—", detail: "等待数据分析", icon: Zap },
  { label: "人物张力", value: "—", detail: "等待数据分析", icon: Users },
  { label: "改编潜力", value: "—", detail: "等待数据分析", icon: TrendingUp },
];

const dimensions = [
  {
    title: "冲突密度分析",
    desc: "评估章节内冲突事件出现的频率与强度，包含外部冲突（情节对抗）与内部冲突（人物内心挣扎）。",
    items: ["外部冲突频率", "内部冲突深度", "冲突升级曲线"],
  },
  {
    title: "人物关系图谱",
    desc: "基于共现分析与对话网络，自动生成人物关系拓扑图，识别核心角色与支线人物。",
    items: ["关系网络密度", "核心角色识别", "人物弧光评估"],
  },
  {
    title: "商业潜力预测",
    desc: "综合题材热度、节奏密度、情感共鸣等多维度指标，预测 IP 改编的票房/播放量潜力。",
    items: ["题材热度匹配", "视觉化潜力", "受众共鸣指数"],
  },
];

export default function InsightsPage() {
  const projects = useProjectStore((s) => s.projects);
  const hasData = projects.some((p) => p.status === "ready");

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <p className="page-header-eyebrow">Insights</p>
        <h1 className="page-header-title">IP 改编评估</h1>
        <p className="page-header-description">
          面向版权和制片团队的宏观决策视图，聚焦冲突密度、人物关系与商业潜力。
          {projects.length > 0 && ` · ${projects.length} 个项目`}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card animate-fade-in-up">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                  {m.label}
                </p>
                <Icon className="h-4 w-4 text-(--text-faint)" />
              </div>
              <p className="mt-2 font-serif text-3xl text-foreground">
                {m.value}
              </p>
              <p className="mt-1 text-xs text-(--text-subtle)">{m.detail}</p>
            </div>
          );
        })}
      </div>

      {!hasData && (
        <div className="empty-state animate-fade-in">
          <BarChart3 className="empty-state-icon" />
          <h2 className="empty-state-title">暂无评估数据</h2>
          <p className="empty-state-description">
            导入并完成 AI 转换后，系统将自动生成 IP
            改编潜力评估报告，包括冲突密度分析、人物关系图谱和商业价值预测。
          </p>
        </div>
      )}

      {/* Assessment Dimensions */}
      <div className="grid gap-4 md:grid-cols-3">
        {dimensions.map((dim) => (
          <div key={dim.title} className="card opacity-60">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-2">
              评估维度
            </p>
            <p className="text-sm font-medium text-foreground">{dim.title}</p>
            <p className="mt-2 text-xs text-(--text-subtle) leading-5">
              {dim.desc}
            </p>
            <ul className="mt-3 space-y-1">
              {dim.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-xs text-(--text-faint)"
                >
                  <span className="h-1 w-1 rounded-full bg-(--line-medium)" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="mt-6 rounded-xl border border-(--line-soft) bg-(--accent-light) p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-soft)" />
          <div>
            <p className="text-sm font-medium text-foreground">
              即将上线：AI 评估报告
            </p>
            <p className="mt-1 text-xs text-(--text-subtle) leading-5">
              完成小说到剧本的转换后，系统将自动生成包含冲突密度分布图、人物关系网状图和商业潜力雷达图的完整
              IP 评估报告，支持 PDF 下载。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
