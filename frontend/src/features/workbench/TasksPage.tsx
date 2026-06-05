import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  HardDriveUpload,
  Link2,
} from "lucide-react";

import { queueMetrics, taskColumns } from "./workbench-data";

const priorityStyles = {
  P0: "bg-rose-300/14 text-rose-100",
  P1: "bg-[--accent-soft]/14 text-[--accent-soft]",
  P2: "bg-white/10 text-[--text-subtle]",
} as const;

export default function TasksPage() {
  return (
    <PageFrame
      eyebrow="Task Center"
      title="任务调度中心"
      description="面向 B 端团队的批处理大盘，追踪排队、推理、校验与人工接力状态。"
      badge="批处理模式"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {queueMetrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            accent={index === 1}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        {taskColumns.map((column) => (
          <section key={column.key} className="surface-card flex min-h-[20rem] flex-col">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{column.label}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[--text-faint]">
                  {column.count} items
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[--text-subtle]">
                {column.key === "running" ? "live" : "board"}
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3">
              {column.items.map((task) => (
                <article
                  key={task.id}
                  className="rounded-[24px] border border-white/8 bg-black/10 p-4 transition hover:border-white/14 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium leading-6 text-white">
                      {task.title}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyles[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-[--text-subtle]">
                    <span className="inline-flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      {task.owner}
                    </span>
                    <span>{task.eta}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="surface-card mt-5">
        <SectionHeader
          icon={<HardDriveUpload className="h-4 w-4" />}
          title="故障反馈与重排队"
          detail="集中查看容错日志、回调状态和异常任务重试入口。"
          action="打开处理日志"
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <StatusCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
            title="Queue health stable"
            detail="最近 6 次运行都在阈值范围内，平均延迟保持在 4.2 分钟左右。"
          />
          <StatusCard
            icon={<AlertTriangle className="h-4 w-4 text-amber-300" />}
            title="1 个任务等待重试"
            detail="《无声回廊》YAML 导出在 Schema 校验阶段失败，可一键重排队列。"
          />
        </div>

        <div className="mt-4 rounded-[24px] border border-white/8 bg-black/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[--accent-soft]">
                <Link2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">
                  Webhook 回调链路
                </p>
                <p className="mt-1 text-sm text-[--text-subtle]">
                  生产回调成功率 99.1%，最近一次失败已进入自动重试。
                </p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[--text-subtle] transition hover:bg-white/[0.08] hover:text-white"
            >
              查看回调详情
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  badge,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full overflow-auto bg-background px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto max-w-[1520px]">
        <header className="surface-card mb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[--text-faint]">
                {eyebrow}
              </p>
              <h1 className="mt-2 font-serif text-3xl text-white">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-[--text-subtle]">
                {description}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[--accent-soft]/25 bg-[--accent-soft]/10 px-4 py-2 text-sm text-[--accent-soft]">
              <Bot className="h-4 w-4" />
              {badge}
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`surface-card ${accent ? "bg-[linear-gradient(135deg,rgba(154,245,214,0.16),rgba(13,18,29,0.96))]" : ""}`}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-[--text-faint]">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <span className="font-serif text-4xl text-white">{value}</span>
        <span className="text-xs text-[--text-subtle]">{detail}</span>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] text-[--accent-soft]">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-[--text-subtle]">{detail}</p>
        </div>
      </div>
      {action ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[--text-subtle] transition hover:bg-white/[0.08] hover:text-white"
        >
          {action}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-[--text-subtle]">{detail}</p>
        </div>
      </div>
    </div>
  );
}
