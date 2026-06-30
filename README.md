# Siyona Mistry — Portfolio

A personal portfolio rendered as a 3D, flippable magazine.

```
portfolio/
├── frontend/         React + TypeScript + Tailwind v4 + Three.js (Vite)
│   ├── src/          the app (the magazine lives in src/components/Magazine.tsx)
│   ├── api/          Vercel serverless functions (contact form → email)
│   └── scripts/      image tooling (e.g. grade-polaroid.py)
```

## Quick start

```bash
cd frontend && npm install && npm run dev      # → http://localhost:5173
```

The contact endpoint is a Vercel function at `frontend/api/contact.ts`. To run it
locally alongside the app, use `vercel dev` instead of `npm run dev`.

## Editing content

Most copy is data-driven:

| What                          | File                              |
| ----------------------------- | --------------------------------- |
| Name, role, tagline, socials  | `frontend/src/data/site.ts`       |
| Education, languages, tools   | `frontend/src/data/about.ts`      |
| Projects                      | `frontend/src/data/projects.ts`   |
| Experience timeline           | `frontend/src/data/experience.ts` |

The magazine pages themselves are drawn to canvas in
`frontend/src/lib/pageRenderers.ts`.

## Deploy (Vercel)

Single project — import the repo and set **Root Directory = `frontend`**. Vercel
detects Vite for the static build and deploys `frontend/api/contact.ts` as a
serverless function at `/api/contact` (same origin as the site, so the form needs
no CORS or separate API URL).

Set these environment variables (Project → Settings → Environment Variables) for
email delivery:

| Variable            | Value                                  |
| ------------------- | -------------------------------------- |
| `SMTP_HOST`         | `smtp.gmail.com`                       |
| `SMTP_PORT`         | `587`                                  |
| `SMTP_USER`         | your Gmail address                     |
| `SMTP_PASS`         | a Gmail **App Password** (not your pw) |
| `CONTACT_TO`        | where messages land                    |
| `CONTACT_FROM`      | your Gmail address                     |

(Leave SMTP_* unset and the function just logs messages instead of emailing.)

Then add your custom domain (Settings → Domains) and point its DNS at Vercel.
