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
  Film,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  createScript,
  fetchScript,
  fetchTask,
  fetchTasks,
  startScriptProcessing,
} from "@/lib/api";
import { useProjectStore } from "@/store/useProjectStore";
import { useScriptStore } from "@/store/useScriptStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useToastStore } from "@/store/useToastStore";
import { useNovelStore } from "@/store/useNovelStore";
import mammoth from "mammoth";

type ImportStep = "upload" | "preview" | "configure" | "confirm" | "converting";

interface ChapterPreview {
  index: number;
  title: string;
  wordCount: number;
  startPos?: number;
  endPos?: number;
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ImportStep>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [chapters, setChapters] = useState<ChapterPreview[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set());
  const [selectedChapterList, setSelectedChapterList] = useState<ChapterPreview[]>([]);
  const [adaptType, setAdaptType] = useState<"short" | "long" | null>(null);
  const [convertProgress, setConvertProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [stepMessages, setStepMessages] = useState<string[]>([]);
  const [lastProgressUpdate, setLastProgressUpdate] = useState<number>(0);
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
  const addNovel = useNovelStore((s) => s.addNovel);
  const setCurrentNovel = useNovelStore((s) => s.setCurrentNovel);

  const mapBackendScriptToWorkbench = (
    script: Awaited<ReturnType<typeof createScript>>,
    projectId: string,
  ) => {
    const scenes = script.scenes || [];
    const hasProcessedScenes = scenes.length > 0;

    return {
      id: script.id,
      projectId,
      title: script.title,
      sourceText: script.original_text ?? "",
      backend: script,
      episodes: [
        {
          id: `${script.id}_episode_1`,
          title: script.title,
          coldOpen: script.main_plot ?? (hasProcessedScenes ? undefined : "正在处理中..."),
          scenes: hasProcessedScenes
            ? scenes.map((scene) => ({
              id: scene.id,
              code: `SC-${scene.heading?.scene_number || 1}`,
              title: `${scene.heading?.location || "未知地点"} · ${scene.heading?.time_of_day || "未知时间"}`,
              location: scene.heading?.location || "未知地点",
              intent:
                typeof scene.descriptions?.[0]?.content === "string"
                  ? String(scene.descriptions[0].content)
                  : (scene.dialogues?.[0]?.content ?? "待补充场景意图"),
              beats: (scene.dialogues || []).map((dialogue) => ({
                id: dialogue.id,
                description: dialogue.content,
                dialogue: dialogue.content,
                character: dialogue.speaker_name ?? undefined,
              })),
              status: "draft" as const,
            }))
            : [
              // 创建一个临时场景，让工作台有内容显示
              {
                id: `${script.id}_temp_scene_1`,
                code: "SC-001",
                title: "场景处理中...",
                location: "等待AI分析",
                intent: "AI正在分析文本结构，请稍候...",
                beats: [
                  {
                    id: `${script.id}_temp_beat_1`,
                    description: "正在提取人物角色...",
                    dialogue: undefined,
                    character: undefined,
                  },
                  {
                    id: `${script.id}_temp_beat_2`,
                    description: "正在分析场景结构...",
                    dialogue: undefined,
                    character: undefined,
                  },
                ],
                status: "draft" as const,
              },
            ],
        },
      ],
    };
  };

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
      // 数字开头的格式
      /^\d+\s*[章节部回卷集]/,
      /^\d+[\.\-\s][章节部回卷集]?/,
    ];

    // 需要过滤的关键词
    const filterKeywords = [
      '插图', '插图页', 'color', 'COLOR', 'illustration', 'Illustration',
      'postscript', 'Postscript', '后记', '序', '序章', '前言',
      '目录', 'contents', 'Contents', 'CONTENTS',
      '作者简介', '作者紹介', 'about the author'
    ];

    const detected: ChapterPreview[] = [];
    let currentChapter: ChapterPreview | null = null;
    let currentCharPos = 0; // 记录当前字符位置

    lines.forEach((line) => {
      const trimmed = line.trim();
      const lineStartPos = currentCharPos;
      const lineEndPos = lineStartPos + line.length + 1; // +1 是换行符

      // 检查是否匹配任何章节模式
      const matchesPattern = chapterPatterns.some((pattern) => pattern.test(trimmed));

      // 额外的验证规则
      const isValidChapter = matchesPattern &&
        // 检查是否包含过滤关键词
        !filterKeywords.some(keyword => trimmed.includes(keyword)) &&
        // 检查是否包含特殊引号（如 『第一章』这种情况）
        !/[『「【（『“”""]/.test(trimmed) &&
        // 检查长度
        trimmed.length <= 100 &&
        // 检查是否为纯章节标题格式（避免误匹配普通文本）
        (
          // 明确有章节关键词的情况
          /第[一二三四五六七八九十百千零\d]+[章节部回卷集]/.test(trimmed) ||
          /[卷部篇][一二三四五六七八九十百千零\d]+/.test(trimmed) ||
          /Chapter\s+\d+/i.test(trimmed) ||
          /Volume\s+\d+/i.test(trimmed)
        );

      if (isValidChapter) {
        // 保存前一个章节的结束位置
        if (currentChapter) {
          currentChapter.endPos = lineStartPos;
        }

        // 开始新章节
        currentChapter = {
          index: detected.length + 1,
          title: trimmed.slice(0, 80),
          wordCount: 0,
          startPos: lineStartPos,
        };
        detected.push(currentChapter);
      } else if (currentChapter) {
        // 累加当前章节的字数
        currentChapter.wordCount += trimmed.length;
      }

      currentCharPos = lineEndPos;
    });

    // 设置最后一个章节的结束位置
    if (currentChapter) {
      (currentChapter as ChapterPreview).endPos = text.length;
    }

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
        let currentPos = 0;

        for (let i = 0; i < 3; i++) {
          const start = i * chapterSize;
          const end = Math.min(start + chapterSize, paragraphs.length);
          const chapterParagraphs = paragraphs.slice(start, end);

          if (chapterParagraphs.length > 0) {
            const chapterText = chapterParagraphs.join("\n\n");
            const chapterStartPos = text.indexOf(chapterText, currentPos);
            const chapterEndPos = chapterStartPos + chapterText.length;
            currentPos = chapterEndPos;

            newChapters.push({
              index: i + 1,
              title: `第 ${i + 1} 部分（约 ${chapterParagraphs.length} 段）`,
              wordCount: chapterText.length,
              startPos: chapterStartPos,
              endPos: chapterEndPos,
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
    const textLength = text.trim().length;
    const potentialChapters = analyzeChapterPatterns(text);

    // 如果没有检测到 3 个章节，但文本足够长（超过 1000 字），也允许通过
    if (detected.length < 3 && textLength < 1000) {
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
    setChapters(detected);
    // 自动选中所有章节
    setSelectedChapters(new Set(detected.map(ch => ch.index)));
    setSelectedChapterList([]); // 清空之前的选中列表
    setStep("preview");
  };

  const handleGoToWorkbench = async () => {
    if (!pasteContent.trim()) {
      addToast({ type: "error", title: "请导入文本", message: "请先上传或粘贴小说文本内容" });
      return;
    }

    // 提取选中的章节内容
    const filteredSelectedChapterList = chapters.filter(ch => selectedChapters.has(ch.index));

    // 为每个章节提取内容
    const chaptersWithContent = filteredSelectedChapterList.map((ch, idx) => {
      let content = '';
      if (ch.startPos !== undefined && ch.endPos !== undefined) {
        content = pasteContent.slice(ch.startPos, ch.endPos);
      } else {
        // 如果没有位置信息，尝试从文本中提取
        const lines = pasteContent.split('\n');
        content = lines.slice((ch.index - 1) * 100, ch.index * 100).join('\n') || ch.title;
      }

      return {
        index: idx + 1,
        title: ch.title,
        wordCount: ch.wordCount,
        originalIndex: ch.index,
        content: content,
      };
    });

    const selectedContent = chaptersWithContent.map(ch => ch.content).join('\n\n');

    // 创建项目
    const backendProject = await createProject({
      title: `新项目 (${selectedChapters.size}章)`,
      source_novel: "导入文本",
      source_author: "未知作者",
      chapter_count: selectedChapters.size,
    });
    const projectId = backendProject.id;
    const project = {
      id: backendProject.id,
      title: backendProject.title,
      sourceNovel: backendProject.source_novel,
      sourceAuthor: backendProject.source_author,
      chapterCount: backendProject.chapter_count,
      status: backendProject.status === "failed" || backendProject.status === "distributing"
        ? "idle"
        : backendProject.status,
      createdAt: backendProject.created_at,
    };
    addProject(project);
    setCurrentProject(projectId);

    // 创建小说数据
    const novelId = `novel_${Date.now().toString(36)}`;
    const novelData = {
      id: novelId,
      projectId,
      title: project.title,
      author: "未知作者",
      totalChapters: selectedChapters.size,
      totalWordCount: selectedContent.length,
      chapters: chaptersWithContent,
      fullText: selectedContent,
      createdAt: new Date().toISOString(),
    };
    addNovel(novelData);
    setCurrentNovel(novelId);

    // 创建基础剧本数据（不需要AI处理）
    const scriptId = `script_${Date.now().toString(36)}`;
    const initialScriptData = {
      id: scriptId,
      projectId,
      title: project.title,
      sourceText: selectedContent,
      episodes: [
        {
          id: `${scriptId}_episode_1`,
          title: project.title,
          coldOpen: "等待 AI 分析",
          scenes: [
            {
              id: `${scriptId}_scene_1`,
              code: "SC-001",
              title: "等待处理",
              location: "等待分析",
              intent: "导入的原始文本尚未处理，请启动 AI 转换",
              beats: [],
              status: "draft" as const,
            },
          ],
        },
      ],
    };
    upsertScript(initialScriptData);
    setCurrentScript(scriptId);

    // 跳转到工作台
    navigate("/workbench");
    addToast({ type: "success", title: "已进入工作台" });
  };

  const handleStartConvert = async () => {
    if (!adaptType || !pasteContent.trim() || isSubmitting) return;
    if (selectedChapters.size === 0) {
      addToast({
        type: "error",
        title: "请选择章节",
        message: "请至少选择一个章节进行AI分析",
      });
      return;
    }

    setIsSubmitting(true);
    setStep("converting");
    setConvertProgress(0);

    const backendProject = await createProject({
      title: `新项目 (${selectedChapters.size}章)`,
      source_novel: "导入文本",
      source_author: "未知作者",
      chapter_count: selectedChapters.size,
    });
    const projectId = backendProject.id;
    const novelId = `novel_${Date.now().toString(36)}`;
    const project = {
      id: backendProject.id,
      title: backendProject.title,
      sourceNovel: backendProject.source_novel,
      sourceAuthor: backendProject.source_author,
      chapterCount: backendProject.chapter_count,
      status: "converting" as const,
      createdAt: backendProject.created_at,
    };
    addProject(project);
    setCurrentProject(projectId);

    // 提取选中的章节内容
    const filteredSelectedChapterList = chapters.filter(ch => selectedChapters.has(ch.index));
    setSelectedChapterList(filteredSelectedChapterList); // 保存到状态
    // 只提取选中章节的内容
    const selectedContent = filteredSelectedChapterList
      .map(ch => {
        if (ch.startPos !== undefined && ch.endPos !== undefined) {
          return pasteContent.slice(ch.startPos, ch.endPos);
        }
        return ch.title + '\n'; // 回退方案
      })
      .join('\n\n');

    const novelData = {
      id: novelId,
      projectId,
      title: project.title,
      author: "未知作者",
      totalChapters: selectedChapters.size,
      totalWordCount: selectedContent.length,
      chapters: filteredSelectedChapterList.map((ch, idx) => ({
        index: idx + 1,
        title: ch.title,
        wordCount: ch.wordCount,
        originalIndex: ch.index,
      })),
      fullText: selectedContent,
      createdAt: new Date().toISOString(),
    };
    addNovel(novelData);
    setCurrentNovel(novelId);

    try {
      setStepMessages(["正在创建剧本..."]);
      setCurrentStep("创建剧本");

      console.log("Step 1: Creating script...");
      const script = await createScript({
        title: project.title,
        type: adaptType === "short" ? "short_film" : "feature_film",
        text: selectedContent.trim(),
        project_id: projectId,
      });
      console.log("Script created:", script);
      setStepMessages(prev => [...prev, "✅ 剧本创建完成"]);

      // 立即保存基础剧本数据到 store，即使任务还在处理中
      const initialScriptData = mapBackendScriptToWorkbench(script, projectId);
      upsertScript(initialScriptData);
      setCurrentScript(script.id);

      setCurrentStep("启动处理任务");
      setStepMessages(prev => [...prev, "正在启动处理任务..."]);

      console.log("Step 2: Starting script processing...");
      const processingTask = await startScriptProcessing(script.id, projectId);
      console.log("Processing task:", processingTask);
      setStepMessages(prev => [...prev, "✅ 处理任务启动成功"]);

      setCurrentStep("获取任务状态");
      setStepMessages(prev => [...prev, "正在获取任务状态..."]);

      console.log("Step 3: Fetching live task...");
      const liveTask = await fetchTask(processingTask.id);
      console.log("Live task:", liveTask);
      setStepMessages(prev => [...prev, "✅ 任务状态获取成功"]);

      updateProject(projectId, {
        scriptId: script.id,
        taskId: liveTask.id,
      });

      addTask(liveTask);
      upsertScript(mapBackendScriptToWorkbench(script, projectId));
      setCurrentScript(script.id);
      setConvertProgress(Math.max(10, liveTask.progress));

      const stepNames: Record<string, string> = {
        dialogue_extraction: "步骤1: 提取对话",
        character_extraction: "步骤2: 提取人物和描写",
        main_plot_extraction: "步骤3: 提取主线",
        dialogue_speaker_tagging: "步骤4: 标记对话主体",
        scene_analysis: "步骤6: 分析场景头",
        psychology_conversion: "步骤7: 转换心理描写",
        scene_packaging: "步骤8: 打包场景",
        useless_line_detection: "步骤9: 检测无用语句",
        useless_line_removal: "步骤10: 移除无用语句",
        polishing: "步骤11: 润色处理",
        export: "步骤12: 导出剧本",
      };

      const completionPoll = window.setInterval(async () => {
        try {
          console.log("Polling task:", liveTask.id);
          const latestTask = await fetchTask(liveTask.id);
          console.log("Latest task:", latestTask);

          updateTask(latestTask.id, latestTask);

          // 检查进度是否有变化
          const previousProgress = convertProgress;
          setConvertProgress(latestTask.progress);

          if (latestTask.progress > previousProgress) {
            setLastProgressUpdate(Date.now());
          }

          // 检查是否长时间无响应（超过2分钟）
          const now = Date.now();
          if (now - lastProgressUpdate > 120000) {
            // 显示警告但不跳转
            if (!stepMessages.includes("⚠️ 检测到长时间无响应，正在尝试重新连接...")) {
              setStepMessages(prev => [...prev, "⚠️ 检测到长时间无响应，正在尝试重新连接..."]);
            }
          }

          // 更新当前步骤
          if (latestTask.current_step && stepNames[latestTask.current_step]) {
            const stepName = stepNames[latestTask.current_step];
            if (currentStep !== stepName) {
              setCurrentStep(stepName);
              setStepMessages(prev => [...prev, `🔄 ${stepName}...`]);
            }
          }

          if (latestTask.status === "done") {
            window.clearInterval(heartbeatInterval);
            setCurrentStep("完成");
            setStepMessages(prev => [...prev, "🎉 剧本转换完成！"]);
            const scriptDetail = await fetchScript(script.id);
            upsertScript(mapBackendScriptToWorkbench(scriptDetail, projectId));
            updateProject(projectId, { status: "ready" });
            setCurrentScript(script.id);
            window.clearInterval(completionPoll);
            setTimeout(() => {
              addToast({ type: "success", title: "剧本转换完成" });
              navigate("/workbench");
            }, 1000);
          } else if (latestTask.status === "failed") {
            window.clearInterval(heartbeatInterval);
            setCurrentStep("失败");
            setStepMessages(prev => [...prev, `❌ 转换失败: ${latestTask.error_message ?? "未知错误"}`]);
            updateProject(projectId, { status: "idle" });
            window.clearInterval(completionPoll);
            setTimeout(() => {
              addToast({
                type: "error",
                title: "转换失败",
                message: latestTask.error_message ?? "后端处理失败",
              });
            }, 500);
          }
        } catch (error) {
          console.error("Polling error:", error);
          // 超时或网络错误时不自动跳转，只显示错误信息
          if (error instanceof Error && error.name === "AbortError") {
            setStepMessages(prev => [...prev, "⚠️ 请求超时，正在重试..."]);
            // 继续轮询，不要停止
          } else {
            setCurrentStep("轮询失败");
            setStepMessages(prev => [...prev, `❌ 轮询失败: ${error instanceof Error ? error.message : "未知错误"}`]);
            // 不要自动停止轮询，保持重试
          }
        }
      }, 2000);

      // 添加模拟进度更新机制，防止进度长时间不动
      const heartbeatInterval = window.setInterval(() => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastProgressUpdate;

        // 如果超过5秒没有进度更新，添加心跳消息
        if (timeSinceLastUpdate > 5000 && convertProgress < 100) {
          setStepMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (!lastMsg?.includes("处理中")) {
              return [...prev, "⏳ AI正在处理中..."];
            }
            return prev;
          });
        }
      }, 8000);

    } catch (error) {
      // 只有在创建脚本或启动任务阶段失败才跳转回配置页
      // 轮询过程中的错误由轮询内部处理
      console.error("Initial setup error:", error);
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
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200 ${dragOver
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
                {chapters.length}
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
                {chapters.length > 0
                  ? Math.round(pasteContent.length / chapters.length).toLocaleString()
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
                  已识别 <strong>{chapters.length}</strong>{" "}
                  个章节，已选择 <strong>{selectedChapters.size}</strong>{" "}
                  个章节进行AI分析
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedChapters.size === chapters.length) {
                      setSelectedChapters(new Set());
                    } else {
                      setSelectedChapters(new Set(chapters.map(ch => ch.index)));
                    }
                  }}
                  className="rounded-lg border border-(--line-soft) px-3 py-1.5 text-xs text-foreground hover:bg-(--muted) transition-colors"
                >
                  {selectedChapters.size === chapters.length ? "取消全选" : "全选"}
                </button>
                <span className="badge badge-success">
                  <Check className="h-3 w-3" />
                  {selectedChapters.size}/{chapters.length}
                </span>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-(--line-soft) bg-(--accent-light)/30 p-3">
              <p className="text-xs text-(--text-subtle) leading-relaxed">
                <span className="font-medium">识别说明：</span>
                系统通过识别章节标题（如"第X章"、"Chapter X"、"卷X"等）来自动划分章节。
                每个章节下方显示的字数为该章节的字符总数，右侧百分比表示该章节占总字数的比例。
              </p>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {chapters.map((ch) => {
                const percentage = chapters.length > 0
                  ? Math.round((ch.wordCount / pasteContent.length) * 100)
                  : 0;
                const isSelected = selectedChapters.has(ch.index);

                return (
                  <div
                    key={ch.index}
                    className={`group rounded-xl border cursor-pointer transition-all ${isSelected
                      ? "border-(--accent-soft) bg-(--accent-light)/30"
                      : "border-(--line-soft) bg-white hover:border-(--accent-soft)/50 hover:bg-(--accent-light)/30"
                      }`}
                    onClick={() => {
                      const newSelected = new Set(selectedChapters);
                      if (isSelected) {
                        newSelected.delete(ch.index);
                      } else {
                        newSelected.add(ch.index);
                      }
                      setSelectedChapters(newSelected);
                    }}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        className="h-4 w-4 rounded border-(--line-medium) text-(--accent-soft) focus:ring-(--accent-soft)/30"
                      />
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
                    <div className="flex items-center justify-between px-3 pb-2">
                      <p className="text-xs text-(--text-faint)">
                        占比 {percentage}%
                      </p>
                      {isSelected && (
                        <span className="badge badge-success">
                          <Check className="h-3 w-3" />
                          已选择
                        </span>
                      )}
                    </div>
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
              onClick={() => {
                if (selectedChapters.size === 0) {
                  alert("请至少选择一个章节进行AI分析");
                  return;
                }
                setStep("configure");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-5 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
            >
              继续配置 ({selectedChapters.size} 个章节)
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
                      label: "影视作品剧本",
                      desc: "适合影视制作，标准剧本格式",
                    },
                    {
                      key: "long" as const,
                      label: "电影剧本",
                      desc: "长篇电影剧本，完整故事架构",
                    },
                  ].map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setAdaptType(type.key)}
                      className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${adaptType === type.key
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
                      AI 将分析已选择的 {selectedChapters.size} 个章节
                    </p>
                    <p className="mt-1 text-xs text-(--text-subtle) leading-5">
                      逐一解析章节内容，提取人物、场景和对白，按照剧本原子化规范生成结构化
                      YAML 剧本。过程约需 {selectedChapters.size * 0.5}-{selectedChapters.size * 1} 分钟。
                    </p>
                    {selectedChapters.size < chapters.length && (
                      <p className="mt-1 text-xs text-(--accent-soft)">
                        提示：您选择了 {selectedChapters.size}/{chapters.length} 个章节进行测试，其他章节将在后续分析。
                      </p>
                    )}
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
              onClick={handleGoToWorkbench}
              disabled={!adaptType}
              className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-5 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              进入工作台
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="card">
            <p className="text-xs uppercase tracking-[0.22em] text-(--text-faint) mb-4">
              确认转换配置
            </p>

            <div className="space-y-4">
              {/* 剧本类型 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-(--accent-light)/30">
                <div>
                  <p className="text-sm text-(--text-subtle)">剧本类型</p>
                  <p className="font-medium text-foreground">
                    {adaptType === "short" ? "影视作品剧本" : "电影剧本"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-(--accent-soft) flex items-center justify-center">
                  <Film className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* 章节数量 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-(--accent-light)/30">
                <div>
                  <p className="text-sm text-(--text-subtle)">待处理章节</p>
                  <p className="font-medium text-foreground">
                    {selectedChapters.size} 个章节
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* 预计时间 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-(--accent-light)/30">
                <div>
                  <p className="text-sm text-(--text-subtle)">预计处理时间</p>
                  <p className="font-medium text-foreground">
                    {selectedChapters.size * 2 - 5} - {selectedChapters.size * 3} 秒
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* 章节列表预览 */}
              <div className="p-4 rounded-xl border border-(--line-soft)">
                <p className="text-sm font-medium text-foreground mb-3">章节列表</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedChapterList.map((ch) => (
                    <div key={ch.index} className="flex items-center justify-between text-sm">
                      <span className="text-(--text-subtle)">第 {ch.index} 章</span>
                      <span className="text-(--text-faint) truncate max-w-[200px]">{ch.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("configure")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--line-medium) px-4 py-2 text-sm text-foreground hover:bg-(--muted) transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回修改
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGoToWorkbench}
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--accent-soft) px-4 py-2 text-sm font-medium text-(--accent-soft) hover:bg-(--accent-light) transition-colors"
              >
                <FileText className="h-4 w-4" />
                直接进入工作台
              </button>
              <button
                type="button"
                onClick={handleStartConvert}
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent-soft) px-5 py-2 text-sm font-medium text-white hover:bg-(--accent-soft)/90 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                开始 AI 转换
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "converting" && (
        <div className="animate-fade-in-up">
          <div className="card overflow-hidden">
            {/* 头部动画区域 */}
            <div className="bg-gradient-to-br from-(--accent-light) to-white py-8 px-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
                {convertProgress < 100 ? (
                  <Loader2 className="h-7 w-7 animate-spin text-(--accent-soft)" />
                ) : (
                  <Check className="h-7 w-7 text-green-500" />
                )}
              </div>
              <h2 className="font-serif text-xl text-foreground mb-2">
                {convertProgress < 100 ? "AI 正在分析转换..." : "转换完成！"}
              </h2>
              <p className="text-sm text-(--text-subtle) max-w-md mx-auto">
                {convertProgress < 100
                  ? "正在逐章解析文本结构，提取人物与场景关系"
                  : "小说文本已成功转换为结构化剧本"}
              </p>
            </div>

            {/* 进度条 */}
            <div className="px-6 py-4 border-b border-(--line-soft)">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">转换进度</span>
                <span className="text-sm font-bold text-(--accent-soft)">{Math.round(convertProgress)}%</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-(--muted)">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-(--accent-soft) to-(--accent-soft)/70 transition-all duration-500 ease-out"
                  style={{ width: `${convertProgress}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-white/30 animate-pulse"
                  style={{ width: `${convertProgress}%` }}
                />
              </div>
            </div>

            {/* 当前步骤 */}
            <div className="px-6 py-4 bg-(--accent-light)/30">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--accent-soft) text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-(--text-faint)">当前步骤</p>
                  <p className="text-sm font-medium text-foreground">
                    {currentStep || "初始化中..."}
                  </p>
                </div>
              </div>
            </div>

            {/* 步骤日志 */}
            <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
              <p className="text-xs uppercase tracking-[0.15em] text-(--text-faint) mb-3">处理日志</p>
              <div className="space-y-2">
                {stepMessages.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-(--text-subtle)">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-(--muted)">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                    <span>等待任务开始...</span>
                  </div>
                ) : (
                  stepMessages.map((msg, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${msg.includes("完成") ? "bg-green-100 text-green-600" :
                        msg.includes("失败") ? "bg-red-100 text-red-600" :
                          "bg-(--accent-light) text-(--accent-soft)"
                        }`}>
                        {msg.includes("完成") ? <Check className="h-3 w-3" /> :
                          msg.includes("失败") ? <AlertCircle className="h-3 w-3" /> :
                            <span className="text-xs">{idx + 1}</span>}
                      </div>
                      <span className={msg.includes("失败") ? "text-red-500" : "text-foreground"}>
                        {msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 步骤详情 */}
            <div className="px-6 py-4 border-t border-(--line-soft)">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.15em] text-(--text-faint)">步骤处理详情</p>
                <button
                  type="button"
                  onClick={() => {
                    console.log("查看步骤详情");
                  }}
                  className="text-xs text-(--accent-soft) hover:underline"
                >
                  查看完整报告
                </button>
              </div>
              <div className="space-y-2 text-xs max-h-[200px] overflow-y-auto">
                {stepMessages.filter(msg => msg.includes("步骤") || msg.includes("提取") || msg.includes("移除") || msg.includes("转换") || msg.includes("标记")).map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-(--muted)/50">
                    <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-(--accent-light) text-(--accent-soft)">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground font-medium">{msg}</p>
                      {msg.includes("提取对话") && (
                        <p className="text-(--text-subtle) mt-1">✓ 已为对话添加唯一标识 |id|</p>
                      )}
                      {msg.includes("移除") && (
                        <p className="text-(--text-subtle) mt-1">✓ 移除的语句已记录在详细报告中</p>
                      )}
                      {msg.includes("标记对话主体") && (
                        <p className="text-(--text-subtle) mt-1">✓ 已使用 ***主体*** 标记说话人</p>
                      )}
                      {msg.includes("转换心理描写") && (
                        <p className="text-(--text-subtle) mt-1">✓ 已转换为动作描写</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 章节进度 */}
            <div className="px-6 py-4 border-t border-(--line-soft) bg-(--muted)/50">
              <p className="text-xs uppercase tracking-[0.15em] text-(--text-faint) mb-3">章节处理</p>
              <div className="grid grid-cols-2 gap-2">
                {selectedChapterList.slice(0, 6).map((ch, idx) => {
                  const done = convertProgress > ((idx + 1) / selectedChapterList.length) * 100;
                  return (
                    <div
                      key={ch.index}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${done ? "bg-green-50 text-green-700" : "bg-white text-(--text-subtle)"
                        }`}
                    >
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full ${done ? "bg-green-500" : "bg-(--line-soft)"
                        }`}>
                        {done ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                      </div>
                      <span className="truncate">{ch.title}</span>
                    </div>
                  );
                })}
              </div>
              {selectedChapterList.length > 6 && (
                <p className="mt-2 text-xs text-(--text-faint)">
                  还有 {selectedChapterList.length - 6} 个章节待处理...
                </p>
              )}
            </div>

            {/* 底部提示 */}
            <div className="px-6 py-4 bg-(--accent-light)/20 text-center">
              <p className="text-xs text-(--text-subtle)">
                预计剩余时间：{Math.max(0, Math.round((100 - convertProgress) * 0.1))} 秒 (快速模式)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
