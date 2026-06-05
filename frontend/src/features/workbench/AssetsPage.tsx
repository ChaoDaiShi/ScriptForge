import type { ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  BookOpenText,
  Download,
  FileStack,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

import { WorkbenchOverviewCard } from "./Workbench";
import { assets } from "./workbench-data";

const assetTypeStyles = {
  人物设定: "bg-[--accent-soft]/14 text-[--accent-soft]",
  场景模板: "bg-sky-300/14 text-sky-100",
  对白语料: "bg-amber-300/14 text-amber-100",
  世界观资料: "bg-white/10 text-[--text-subtle]",
} as const;

export default function AssetsPage() {
  return (
    <PageFrame
      eyebrow="Assets"
      title="剧本库与导出资产"
      description="统一管理结构化剧本、导出版式文件和原始导入素材，让工作台与工程资产保持同源。"
      badge="多格式归档"
    >
      <WorkbenchOverviewCard />

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[--text-subtle]">
              <Search className="h-4 w-4" />
              搜索角色、场景、设定片段
            </div>
            <button className="rounded-full bg-[--accent-soft] px-4 py-2 text-sm font-medium text-[#091018] shadow-[0_10px_25px_rgba(154,245,214,0.2)] transition hover:bg-[--accent-strong]">
              新建资产
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {assets.map((asset) => (
              <article
                key={asset.id}
                className="grid gap-4 rounded-[24px] border border-white/8 bg-black/10 p-4 transition hover:border-white/14 hover:bg-white/[0.04] md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-medium text-white">{asset.title}</h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${assetTypeStyles[asset.type]}`}
                    >
                      {asset.type}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[--text-subtle]">
                    <span className="inline-flex items-center gap-1.5">
                      <Archive className="h-3.5 w-3.5" />
                      Updated {asset.updatedAt}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FileStack className="h-3.5 w-3.5" />
                      Used {asset.usageCount} times
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:bg-white/[0.08]">
                    打开详情
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="surface-card bg-[linear-gradient(135deg,rgba(154,245,214,0.14),rgba(13,18,29,0.96))]">
            <p className="text-xs uppercase tracking-[0.22em] text-[--text-faint]">
              featured pack
            </p>
            <h2 className="mt-3 font-serif text-3xl text-white">Noir Harbor Kit</h2>
            <p className="mt-3 text-sm leading-6 text-[--text-subtle]">
              一套用于港口悬疑题材的角色表、镜头模板和对白语料，可直接喂给工作台的生成链路。
            </p>
            <div className="mt-5 flex items-center gap-3 text-sm text-[--text-subtle]">
              <Star className="h-4 w-4 text-[--accent-soft]" />
              复用率 73%
            </div>
          </section>

          <section className="surface-card">
            <SectionHeader
              icon={<BookOpenText className="h-4 w-4" />}
              title="导出分发面板"
              detail="并行导出 YAML、PDF 与团队水印稿"
              action="配置批量下载"
            />

            <div className="mt-5 space-y-4">
              <ChecklistRow title="YAML 模型" detail="保留 schema 注释，绑定版本号，支持 API 回传。" />
              <ChecklistRow title="PDF 排版稿" detail="剧本格式分页，加入版权水印，角色对白高对比。" />
              <ChecklistRow title="协作分发" detail="抄送制片团队，同步 webhook，归档到云端。" />
            </div>
          </section>

          <section className="surface-card">
            <SectionHeader
              icon={<Download className="h-4 w-4" />}
              title="覆盖率"
              detail="当前资产对主线项目的支持情况"
            />
            <div className="mt-4 space-y-4">
              {[
                ["角色设定", "16 / 18", "89%"],
                ["场景模板", "12 / 15", "80%"],
                ["对白语料", "8 / 10", "80%"],
              ].map(([label, value, progress]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm text-white">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[--accent-soft]"
                      style={{ width: progress }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
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
              <Sparkles className="h-4 w-4" />
              {badge}
            </div>
          </div>
        </header>

        {children}
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

function ChecklistRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-[--text-subtle]">{detail}</p>
    </div>
  );
}
