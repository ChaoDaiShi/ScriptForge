import { Activity, Key, Webhook, BarChart3 } from "lucide-react";

const statCards = [
  { label: "API 请求总量", value: "—", detail: "连接后端后将在此显示" },
  { label: "Webhook 成功率", value: "—", detail: "连接后端后将在此显示" },
  { label: "活跃 API Keys", value: "—", detail: "连接后端后将在此显示" },
];

export default function DashboardPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <p className="page-header-eyebrow">API & Data</p>
        <h1 className="page-header-title">API 与数据底座</h1>
        <p className="page-header-description">
          集中查看接口调用、Webhook 交付与密钥状态，满足 B 端接入与运维需求。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
              {s.label}
            </p>
            <p className="mt-2 font-serif text-3xl text-foreground">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-(--text-subtle)">{s.detail}</p>
          </div>
        ))}
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent-soft)">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">API 密钥</p>
            <p className="text-xs text-(--text-subtle) mt-0.5">
              在设置页面创建和管理 API 密钥
            </p>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent-soft)">
            <Webhook className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Webhook 回调</p>
            <p className="text-xs text-(--text-subtle) mt-0.5">
              配置转换完成后的回调通知地址
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
