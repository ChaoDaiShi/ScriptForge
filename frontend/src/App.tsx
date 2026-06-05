import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import AssetsPage from "@/features/workbench/AssetsPage";
import TasksPage from "@/features/workbench/TasksPage";
import Workbench from "@/features/workbench/Workbench";
import {
  Cable,
  LineChart,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/workbench" replace />} />
        <Route path="workbench" element={<Workbench />} />
        <Route path="workbenc" element={<Navigate to="/workbench" replace />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route
          path="insights"
          element={
            <InfoPage
              eyebrow="Insights"
              title="IP 改编评估"
              description="面向版权和制片团队的宏观决策视图，聚焦冲突密度、人物关系与商业潜力。"
              badge="阶段二 P1"
              icon={<LineChart className="h-4 w-4" />}
              sections={[
                ["冲突密度", "7.8 / 10", "Cold Open 与 Act 2 冲突峰值最强。"],
                ["人物张力", "82%", "主反角色对抗清晰，配角动机可再拉开。"],
                ["改编潜力", "A-", "具备强画面感与悬疑钩子，适合竖屏短剧。"],
              ]}
            />
          }
        />
        <Route
          path="dashboard"
          element={
            <InfoPage
              eyebrow="API & Data"
              title="API 与数据底座"
              description="集中查看接口调用、Webhook 交付与密钥状态，满足 B 端接入与运维需求。"
              badge="服务可观测"
              icon={<Cable className="h-4 w-4" />}
              sections={[
                ["API 请求总量", "128,430", "近 30 天 +18.4%。"],
                ["Webhook 成功率", "99.1%", "最近一次失败已进入自动重试。"],
                ["活跃 API Keys", "12", "2 个 key 即将到期。"],
              ]}
            />
          }
        />
        <Route
          path="settings"
          element={
            <div className="min-h-full overflow-auto bg-background px-4 py-5 md:px-6 md:py-6">
              <div className="mx-auto max-w-[1520px]">
                <div className="surface-card">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[--text-faint]">
                        Settings & Billing
                      </p>
                      <h1 className="mt-2 font-serif text-3xl text-white">
                        设置与账单
                      </h1>
                      <p className="mt-2 max-w-3xl text-sm text-[--text-subtle]">
                        覆盖团队成员、套餐额度、工作流偏好与安全策略，承接文档中的商业化引导层。
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-[--accent-soft]/25 bg-[--accent-soft]/10 px-4 py-2 text-sm text-[--accent-soft]">
                      <Receipt className="h-4 w-4" />
                      商业化引导
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[--accent-soft]">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">个人包月创作版</p>
                          <p className="mt-1 text-sm text-[--text-subtle]">
                            适合单作者沉浸式创作，含流式工作台与基础导出。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[--accent-soft]">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">API 专业版 / 企业版</p>
                          <p className="mt-1 text-sm text-[--text-subtle]">
                            开放批处理、团队协作、Webhook 与更高并发额度。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-black/10 p-4 lg:col-span-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[--accent-soft]">
                          <Users2 className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">工作区偏好</p>
                          <p className="mt-1 text-sm text-[--text-subtle]">
                            创作者模式默认展示可视化卡片，隐藏 YAML；团队模式优先看板与数据底座。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        />
        <Route
          path="*"
          element={<div className="p-8 text-foreground">404 Not Found</div>}
        />
      </Route>
    </Routes>
  );
}

export default App;

function InfoPage({
  eyebrow,
  title,
  description,
  badge,
  icon,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  sections: [string, string, string][];
}) {
  return (
    <div className="min-h-full overflow-auto bg-background px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto max-w-[1520px]">
        <div className="surface-card">
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
              {icon}
              {badge}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {sections.map(([label, value, detail]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/8 bg-black/10 p-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[--text-faint]">
                  {label}
                </p>
                <p className="mt-3 font-serif text-4xl text-white">{value}</p>
                <p className="mt-2 text-sm text-[--text-subtle]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
