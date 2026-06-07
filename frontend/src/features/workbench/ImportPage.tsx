import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  createScript,
  fetchScript,
  fetchTask,
  fetchTasks,
  type ScriptSourcePayload,
  startScriptProcessing,
} from "@/lib/api";
import { useProjectStore } from "@/store/useProjectStore";
import { useScriptStore } from "@/store/useScriptStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useToastStore } from "@/store/useToastStore";
import mammoth from "mammoth";

type ImportStep = "upload" | "preview" | "configure" | "converting";

interface ChapterPreview {
  index: number;
  title: string;
  wordCount: number;
  startPos?: number;
  endPos?: number;
}

interface StructuredChapter {
  index: number;
  title: string;
  content: string;
  wordCount: number;
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ImportStep>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [structuredChapters, setStructuredChapters] = useState<StructuredChapter[]>([]);
  const [adaptType, setAdaptType] = useState<"short" | "long" | null>(null);
  const [convertProgress, setConvertProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addProject = useProjectStore((s) => s.addProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const projects = useProjectStore((s) => s.projects);
  const upsertScript = useScriptStore((s) => s.upsertScript);
  const setCurrentScript = useScriptStore((s) => s.setCurrentScript);
  const setTasks = useTaskStore((s) => s.setTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const addToast = useToastStore((s) => s.addToast);

  const mapBackendScriptToWorkbench = (
    script: Awaited<ReturnType<typeof createScript>>,
    projectId: string,
  ) => ({
    id: script.id,
    projectId,
    title: script.title,
    sourceText: script.original_text,
    backend: script,
    episodes: [
      {
        id: `${script.id}_episode_1`,
        title: script.title,
        coldOpen: script.main_plot ?? undefined,
        scenes: script.scenes.map((scene) => ({
          id: scene.id,
          code: `SC-${scene.heading.scene_number}`,
          title: `${scene.heading.location} · ${scene.heading.time_of_day}`,
          location: scene.heading.location,
          intent:
            typeof scene.descriptions[0]?.content === "string"
              ? String(scene.descriptions[0].content)
              : (scene.dialogues[0]?.content ?? "待补充场景意图"),
          beats: scene.dialogues.map((dialogue) => ({
            id: dialogue.id,
            description: dialogue.content,
            dialogue: dialogue.content,
            character: dialogue.speaker_name ?? undefined,
          })),
          status: "draft" as const,
        })),
      },
    ],
  });

  useEffect(() => {
    if (step !== "converting") {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const taskPayload = await fetchTasks();
        setTasks(taskPayload.tasks);
      } catch {
        // Ignore polling errors here and surface them only on submit path.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [setTasks, step]);

  const detectChapters = (text: string): ChapterPreview[] => {
    const lines = text.split("\n");
    
    // 更全面的章节检测正则表达式，支持多种语言和格式
    const chapterPatterns = [
      // 中文格式 - 支持更多变体
      /^第[一二三四五六七八九十百千零\d]+[章节部回卷集]/,
      /^第\s*[一二三四五六七八九十百千零\d]+\s*[章节部回卷集]/,
      /^[一二三四五六七八九十百千零\d]+[章节部回卷集]/,  // 不带"第"字的格式
      /^第[一二三四五六七八九十百千零\d]+[\s\-_][章节部回卷集]?/,  // 带分隔符的格式
      /^卷[一二三四五六七八九十百千零\d]+/,  // "卷一"格式
      /^[卷部篇][一二三四五六七八九十百千零\d]+/,  // "卷一"、"部一"格式
      // 带标题的格式
      /^第[一二三四五六七八九十百千零\d]+[章节部回卷集]\s+.*/,
      /^[一二三四五六七八九十百千零\d]+[章节部回卷集]\s+.*/,
      // 日文格式
      /^[一二三四五六七八九十百千零\d]+[章節部回巻集]/,
      /^\[[一二三四五六七八九十百千零\d]+[章節部回巻集]\]/,
      // 英文格式
      /^Chapter\s+\d+/i,
      /^Part\s+\d+/i,
      /^Volume\s+\d+/i,
      /^VOLUME\s+\d+/i,
      /^Book\s+\d+/i,
      /^Episode\s+\d+/i,
      /^Ep\.\s*\d+/i,
      /^Act\s+\d+/i,
      /^Section\s+\d+/i,
      // 简写格式
      /^[Cc]h\.\s*\d+/,
      /^[Vv]ol\.\s*\d+/,
      // 括号包裹的章节
      /^\([一二三四五六七八九十百千零\d]+\)/,
      /^\([\d]+\)/,
      /^\[[一二三四五六七八九十百千零\d]+\]/,
      /^\[[\d]+\]/,
      // 数字开头的格式
      /^\d+\s*[章节部回卷集]/,
      /^\d+[\.\-\s][章节部回卷集]?/,
    ];
    
    const detected: ChapterPreview[] = [];
    let currentChapter: ChapterPreview | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // 检查是否匹配任何章节模式
      const isChapter = chapterPatterns.some((pattern) => pattern.test(trimmed));
      
      if (isChapter) {
        // 保存前一个章节的字数
        if (currentChapter) {
          currentChapter.wordCount = currentChapter.wordCount;
        }
        
        // 开始新章节
        currentChapter = {
          index: detected.length + 1,
          title: trimmed.slice(0, 60),
          wordCount: 0,
        };
        detected.push(currentChapter);
      } else if (currentChapter) {
        // 累加当前章节的字数
        currentChapter.wordCount += trimmed.length;
      }
    });

    // 如果检测到的章节不足3个且文本较长，尝试其他方式
    if (detected.length < 3 && text.trim().length > 1000) {
      // 基于换行段落来智能分段
      const paragraphs = text
        .split(/\n\n+/)
        .filter((p) => p.trim().length > 100); // 只保留超过100字的段落
      
      if (paragraphs.length >= 3) {
        // 将长段落分成3个虚拟章节
        const chapterSize = Math.ceil(paragraphs.length / 3);
        const newChapters: ChapterPreview[] = [];
        
        for (let i = 0; i < 3; i++) {
          const start = i * chapterSize;
          const end = Math.min(start + chapterSize, paragraphs.length);
          const chapterParagraphs = paragraphs.slice(start, end);
          
          if (chapterParagraphs.length > 0) {
            const chapterText = chapterParagraphs.join("\n\n");
            newChapters.push({
              index: i + 1,
              title: `第 ${i + 1} 部分（约 ${chapterParagraphs.length} 段）`,
              wordCount: chapterText.length,
            });
          }
        }
        
        // 如果成功创建了章节，替换检测到的章节
        if (newChapters.length >= 3) {
          return newChapters;
        }
      }
    }

    return detected;
  };

  const buildStructuredChapters = (
    text: string,
    detected: ChapterPreview[],
  ): StructuredChapter[] => {
    const normalizedText = text.replace(/\r\n/g, "\n");

    if (detected.length >= 1) {
      const lines = normalizedText.split("\n");
      const chapterStarts = detected
        .map((chapter) => {
          const titleLineIndex = lines.findIndex(
            (line) => line.trim() === chapter.title.trim(),
          );

          return {
            ...chapter,
            lineIndex: titleLineIndex,
          };
        })
        .filter((chapter) => chapter.lineIndex >= 0)
        .sort((a, b) => a.lineIndex - b.lineIndex);

      if (chapterStarts.length >= 1) {
        return chapterStarts
          .map((chapter, index) => {
            const start = chapter.lineIndex;
            const end =
              index < chapterStarts.length - 1
                ? chapterStarts[index + 1].lineIndex
                : lines.length;
            const block = lines.slice(start, end).join("\n").trim();
            const content = lines
              .slice(start + 1, end)
              .join("\n")
              .trim();

            return {
              index: index + 1,
              title: chapter.title,
              content: content || block,
              wordCount: (content || block).length,
            };
          })
          .filter((chapter) => chapter.content.length > 0);
      }
    }

    const paragraphs = normalizedText
      .split(/\n\s*\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    const bucketSize = Math.max(1, Math.ceil(paragraphs.length / 3));

    return Array.from({ length: 3 }, (_, index) => {
      const start = index * bucketSize;
      const end = Math.min(start + bucketSize, paragraphs.length);
      const content = paragraphs.slice(start, end).join("\n\n").trim();

      return {
        index: index + 1,
        title: `第 ${index + 1} 部分`,
        content,
        wordCount: content.length,
      };
    }).filter((chapter) => chapter.content.length > 0);
  };

  const buildSourcePayload = (
    text: string,
    chapterItems: StructuredChapter[],
  ): ScriptSourcePayload => ({
    mode: "chapter_json",
    total_word_count: text.trim().length,
    chapter_count: chapterItems.length,
    chapters: chapterItems.map((chapter) => ({
      index: chapter.index,
      title: chapter.title,
      content: chapter.content,
      word_count: chapter.wordCount,
    })),
  });

  const effectiveChapterCount = structuredChapters.length;

  // 调试函数：分析文本中可能的章节标题
  const analyzeChapterPatterns = (text: string): string[] => {
    const lines = text.split("\n");
    const potentialChapters: string[] = [];
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      // 查找包含数字开头的行
      if (/^[第卷ChapterVolVolume一二三四五六七八九十百千零\d]/.test(trimmed) && trimmed.length < 50) {
        potentialChapters.push(`行 ${idx + 1}: ${trimmed}`);
      }
    });
    
    return potentialChapters.slice(0, 20); // 只返回前20个
  };

  const ALLOWED_EXTENSIONS = [".txt", ".md", ".doc", ".docx"];

  const isValidFileType = (filename: string): boolean => {
    const ext = filename.toLowerCase().split(".").pop();
    return ext ? ALLOWED_EXTENSIONS.includes(`.${ext}`) : false;
  };

  const readFileContent = async (file: File): Promise<string> => {
    const ext = file.name.toLowerCase().split(".").pop();

    if (ext === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    // txt, md, doc 等纯文本格式 - 尝试多种编码
    const arrayBuffer = await file.arrayBuffer();
    const encodings = ["UTF-8", "GBK", "GB2312", "GB18030", "Big5"];
    
    for (const encoding of encodings) {
      try {
        const textDecoder = new TextDecoder(encoding, { fatal: true });
        const text = textDecoder.decode(arrayBuffer);
        // 检查是否有大量替换字符（表示解码失败）
        const replacementCharCount = (text.match(/\uFFFD/g) || []).length;
        if (replacementCharCount < text.length * 0.1) {
          return text;
        }
      } catch {
        // 编码不匹配，尝试下一个
        continue;
      }
    }

    // 如果所有编码都失败，使用默认方式读取
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => resolve(evt.target?.result as string);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFileType(file.name)) {
      addToast({
        type: "error",
        title: "文件格式非法",
        message: `仅支持 ${ALLOWED_EXTENSIONS.join(", ")} 格式的文件`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const text = await readFileContent(file);
      handleTextContent(text);
    } catch {
      addToast({
        type: "error",
        title: "文件读取失败",
        message: "无法读取文件内容，请确认文件未损坏",
      });
    }
  };

  const handleTextContent = (text: string) => {
    const detected = detectChapters(text);
    const structured = buildStructuredChapters(text, detected);
    const textLength = text.trim().length;
    const potentialChapters = analyzeChapterPatterns(text);

    // 如果没有检测到 3 个章节，但文本足够长（超过 1000 字），也允许通过
    if (structured.length < 3 && textLength < 1000) {
      alert(
        "至少需要 3 个章节或文本超过 1000 字才能进行转换，请补充更多内容。",
      );
      return;
    }

    // 如果检测到的章节数少于预期，显示警告信息
    if (detected.length < 3 && potentialChapters.length > 0) {
      const warning = `检测到 ${detected.length} 个章节，但文本中似乎有 ${potentialChapters.length} 个可能的章节标题。\n\n可能的章节标题：\n${potentialChapters.slice(0, 5).join('\n')}${potentialChapters.length > 5 ? '\n...' : ''}\n\n如果您的小说确实有更多章节，请检查章节标题格式是否符合系统支持的格式。`;
      console.warn(warning);
      // 这里不阻止上传，只是记录警告
    }

    setPasteContent(text); // 确保文本内容被保存
    setStructuredChapters(structured);
    setStep("preview");
  };

  const handleStartConvert = async () => {
    if (!adaptType || !pasteContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStep("converting");
    setConvertProgress(0);

    const projectId = `proj_${Date.now().toString(36)}`;
    const project = {
      id: projectId,
      title: `新项目 (${effectiveChapterCount}章)`,
      sourceNovel: "导入文本",
      sourceAuthor: "未知作者",
      chapterCount: effectiveChapterCount,
      status: "converting" as const,
      createdAt: new Date().toISOString(),
    };
    addProject(project);
    setCurrentProject(projectId);

    try {
      const script = await createScript({
        title: project.title,
        type: adaptType === "short" ? "short_film" : "feature_film",
        text: pasteContent.trim(),
        source_payload: buildSourcePayload(pasteContent, structuredChapters),
      });
      const processingTask = await startScriptProcessing(script.id);
      const liveTask = await fetchTask(processingTask.id);

      updateProject(projectId, {
        scriptId: script.id,
        taskId: liveTask.id,
      });

      addTask(liveTask);
      upsertScript(mapBackendScriptToWorkbench(script, projectId));
      setCurrentScript(script.id);
      setConvertProgress(Math.max(10, liveTask.progress));

      const completionPoll = window.setInterval(async () => {
        try {
          const latestTask = await fetchTask(liveTask.id);
          updateTask(latestTask.id, latestTask);
          setConvertProgress(latestTask.progress);

          if (latestTask.status === "done") {
            const scriptDetail = await fetchScript(script.id);
            upsertScript(mapBackendScriptToWorkbench(scriptDetail, projectId));
            updateProject(projectId, { status: "ready" });
            setCurrentScript(script.id);
            window.clearInterval(completionPoll);
            addToast({ type: "success", title: "剧本转换完成" });
          } else if (latestTask.status === "failed") {
            updateProject(projectId, { status: "idle" });
            window.clearInterval(completionPoll);
            addToast({
              type: "error",
              title: "转换失败",
              message: latestTask.error_message ?? "后端处理失败",
            });
          }
        } catch (error) {
          window.clearInterval(completionPoll);
          addToast({
            type: "error",
            title: "轮询任务失败",
            message: error instanceof Error ? error.message : "未知错误",
          });
        }
      }, 2500);

      setTimeout(() => {
        navigate("/tasks");
      }, 800);
    } catch (error) {
      setStep("configure");
      addToast({
        type: "error",
        title: "提交失败",
        message: error instanceof Error ? error.message : "无法连接后端服务",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-3xl animate-fade-in">
      <header className="page-header">
        <p className="page-header-eyebrow">
          <span className="inline-flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5 text-(--accent-soft)" />
            文本导入
          </span>
        </p>
        <h1 className="page-header-title">导入小说源文本</h1>
        <p className="page-header-description">
          支持 TXT、MD、DOC、DOCX
          文件上传或直接粘贴小说内容。系统将自动识别章节结构，最少需要 3
          个章节或文本超过 1000 字才能进行转换。
        </p>
      </header>

      {step === "upload" && (
        <div className="space-y-6 animate-fade-in-up">
          <div
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200 ${
              dragOver
                ? "border-(--accent-soft) bg-(--accent-light) scale-[1.01]"
                : "border-(--line-medium) hover:border-(--accent-soft)/50 hover:bg-(--accent-light) hover:scale-[1.005]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                if (!isValidFileType(file.name)) {
                  addToast({
                    type: "error",
                    title: "文件格式非法",
                    message: `仅支持 ${ALLOWED_EXTENSIONS.join(", ")} 格式的文件`,
                  });
                  return;
                }
                try {
                  const text = await readFileContent(file);
                  handleTextContent(text);
                } catch {
                  addToast({
                    type: "error",
                    title: "文件读取失败",
                    message: "无法读取文件内容，请确认文件未损坏",
                  });
                }
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-(--accent-light) text-(--accent-soft)">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              点击上传或拖拽文件到此区域
            </p>
            <p className="mt-1 text-xs text-(--text-subtle)">
              支持 TXT、MD、DOC、DOCX 格式，最大 10MB
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-(--line-soft)" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-(--text-subtle)">
                或者
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              粘贴小说内容
            </label>
            <textarea
              ref={textareaRef}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="w-full min-h-[220px] rounded-xl border border-(--line-medium) bg-white p-4 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft) resize-y transition-shadow"
              placeholder="将你的小说段落粘贴在此处，至少包含 3 个章节或文本超过 1000 字..."
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-(--text-subtle)">
                <FileText className="h-3.5 w-3.5" />共 {pasteContent.length} 字
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!pasteContent.trim()) {
                    textareaRef.current?.focus();
                    return;
                  }
                  handleTextContent(pasteContent);
                }}
                disabled={!pasteContent.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                识别章节
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="card animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-(--text-faint)" />
                <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                  已有项目
                </p>
              </div>
              <div className="space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-(--line-soft) px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">{p.title}</span>
                    <span className="text-xs text-(--text-subtle)">
                      {p.chapterCount} 章 ·{" "}
                      {p.status === "converting"
                        ? "转换中"
                        : p.status === "ready"
                          ? "已完成"
                          : "待处理"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-6 animate-fade-in-up">
          {/* 总体统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-1">
                总章节数
              </p>
              <p className="text-2xl font-bold text-foreground">
                {effectiveChapterCount}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-1">
                总字数
              </p>
              <p className="text-2xl font-bold text-foreground">
                {pasteContent.length.toLocaleString()}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-1">
                平均每章
              </p>
              <p className="text-2xl font-bold text-foreground">
                {effectiveChapterCount > 0
                  ? Math.round(pasteContent.length / effectiveChapterCount).toLocaleString()
                  : 0}
              </p>
            </div>
          </div>

          {/* 章节预览列表 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
                  章节预览
                </p>
                <p className="mt-1 text-sm text-foreground">
                  已识别 <strong>{effectiveChapterCount}</strong>{" "}
                  个章节，请确认划分是否正确
                </p>
              </div>
              <span className="badge badge-success">
                <Check className="h-3 w-3" />
                {effectiveChapterCount} 章节
              </span>
            </div>

            <div className="mb-4 rounded-lg border border-(--line-soft) bg-(--accent-light)/30 p-3">
              <p className="text-xs text-(--text-subtle) leading-relaxed">
                <span className="font-medium">识别说明：</span>
                系统通过识别章节标题（如"第X章"、"Chapter X"、"卷X"等）来自动划分章节。
                每个章节下方显示的字数为该章节的字符总数，右侧百分比表示该章节占总字数的比例。
              </p>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {structuredChapters.map((ch) => {
                const percentage = effectiveChapterCount > 0
                  ? Math.round((ch.wordCount / pasteContent.length) * 100) 
                  : 0;
                
                return (
                  <div
                    key={ch.index}
                    className="group rounded-xl border border-(--line-soft) bg-white px-4 py-3 hover:border-(--accent-soft)/50 hover:bg-(--accent-light)/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-(--accent-light) text-sm font-medium text-(--accent-soft)">
                        {ch.index}
                      </span>
                      <span className="flex-1 truncate font-medium text-foreground">
                        {ch.title}
                      </span>
                      <span className="shrink-0 text-sm font-medium text-(--accent-soft)">
                        {ch.wordCount.toLocaleString()} 字
                      </span>
                    </div>
                    
                    {/* 字数进度条 */}
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-(--muted)">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-(--accent-soft) to-(--accent-soft)/70 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-(--text-faint) text-right">
                      占比 {percentage}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--line-medium) px-4 py-2 text-sm text-foreground hover:bg-(--muted) transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回修改
            </button>
            <button
              type="button"
              onClick={() => setStep("configure")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-5 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
            >
              继续配置
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === "configure" && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="card">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-4">
              改编配置
            </p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  改编形式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      key: "short" as const,
                      label: "竖屏短剧",
                      desc: "快节奏、强冲突、每集 1-3 分钟",
                    },
                    {
                      key: "long" as const,
                      label: "悬疑长剧",
                      desc: "多线叙事、人物关系复杂、每集 10-15 分钟",
                    },
                  ].map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setAdaptType(type.key)}
                      className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                        adaptType === type.key
                          ? "border-(--accent-soft) bg-(--accent-light)"
                          : "border-(--line-soft) hover:border-(--accent-soft)/50 hover:bg-(--accent-light)/50"
                      }`}
                    >
                      <p className="font-medium text-foreground">
                        {type.label}
                      </p>
                      <p className="mt-1.5 text-xs text-(--text-subtle) leading-5">
                        {type.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-(--line-soft) bg-(--muted) p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-soft)" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      AI 将分析 {effectiveChapterCount} 个章节
                    </p>
                    <p className="mt-1 text-xs text-(--text-subtle) leading-5">
                      逐一解析章节内容，提取人物、场景和对白，按照剧本原子化规范生成结构化
                      YAML 剧本。过程约需 1-3 分钟。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("preview")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--line-medium) px-4 py-2 text-sm text-foreground hover:bg-(--muted) transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回修改
            </button>
            <button
              type="button"
              onClick={handleStartConvert}
              disabled={!adaptType}
              className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-5 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              开始 AI 转换
            </button>
          </div>
        </div>
      )}

      {step === "converting" && (
        <div className="animate-fade-in-up">
          <div className="card text-center py-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-(--accent-light)">
              {convertProgress < 100 ? (
                <Loader2 className="h-7 w-7 animate-spin text-(--accent-soft)" />
              ) : (
                <Check className="h-7 w-7 text-green-500" />
              )}
            </div>

            <h2 className="font-serif text-xl text-foreground mb-2">
              {convertProgress < 100 ? "AI 正在分析转换..." : "转换完成！"}
            </h2>
            <p className="text-sm text-(--text-subtle) mb-6 max-w-md mx-auto leading-6">
              {convertProgress < 100
                ? "正在逐章解析文本结构，提取人物与场景关系，按照剧本规范生成结构化数据。"
                : "小说文本已成功转换为结构化剧本，可前往工作台查看和编辑。"}
            </p>

            <div className="mx-auto max-w-xs">
              <div className="flex items-center justify-between text-xs text-(--text-subtle) mb-2">
                <span>转换进度</span>
                <span>{Math.round(convertProgress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-(--muted)">
                <div
                  className="h-full rounded-full bg-(--accent-soft) transition-all duration-500 ease-out"
                  style={{ width: `${convertProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-8 space-y-2 max-w-sm mx-auto text-left">
              {structuredChapters.slice(0, 5).map((ch) => {
                const done =
                  convertProgress > (ch.index / effectiveChapterCount) * 100;
                return (
                  <div
                    key={ch.index}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        done
                          ? "bg-green-100 text-green-600"
                          : "bg-(--muted) text-(--text-faint)"
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="text-xs">{ch.index}</span>
                      )}
                    </div>
                    <span
                      className={`truncate ${done ? "text-foreground" : "text-(--text-subtle)"}`}
                    >
                      {ch.title}
                    </span>
                  </div>
                );
              })}
              {effectiveChapterCount > 5 && (
                <p className="text-xs text-(--text-faint) pl-8">
                  还有 {effectiveChapterCount - 5} 个章节...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
