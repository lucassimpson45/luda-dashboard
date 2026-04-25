# Luda AI — Client Dashboard

A Next.js client portal that pulls live call data from **Retell AI** and lets clients
see their receptionist's performance: call counts, durations, transcripts, and outcomes.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Retell AI** — voice receptionist + call data
- **N8N** — post-call enrichment via webhook
- **Tailwind CSS** — styling
- **Vercel** — deployment

---

## Setup in Cursor

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
```
Edit `.env.local`:

| Variable | Where to get it |
|---|---|
| `RETELL_API_KEY` | Retell dashboard → Settings → API Keys |
| `RETELL_AGENT_ID` | Retell dashboard → Agents → your agent → copy the ID |
| `N8N_WEBHOOK_SECRET` | Make up a random string (e.g. `openssl rand -hex 32`) |
| `DASHBOARD_PASSWORD` | Password your clients will use to log in |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (after first deploy) |

### 3. Run locally
```bash
npm run dev
```
Visit `http://localhost:3000` → you'll see the login page.

---

## Retell AI integration

Call data is fetched from:
```
GET https://api.retellai.com/v2/list-calls
```

### Outcome classification
Open `lib/retell.ts` → `classifyOutcome()`. By default it reads your Retell agent's
**Post-call analysis** fields. Go to Retell → your Agent → Post-call analysis and add:

| Field name | Type | Description |
|---|---|---|
| `appointment_booked` | Boolean | True if the caller booked |
| `lead_qualified` | Boolean | True if caller is a qualified lead |
| `not_a_fit` | Boolean | True if caller is not a fit |

These names must match exactly what you set in `classifyOutcome()`.

---

## N8N integration

After each call, N8N can send enrichment data (caller name from CRM, confirmed outcome, etc.)
to the dashboard webhook.

### N8N workflow setup
1. Add a trigger: **Retell webhook** or a polling node that detects ended calls
2. Add an **HTTP Request** node:
   - Method: `POST`
   - URL: `https://your-app.vercel.app/api/webhook/n8n`
   - Body (JSON):
     ```json
     {
       "call_id": "{{ $json.call_id }}",
       "caller_name": "{{ $json.crm_name }}",
       "outcome": "booked",
       "appointment_time": "2026-04-25T09:00:00Z",
       "notes": "Hail damage inspection",
       "secret": "your_N8N_WEBHOOK_SECRET"
     }
     ```
3. The `secret` must match `N8N_WEBHOOK_SECRET` in your `.env.local`

### Outcome values
- `booked` — appointment scheduled
- `qualified` — good lead, needs follow-up
- `not_a_fit` — wrong service / area / etc.
- `info_only` — just asked a question

---

## Deploy to Vercel

```bash
npm run build   # verify it builds cleanly first
```

Then:
1. Push to GitHub
2. Import repo in Vercel
3. Add all `.env.local` variables in Vercel → Project Settings → Environment Variables
4. Deploy

---

## Per-client setup (future)

Right now the dashboard shows all calls for one agent. To support multiple clients:
- Add a `clients` table to a DB (Supabase is the easiest with Vercel)
- Each client gets their own `RETELL_AGENT_ID` and login
- The calls API filters by `agent_id` per authenticated session

---

## File structure

```
luda-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/route.ts         ← login/logout
│   │   ├── calls/route.ts        ← proxies Retell, returns normalised data
│   │   └── webhook/n8n/route.ts  ← receives N8N enrichment
│   ├── dashboard/page.tsx        ← server component, fetches data
│   ├── login/page.tsx            ← password login
│   ├── layout.tsx
│   ├── page.tsx                  ← redirects to /dashboard or /login
│   └── globals.css
├── components/
│   └── dashboard/
│       └── DashboardClient.tsx   ← all the UI
├── lib/
│   ├── retell.ts                 ← Retell API client + normalisation
│   └── auth.ts                   ← session helpers
├── types/
│   └── index.ts                  ← TypeScript types
├── middleware.ts                  ← route protection
├── .env.local.example
└── README.md
```
