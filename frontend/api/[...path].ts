const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

declare const Buffer:
  | {
      from(input: ArrayBuffer): Uint8Array;
    }
  | undefined;

type HeaderMap = Record<string, string | string[] | undefined>;

type ProxyRequest = {
  method?: string;
  headers: HeaderMap;
  query: Record<string, string | string[] | undefined>;
};

type ProxyResponse = {
  status: (code: number) => ProxyResponse;
  json: (body: unknown) => void;
  send: (body: Uint8Array) => void;
  setHeader: (name: string, value: string) => void;
};

function resolveBackendUrl() {
  const rawUrl =
    process?.env?.BACKEND_URL ??
    process?.env?.VITE_BACKEND_URL ??
    DEFAULT_BACKEND_URL;

  return rawUrl.replace(/\/+$/, "");
}

function resolveBackendApiPrefix() {
  return (
    process?.env?.BACKEND_API_PREFIX ??
    process?.env?.VITE_BACKEND_API_PREFIX ??
    "/api"
  ).replace(/\/+$/, "");
}

function resolveTargetPath(pathParam: string | string[] | undefined) {
  const segments = Array.isArray(pathParam)
    ? pathParam
    : [pathParam].filter((value): value is string => Boolean(value));

  const normalizedPath = segments.map(encodeURIComponent).join("/");
  return normalizedPath ? `/${normalizedPath}` : "/";
}

function normalizeHeaderValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value ?? fallback;
}

function copyResponseHeaders(
  sourceHeaders: Headers,
  targetResponse: ProxyResponse,
) {
  const skippedHeaders = new Set([
    "content-encoding",
    "content-length",
    "connection",
    "transfer-encoding",
  ]);

  sourceHeaders.forEach((value, key) => {
    if (!skippedHeaders.has(key.toLowerCase())) {
      targetResponse.setHeader(key, value);
    }
  });
}

export default async function handler(
  request: ProxyRequest,
  response: ProxyResponse,
) {
  const backendUrl = resolveBackendUrl();
  const backendApiPrefix = resolveBackendApiPrefix();
  const path = resolveTargetPath(request.query.path);
  const query = new URLSearchParams();

  Object.entries(request.query).forEach(([key, value]) => {
    if (key === "path" || value == null) {
      return;
    }

    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => query.append(key, item));
  });

  const targetUrl = new URL(`${backendUrl}${backendApiPrefix}${path}`);
  query.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const fetchInit: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers: {
        accept: normalizeHeaderValue(request.headers.accept, "*/*"),
        authorization: normalizeHeaderValue(request.headers.authorization),
        "content-type": normalizeHeaderValue(request.headers["content-type"]),
      },
      body:
        request.method && ["GET", "HEAD"].includes(request.method)
          ? undefined
          : (request as unknown as RequestInit["body"]),
    };

    if (fetchInit.body !== undefined) {
      fetchInit.duplex = "half";
    }

    const upstreamResponse = await fetch(targetUrl, {
      ...fetchInit,
    });

    copyResponseHeaders(upstreamResponse.headers, response);
    const bytes = new Uint8Array(await upstreamResponse.arrayBuffer());
    response
      .status(upstreamResponse.status)
      .send(Buffer ? Buffer.from(bytes.buffer) : bytes);
  } catch (error) {
    response.status(502).json({
      error: "Backend proxy request failed",
      message: error instanceof Error ? error.message : "Unknown proxy error",
      target: targetUrl.origin,
    });
  }
}
