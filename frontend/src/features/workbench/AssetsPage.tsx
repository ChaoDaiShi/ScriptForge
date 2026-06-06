import { Library, FileText, Download, Search, Plus } from "lucide-react";

export default function AssetsPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <p className="page-header-eyebrow">Assets</p>
        <h1 className="page-header-title">剧本库与导出资产</h1>
        <p className="page-header-description">
          统一管理结构化剧本、导出版式文件和原始导入素材。
        </p>
      </header>

      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-faint)" />
          <input
            type="text"
            placeholder="搜索剧本..."
            className="w-full rounded-xl border border-(--line-medium) bg-white py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft)"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新建项目
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent-soft)">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">项目 {i}</p>
                  <p className="text-xs text-(--text-faint) mt-0.5">等待导入</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-(--text-subtle) leading-5">
              导入小说源文本并开始 AI 转换后，剧本将自动生成在此。
            </p>
            <div className="mt-4 flex items-center justify-between text-xs text-(--text-faint)">
              <span>0 章节</span>
              <span>—</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
              导出与分发
            </p>
            <p className="mt-1 text-sm text-foreground">多格式导出</p>
          </div>
          <span className="badge badge-muted">即将上线</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "YAML 模型", desc: "结构化剧本数据，含 Schema 注释" },
            { label: "PDF 排版稿", desc: "剧本格式分页，含版权水印" },
            { label: "协作分发", desc: "同步 webhook，归档到云端" },
          ].map((fmt) => (
            <div
              key={fmt.label}
              className="flex items-center gap-3 rounded-xl border border-(--line-soft) px-4 py-3"
            >
              <Download className="h-4 w-4 text-(--text-faint)" />
              <div>
                <p className="text-sm text-foreground">{fmt.label}</p>
                <p className="text-xs text-(--text-subtle) mt-0.5">{fmt.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
