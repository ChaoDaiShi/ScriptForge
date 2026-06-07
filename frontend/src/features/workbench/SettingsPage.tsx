import { useMemo, useState } from "react";
import { Users, Receipt, Key, Bell, Palette, Globe } from "lucide-react";
import { fetchMe, loginWithEmail, registerWithEmail, type AuthPayload } from "@/lib/api";
import { useToastStore } from "@/store/useToastStore";

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

const settingSections = [
  {
    title: "偏好设置",
    items: [
      {
        icon: Palette,
        label: "主题外观",
        desc: "亮色模式（暗色模式即将上线）",
      },
      { icon: Globe, label: "语言与区域", desc: "简体中文 · 中国" },
      { icon: Bell, label: "通知偏好", desc: "邮件通知 · 任务完成提醒" },
    ],
  },
];

export default function SettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authPayload, setAuthPayload] = useState<AuthPayload | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("scriptforge-auth");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthPayload;
    } catch {
      return null;
    }
  });

  const accountDescription = useMemo(() => {
    if (!authPayload) {
      return "登录后可查看和编辑账户详情";
    }
    return `当前登录：${authPayload.user.email}`;
  }, [authPayload]);

  const persistAuth = (payload: AuthPayload) => {
    setAuthPayload(payload);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("scriptforge-auth", JSON.stringify(payload));
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      addToast({ type: "warning", title: "请输入邮箱和密码" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = isRegisterMode
        ? await registerWithEmail({ email, password })
        : await loginWithEmail({ email, password });
      persistAuth(payload);
      await fetchMe();
      addToast({
        type: "success",
        title: isRegisterMode ? "注册成功" : "登录成功",
        message: payload.user.email,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: isRegisterMode ? "注册失败" : "登录失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-4xl animate-fade-in">
      <header className="page-header">
        <p className="page-header-eyebrow">Settings & Billing</p>
        <h1 className="page-header-title">设置与账单</h1>
        <p className="page-header-description">
          管理你的账户、套餐额度与工作流偏好。
        </p>
      </header>

      <div className="space-y-6">
        {/* Account Info */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent-soft)">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">账户信息</p>
              <p className="text-xs text-(--text-subtle) mt-0.5">
                {accountDescription}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              className="rounded-lg border border-(--line-medium) bg-white px-4 py-2 text-sm text-foreground"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="rounded-lg border border-(--line-medium) bg-white px-4 py-2 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-(--accent-soft) px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {isSubmitting ? "提交中..." : isRegisterMode ? "注册" : "登录"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsRegisterMode((prev) => !prev)}
            className="mt-3 text-xs text-(--accent-soft)"
          >
            {isRegisterMode ? "已有账号，切换到登录" : "没有账号，切换到注册"}
          </button>
        </div>

        {/* Settings Sections */}
        {settingSections.map((section) => (
          <div key={section.title}>
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-3">
              {section.title}
            </p>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="card flex items-center gap-3 card-hover cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--muted) text-(--text-subtle)">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{item.label}</p>
                      <p className="text-xs text-(--text-subtle) mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* API Keys */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-3">
            开发者
          </p>
          <div className="card flex items-center gap-3 card-hover cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--muted) text-(--text-subtle)">
              <Key className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">API 密钥管理</p>
              <p className="text-xs text-(--text-subtle) mt-0.5">
                创建和管理 API 访问密钥
              </p>
            </div>
            <span className="badge badge-primary">即将上线</span>
          </div>
        </div>

        {/* Plan Selection */}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-4">
            选择套餐
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card relative animate-fade-in-up ${
                  plan.recommended ? "ring-1 ring-(--accent-soft)" : ""
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-(--accent-soft) px-3 py-0.5 text-xs text-white">
                    推荐
                  </span>
                )}
                <p className="text-sm font-medium text-foreground">
                  {plan.name}
                </p>
                <p className="mt-2 font-serif text-2xl text-foreground">
                  {plan.price}
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-xs text-(--text-subtle)"
                    >
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
                  {plan.recommended
                    ? "升级到专业版"
                    : plan.name === "企业版"
                      ? "联系销售"
                      : "当前方案"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <div>
          <div className="card flex items-center gap-3 card-hover cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--muted) text-(--text-subtle)">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">账单历史</p>
              <p className="text-xs text-(--text-subtle) mt-0.5">
                查看过去的付款记录和发票
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
