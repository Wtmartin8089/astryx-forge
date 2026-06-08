# Echo AI Integration

## Architecture

```
Frontend Component
      ↓ fetch /api/echo/generateX
pages/api/echo/generateX.js        (thin Vercel serverless wrapper)
      ↓
src/server/routes/echo/xRoute.js   (request validation, cache check/write)
      ↓ (cache miss)
src/server/ai/echoService.js       (prompt builder + JSON parser)
      ↓
src/server/ai/echoClient.js        (HTTP client with retry + timeout)
      ↓
https://echo.home/api/generate     (Echo AI → Ollama qwen3:14b)

Firestore Collections (cache):
  echoNpcs, echoQuests, echoLore, echoItems, echoEncounters, echoFactions, echoImages
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `ECHO_URL` | `https://echo.home` | Echo base URL |
| `ECHO_MODEL` | `qwen3:14b` | Ollama model name |

Set in Vercel dashboard under Project Settings → Environment Variables.

## API Endpoints

### POST /api/echo/generateNpc
Body: `{ context?: { faction, shipName, setting, tone }, cacheKey?, forceRegenerate? }`
Returns: `{ name, race, class_, appearance, personality, background, goals, secrets, cached, id }`

### POST /api/echo/generateQuest
Body: `{ context?: { shipName, region, difficulty, factionHint }, forceRegenerate? }`
Returns: `{ title, description, objectives[], rewards[], difficulty, factionInvolvement, cached, id }`

### POST /api/echo/generateLore
Body: `{ topic, type, forceRegenerate? }`
Returns: `{ name, type, description, history, significance, connections[], cached, id }`

### POST /api/echo/generateDialogue
Body: `{ npc, situation, campaignContext? }`
Returns: `{ opening, options[{playerLine, npcResponse}], conclusion }`
*(Not cached — always fresh)*

### POST /api/echo/generateImage
Body: `{ imageType, subject, options?, forceRegenerate? }`
Returns: `{ url, data, prompt, cached, id }`

## Admin UI

Navigate to `/admin/echo` (admin only). Accessible via Account Settings admin panel.

Tabs: NPC Generator | Quest Generator | Lore Generator | Image Generator

Each tab includes a library of previously generated content from Firestore.

## Networking

Echo runs at `https://echo.home` — a homelab service. Vercel serverless functions
run in the cloud and cannot reach `echo.home` by default.

**Options to make Echo accessible:**
1. **Cloudflare Tunnel** (recommended): `cloudflared tunnel --url http://localhost:7860`
2. **Tailscale Funnel**: expose Echo via Tailscale public URL
3. **Local dev only**: set `ECHO_URL=http://localhost:7860` for local Vite dev server

For production, set `ECHO_URL` to the public tunnel URL in Vercel environment variables.

## Troubleshooting

**503 Echo Unavailable**: Echo is unreachable. Check tunnel/network and `ECHO_URL` setting.
**500 Unexpected format**: qwen3:14b returned malformed JSON. Click Regenerate.
**Empty cache**: First generation populates Firestore; subsequent identical requests return cached.

## Future Expansion

- Streaming responses (SSE) for real-time token display
- NPC dialogue trees persisted to Firestore and linked to crew records
- Auto-trigger NPC/encounter generation from anomaly scan events
- Image generation progress polling (for long ComfyUI jobs)
- Rate limiting per UID stored in Firestore
- Background job queue via Firestore + Cloud Functions
