const API_BASE_URL = "/api";

export function apiUrl(path: string) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${normalizedBaseUrl}/${normalizedPath}`;
}

function authHeaders() {
  if (typeof window === "undefined") {
    return {};
  }
  const auth = window.localStorage.getItem("scriptforge-auth");
  if (!auth) {
    return {};
  }
  try {
    const parsed = JSON.parse(auth) as {
      user?: { id?: string };
      token?: string;
    };
    return {
      ...(parsed.user?.id ? { "X-User-Id": parsed.user.id } : {}),
      ...(parsed.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
    };
  } catch {
    return {};
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response;
}

export interface ApiEnvelope<T> {
  code: number;
  status: "success" | "error";
  message: string;
  data: T;
  timestamp: string;
  errors?: Record<string, unknown>;
}

export type ScriptType = "feature_film" | "short_film";
export type TaskStatus = "queued" | "running" | "review" | "done" | "failed";
export type ProjectStatus =
  | "idle"
  | "importing"
  | "converting"
  | "ready"
  | "distributing"
  | "failed";
export type ExportFormat = "yaml" | "pdf" | "json" | "share";
export type DistributionPlatform = "douyin" | "wechat";

export interface ScriptCharacter {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  traits: string[];
}

export interface ScriptSceneHeading {
  scene_number: number;
  is_interior: boolean;
  location: string;
  time_of_day: string;
}

export interface ScriptScene {
  id: string;
  heading: ScriptSceneHeading;
  dialogues: Array<{
    id: string;
    speaker_id?: string | null;
    speaker_name?: string | null;
    content: string;
    emotion?: string | null;
  }>;
  descriptions: Array<Record<string, unknown>>;
  characters: ScriptCharacter[];
}

export interface BackendScript {
  id: string;
  title: string;
  type: ScriptType;
  original_text: string;
  processed_text?: string | null;
  characters: ScriptCharacter[];
  scenes: ScriptScene[];
  main_plot?: string | null;
  project_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendTask {
  id: string;
  project_id?: string | null;
  script_id: string;
  script_title: string;
  title: string;
  type: "convert" | "export" | "distribution";
  status: TaskStatus;
  progress: number;
  current_step?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendProject {
  id: string;
  user_id?: string | null;
  title: string;
  source_novel: string;
  source_author: string;
  chapter_count: number;
  status: ProjectStatus;
  script_id?: string | null;
  task_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  credits: number;
  credits_used: number;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

export interface ProjectExportRecord {
  id: string;
  project_id: string;
  script_id?: string | null;
  format: ExportFormat;
  status: string;
  download_url: string;
  created_at: string;
}

export interface DistributionJob {
  id: string;
  project_id: string;
  script_id: string;
  title: string;
  description: string;
  resolution: string;
  ratio: string;
  duration: number;
  platforms: DistributionPlatform[];
  watermark: boolean;
  generate_audio: boolean;
  status: string;
  video_url?: string | null;
  external_docs: string[];
  created_at: string;
  updated_at: string;
}

export interface ScriptSourceChapterPayload {
  index: number;
  title: string;
  content: string;
  word_count: number;
}

export interface ScriptSourcePayload {
  mode: "chapter_json";
  total_word_count: number;
  chapter_count: number;
  chapters: ScriptSourceChapterPayload[];
}

export interface TaskListPayload {
  tasks: BackendTask[];
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const response = await apiFetch(path, init);
  return (await response.json()) as ApiEnvelope<T>;
}

export async function registerWithEmail(payload: {
  email: string;
  password: string;
}) {
  const response = await apiJson<AuthPayload>("auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function loginWithEmail(payload: {
  email: string;
  password: string;
}) {
  const response = await apiJson<AuthPayload>("auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchMe() {
  const response = await apiJson<AuthUser>("auth/me");
  return response.data;
}

export async function fetchCredits() {
  const response = await apiJson<{ credits: number; credits_used: number }>(
    "auth/credits",
  );
  return response.data;
}

export async function redeemCredits(code: string) {
  const response = await apiJson<{
    credits: number;
    credits_used: number;
    message: string;
  }>("auth/credits/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return response.data;
}

export async function createProject(payload: {
  title: string;
  source_novel: string;
  source_author: string;
  chapter_count: number;
  user_id?: string;
}) {
  const response = await apiJson<BackendProject>("projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchProjects() {
  const response = await apiJson<{ projects: BackendProject[] }>("projects");
  return response.data.projects;
}

export async function updateProject(
  projectId: string,
  payload: Partial<BackendProject>,
) {
  const response = await apiJson<BackendProject>(`projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function createScript(payload: {
  title: string;
  type: ScriptType;
  text: string;
  project_id?: string;
  source_payload?: ScriptSourcePayload;
}) {
  const response = await apiJson<BackendScript>("scripts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function startScriptProcessing(
  scriptId: string,
  projectId?: string,
) {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  const response = await apiJson<{ task: BackendTask }>(
    `scripts/${scriptId}/process${query}`,
    { method: "POST" },
  );
  return response.data.task;
}

export async function fetchScript(scriptId: string) {
  const response = await apiJson<BackendScript>(`scripts/${scriptId}`);
  return response.data;
}

export async function fetchTasks(status?: TaskStatus, projectId?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (projectId) params.set("project_id", projectId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await apiJson<TaskListPayload>(`tasks${query}`);
  return response.data;
}

export async function fetchTask(taskId: string) {
  const response = await apiJson<{ task: BackendTask }>(`tasks/${taskId}`);
  return response.data.task;
}

export async function retryTask(taskId: string) {
  const response = await apiJson<{ task: BackendTask }>(
    `tasks/${taskId}/retry`,
    { method: "POST" },
  );
  return response.data.task;
}

export async function deleteTask(taskId: string) {
  await apiJson<{ task_id: string }>(`tasks/${taskId}`, { method: "DELETE" });
}

export async function createProjectExport(
  projectId: string,
  format: ExportFormat,
  scriptId?: string,
) {
  const query = scriptId ? `?script_id=${encodeURIComponent(scriptId)}` : "";
  const response = await apiJson<{ export: ProjectExportRecord }>(
    `projects/${projectId}/exports/${format}${query}`,
    {
      method: "POST",
    },
  );
  return response.data.export;
}

export async function fetchProjectExports(projectId: string) {
  const response = await apiJson<{ exports: ProjectExportRecord[] }>(
    `projects/${projectId}/exports`,
  );
  return response.data.exports;
}

export async function createDistributionJob(payload: {
  project_id: string;
  script_id: string;
  title: string;
  description: string;
  resolution: string;
  ratio: string;
  duration: number;
  watermark: boolean;
  generate_audio: boolean;
  platforms: DistributionPlatform[];
}) {
  const response = await apiJson<{ job: DistributionJob }>(
    `projects/${payload.project_id}/distribution-jobs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return response.data.job;
}

export async function dispatchDistributionJob(
  projectId: string,
  jobId: string,
  platforms: DistributionPlatform[],
) {
  const response = await apiJson<{
    job: DistributionJob;
    requested_platforms: DistributionPlatform[];
  }>(`projects/${projectId}/distribution-jobs/${jobId}/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platforms }),
  });
  return response.data.job;
}

export async function fetchDistributionJobs(projectId: string) {
  const response = await apiJson<{ jobs: DistributionJob[] }>(
    `projects/${projectId}/distribution-jobs`,
  );
  return response.data.jobs;
}
