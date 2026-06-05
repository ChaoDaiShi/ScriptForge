const DEFAULT_BACKEND_URL = 'https://script-backend-ten.vercel.app'

function resolveBackendUrl() {
  return (process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL).replace(
    /\/+$/,
    '',
  )
}

function resolveTargetPath(path) {
  const segments = Array.isArray(path) ? path : [path].filter(Boolean)
  const normalizedPath = segments.map(encodeURIComponent).join('/')

  return normalizedPath ? `/${normalizedPath}` : '/'
}

function copyResponseHeaders(sourceHeaders, targetResponse) {
  const skippedHeaders = new Set([
    'content-encoding',
    'content-length',
    'connection',
    'transfer-encoding',
  ])

  sourceHeaders.forEach((value, key) => {
    if (!skippedHeaders.has(key.toLowerCase())) {
      targetResponse.setHeader(key, value)
    }
  })
}

export default async function handler(request, response) {
  const backendUrl = resolveBackendUrl()
  const path = resolveTargetPath(request.query.path)
  const query = new URLSearchParams(request.query)
  query.delete('path')

  const targetUrl = new URL(`${backendUrl}${path}`)
  query.forEach((value, key) => {
    targetUrl.searchParams.append(key, value)
  })

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        accept: request.headers.accept || '*/*',
        authorization: request.headers.authorization || '',
        'content-type': request.headers['content-type'] || '',
      },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request,
      duplex: 'half',
    })

    copyResponseHeaders(upstreamResponse.headers, response)
    response.status(upstreamResponse.status).send(Buffer.from(await upstreamResponse.arrayBuffer()))
  } catch (error) {
    response.status(502).json({
      error: 'Backend proxy request failed',
      message: error instanceof Error ? error.message : 'Unknown proxy error',
      target: targetUrl.origin,
    })
  }
}
