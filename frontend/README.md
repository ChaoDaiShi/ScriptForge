# Frontend

## API wiring

The frontend always calls the same-origin `/api/*` path.

- Local development: Vite proxies `/api/*` to `VITE_BACKEND_URL`.
- Vercel deployment: [`api/[...path].ts`](/Users/allure/Desktop/ScriptForge/frontend/api/[...path].ts) proxies `/api/*` to `BACKEND_URL`.
- Browser-side request helpers live in [`src/lib/api.ts`](/Users/allure/Desktop/ScriptForge/frontend/src/lib/api.ts).

## Environment variables

Copy [`frontend/.env.example`](/Users/allure/Desktop/ScriptForge/frontend/.env.example) and replace the values with your real backend address.

```env
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=http://127.0.0.1:8000
VITE_BACKEND_API_PREFIX=/api
BACKEND_URL=http://127.0.0.1:8000
BACKEND_API_PREFIX=/api
```

Rules:

- `VITE_API_BASE_URL` is the base URL used by browser code. In this repo it should normally stay `/api`.
- `VITE_BACKEND_URL` is used by the local Vite dev proxy.
- `VITE_BACKEND_API_PREFIX` is the backend route prefix expected by the FastAPI service. In this repo it should stay `/api`.
- `BACKEND_URL` is used by the Vercel serverless proxy.
- `BACKEND_API_PREFIX` is the backend route prefix used by the Vercel proxy.
- If the backend itself already exposes routes under `/api`, point both backend URLs to that exact base, for example `https://your-backend.example.com/api`.
