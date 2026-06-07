import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import {
  Sparkles,
  FileText,
  Users,
  ListTree,
  Bot,
  Code2,
  History,
  MessageSquareText,
  ChevronDown,
  ChevronRight,
  Send,
  RotateCcw,
  Copy,
  Check,
  Upload,
  AlertCircle,
  ArrowRight,
  X,
} from "lucide-react";
import { useScriptStore } from "@/store/useScriptStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useNovelStore } from "@/store/useNovelStore";
import mammoth from "mammoth";
import { useNavigate } from "react-router-dom";
import { useToastStore } from "@/store/useToastStore";
import { detectChapters, extractChapterContents } from "@/lib/chapterUtils";

type AssistantTab = "chat" | "yaml" | "history";

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-2"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {title}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// AI Chat Message type
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Workbench() {
  const navigate = useNavigate();
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [importText, setImportText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // 提升到 Workbench 以便左侧"原始文本"面板也能实时看到处理结果
  const [processedText, setProcessedText] = useState("");
  // AI 分析结果（人物分析 + 场景拆分），独立于剧本正文
  const [analysisText, setAnalysisText] = useState("");
  // 动态生成的 YAML
  const [yamlOutput, setYamlOutput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentScript = useScriptStore((s) =>
    s.scripts.find((scr) => scr.id === s.currentScriptId),
  );
  const projects = useProjectStore((s) => s.projects);
  const activeProject = projects.find((p) => p.id === currentScript?.projectId);

  const addProject = useProjectStore((s) => s.addProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const upsertScript = useScriptStore((s) => s.upsertScript);
  const setCurrentScript = useScriptStore((s) => s.setCurrentScript);
  const addNovel = useNovelStore((s) => s.addNovel);
  const setCurrentNovel = useNovelStore((s) => s.setCurrentNovel);
  const addToast = useToastStore((s) => s.addToast);

  // 获取当前小说数据
  const currentNovel = useNovelStore((s) =>
    s.novels.find((n) => n.projectId === activeProject?.id)
  );
  const setSelectedChapter = useNovelStore((s) => s.setSelectedChapter);

  const hasData = !!currentScript && currentScript.sourceText;
  const hasScenes = !!currentScript && currentScript.episodes.length > 0 &&
    currentScript.episodes[0].scenes.length > 0 &&
    currentScript.episodes[0].scenes.some(s => (s.intent && s.intent.trim()) || (s.code && s.code.trim()) || s.title !== "等待处理");
  const hasNovelData = !!currentNovel && currentNovel.chapters.length > 0;

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

    const arrayBuffer = await file.arrayBuffer();
    const encodings = ["UTF-8", "GBK", "GB2312", "GB18030", "Big5"];

    for (const encoding of encodings) {
      try {
        const textDecoder = new TextDecoder(encoding, { fatal: true });
        const text = textDecoder.decode(arrayBuffer);
        const replacementCharCount = (text.match(/\uFFFD/g) || []).length;
        if (replacementCharCount < text.length * 0.1) {
          return text;
        }
      } catch {
        continue;
      }
    }

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
      setImportText(text);
    } catch {
      addToast({
        type: "error",
        title: "文件读取失败",
        message: "无法读取文件内容，请确认文件未损坏",
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
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
        setImportText(text);
      } catch {
        addToast({
          type: "error",
          title: "文件读取失败",
          message: "无法读取文件内容，请确认文件未损坏",
        });
      }
    }
  };

  const handleCreateFromImport = () => {
    const text = importText.trim();
    if (!text) {
      addToast({ type: "error", title: "请输入文本", message: "请先输入或上传小说文本" });
      return;
    }

    // 检测章节
    const detectedChapters = detectChapters(text);
    if (detectedChapters.length < 3) {
      addToast({
        type: "error",
        title: "章节不足",
        message: `仅检测到 ${detectedChapters.length} 个章节，至少需要 3 个章节才能进行转换`,
      });
      return;
    }

    // 提取所有章节内容
    const allIndices = new Set(detectedChapters.map((ch) => ch.index));
    const chaptersWithContent = extractChapterContents(text, detectedChapters, allIndices);

    const projectId = `proj_${Date.now().toString(36)}`;
    const projectTitle = detectedChapters[0]?.title?.replace(/^第[一二三四五六七八九十百千零\d]+[章节部回卷集]\s*/, "") || "新项目";

    const project = {
      id: projectId,
      title: projectTitle,
      sourceNovel: detectedChapters[0]?.title || "导入文本",
      sourceAuthor: "未知作者",
      chapterCount: chaptersWithContent.length,
      status: "idle" as const,
      createdAt: new Date().toISOString(),
    };
    addProject(project);
    setCurrentProject(projectId);

    const novelId = `novel_${Date.now().toString(36)}`;
    const novelData = {
      id: novelId,
      projectId,
      title: projectTitle,
      author: "未知作者",
      totalChapters: chaptersWithContent.length,
      totalWordCount: text.length,
      chapters: chaptersWithContent,
      fullText: text,
      createdAt: new Date().toISOString(),
    };
    addNovel(novelData);
    setCurrentNovel(novelId);

    // 每章对应一个 Episode，首个 episode 包含 sourceText
    const episodes = chaptersWithContent.map((ch, i) => ({
      id: `${projectId}_episode_${i + 1}`,
      title: ch.title,
      coldOpen: i === 0 ? undefined : undefined,
      scenes: [
        {
          id: `${projectId}_scene_${i}_1`,
          code: `SC-${(i + 1).toString().padStart(3, "0")}`,
          title: "等待处理",
          location: "等待分析",
          intent: `第${i + 1}章 ${ch.title} 的原始文本，请启动 AI 转换`,
          beats: [],
          status: "draft" as const,
        },
      ],
    }));

    const scriptId = `script_${Date.now().toString(36)}`;
    const initialScriptData = {
      id: scriptId,
      projectId,
      title: projectTitle,
      sourceText: text,
      episodes,
    };
    upsertScript(initialScriptData);
    setCurrentScript(scriptId);

    setShowImportPanel(false);
    setImportText("");
    addToast({
      type: "success",
      title: "文本导入成功",
      message: `已识别 ${chaptersWithContent.length} 个章节，进入工作台开始 AI 转换`,
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || isAiTyping) return;
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: chatInput.trim(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAiTyping(true);

    // Simulate AI response
    const responses = [
      "我建议在冷开场部分增加一个悬念钩子，比如让主角在开头发现一个异常信号，为后续情节埋下伏笔。",
      "第三场景的情绪张力可以再强化一些。当前的对白偏叙述性，建议转换为更具冲突感的对话。",
      "已分析当前节拍结构。检测到 Act 1 和 Act 2 之间的节奏过渡偏快，建议在中间增加一个过渡场景。",
      "根据当前人物档案，反派的动机线尚未充分展开。建议在 Scene 4 增加一段内心独白来丰富角色层次。",
    ];
    setTimeout(
      () => {
        const aiMsg: ChatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
        };
        setChatMessages((prev) => [...prev, aiMsg]);
        setIsAiTyping(false);
      },
      1200 + Math.random() * 1000,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const demoYaml = `# Episode 01 · 潮汐以下
episode:
  id: ep_01
  title: "潮汐以下"
  cold_open:
    intent: "让危险先于答案出现"
    scenes:
      - id: sc_001
        type: INT.
        location: "深海勘探站 · 主控室"
        time: "夜晚"
        summary: "主角发现异常信号"
        beats:
          - type: action
            description: "监控屏幕闪烁，警报灯旋转"
          - type: dialogue
            character: "林深"
            line: "这个频率...不像是已知的海洋生物。"
`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="border-b border-(--line-soft) px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] text-(--text-faint)">
              <Sparkles className="h-3 w-3 text-(--accent-soft)" />
              AI 剧本工作台
            </p>
            <h1 className="mt-1 font-serif text-2xl text-foreground">
              {activeProject?.title ?? "Episode 01 · 潮汐以下"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {hasData ? (
              <>
                <span className="badge badge-primary">Cold Open</span>
                <span className="badge badge-muted">
                  {currentScript.episodes.reduce(
                    (acc, ep) => acc + ep.scenes.length,
                    0,
                  )}{" "}
                  场景
                </span>
              </>
            ) : (
              <>
                <span className="badge badge-muted">等待导入</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3-Panel Grid */}
      <div className="flex min-h-0 flex-1 gap-px bg-(--line-soft)">
        {/* ===== Left Panel - Context ===== */}
        <div className="flex w-72 flex-col overflow-y-auto bg-white p-4">
          <CollapsibleSection
            title="原著对照"
            icon={<FileText className="h-3 w-3" />}
          >
            {hasNovelData ? (
              <div className="space-y-2">
                {/* 小说基本信息 */}
                <div className="mb-3 rounded-lg border border-(--line-soft) bg-(--muted) p-3">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {currentNovel.title}
                  </p>
                  <p className="text-xs text-(--text-subtle)">
                    共 {currentNovel.totalChapters} 章 · {currentNovel.totalWordCount.toLocaleString()} 字
                  </p>
                </div>

                {/* 章节列表 */}
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {currentNovel.chapters.map((chapter) => (
                    <button
                      key={chapter.index}
                      type="button"
                      onClick={() => {
                        setSelectedChapterIndex(chapter.index);
                        setSelectedChapter(chapter.index);
                      }}
                      className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${selectedChapterIndex === chapter.index
                        ? "border-(--accent-soft) bg-(--accent-light) text-foreground"
                        : "border-(--line-soft) hover:bg-(--muted) text-(--text-subtle)"
                        }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-(--accent-light) text-xs text-(--accent-soft)">
                        {chapter.index}
                      </span>
                      <span className="flex-1 truncate text-xs">
                        {chapter.title}
                      </span>
                      <span className="shrink-0 text-xs text-(--text-faint)">
                        {chapter.wordCount.toLocaleString()}字
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : hasData ? (
              <div className="text-sm leading-6 text-(--text-subtle)">
                <p className="text-foreground mb-2 font-medium">导入文本</p>
                <div className="rounded-lg border border-(--line-soft) p-3 bg-white">
                  <pre className="text-xs text-(--text-subtle) leading-6 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {currentScript?.sourceText || "暂无内容"}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-(--text-subtle)">
                导入小说源文本后，此处将显示原始章节内容。
              </p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title={processedText ? "处理文本" : "原始文本"}
            icon={<FileText className="h-3 w-3" />}
          >
            {currentScript?.sourceText ? (
              <div className="space-y-2">
                {processedText ? (
                  /* 实时显示处理中的文本 */
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">
                      处理文本（实时更新）
                    </p>
                    <div className="rounded-lg border border-(--accent-soft)/30 p-3 bg-(--accent-light)">
                      <pre className="text-xs text-(--text-subtle) leading-6 whitespace-pre-wrap max-h-[350px] overflow-y-auto">
                        {processedText}
                      </pre>
                    </div>
                  </div>
                ) : selectedChapterIndex !== null && hasNovelData ? (
                  /* 显示选中章节的内容 */
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">
                      {currentNovel.chapters.find(c => c.index === selectedChapterIndex)?.title}
                    </p>
                    <div className="rounded-lg border border-(--line-soft) p-3 bg-white">
                      <pre className="text-xs text-(--text-subtle) leading-6 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {currentNovel.chapters.find(c => c.index === selectedChapterIndex)?.content || "暂无内容"}
                      </pre>
                    </div>
                  </div>
                ) : (
                  /* 显示全部原始文本 */
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">
                      全部原始文本
                    </p>
                    <div className="rounded-lg border border-(--line-soft) p-3 bg-white">
                      <pre className="text-xs text-(--text-subtle) leading-6 whitespace-pre-wrap max-h-[350px] overflow-y-auto">
                        {hasNovelData
                          ? currentNovel.fullText || "暂无内容"
                          : currentScript.sourceText}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm leading-6 text-(--text-subtle)">
                暂无原始文本，请先导入文本。
              </p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="人物档案"
            icon={<Users className="h-3 w-3" />}
          >
            {(() => {
              // 多渠道提取角色
              let chars: string[] = [];

              // 1. 从剧本正文提取 ***角色名*** 模式
              const scriptMatches = processedText.match(/\*\*\*(.+?)\*\*\*/g);
              if (scriptMatches) {
                chars = [...new Set(scriptMatches.map(c => c.replace(/\*\*\*/g, "").trim()))]
                  .filter(c => c.length > 0 && c.length < 10 && !/^角色[甲乙丙丁]$/.test(c));
              }

              // 2. 从场景 intent（出场人员）提取
              if (chars.length === 0 && currentScript?.episodes[0]?.scenes) {
                const sceneChars = currentScript.episodes[0].scenes
                  .flatMap(s => {
                    const m = s.intent?.match(/出场[:：](.+)/);
                    return m ? m[1].split(/[,，、]/).map(c => c.trim()).filter(Boolean) : [];
                  });
                chars = [...new Set(sceneChars)].filter(c => c.length < 10);
              }

              // 3. 从 AI 分析文本提取
              if (chars.length === 0 && analysisText) {
                const charSection = analysisText.match(/人物[分析|角色|提取][\s\S]*?(?=##|\n\n|$)/);
                if (charSection) {
                  const names = charSection[0].match(/[（(][^)）]+[)）]|[-–—]\s*([^\s：:]+)[：:]/g);
                  if (names) {
                    chars = [...new Set(names.map(n => n.replace(/[（()）[-–—]/g, "").replace(/[：:].*/, "").trim()))]
                      .filter(c => c.length > 0 && c.length < 10);
                  }
                }
              }

              if (chars.length > 0) {
                return (
                  <div className="space-y-1.5">
                    {chars.slice(0, 10).map((char, i) => (
                      <div
                        key={char}
                        className="flex items-center gap-2 rounded-lg border border-(--line-soft) px-3 py-2 text-sm"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-(--accent-light) text-xs text-(--accent-soft)">
                          {i + 1}
                        </div>
                        <span className="text-xs text-foreground">{char}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <p className="text-sm leading-6 text-(--text-subtle)">
                  AI 将从文本中自动提取人物角色及其关系。
                </p>
              );
            })()}
          </CollapsibleSection>

          <CollapsibleSection
            title="故事大纲"
            icon={<ListTree className="h-3 w-3" />}
          >
            <div className="space-y-3">
              {(() => {
                // 优先从 processedText 解析场景，回退到 store
                const sceneParts = processedText.split(/(?=【场景\d+】)/).filter(p => p.trim());
                const parsedScenes = sceneParts.map(part => {
                  const hm = part.match(/【场景(\d+)】(.+)/);
                  const hi = hm ? hm[2] : "";
                  const lm = hi.match(/(INT\.|EXT\.)\s*(.+?)\s*-\s*(日|夜|白天|夜晚|晨|黄昏|傍晚)/);
                  return {
                    title: `场景 ${hm?.[1] || "?"}`,
                    location: lm ? `${lm[1]} ${lm[2].trim()}` : "",
                    timeOfDay: lm ? lm[3] : "",
                    chars: hi.match(/出场[:：](.+)/)?.[1]?.trim() || "",
                  };
                });

                if (parsedScenes.length > 0 && parsedScenes.some(s => s.location || s.chars)) {
                  return parsedScenes.slice(0, 4).map((scene, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-(--accent-soft)" : "bg-(--line-medium)"}`} />
                        {i < Math.min(parsedScenes.length - 1, 3) && (
                          <span className="mt-1.5 h-8 w-px bg-(--line-soft)" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{scene.title}</p>
                        <p className="text-xs text-(--text-subtle)">
                          {scene.location || scene.timeOfDay
                            ? `${scene.location}${scene.location && scene.timeOfDay ? " · " : ""}${scene.timeOfDay}`
                            : scene.chars || "等待详情"}
                        </p>
                      </div>
                    </div>
                  ));
                }

                // 回退到 store 场景
                if (hasScenes && currentScript?.episodes[0]?.scenes?.length > 0) {
                  return currentScript.episodes[0].scenes.slice(0, 4).map((scene, i) => (
                    <div key={scene.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-(--accent-soft)" : "bg-(--line-medium)"}`} />
                        {i < Math.min(currentScript.episodes[0].scenes.length - 1, 3) && (
                          <span className="mt-1.5 h-8 w-px bg-(--line-soft)" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{scene.title}</p>
                        <p className="text-xs text-(--text-subtle)">
                          {scene.location || scene.timeOfDay
                            ? `${scene.location}${scene.location && scene.timeOfDay ? " · " : ""}${scene.timeOfDay}`
                            : scene.intent || "等待详情"}
                        </p>
                      </div>
                    </div>
                  ));
                }

                return (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-(--line-medium)" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">等待分析</p>
                      <p className="text-xs text-(--text-subtle)">
                        {hasData ? "等待 AI 分析生成故事结构" : "请先导入文本"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CollapsibleSection>
        </div>

        {/* ===== Center Panel - Editor ===== */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-white p-4">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-1">
              Visual Editor
            </p>
            <h2 className="font-serif text-base text-foreground">可视化编剧台</h2>
            <p className="mt-0.5 text-xs text-(--text-subtle)">
              以剧本原子化结构编辑集、场景与节拍。
            </p>
          </div>

          {/* AI Convert Panel or Import Panel */}
          {hasData && !showEditor ? (
            <AIConvertPanel processedText={processedText} setProcessedText={setProcessedText} setYamlOutput={setYamlOutput} setAnalysisText={setAnalysisText} />
          ) : showEditor ? (
            <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-(--line-soft) p-8">
              <div className="text-center">
                <p className="text-sm text-(--text-subtle)">切换到「AI转换」模式开始处理文本</p>
              </div>
            </div>
          ) : showImportPanel ? (
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-(--accent-soft)/50 bg-white p-4 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-foreground">导入小说文本</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportPanel(false);
                    setImportText("");
                  }}
                  className="rounded-md p-1 text-(--text-faint) hover:text-foreground hover:bg-(--muted) transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 上传区域 */}
              <div
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${dragOver
                  ? "border-(--accent-soft) bg-(--accent-light)"
                  : "border-(--line-medium) hover:border-(--accent-soft)/50 hover:bg-(--accent-light)"
                  }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-(--accent-light) text-(--accent-soft)">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm text-foreground">点击上传或拖拽文件</p>
                <p className="mt-1 text-xs text-(--text-subtle)">支持 TXT、MD、DOC、DOCX 格式</p>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-(--line-soft)" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-(--text-subtle)">或者</span>
                </div>
              </div>

              {/* 文本输入区域 */}
              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="flex-1 resize-none rounded-xl border border-(--line-medium) bg-white p-4 text-sm text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft)"
                  placeholder="将你的小说文本粘贴到这里..."
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-(--text-subtle)">
                    <FileText className="h-3.5 w-3.5" />
                    共 {importText.length} 字
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportPanel(false);
                        setImportText("");
                      }}
                      className="rounded-lg border border-(--line-medium) px-4 py-2 text-sm text-foreground hover:bg-(--muted) transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateFromImport}
                      disabled={!importText.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      开始创作
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-(--line-soft) p-8">
              <div className="text-center max-w-md">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--accent-light)">
                  <FileText className="h-8 w-8 text-(--accent-soft)" />
                </div>
                <h3 className="font-serif text-xl text-foreground mb-2">
                  导入小说源文本
                </h3>
                <p className="text-sm text-(--text-subtle) mb-6">
                  上传小说文件或直接粘贴文本内容，开始你的剧本创作之旅
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("/import")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-(--line-medium) px-4 py-2 text-sm text-foreground hover:bg-(--muted) transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    高级导入
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportPanel(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    快速输入
                  </button>
                </div>
                <div className="mt-6 rounded-xl border border-(--line-soft) bg-(--muted) p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-soft)" />
                    <div className="text-left">
                      <p className="text-xs font-medium text-foreground">格式要求</p>
                      <p className="mt-1 text-xs text-(--text-subtle) leading-5">
                        支持 TXT、MD、DOC、DOCX 文件格式，或直接粘贴文本内容。系统将自动识别章节结构。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== Right Panel - Assistant ===== */}
        <div className="flex w-72 flex-col overflow-y-auto bg-white p-4">
          {/* Tabs */}
          <div className="mb-4 flex rounded-lg bg-(--muted) p-0.5">
            {[
              {
                key: "chat" as const,
                icon: <MessageSquareText className="h-3.5 w-3.5" />,
                label: "AI",
              },
              {
                key: "yaml" as const,
                icon: <Code2 className="h-3.5 w-3.5" />,
                label: "YAML",
              },
              {
                key: "history" as const,
                icon: <History className="h-3.5 w-3.5" />,
                label: "历史",
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAssistantTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${assistantTab === tab.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-(--text-subtle) hover:text-foreground"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* AI Chat Tab */}
          {assistantTab === "chat" && (
            <div className="flex flex-1 flex-col min-h-0">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bot className="h-8 w-8 text-(--text-faint) mb-2" />
                    <p className="text-xs text-(--text-subtle) leading-5">
                      AI 编剧助手将在此提供场景改写建议、情绪增强和结构优化。
                    </p>
                    {/* Suggested prompts */}
                    <div className="mt-4 space-y-1.5 w-full">
                      {[
                        "分析当前场景节奏",
                        "建议情绪增强点",
                        "检查对白自然度",
                      ].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setChatMessages([
                              {
                                id: `msg_${Date.now()}`,
                                role: "user",
                                content: p,
                              },
                            ]);
                            setIsAiTyping(true);
                            setTimeout(() => {
                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  id: `msg_${Date.now()}_ai`,
                                  role: "assistant",
                                  content: `好的，我来${p.toLowerCase()}。根据当前剧本结构，建议在关键情节点增加视觉化的动作描写来替代部分内心独白，以增强画面感。`,
                                },
                              ]);
                              setIsAiTyping(false);
                            }, 1000);
                          }}
                          className="w-full rounded-lg border border-(--line-soft) px-3 py-2 text-xs text-(--text-subtle) hover:text-foreground hover:bg-(--muted) transition-colors text-left"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 ${msg.role === "user"
                          ? "bg-(--accent-soft) text-white"
                          : "bg-(--muted) text-foreground"
                          }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isAiTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="rounded-xl bg-(--muted) px-3 py-2 text-xs">
                      <div className="flex gap-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-(--text-faint) animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-(--text-faint) animate-bounce"
                          style={{ animationDelay: "200ms" }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-(--text-faint) animate-bounce"
                          style={{ animationDelay: "400ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="mt-3 flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入指令..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-(--line-medium) bg-white px-3 py-2 text-xs text-foreground placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent-soft)/30 focus:border-(--accent-soft)"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isAiTyping}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-soft) text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* YAML Tab */}
          {assistantTab === "yaml" && (
            <div className="flex flex-1 flex-col min-h-0">
              {hasData ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-(--text-subtle)">
                      {yamlOutput ? "script.yaml" : "episode_01.yaml"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(yamlOutput || demoYaml);
                        setCopiedYaml(true);
                        setTimeout(() => setCopiedYaml(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--text-subtle) hover:text-foreground hover:bg-(--muted) transition-colors"
                    >
                      {copiedYaml ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedYaml ? "已复制" : "复制"}
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto rounded-xl bg-[#0d1117] p-4 text-xs leading-5">
                    <code className="text-[#e6edf3] font-mono">{yamlOutput || demoYaml}</code>
                  </pre>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-(--text-subtle) leading-5">
                    YAML 结构源代码视图。完成 AI
                    转换后，剧本的底层数据结构将在此展示。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {assistantTab === "history" && (
            <div className="flex flex-1 flex-col min-h-0">
              {hasData ? (
                <div className="space-y-2">
                  {[
                    {
                      version: "v1.3",
                      time: "10 分钟前",
                      desc: "Scene 3 情绪基调调整",
                    },
                    {
                      version: "v1.2",
                      time: "25 分钟前",
                      desc: "Act 1 对白润色",
                    },
                    {
                      version: "v1.1",
                      time: "1 小时前",
                      desc: "Cold Open 节拍重组",
                    },
                  ].map((v) => (
                    <div
                      key={v.version}
                      className="flex items-center gap-3 rounded-xl border border-(--line-soft) px-3 py-2.5 hover:bg-(--muted) transition-colors cursor-pointer"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-(--accent-light) text-xs text-(--accent-soft) font-mono">
                        {v.version}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {v.desc}
                        </p>
                        <p className="text-xs text-(--text-faint)">{v.time}</p>
                      </div>
                      <RotateCcw className="h-3 w-3 shrink-0 text-(--text-faint)" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-(--text-subtle) leading-5">
                    版本历史将追踪你对剧本的每一次修改，支持 Diff
                    对比与一键回退。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkbenchOverviewCard() {
  return (
    <div className="card flex items-center justify-between gap-4 p-5 card-hover cursor-pointer">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint)">
          导向入口
        </p>
        <h3 className="mt-2 font-serif text-xl text-foreground">
          继续推进当前工作台
        </h3>
        <p className="mt-1 max-w-xl text-sm text-(--text-subtle)">
          进入沉浸式工作台，处理 AI 回写、YAML 校验与节拍润色。
        </p>
      </div>
      <Sparkles className="hidden h-8 w-8 text-(--accent-soft) md:block" />
    </div>
  );
}

const AI_STEPS = [
  { id: "dialog", label: "对话标记", desc: "识别对话语句并添加唯一标识" },
  { id: "character", label: "人物提取", desc: "提取主要人物和次要人物" },
  { id: "description", label: "描写分离", desc: "分离景物、心理、肖像描写" },
  { id: "plot", label: "主线提取", desc: "提取故事主线和转场" },
  { id: "speaker", label: "对话主体", desc: "标记对话的说话主体" },
  { id: "structure", label: "剧本架构", desc: "选择长剧本或短剧本" },
  { id: "scene", label: "场景头生成", desc: "分析景物描写生成场景头" },
  { id: "psychology", label: "心理转换", desc: "将心理描写转为动作神态" },
  { id: "packaging", label: "场景打包", desc: "按相似度分场景打包" },
  { id: "cleanup", label: "无用语句", desc: "去除无用语句" },
  { id: "polish", label: "AI 润色", desc: "润色剧本使其更专业" },
  { id: "export", label: "导出剧本", desc: "生成 JSON/YAML 格式剧本" },
];

interface AIConvertPanelProps {
  processedText: string;
  setProcessedText: (text: string) => void;
  setYamlOutput: (yaml: string) => void;
  setAnalysisText: (text: string) => void;
}

function AIConvertPanel({ processedText, setProcessedText, setYamlOutput, setAnalysisText }: AIConvertPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adaptType, setAdaptType] = useState<"short" | "long">("long");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(true);
  const novels = useNovelStore((s) => s.novels);
  const currentNovelId = useNovelStore((s) => s.currentNovelId);
  const currentNovel = novels.find(n => n.id === currentNovelId);
  const { addToast } = useToastStore();
  const upsertScript = useScriptStore((s) => s.upsertScript);
  const scripts = useScriptStore((s) => s.scripts);
  const currentScriptId = useScriptStore((s) => s.currentScriptId);
  const currentScript = scripts.find(s => s.id === currentScriptId);

  const originalText = currentNovel?.fullText || "";
  const displayText = processedText || originalText;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const callApi = async (endpoint: string, text: string) => {
    try {
      const response = await fetch(`${apiBase}/api/workbench/process/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      console.log(`API response for ${endpoint}:`, data);
      if (data.status === "success" && data.data && data.data.text) {
        return data.data.text;
      } else {
        console.error(`API error for ${endpoint}:`, data.message || "Unknown error");
        return text;
      }
    } catch (error) {
      console.error(`Failed to call API ${endpoint}:`, error);
      return text;
    }
  };

  const processStep = async (stepId: string) => {
    setIsProcessing(true);

    let result = processedText || originalText;

    switch (stepId) {
      case "dialog":
        result = await callApi("dialog", result);
        break;
      case "character":
        result = await callApi("character", result);
        break;
      case "plot":
        result = await callApi("plot", result);
        break;
      case "speaker":
        result = await callApi("speaker", result);
        break;
      case "scene":
        result = await callApi("scene-header", result);
        break;
      case "psychology":
        result = await callApi("psychology", result);
        break;
      case "packaging":
        result = packageScenes(result);
        break;
      case "cleanup":
        result = await callApi("cleanup", result);
        break;
      case "polish":
        result = await callApi("polish", result);
        break;
      case "export":
        exportScript(result);
        break;
      default:
        break;
    }

    setProcessedText(result);
    const newCompletedSteps = new Set([...completedSteps, stepId]);
    setCompletedSteps(newCompletedSteps);
    setIsProcessing(false);
    addToast({ type: "success", title: `${AI_STEPS.find(s => s.id === stepId)?.label} 完成` });

    if (newCompletedSteps.size >= AI_STEPS.length - 1) {
      setIsComplete(true);
      saveScript(result);
    }
  };

  const saveScript = (scriptText: string) => {
    if (!currentScript || !currentScriptId) return;

    // 解析场景：优先按【场景N】分割，回退到 ###
    let scenes: Array<{
      id: string;
      title: string;
      location: string;
      timeOfDay: string;
      intent: string;
      beats: Array<unknown>;
      content: string;
      code: string;
      status: "draft";
    }> = [];

    const sceneHeaderRegex = /【场景(\d+)】(.+)/g;
    const parts = scriptText.split(/(?=【场景\d+】)/);

    if (parts.length > 1) {
      // AI 输出格式：按【场景N】分割
      parts.forEach((part, i) => {
        const headerMatch = part.match(/【场景(\d+)】(.+)/);
        if (headerMatch) {
          const headerInfo = headerMatch[2];
          // 解析：EXT./INT. 地点 - 时间｜出场：角色
          const locMatch = headerInfo.match(/(INT\.|EXT\.)\s*(.+?)\s*-\s*(日|夜|白天|夜晚|晨|黄昏|傍晚)/);
          const charsMatch = headerInfo.match(/出场[:：](.+)/);

          let body = part.replace(/【场景\d+】.*(?:\r?\n|$)/, "").trim();

          scenes.push({
            id: `scene_${Date.now()}_${i}`,
            title: `场景 ${headerMatch[1]}`,
            location: locMatch ? `${locMatch[1]} ${locMatch[2].trim()}` : "",
            timeOfDay: locMatch ? locMatch[3] : "",
            intent: charsMatch ? `出场：${charsMatch[1].trim()}` : "",
            beats: [],
            content: body,
            code: "",
            status: "draft",
          });
        }
      });
    } else {
      // 回退：按 ### 分割
      scenes = scriptText.split("###").filter(s => s.trim()).map((sceneContent, i) => ({
        id: `scene_${Date.now()}_${i}`,
        title: `场景 ${i + 1}`,
        location: "",
        timeOfDay: "",
        intent: "",
        beats: [],
        content: sceneContent.trim(),
        code: "",
        status: "draft" as const,
      }));
    }

    const updatedScript = {
      ...currentScript,
      episodes: currentScript?.episodes?.map((ep, i) =>
        i === 0
          ? {
            ...ep,
            scenes: scenes.length > 0 ? scenes : ep.scenes,
          }
          : ep
      ) || [
          {
            id: `${currentScript?.id || "script"}_episode_1`,
            title: "第1集",
            scenes: scenes.length > 0 ? scenes : [],
          },
        ],
    };

    upsertScript(updatedScript);
    addToast({ type: "success", title: "剧本已保存" });
  };

  const processAll = async () => {
    const text = processedText || originalText;
    if (!text.trim()) return;

    setIsProcessing(true);
    setCurrentStep(1);

    try {
      const response = await fetch(`${apiBase}/api/workbench/process/all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          script_type: adaptType === "long" ? "long" : "short",
          title: currentNovel?.title || "未命名剧本",
        }),
      });
      const data = await response.json();
      console.log("Process all response:", data);

      if (data.status === "success" && data.data) {
        // 剧本正文
        setProcessedText(data.data.text);
        if (data.data.yaml) {
          setYamlOutput(data.data.yaml);
        }
        // AI 分析结果（人物分析 + 场景拆分）
        if (data.data.analysis) {
          setAnalysisText(data.data.analysis);
        }
        // 标记所有步骤为完成
        const allDone = new Set(AI_STEPS.filter(s => s.id !== "structure").map(s => s.id));
        setCompletedSteps(allDone);
        setCurrentStep(AI_STEPS.length);
        setIsComplete(true);
        saveScript(data.data.text);
        addToast({ type: "success", title: "AI 5步转换完成，已生成结构化剧本" });
      } else {
        addToast({ type: "error", title: "转换失败", message: data.message || "后端返回异常" });
      }
    } catch (error) {
      console.error("Process all failed:", error);
      addToast({ type: "error", title: "转换失败", message: "无法连接后端服务" });
    } finally {
      setIsProcessing(false);
    }
  };

  const packageScenes = (text: string) => {
    return `###\n${text.slice(0, Math.floor(text.length / 2))}\n###\n${text.slice(Math.floor(text.length / 2))}\n###`;
  };

  const exportScript = (text: string) => {
    const script = {
      title: currentNovel?.title || "未命名剧本",
      scenes: text.split("###").filter(s => s.trim()).map((scene, i) => ({
        id: `scene_${i + 1}`,
        content: scene.trim(),
      })),
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const processingStep = isProcessing ? AI_STEPS[currentStep] : null;

  if (isComplete && processedText) {
    // 解析场景卡片
    const sceneParts = processedText.split(/(?=【场景\d+】)/).filter(p => p.trim());
    const sceneCards = sceneParts.map((part, idx) => {
      const headerMatch = part.match(/【场景(\d+)】(.+)/);
      const headerInfo = headerMatch ? headerMatch[2] : "";
      const locMatch = headerInfo.match(/(INT\.|EXT\.)\s*(.+?)\s*-\s*(日|夜|白天|夜晚|晨|黄昏|傍晚)/);
      const charsMatch = headerInfo.match(/出场[:：](.+)/);
      const body = part.replace(/【场景\d+】.*(?:\r?\n|$)/, "").trim();

      // 解析对话行：***角色名***\n    台词
      const lines = body.split("\n");
      const formattedLines: Array<{ type: "dialogue" | "action" | "empty"; speaker?: string; text: string }> = [];
      let lineIdx = 0;
      while (lineIdx < lines.length) {
        const line = lines[lineIdx];
        const speakerMatch = line.match(/^\*\*\*(.+?)\*\*\*$/);
        if (speakerMatch) {
          const nextLine = lines[lineIdx + 1] || "";
          formattedLines.push({
            type: "dialogue",
            speaker: speakerMatch[1].trim(),
            text: nextLine.trim(),
          });
          lineIdx += 2;
        } else if (line.trim()) {
          formattedLines.push({ type: "action", text: line });
          lineIdx += 1;
        } else {
          formattedLines.push({ type: "empty", text: "" });
          lineIdx += 1;
        }
      }

      return {
        index: headerMatch ? parseInt(headerMatch[1]) : idx + 1,
        location: locMatch ? `${locMatch[1]} ${locMatch[2].trim()}` : "",
        timeOfDay: locMatch ? locMatch[3] : "",
        characters: charsMatch ? charsMatch[1].trim().split(/[,，、]/).map(c => c.trim()).filter(Boolean) : [],
        lines: formattedLines,
        rawHeader: headerInfo,
      };
    });

    return (
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg text-foreground">剧本内容</h3>
            <p className="text-sm text-(--text-subtle)">AI 转换完成 · 共 {sceneCards.length} 场</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(0);
                setProcessedText("");
                setYamlOutput("");
                setAnalysisText("");
                setCompletedSteps(new Set());
                setIsComplete(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-(--line-soft) text-xs text-(--text-subtle) hover:bg-(--muted) transition-colors"
            >
              重新转换
            </button>
            <button
              type="button"
              onClick={() => exportScript(processedText)}
              className="px-3 py-1.5 rounded-lg bg-(--accent-soft) text-white text-xs hover:bg-(--accent-soft)/90 transition-colors"
            >
              导出剧本
            </button>
          </div>
        </div>

        {sceneCards.map((scene) => (
          <div
            key={scene.index}
            className="rounded-xl border border-(--line-soft) bg-white overflow-hidden shadow-sm"
          >
            {/* 场景头 */}
            <div className="flex items-center gap-3 px-4 py-3 bg-(--muted) border-b border-(--line-soft)">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--accent-soft) text-xs font-bold text-white">
                {scene.index}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {scene.location && (
                    <span className="text-sm font-medium text-foreground">
                      {scene.location}
                    </span>
                  )}
                  {scene.timeOfDay && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-(--accent-light) text-(--accent-soft)">
                      {scene.timeOfDay}
                    </span>
                  )}
                </div>
                {scene.characters.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {scene.characters.map((char) => (
                      <span
                        key={char}
                        className="text-xs text-(--text-subtle)"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 场景内容 */}
            <div className="px-4 py-3 space-y-2">
              {scene.lines.map((line, li) => {
                if (line.type === "empty") return <div key={li} className="h-2" />;
                if (line.type === "action") {
                  return (
                    <p key={li} className="text-sm text-(--text-subtle) leading-relaxed">
                      {line.text}
                    </p>
                  );
                }
                if (line.type === "dialogue") {
                  return (
                    <div key={li} className="flex gap-3 items-start">
                      <span className="shrink-0 mt-0.5 text-xs font-semibold text-(--accent-soft) bg-(--accent-light) px-2 py-0.5 rounded">
                        {line.speaker}
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">
                        {line.text}
                      </p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {/* 底栏操作 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setCurrentStep(0);
              setProcessedText("");
              setYamlOutput("");
              setAnalysisText("");
              setCompletedSteps(new Set());
              setIsComplete(false);
            }}
            className="flex-1 px-4 py-2 rounded-lg border border-(--line-soft) text-sm text-(--text-subtle) hover:bg-(--muted) transition-colors"
          >
            重新转换
          </button>
          <button
            type="button"
            onClick={() => exportScript(processedText)}
            className="flex-1 px-4 py-2 rounded-lg bg-(--accent-soft) text-white text-sm hover:bg-(--accent-soft)/90 transition-colors"
          >
            导出剧本
          </button>
        </div>
      </div>
    );
  }

  const handleReimport = () => {
    window.location.href = "/import";
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg text-foreground">AI 剧本转换</h3>
            <p className="text-xs text-(--text-subtle)">按照以下步骤将小说文本转换为专业剧本格式</p>
          </div>
          <button
            type="button"
            onClick={handleReimport}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-(--line-soft) text-sm text-(--text-subtle) hover:bg-(--muted) transition-colors"
          >
            <Upload className="h-4 w-4" />
            重新选择文本
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-(--text-subtle)">剧本架构</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdaptType("long")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${adaptType === "long"
                ? "bg-(--accent-soft) text-white"
                : "border border-(--line-soft) text-(--text-subtle) hover:bg-(--muted)"
                }`}
            >
              影视作品（长剧本）
            </button>
            <button
              type="button"
              onClick={() => setAdaptType("short")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${adaptType === "short"
                ? "bg-(--accent-soft) text-white"
                : "border border-(--line-soft) text-(--text-subtle) hover:bg-(--muted)"
                }`}
            >
              电影剧本（短剧本）
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-(--text-subtle)">
            {isProcessing && processingStep ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-(--accent-soft) border-t-transparent rounded-full animate-spin" />
                正在处理: {processingStep.label}
              </span>
            ) : processedText ? (
              "已处理文本"
            ) : (
              "原始文本"
            )}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-(--text-faint)">
              {displayText.length} 字符
            </span>
            <button
              type="button"
              onClick={() => setShowTextPanel(!showTextPanel)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-(--text-subtle) hover:text-foreground hover:bg-(--muted) transition-colors"
            >
              {showTextPanel ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  收起文本
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3" />
                  展开文本
                </>
              )}
            </button>
          </div>
        </div>
        {showTextPanel && (
          <div className="bg-(--muted) rounded-xl p-4 min-h-[400px] font-mono text-sm text-foreground whitespace-pre-wrap overflow-auto">
            {displayText || "等待导入文本..."}
          </div>
        )}
      </div>

      <div className="border-t border-(--line-soft) pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-foreground">处理进度</p>
          <span className="text-xs text-(--text-subtle)">
            {completedSteps.size} / {AI_STEPS.length - 1} 步骤完成
          </span>
        </div>

        <div className="relative h-2 bg-(--muted) rounded-full overflow-hidden mb-4">
          <div
            className="absolute left-0 top-0 h-full bg-(--accent-soft) rounded-full transition-all duration-300"
            style={{ width: `${((completedSteps.size) / (AI_STEPS.length - 1)) * 100}%` }}
          />
          {isProcessing && (
            <div className="absolute left-0 top-0 h-full bg-(--accent-soft)/50 rounded-full animate-pulse" />
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {AI_STEPS.filter(s => s.id !== "structure").map((step, index) => (
            <span
              key={step.id}
              className={`px-2 py-1 rounded text-xs ${completedSteps.has(step.id)
                ? "bg-green-100 text-green-700"
                : isProcessing && index === currentStep
                  ? "bg-(--accent-light) text-(--accent-soft)"
                  : "bg-(--muted) text-(--text-subtle)"
                }`}
            >
              {step.label}
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setCurrentStep(0);
              setProcessedText("");
              setYamlOutput("");
              setAnalysisText("");
              setCompletedSteps(new Set());
              setIsComplete(false);
            }}
            className="flex-1 px-4 py-2 rounded-lg border border-(--line-soft) text-sm text-(--text-subtle) hover:bg-(--muted) transition-colors"
          >
            重置
          </button>
          <button
            type="button"
            onClick={processAll}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 rounded-lg bg-(--accent-soft) text-white text-sm hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "处理中..." : "一键转换全部"}
          </button>
        </div>
      </div>
    </div>
  );
}
