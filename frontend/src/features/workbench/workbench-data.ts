export type SceneStatus = "draft" | "review" | "blocked" | "ready";

export interface SceneItem {
  id: string;
  code: string;
  title: string;
  location: string;
  intent: string;
  status: SceneStatus;
  progress: number;
  duration: string;
  tokens: number;
  beats: string[];
}

export interface TaskItem {
  id: string;
  title: string;
  owner: string;
  priority: "P0" | "P1" | "P2";
  eta: string;
}

export interface AssetItem {
  id: string;
  title: string;
  type: "人物设定" | "场景模板" | "对白语料" | "世界观资料";
  updatedAt: string;
  usageCount: number;
}

export const scenes: SceneItem[] = [
  {
    id: "scene-01",
    code: "EP01-S01",
    title: "雨夜抵达旧港",
    location: "外景 / 旧港码头",
    intent: "建立危机感与主角第一动机",
    status: "ready",
    progress: 92,
    duration: "2m 10s",
    tokens: 1480,
    beats: ["暴雨遮挡视线", "主角误认联系人", "镜头落到被篡改的货柜编号"],
  },
  {
    id: "scene-02",
    code: "EP01-S02",
    title: "调度室里的伪证",
    location: "内景 / 港务调度室",
    intent: "抛出第一层线索冲突",
    status: "review",
    progress: 68,
    duration: "3m 25s",
    tokens: 2014,
    beats: ["监控缺失十分钟", "角色互相试探", "发现伪造日志的时间戳错误"],
  },
  {
    id: "scene-03",
    code: "EP01-S03",
    title: "巷口的临时交易",
    location: "外景 / 海鲜市场后巷",
    intent: "让配角正式卷入主线",
    status: "draft",
    progress: 43,
    duration: "1m 45s",
    tokens: 952,
    beats: ["交换失败", "第三方目击者出现", "留下可追踪物证"],
  },
  {
    id: "scene-04",
    code: "EP01-S04",
    title: "电梯里的沉默对峙",
    location: "内景 / 金融中心 B 座",
    intent: "推进人物关系反转",
    status: "blocked",
    progress: 27,
    duration: "2m 00s",
    tokens: 734,
    beats: ["双方都知道对方在说谎", "台词留白", "出电梯即切到新闻爆点"],
  },
];

export const taskColumns = [
  {
    key: "queue",
    label: "待生成",
    count: 4,
    items: [
      { id: "task-01", title: "补全 EP01-S04 镜头板", owner: "Lumi", priority: "P1", eta: "14 min" },
      { id: "task-02", title: "刷新角色语气词样本", owner: "Mika", priority: "P2", eta: "22 min" },
    ] satisfies TaskItem[],
  },
  {
    key: "running",
    label: "生成中",
    count: 2,
    items: [
      { id: "task-03", title: "批量重写港口线对白", owner: "Forge", priority: "P0", eta: "03 min" },
      { id: "task-04", title: "压缩世界观设定提示词", owner: "Rune", priority: "P1", eta: "09 min" },
    ] satisfies TaskItem[],
  },
  {
    key: "review",
    label: "待审核",
    count: 3,
    items: [
      { id: "task-05", title: "检查场景节奏断点", owner: "Nora", priority: "P0", eta: "Ready" },
      { id: "task-06", title: "核对人物关系图", owner: "Kai", priority: "P1", eta: "Ready" },
    ] satisfies TaskItem[],
  },
  {
    key: "done",
    label: "已完成",
    count: 9,
    items: [
      { id: "task-07", title: "导出第一版结构 YAML", owner: "Forge", priority: "P2", eta: "Done" },
      { id: "task-08", title: "生成第一轮场景摘要", owner: "Lumi", priority: "P2", eta: "Done" },
    ] satisfies TaskItem[],
  },
];

export const assets: AssetItem[] = [
  {
    id: "asset-01",
    title: "旧港角色动机表",
    type: "人物设定",
    updatedAt: "2h ago",
    usageCount: 14,
  },
  {
    id: "asset-02",
    title: "金融中心夜景镜头模板",
    type: "场景模板",
    updatedAt: "5h ago",
    usageCount: 9,
  },
  {
    id: "asset-03",
    title: "调查戏对白节奏包",
    type: "对白语料",
    updatedAt: "Yesterday",
    usageCount: 23,
  },
  {
    id: "asset-04",
    title: "海运财团关系索引",
    type: "世界观资料",
    updatedAt: "Yesterday",
    usageCount: 7,
  },
];

export const queueMetrics = [
  { label: "本轮生成", value: "18", detail: "scene blocks" },
  { label: "平均延迟", value: "4.2m", detail: "per task" },
  { label: "通过率", value: "87%", detail: "editor review" },
];

export const promptPreview = `episode: EP01
scene: EP01-S02
tone: tense, procedural, rain-soaked
must_keep:
  - forged log timestamp mismatch
  - two-character verbal feint
  - end on silent realization
avoid:
  - exposition dump
  - melodramatic confession`;
