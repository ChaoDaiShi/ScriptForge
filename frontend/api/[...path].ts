import type { IncomingMessage, ServerResponse } from "node:http";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:5000";

type ProxyRequest = IncomingMessage & {
  method?: string;
  headers: IncomingMessage["headers"];
  query: Record<string, string | string[] | undefined>;
};

type ProxyResponse = ServerResponse<IncomingMessage> & {
  status: (code: number) => ProxyResponse;
  json: (body: unknown) => void;
  send: (body: Buffer) => void;
};

function resolveBackendUrl() {
  const rawUrl =
    process.env.BACKEND_URL ??
    process.env.VITE_BACKEND_URL ??
    DEFAULT_BACKEND_URL;

  return rawUrl.replace(/\/+$/, "");
}

function resolveTargetPath(pathParam: string | string[] | undefined) {
  const segments = Array.isArray(pathParam)
    ? pathParam
    : [pathParam].filter((value): value is string => Boolean(value));

  const normalizedPath = segments.map(encodeURIComponent).join("/");
  return normalizedPath ? `/${normalizedPath}` : "/";
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
  const path = resolveTargetPath(request.query.path);
  const query = new URLSearchParams();

  Object.entries(request.query).forEach(([key, value]) => {
    if (key === "path" || value == null) {
      return;
    }

    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => query.append(key, item));
  });

  const targetUrl = new URL(`${backendUrl}${path}`);
  query.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        accept: request.headers.accept ?? "*/*",
        authorization: request.headers.authorization ?? "",
        "content-type": request.headers["content-type"] ?? "",
      },
      body:
        request.method && ["GET", "HEAD"].includes(request.method)
          ? undefined
          : (request as unknown as BodyInit),
      duplex: "half",
    });

    copyResponseHeaders(upstreamResponse.headers, response);
    response
      .status(upstreamResponse.status)
      .send(Buffer.from(await upstreamResponse.arrayBuffer()));
  } catch (error) {
    response.status(502).json({
      error: "Backend proxy request failed",
      message: error instanceof Error ? error.message : "Unknown proxy error",
      target: targetUrl.origin,
    });
  }
}
