import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const statusConfig = {
  queued: { icon: Clock, label: "排队中", color: "text-(--text-faint)" },
  running: { icon: ArrowRight, label: "运行中", color: "text-(--accent-soft)" },
  review: { icon: AlertCircle, label: "待审核", color: "text-amber-500" },
  done: { icon: CheckCircle2, label: "已完成", color: "text-emerald-500" },
  failed: { icon: AlertCircle, label: "失败", color: "text-red-400" },
};

const columns = [
  { key: "queued", label: "排队中", count: 0 },
  { key: "running", label: "运行中", count: 0 },
  { key: "review", label: "待审核", count: 0 },
  { key: "done", label: "已完成", count: 0 },
];

export default function TasksPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <p className="page-header-eyebrow">Task Center</p>
        <h1 className="page-header-title">任务调度中心</h1>
        <p className="page-header-description">
          追踪排队、推理、校验与人工接力状态。当前无活跃任务。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[
          { label: "排队中", value: "0", desc: "等待处理" },
          { label: "运行中", value: "0", desc: "正在转换" },
          { label: "待审核", value: "0", desc: "等待人工确认" },
          { label: "已完成", value: "0", desc: "本次会话" },
        ].map((m) => (
          <div key={m.label} className="card">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
              {m.label}
            </p>
            <p className="mt-2 font-serif text-2xl text-foreground">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-(--text-subtle)">{m.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {columns.map((col) => (
          <div key={col.key} className="card min-h-50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-foreground">{col.label}</p>
              <span className="text-xs text-(--text-faint)">
                {col.count} 项
              </span>
            </div>

            <div className="flex flex-1 items-center justify-center py-8">
              <p className="text-xs text-(--text-faint)">暂无任务</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
