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
VITE_BACKEND_URL=http://127.0.0.1:5000
BACKEND_URL=http://127.0.0.1:5000
```

Rules:

- `VITE_API_BASE_URL` is the base URL used by browser code. In this repo it should normally stay `/api`.
- `VITE_BACKEND_URL` is used by the local Vite dev proxy.
- `BACKEND_URL` is used by the Vercel serverless proxy.
- If the backend itself already exposes routes under `/api`, point both backend URLs to that exact base, for example `https://your-backend.example.com/api`.
