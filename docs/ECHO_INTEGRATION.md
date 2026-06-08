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
src/server/ai/echoClient.js        (HTTP client: auth headers, retry, timeout)
      ↓  X-Echo-Api-Key header
<ECHO_URL>/api/generate            (Echo AI → Ollama qwen3:14b)

Firestore Collections (cache):
  echoNpcs, echoQuests, echoLore, echoItems, echoEncounters, echoFactions, echoImages
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ECHO_URL` | **Yes** | *(none)* | Echo base URL. Use the public Cloudflare Tunnel URL in production; `http://localhost:7860` or `https://echo.home` locally. |
| `ECHO_API_KEY` | **Yes (prod)** | *(none)* | API key sent as `X-Echo-Api-Key` on every request. Required in production. Omit only for trusted local dev. |
| `ECHO_MODEL` | No | `qwen3:14b` | Ollama model name. Change only if you switch models on Echo. |

> **Security warning:** Never expose Echo to the internet without `ECHO_API_KEY` protection. A publicly accessible Ollama endpoint with no auth can be abused for free GPU compute and prompt injection.

---

## Local Development Setup

1. Copy `.env.example` to `.env.local` in the project root.

2. Set your local values:
   ```env
   ECHO_URL=http://localhost:7860
   ECHO_API_KEY=                   # leave blank if Echo has no auth locally
   ECHO_MODEL=qwen3:14b
   ```

3. If Echo is running on your homelab and accessible via LAN:
   ```env
   ECHO_URL=https://echo.home
   ```

4. Start the Vite dev server:
   ```bash
   npm run dev
   ```

Serverless functions in `pages/api/` are **not** run locally by `vite dev`. To test API routes locally, use the Vercel CLI:
```bash
npx vercel dev
```

---

## Production Setup (Vercel + Cloudflare Tunnel)

### Step 1 — Install cloudflared on the Echo host

```bash
# Arch Linux (AUR)
yay -S cloudflared

# Or download directly
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
```

### Step 2 — Create a named tunnel (recommended over quick tunnels)

```bash
cloudflared tunnel login                          # opens browser auth
cloudflared tunnel create echo-ai                 # creates tunnel credentials
cloudflared tunnel route dns echo-ai echo.yourdomain.com
```

Create `/etc/cloudflared/config.yml`:
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: echo.yourdomain.com
    service: http://localhost:7860
  - service: http_status:404
```

### Step 3 — Run the tunnel as a service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

### Step 4 — Set Vercel environment variables

In the Vercel dashboard: **Project → Settings → Environment Variables**

| Key | Value | Environment |
|-----|-------|-------------|
| `ECHO_URL` | `https://echo.yourdomain.com` | Production, Preview |
| `ECHO_API_KEY` | `<your-secret-key>` | Production, Preview |
| `ECHO_MODEL` | `qwen3:14b` | Production, Preview (optional) |

> Do **not** commit these values to source control. Use `.env.local` locally (gitignored).

### Step 5 — Configure API key validation on Echo

Echo must validate incoming `X-Echo-Api-Key` headers. Add middleware to Echo's FastAPI app (`app.py`):

```python
import os
from fastapi import Request, HTTPException

ECHO_API_KEY = os.getenv("ECHO_API_KEY")

@app.middleware("http")
async def require_api_key(request: Request, call_next):
    if ECHO_API_KEY:
        key = request.headers.get("X-Echo-Api-Key")
        if key != ECHO_API_KEY:
            raise HTTPException(status_code=401, detail="Unauthorized")
    return await call_next(request)
```

Set the same key in Echo's systemd service:
```ini
# ~/.config/systemd/user/echo.service
[Service]
Environment="ECHO_API_KEY=<your-secret-key>"
```

Then reload: `systemctl --user daemon-reload && systemctl --user restart echo`

---

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

---

## Admin UI

Navigate to `/admin/echo` (admin only). Accessible via **Account Settings → Admin Tools → Echo Console**.

Tabs: NPC Generator | Quest Generator | Lore Generator | Image Generator

Each tab includes a library of previously generated content from Firestore.

---

## Caching Behaviour

All content types except **dialogue** are cached in Firestore on first generation.

| Type | Collection | Cache key |
|------|-----------|-----------|
| NPC | `echoNpcs` | `npc:<JSON(context)>` |
| Quest | `echoQuests` | `quest:<JSON(context)>` |
| Lore | `echoLore` | `lore:<type>:<topic>` |
| Item | `echoItems` | `item:<JSON(context)>` |
| Encounter | `echoEncounters` | `encounter:<JSON(context)>` |
| Faction | `echoFactions` | `faction:<JSON(context)>` |
| Image | `echoImages` | `image:<imageType>:<subject[:80]>` |
| Dialogue | *(not cached)* | — |

Pass `forceRegenerate: true` in any request body to bypass the cache and generate fresh content.

---

## Troubleshooting

**503 — Echo AI unavailable**
- Verify the Cloudflare Tunnel is running: `systemctl --user status cloudflared`
- Confirm `ECHO_URL` is set correctly in Vercel environment variables
- Test the tunnel directly: `curl https://echo.yourdomain.com/api/generate` (expect a response, not a timeout)

**401/403 — Invalid or missing ECHO_API_KEY**
- Confirm `ECHO_API_KEY` is set in both Vercel and Echo's systemd service
- Ensure the same key value is used on both sides

**500 — Unexpected format**
- qwen3:14b returned malformed JSON. Click **Regenerate**.
- If persistent, the model may be overloaded — check Echo's Ollama logs.

**Empty library in admin console**
- First generation populates Firestore. Generate at least one item per type.
- Firestore composite indexes may be pending — check the Firebase console for index creation links.

---

## Future Expansion

- Streaming responses (SSE) for real-time token display
- NPC dialogue trees persisted to Firestore and linked to crew records
- Auto-trigger NPC/encounter generation from anomaly scan events
- Image generation progress polling (for long ComfyUI jobs)
- Rate limiting per UID stored in Firestore
- Background job queue via Firestore + Cloud Functions
