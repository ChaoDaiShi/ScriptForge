/**
 * 章节检测与拆分工具
 * 供 ImportPage 和 Workbench 共用
 */

export interface ChapterPreview {
  index: number;
  title: string;
  wordCount: number;
  startPos?: number;
  endPos?: number;
}

export interface ChapterWithContent {
  index: number;
  title: string;
  wordCount: number;
  originalIndex: number;
  content: string;
}

/**
 * 从文本中检测章节结构
 * 支持中文（第X章/卷X）、英文（Chapter X）、日文等多种格式
 */
export function detectChapters(text: string): ChapterPreview[] {
  const lines = text.split("\n");

  const chapterPatterns = [
    // 中文格式
    /^第[一二三四五六七八九十百千零\d]+[章节部回卷集]/,
    /^第\s*[一二三四五六七八九十百千零\d]+\s*[章节部回卷集]/,
    /^[一二三四五六七八九十百千零\d]+[章节部回卷集]/,
    /^第[一二三四五六七八九十百千零\d]+[\s\-_][章节部回卷集]?/,
    /^卷[一二三四五六七八九十百千零\d]+/,
    /^[卷部篇][一二三四五六七八九十百千零\d]+/,
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
    // 数字开头
    /^\d+\s*[章节部回卷集]/,
    /^\d+[\.\-\s][章节部回卷集]?/,
  ];

  const filterKeywords = [
    "插图", "插图页", "color", "COLOR", "illustration", "Illustration",
    "postscript", "Postscript", "后记", "序", "序章", "前言",
    "目录", "contents", "Contents", "CONTENTS",
    "作者简介", "作者紹介", "about the author",
  ];

  const detected: ChapterPreview[] = [];
  let currentChapter: ChapterPreview | null = null;
  let currentCharPos = 0;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const lineStartPos = currentCharPos;
    const lineEndPos = lineStartPos + line.length + 1;

    const matchesPattern = chapterPatterns.some((pattern) => pattern.test(trimmed));

    const isValidChapter =
      matchesPattern &&
      !filterKeywords.some((keyword) => trimmed.includes(keyword)) &&
      !/[『「【（『“”""]/.test(trimmed) &&
      trimmed.length <= 100 &&
      (/第[一二三四五六七八九十百千零\d]+[章节部回卷集]/.test(trimmed) ||
        /[卷部篇][一二三四五六七八九十百千零\d]+/.test(trimmed) ||
        /Chapter\s+\d+/i.test(trimmed) ||
        /Volume\s+\d+/i.test(trimmed));

    if (isValidChapter) {
      if (currentChapter) {
        currentChapter.endPos = lineStartPos;
      }
      currentChapter = {
        index: detected.length + 1,
        title: trimmed.slice(0, 80),
        wordCount: 0,
        startPos: lineStartPos,
      };
      detected.push(currentChapter);
    } else if (currentChapter) {
      currentChapter.wordCount += trimmed.length;
    }

    currentCharPos = lineEndPos;
  });

  if (currentChapter) {
    currentChapter.endPos = text.length;
  }

  // 检测不足3章时，尝试按段落智能分段
  if (detected.length < 3 && text.trim().length > 1000) {
    const paragraphs = text
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 100);

    if (paragraphs.length >= 3) {
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

      if (newChapters.length >= 3) {
        return newChapters;
      }
    }
  }

  return detected;
}

/**
 * 从检测到的章节中按索引提取内容
 */
export function extractChapterContents(
  text: string,
  chapters: ChapterPreview[],
  selectedIndices: Set<number>,
): ChapterWithContent[] {
  const selectedChapters = chapters.filter((ch) => selectedIndices.has(ch.index));

  return selectedChapters.map((ch, idx) => {
    let content = "";
    if (ch.startPos !== undefined && ch.endPos !== undefined) {
      content = text.slice(ch.startPos, ch.endPos);
    } else {
      const lines = text.split("\n");
      content =
        lines.slice((ch.index - 1) * 100, ch.index * 100).join("\n") ||
        ch.title;
    }

    return {
      index: idx + 1,
      title: ch.title,
      wordCount: ch.wordCount,
      originalIndex: ch.index,
      content,
    };
  });
}
