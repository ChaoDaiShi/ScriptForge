import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Zap,
  Check,
  Copy,
  ArrowLeft,
  Loader2,
  Sparkles,
  Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToastStore } from "@/store/useToastStore";

const PRICING_PLANS = [
  {
    credits: 10,
    price: "¥9.9",
    popular: false,
  },
  {
    credits: 50,
    price: "¥39.9",
    popular: true,
    badge: "最受欢迎",
  },
  {
    credits: 200,
    price: "¥129.9",
    popular: false,
    badge: "超值",
  },
  {
    credits: 500,
    price: "¥299.9",
    popular: false,
    badge: "专业版",
  },
];

function RedeemSection() {
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const redeemCode = useAuthStore((s) => s.redeemCode);
  const addToast = useToastStore((s) => s.addToast);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const message = await redeemCode(code.trim());
      addToast({ type: "success", title: message || "兑换成功！" });
      setCode("");
    } catch (err) {
      addToast({
        type: "error",
        title: "兑换失败",
        message: err instanceof Error ? err.message : "无效的兑换码",
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.08)]">
          <Gift className="h-4 w-4 text-purple-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            兑换码
          </p>
          <p className="text-xs text-[var(--text-subtle)]">
            输入兑换码获取免费次数
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="输入兑换码"
          className="flex-1 rounded-xl border border-[var(--line-medium)] bg-white px-4 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[var(--text-subtle)] outline-none transition-all focus:border-[var(--accent-soft)] focus:ring-2 focus:ring-[oklch(from var(--accent-soft) l c h / 0.12)]"
        />
        <button
          type="button"
          onClick={handleRedeem}
          disabled={!code.trim() || redeeming}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {redeeming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          兑换
        </button>
      </div>
    </div>
  );
}

export default function RechargePage() {
  const navigate = useNavigate();
  const { credits, creditsUsed } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyContact = (planIndex: number) => {
    navigator.clipboard.writeText("contact@scriptforge.ai").then(() => {
      setCopiedIndex(planIndex);
      addToast({ type: "success", title: "邮箱已复制" });
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-subtle)] hover:text-[hsl(var(--foreground))] transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-faint)] mb-1.5">
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            充值中心
          </span>
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
          获取更多生成次数
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--text-subtle)]">
          每次视频生成消耗 1 次次数。选择适合你的方案，畅享 AI 短剧制作。
        </p>
      </div>

      {/* Current Balance */}
      <div className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-[var(--line-soft)] bg-white px-5 py-4 shadow-[var(--shadow-card)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(251,191,36,0.1)]">
          <Zap className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-subtle)]">当前剩余次数</p>
          <p className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
            {credits}{" "}
            <span className="text-sm font-normal text-[var(--text-subtle)]">
              次（已用 {creditsUsed} 次）
            </span>
          </p>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRICING_PLANS.map((plan, i) => (
          <div
            key={i}
            className={`relative flex flex-col rounded-2xl border bg-white p-5 transition-all duration-300 hover:shadow-[var(--shadow-surface)] hover:-translate-y-0.5 ${
              plan.popular
                ? "border-[var(--accent-soft)] shadow-[var(--shadow-surface)]"
                : "border-[var(--line-soft)] hover:border-[var(--line-medium)]"
            }`}
          >
            {plan.badge && (
              <span
                className={`absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium ${
                  plan.popular
                    ? "bg-[var(--accent-soft)] text-white"
                    : "bg-[var(--muted)] text-[var(--text-subtle)]"
                }`}
              >
                {plan.badge}
              </span>
            )}

            <div className="mb-4 mt-1">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                {plan.credits} 次
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                {plan.price}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                每次低至 ¥
                {(
                  parseFloat(plan.price.replace("¥", "")) / plan.credits
                ).toFixed(1)}
              </p>
            </div>

            <div className="mt-auto space-y-2 mb-5">
              {[
                `${plan.credits} 次视频生成`,
                "7×24 小时支持",
                "无限制导出",
              ].map((f, j) => (
                <div
                  key={j}
                  className="flex items-center gap-2 text-xs text-[var(--text-subtle)]"
                >
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleCopyContact(i)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-soft)]"
            >
              {copiedIndex === i ? (
                <>
                  <Check className="h-4 w-4" />
                  已复制联系方式
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  联系购买
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Redeem Section */}
      <RedeemSection />

      {/* Info */}
      <div className="mt-6 rounded-2xl border border-[var(--line-soft)] bg-white p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-soft)]" />
          <div className="text-xs text-[var(--text-subtle)] leading-6">
            <p>
              充值后次数即时到账，永久有效。企业用户可联系
              <span
                className="cursor-pointer text-[var(--accent-soft)] hover:underline"
                onClick={() => {
                  navigator.clipboard.writeText("contact@scriptforge.ai");
                  addToast({ type: "success", title: "邮箱已复制" });
                }}
              >
                {" "}
                contact@scriptforge.ai{" "}
              </span>
              获取 API 批量方案和定制服务。
            </p>
            <p className="mt-2">
              每次视频生成消耗 1 次次数，生成失败不扣次数。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
