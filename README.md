# Siyona Mistry — Portfolio

A full-stack personal portfolio.

```
portfolio/
├── frontend/   React + TypeScript + Tailwind v4 + Framer Motion (Vite)
├── backend/    Go contact API (serverless-ready, framework-free)
```

## Quick start

```bash
# Frontend
cd frontend && npm install && npm run dev      # → http://localhost:5173

# Backend (optional — only needed for the contact form locally)
cd backend && go run ./cmd/server              # → http://localhost:8080
```

The Vite dev server proxies `/api/*` to the Go backend, so the contact form
works locally when both are running. With no SMTP configured, messages are
logged to the backend console rather than emailed.

## Editing content

Everything is data-driven — no need to touch JSX:

| What                          | File                              |
| ----------------------------- | --------------------------------- |
| Name, role, tagline, socials  | `frontend/src/data/site.ts`       |
| Education, languages, tools   | `frontend/src/data/about.ts`      |
| Projects                      | `frontend/src/data/projects.ts`   |
| Experience timeline           | `frontend/src/data/experience.ts` |

Drop a `resume.pdf` into `frontend/public/` and set `resumeUrl` in `site.ts`
to link it.

## Architecture notes

The backend is a single serverless-ready Go function, not a standing service —
the right size for one stateless endpoint. See `backend/README.md`.

## Deploy

Frontend builds to static files (`cd frontend && npm run build`) for any CDN/
host (Vercel recommended). The Go endpoint deploys as a serverless function.
Custom domain: `siyonamistry.com` (planned).
