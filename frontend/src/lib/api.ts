const API_BASE_URL = "/api";

export function apiUrl(path: string) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");

  return `${normalizedBaseUrl}/${normalizedPath}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  // 临时禁用超时机制进行测试
  try {
    const response = await fetch(apiUrl(path), init);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时，请检查网络连接或稍后重试");
    }
    throw error;
  }
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
  characters: string[];
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
  created_at: string;
  updated_at: string;
}

export interface BackendTask {
  id: string;
  script_id: string;
  script_title: string;
  title: string;
  type: "convert";
  status: TaskStatus;
  progress: number;
  current_step?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
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
  console.log(`Calling API: ${path}`, init ? init.method || 'GET' : 'GET');
  const response = await apiFetch(path, init);
  const json = await response.json();
  console.log(`API response for ${path}:`, json);
  return json as ApiEnvelope<T>;
}

export async function createScript(payload: {
  title: string;
  type: ScriptType;
  text: string;
}) {
  const response = await apiJson<BackendScript>("scripts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("createScript response:", response);
  console.log("createScript returning:", response.data);
  return response.data;
}

export async function startScriptProcessing(scriptId: string) {
  const response = await apiJson<{ task: BackendTask }>(
    `scripts/${scriptId}/process`,
    {
      method: "POST",
    },
  );

  return response.data.task;
}

export async function fetchScript(scriptId: string) {
  const response = await apiJson<BackendScript>(`scripts/${scriptId}`);
  return response.data;
}

export async function fetchTasks(status?: TaskStatus) {
  const query = status ? `?status=${status}` : "";
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
    {
      method: "POST",
    },
  );
  return response.data.task;
}

export async function deleteTask(taskId: string) {
  await apiJson<{ task_id: string }>(`tasks/${taskId}`, {
    method: "DELETE",
  });
}
