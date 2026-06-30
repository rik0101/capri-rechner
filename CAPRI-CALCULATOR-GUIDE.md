# CAPRI CONSULT – Calculator Build Guide

Reference for building lead-generating tax calculators. Based on the Ehegattenschaukel-Rechner.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (Postgres + Edge Functions) |
| Email delivery | Brevo (transactional email API) |
| Lead forwarding | Zapier webhook |
| Hosting | Netlify / Vercel (static export) |

---

## Project Structure

```
project/
├── src/
│   └── App.tsx              # Single-file calculator + email form
├── supabase/
│   └── functions/
│       └── submit-lead/
│           └── index.ts     # Edge function: saves lead + sends email
├── .env                     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── index.html
├── vite.config.ts
└── tailwind.config.js
```

---

## Brand Colors

| Token | Value | Usage |
|---|---|---|
| Primary dark | `#1c1e65` | Header, buttons, table headers, chart |
| Accent green | `#94fab7` | CTA buttons, highlight boxes |
| White | `#ffffff` | Backgrounds |

Font: `effra` (loaded via CSS `@import` in email templates; system fallback `Arial` in HTML).

---

## Calculator Flow

1. User fills in inputs (Kaufpreis, Marktwert, optional expert settings)
2. User clicks **Jetzt berechnen** → `calculate()` runs client-side math
3. Result state is set → email capture form appears and auto-scrolls into view
4. User enters email → `handleEmailSubmit()` calls the Edge Function
5. Edge Function: saves lead to Supabase, sends Brevo email, pings Zapier
6. Success state shown with CTA to book a consultation

---

## Database

### Table: `email_leads`

```sql
CREATE TABLE email_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  calculation_details jsonb
);

ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- No public read access; only the service role (Edge Function) writes
CREATE POLICY "insert_leads" ON email_leads FOR INSERT
  TO anon, authenticated WITH CHECK (true);
```

The `calculation_details` JSONB column stores the full calculation snapshot so every lead has context.

Duplicate emails return HTTP 409 (Postgres unique constraint error code `23505`).

---

## Edge Function: `submit-lead`

**File:** `supabase/functions/submit-lead/index.ts`
**JWT verification:** OFF (public endpoint, called with anon key)

### What it does

1. Validates email format
2. Inserts into `email_leads` using the **service role key** (bypasses RLS)
3. Sends a branded HTML email via Brevo
4. POSTs lead data to a Zapier webhook

### Secrets required (set in Supabase Dashboard > Edge Functions > Secrets)

| Secret name | Description |
|---|---|
| `SUPABASE_URL` | Auto-provided by Supabase |
| `SUPABASE_ANON_KEY` | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided |
| `BREVO_API_KEY` | From Brevo Dashboard > Settings > API Keys |

### Deploying / updating

The function is deployed via the Supabase MCP tool. The source file must exist on disk before deploying:

```
supabase/functions/submit-lead/index.ts
```

Then deploy with `verify_jwt: false` (it's a public endpoint).

### Calling from the frontend

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-lead`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, calculation_details: { ...result } }),
  }
);
```

---

## Brevo Email Setup

- **Sender address:** `kontakt@capri-consult.de` (must be a verified sender in Brevo)
- **API endpoint:** `POST https://api.brevo.com/v3/smtp/email`
- **Auth header:** `api-key: <BREVO_API_KEY>`
- The HTML email mirrors the calculator results: yearly savings highlight, comparison table, 10-year cumulative preview, CTA button

**Important:** The Brevo call in the Edge Function does not throw on failure — it fires and continues. If emails stop arriving, check:
1. Brevo Dashboard > Logs > Email logs (look for bounces or rejections)
2. Brevo Dashboard > Senders & IP (verify `kontakt@capri-consult.de` is still verified)
3. Account daily send limit (free plan: 300/day)

---

## Zapier Integration

A webhook payload is sent to `https://hooks.zapier.com/hooks/catch/<id>/<key>/` on every successful lead submission. Payload:

```json
{
  "email": "user@example.com",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "calculation_details": { ... }
}
```

Update the webhook URL directly in the Edge Function source if the Zap is recreated.

---

## Environment Variables

`.env` (frontend only — never put secrets here):

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

All sensitive keys (Brevo, service role) live exclusively in **Supabase Edge Function Secrets**, not in `.env`.

---

## Building a New Calculator

Follow this checklist:

### 1. Frontend (`src/App.tsx` or new file)
- [ ] Define input state variables
- [ ] Write `calculate()` function with domain-specific math
- [ ] Show results after calculation
- [ ] Trigger email form after results are shown (same pattern as existing)
- [ ] Pass calculation snapshot as `calculation_details` to the Edge Function

### 2. Edge Function
- [ ] Copy `supabase/functions/submit-lead/index.ts` as starting point
- [ ] Update the `LeadSubmission` interface to match new `calculation_details` shape
- [ ] Update the HTML email template to reflect the new calculator's outputs
- [ ] Keep CORS headers, Brevo call, Zapier webhook
- [ ] Deploy with `verify_jwt: false`

### 3. Database
- [ ] Add a new table (or reuse `email_leads` with a `calculator_type` column)
- [ ] Enable RLS
- [ ] Write insert policy for `anon` role

### 4. Brevo
- [ ] Confirm `kontakt@capri-consult.de` is still a verified sender
- [ ] Test a real submission end-to-end after deployment

### 5. Deploy
- [ ] Run `npm run build` — must pass with zero errors
- [ ] Deploy to Netlify/Vercel
- [ ] Verify `_redirects` file is in `public/` (for SPA routing): `/* /index.html 200`

---

## Key Implementation Patterns

### Auto-scroll to email form after calculation
```typescript
const emailBoxRef = useRef<HTMLDivElement>(null);

// inside calculate():
setResult({ ... });
setShowEmailForm(true);
setTimeout(() => {
  emailBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, 100);
```

### Handle duplicate email gracefully
```typescript
if (error.code === '23505') {
  return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409 });
}
```
In the frontend, show this as a friendly German message rather than an error state.

### German number formatting
```typescript
const formatEUR = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(value);
```

### Canvas chart (10-year cumulative view)
Uses a plain `<canvas>` element with `useRef` and `useEffect`. Redraws whenever `result` changes. No chart library dependency — keeps bundle size minimal.
