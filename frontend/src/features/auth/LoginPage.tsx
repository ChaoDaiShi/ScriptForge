import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ArrowRight,
  X,
} from "lucide-react";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, skipAuth, loading, error, clearError } =
    useAuthStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await login(email, password);
    } else {
      if (!agreed) return;
      await register(email, password);
    }
    navigate("/workbench");
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    clearError();
  };

  const handleSkip = () => {
    skipAuth();
    navigate("/workbench");
  };

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      {/* Left Panel — Brand / Hero */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-linear-to-br from-[#7bb8e8]/10 via-white to-[#7bb8e8]/5 p-12 lg:flex">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#7bb8e8]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#7bb8e8]/5 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7bb8e8] text-sm font-bold text-white shadow-lg shadow-[#7bb8e8]/20">
              S
            </div>
            <span className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              ScriptForge
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[rgba(123,184,232,0.2)] bg-[rgba(123,184,232,0.08)] px-3 py-1 text-xs text-[#7bb8e8]">
            <Sparkles className="h-3 w-3" />
            AI 驱动的剧本创作工具
          </div>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-[hsl(var(--foreground))]">
            从文字到影像，
            <br />
            一键生成短剧。
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-subtle)]">
            导入小说 → AI 结构化 → 生成短剧脚本 → 多平台分发。ScriptForge
            让创意直达观众。
          </p>

          <div className="mt-10 space-y-4">
            {[
              { title: "智能剧本转换", desc: "AI 自动识别章节、人物与场景" },
              { title: "可视化编剧台", desc: "分集大纲、场景卡片、对话编辑" },
              { title: "一键视频分发", desc: "对接火山方舟、微信视频号、抖音" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(123,184,232,0.12)]">
                  <Check className="h-3.5 w-3.5 text-[#7bb8e8]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-[var(--text-faint)]">
          &copy; 2026 ScriptForge. All rights reserved.
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7bb8e8] text-sm font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold">ScriptForge</span>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-subtle)]">
              {mode === "login"
                ? "登录以继续使用 ScriptForge"
                : "注册以开始创作之旅"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]"
              >
                邮箱
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-xl border border-[var(--line-medium)] bg-white py-2.5 pl-10 pr-4 text-sm text-[hsl(var(--foreground))] placeholder:text-[var(--text-subtle)] outline-none transition-all focus:border-[#7bb8e8] focus:ring-2 focus:ring-[rgba(123,184,232,0.15)]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]"
              >
                密码
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "register" ? "至少 6 位密码" : "输入密码"
                  }
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[var(--line-medium)] bg-white py-2.5 pl-10 pr-10 text-sm text-[hsl(var(--foreground))] placeholder:text-[var(--text-subtle)] outline-none transition-all focus:border-[#7bb8e8] focus:ring-2 focus:ring-[rgba(123,184,232,0.15)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-subtle)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Agreement checkbox for register */}
            {mode === "register" && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--line-medium)] text-[#7bb8e8] focus:ring-[rgba(123,184,232,0.3)]"
                />
                <span className="text-xs text-[var(--text-subtle)] leading-5">
                  我已阅读并同意{" "}
                  <span className="text-[#7bb8e8] hover:underline cursor-pointer">
                    服务条款
                  </span>{" "}
                  和{" "}
                  <span className="text-[#7bb8e8] hover:underline cursor-pointer">
                    隐私政策
                  </span>
                </span>
              </label>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-500">
                <X className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (mode === "register" && !agreed)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7bb8e8] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[rgba(123,184,232,0.25)] transition-all hover:bg-[#6aadd8] hover:shadow-xl hover:shadow-[rgba(123,184,232,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {loading
                ? mode === "login"
                  ? "登录中..."
                  : "注册中..."
                : mode === "login"
                  ? "登录"
                  : "创建账号"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--line-soft)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[hsl(var(--background))] px-3 text-xs text-[var(--text-faint)]">
                或
              </span>
            </div>
          </div>

          {/* Skip */}
          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-medium)] px-6 py-2.5 text-sm text-[var(--text-subtle)] transition-colors hover:bg-[var(--muted)] hover:text-[hsl(var(--foreground))]"
          >
            先逛逛，稍后再说
          </button>

          {/* Toggle mode */}
          <p className="mt-6 text-center text-xs text-[var(--text-subtle)]">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-[#7bb8e8] hover:underline"
            >
              {mode === "login" ? "注册" : "登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
