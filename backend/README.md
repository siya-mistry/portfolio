# Backend — Contact API (Go)

A single, right-sized endpoint that powers the portfolio's contact form. No
framework, no database, no standing service required.

- `contact/contact.go` — the actual logic (validation, CORS, email/SMTP, log fallback).
- `cmd/server/main.go` — local dev server (`/api/contact`, `/api/health`).
- `api/contact.go` — serverless entry point (`Handler`) for Vercel/Netlify.

## Run locally

```bash
cd backend
go run ./cmd/server
# → contact API listening on http://localhost:8080
```

With no SMTP env vars set, submitted messages are **logged to the console** —
so it works immediately. To send real email, copy `.env.example` to `.env`,
fill in SMTP details, and export them (e.g. `set -a; source .env; set +a`)
before running.

The Vite dev server proxies `/api` → `localhost:8080`, so with both running:

```bash
# terminal 1
cd backend && go run ./cmd/server
# terminal 2
cd frontend && npm run dev
```

…the contact form on http://localhost:5173 works end to end.

## Test the endpoint directly

```bash
curl -X POST http://localhost:8080/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"t@example.com","message":"Hello there!"}'
```

## Deploy (serverless)

The endpoint is designed to run as a serverless function — no always-on host.
On **Vercel**, functions live in an `/api` directory at the deploy root and
must export `func Handler(w http.ResponseWriter, r *http.Request)`, which
`api/contact.go` already does. Set `SMTP_*`, `CONTACT_TO`, and
`CORS_ALLOW_ORIGIN` (your domain) as environment variables in the dashboard.

## Why a serverless function and not a service?

A portfolio's only dynamic need is a single stateless request: validate → send
email. A long-running service would add hosting, uptime, and deploy overhead
for zero benefit. Keeping it serverless is the right-sized choice — and the
logic stays in Go.
