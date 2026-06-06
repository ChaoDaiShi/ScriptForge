import { Activity, Key, Webhook, BarChart3, Copy, Shield } from "lucide-react";
import { useState } from "react";
import { useToastStore } from "@/store/useToastStore";

const statCards = [
  {
    label: "API 请求总量",
    value: "—",
    detail: "连接后端后将在此显示",
    icon: Activity,
  },
  {
    label: "Webhook 成功率",
    value: "—",
    detail: "连接后端后将在此显示",
    icon: Webhook,
  },
  {
    label: "活跃 API Keys",
    value: "—",
    detail: "连接后端后将在此显示",
    icon: Key,
  },
];

export default function DashboardPage() {
  const [showKey, setShowKey] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const demoKey = "sf_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addToast({ type: "success", title: "已复制到剪贴板" });
    });
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <p className="page-header-eyebrow">API & Data</p>
        <h1 className="page-header-title">API 与数据底座</h1>
        <p className="page-header-description">
          集中查看接口调用、Webhook 交付与密钥状态，满足 B 端接入与运维需求。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card animate-fade-in-up">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                  {s.label}
                </p>
                <Icon className="h-4 w-4 text-(--text-faint)" />
              </div>
              <p className="mt-2 font-serif text-3xl text-foreground">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-(--text-subtle)">{s.detail}</p>
            </div>
          );
        })}
      </div>

      {/* API Key Section */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent-soft)">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">API 密钥</p>
              <p className="text-xs text-(--text-subtle) mt-0.5">
                用于认证 API 请求，请妥善保管
              </p>
            </div>
          </div>
          <span className="badge badge-muted">Demo</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-(--line-soft) bg-(--muted) px-4 py-3">
          <code className="flex-1 text-xs text-(--text-subtle) font-mono">
            {showKey ? demoKey : "sf_demo_•".repeat(8)}
          </code>
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="rounded-md p-1.5 text-(--text-faint) hover:text-foreground hover:bg-white transition-colors"
            title={showKey ? "隐藏密钥" : "显示密钥"}
          >
            <Shield className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(demoKey)}
            className="rounded-md p-1.5 text-(--text-faint) hover:text-foreground hover:bg-white transition-colors"
            title="复制密钥"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Webhook Section */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent-soft)">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Webhook 回调
              </p>
              <p className="text-xs text-(--text-subtle) mt-0.5">
                配置转换完成后的回调通知地址
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="url"
            placeholder="https://your-server.com/webhook"
            className="flex-1 rounded-xl border border-(--line-medium) bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft) transition-shadow"
            disabled
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-4 py-2.5 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed opacity-40 cursor-not-allowed"
            disabled
          >
            保存
          </button>
        </div>
        <p className="mt-2 text-xs text-(--text-faint)">
          Webhook 功能即将上线，敬请期待
        </p>
      </div>

      {/* API Info Banner */}
      <div className="rounded-xl border border-(--line-soft) bg-(--muted) p-4">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-(--text-faint)" />
          <div>
            <p className="text-sm font-medium text-foreground">后端服务状态</p>
            <p className="mt-1 text-xs text-(--text-subtle) leading-5">
              启动后端服务后，API 统计数据将自动更新。可查看接口文档
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs font-mono text-(--accent-soft)">
                /docs
              </code>
              了解更多。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
