import { Sparkles, Shield, Users, Receipt } from "lucide-react";

const plans = [
  {
    name: "个人版",
    price: "免费",
    features: ["单项目创作", "YAML 导出", "基础 AI 转换", "每月 100 次转换"],
    recommended: false,
  },
  {
    name: "专业版",
    price: "¥99/月",
    features: ["无限项目", "AI 高级打磨", "批量导出", "优先支持"],
    recommended: true,
  },
  {
    name: "企业版",
    price: "¥499/月",
    features: ["API 接入", "团队协作", "Webhook 回调", "专属 SLA"],
    recommended: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="page-container max-w-4xl">
      <header className="page-header">
        <p className="page-header-eyebrow">Settings & Billing</p>
        <h1 className="page-header-title">设置与账单</h1>
        <p className="page-header-description">
          管理你的账户、套餐额度与工作流偏好。
        </p>
      </header>

      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent-soft)">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">账户信息</p>
              <p className="text-xs text-(--text-subtle)">登录后可查看账户详情</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-4">
            选择套餐
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card relative ${
                  plan.recommended
                    ? "ring-1 ring-(--accent-soft)"
                    : ""
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-(--accent-soft) px-3 py-0.5 text-xs text-white">
                    推荐
                  </span>
                )}
                <p className="text-sm font-medium text-foreground">{plan.name}</p>
                <p className="mt-2 font-serif text-2xl text-foreground">{plan.price}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-(--text-subtle)">
                      <span className="text-(--accent-soft)">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-5 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                    plan.recommended
                      ? "bg-(--accent-soft) text-white hover:bg-(--accent-soft)/90"
                      : "border border-(--line-medium) text-foreground hover:bg-(--muted)"
                  }`}
                >
                  {plan.recommended ? "升级到专业版" : plan.name === "企业版" ? "联系销售" : "当前方案"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
