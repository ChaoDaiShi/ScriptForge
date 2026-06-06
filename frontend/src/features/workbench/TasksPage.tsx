import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useTaskStore, type TaskItem } from "@/store/useTaskStore";

const statusConfig = {
  queued: { icon: Clock, label: "排队中", color: "text-(--text-faint)" },
  running: { icon: Loader2, label: "运行中", color: "text-(--accent-soft)" },
  review: { icon: AlertCircle, label: "待审核", color: "text-amber-500" },
  done: { icon: CheckCircle2, label: "已完成", color: "text-emerald-500" },
  failed: { icon: AlertCircle, label: "失败", color: "text-red-400" },
};

const columns: { key: TaskItem["status"]; label: string; count: number }[] = [
  { key: "queued", label: "排队中", count: 0 },
  { key: "running", label: "运行中", count: 0 },
  { key: "review", label: "待审核", count: 0 },
  { key: "done", label: "已完成", count: 0 },
];

function TaskCard({ task }: { task: TaskItem }) {
  const removeTask = useTaskStore((s) => s.removeTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl border border-(--line-soft) bg-white px-4 py-3 text-sm shadow-sm transition-all hover:shadow-md hover:border-(--line-medium) animate-scale-in">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{task.title}</p>
          <p className="mt-1 text-xs text-(--text-subtle) capitalize">
            {task.type === "convert"
              ? "AI 转换"
              : task.type === "export"
                ? "导出"
                : "润色"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(task.status === "review" || task.status === "failed") && (
            <button
              type="button"
              onClick={() => updateTask(task.id, { status: "queued" })}
              className="rounded-md p-1 text-(--text-faint) hover:text-(--accent-soft) hover:bg-(--accent-light) transition-colors"
              title="重新排队"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => removeTask(task.id)}
            className="rounded-md p-1 text-(--text-faint) hover:text-red-400 hover:bg-red-50 transition-colors"
            title="删除任务"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {task.status === "running" && task.progress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-(--text-subtle) mb-1">
            <span>进度</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-(--muted)">
            <div
              className="h-full rounded-full bg-(--accent-soft) transition-all duration-500"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {task.status === "failed" && (
        <p className="mt-2 text-xs text-red-400">处理失败，可点击重试</p>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-(--text-faint)">
        <StatusIcon
          className={`h-3 w-3 ${status.color} ${task.status === "running" ? "animate-spin" : ""}`}
        />
        <span className={status.color}>{status.label}</span>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const tasks = useTaskStore((s) => s.tasks);

  const statCards = [
    {
      label: "排队中",
      value: tasks.filter((t) => t.status === "queued").length,
      desc: "等待处理",
    },
    {
      label: "运行中",
      value: tasks.filter((t) => t.status === "running").length,
      desc: "正在转换",
    },
    {
      label: "待审核",
      value: tasks.filter((t) => t.status === "review").length,
      desc: "等待人工确认",
    },
    {
      label: "已完成",
      value: tasks.filter((t) => t.status === "done").length,
      desc: "本次会话",
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <p className="page-header-eyebrow">Task Center</p>
        <h1 className="page-header-title">任务调度中心</h1>
        <p className="page-header-description">
          追踪排队、推理、校验与人工接力状态。
          {tasks.length > 0 && `当前共 ${tasks.length} 个任务`}
        </p>
      </header>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {statCards.map((m) => (
          <div key={m.label} className="card animate-fade-in-up">
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

      {/* Kanban Board */}
      <div className="grid gap-4 md:grid-cols-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="card min-h-[200px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-foreground">
                  {col.label}
                </p>
                <span className="text-xs text-(--text-faint)">
                  {colTasks.length} 项
                </span>
              </div>

              <div className="flex-1 space-y-3">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => <TaskCard key={task.id} task={task} />)
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--muted) mb-2">
                      <CheckSquare className="h-4 w-4 text-(--text-faint)" />
                    </div>
                    <p className="text-xs text-(--text-faint)">暂无任务</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
