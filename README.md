# MarketPulse Morning Market Brief

Responsive Next.js + TypeScript + Tailwind implementation of the MarketPulse Morning Market Brief dashboard.

## Structure

- `app/page.tsx` - main page entry
- `app/api/morning-brief/route.ts` - server-owned `GET /api/morning-brief` mock endpoint for backend/cron workflows
- `app/api/cron/update-morning-brief/route.ts` - protected `POST` endpoint for scheduled data updates
- `components/` - reusable UI components
- `lib/morningBriefData.ts` - typed mock `morningBriefData` source of truth
- `lib/morningBriefStore.ts` - file-backed brief reader/writer used by the page and cron endpoint
- `lib/types.ts` - data contracts with `status`, `source`, and `asOf`
- `lib/dataValidation.ts` - timestamp and availability validation
- `data/morningBriefData.json` - JSON storage contract example for future AI-generated data

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

API endpoint:

```text
http://localhost:3000/api/morning-brief
```

Protected cron update endpoint:

```text
POST http://localhost:3000/api/cron/update-morning-brief
```

## Data Refresh Model

The public page does not expose a refresh button. Visitors only see the latest prepared morning brief.

Use a cron job or scheduled backend process to update the data once each morning. That process can replace the mock source in `lib/morningBriefData.ts`, write a generated JSON file with the same contract, or call/reuse the logic behind `/api/morning-brief`.

Missing values should be returned as `status: "unavailable"` and displayed as `Unavailable`; stale timestamps are marked `status: "stale"`.

Set a secret before using the cron endpoint:

```bash
CRON_SECRET="replace-with-a-long-random-secret"
```

Trigger locally:

```bash
curl -X POST http://localhost:3000/api/cron/update-morning-brief \
  -H "Authorization: Bearer replace-with-a-long-random-secret"
```

You can also post generated data:

```bash
curl -X POST http://localhost:3000/api/cron/update-morning-brief \
  -H "Authorization: Bearer replace-with-a-long-random-secret" \
  -H "Content-Type: application/json" \
  --data '{"data": { ...complete morningBriefData object... }}'
```

The endpoint writes the latest validated brief to `data/currentMorningBriefData.json`. The public page and `GET /api/morning-brief` read that file first, then fall back to the mock data if it does not exist.
