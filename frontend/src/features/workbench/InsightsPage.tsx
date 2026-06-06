import { BarChart3, TrendingUp, Users, BookOpen } from "lucide-react";

const metrics = [
  { label: "冲突密度", value: "—", detail: "等待数据分析" },
  { label: "人物张力", value: "—", detail: "等待数据分析" },
  { label: "改编潜力", value: "—", detail: "等待数据分析" },
];

export default function InsightsPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <p className="page-header-eyebrow">Insights</p>
        <h1 className="page-header-title">IP 改编评估</h1>
        <p className="page-header-description">
          面向版权和制片团队的宏观决策视图，聚焦冲突密度、人物关系与商业潜力。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="card">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
              {m.label}
            </p>
            <p className="mt-2 font-serif text-3xl text-foreground">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-(--text-subtle)">{m.detail}</p>
          </div>
        ))}
      </div>

      <div className="empty-state">
        <BarChart3 className="empty-state-icon" />
        <h2 className="empty-state-title">暂无评估数据</h2>
        <p className="empty-state-description">
          导入并完成 AI 转换后，系统将自动生成 IP
          改编潜力评估报告，包括冲突密度分析、人物关系图谱和商业价值预测。
        </p>
      </div>
    </div>
  );
}
