# IWSDK Spirit Preview — Backup

This folder is a snapshot of the spirit-preview sandbox from `~/.openclaw/workspace/spirit-preview/`.

## What's here

- **`spirit-scene.js`** — The main scene: starfield particles, spirit GLB (from r2.mexicanbold.com), interactive crystal (raycaster tap), Antoine art cube (6 faces, Cloudflare Images), camera orbit, narrative overlays
- **`main.js`** — Original IWSDK world version with GLB + animations
- **`index.html`** — Entry point loading spirit-scene.js
- **`vite.config.js`** — IWSDK vite-plugin-dev config (MetaQuest3, agent mode, MCP)
- **`.mcp.json`** — MCP server config for the 32 IWSDK tools
- **`src/`** — All source files including earlier experiments (ultra-simple, simple-crystal, portal-preview)

## How to run

```bash
cd spirit-preview
npm install
npx vite
# → https://localhost:8090
```

## GLB Source

Spirit loaded from: `https://r2.mexicanbold.com/72fpsEFLSpirit-enhanced.glb`

## Artwork

Antoine characters via Cloudflare Images:
`https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/<id>/segment=foreground,width=512`

Artwork IDs:
- `12c79899-fb93-4885-508f-d2da0a2fbf00` — Arboleda
- `bd4602b0-149d-42f8-e872-f697b64c7d00` — Fiesta
- `5c7fb409-1aa2-45a9-8466-296077e18e00` — Oceano
- `f8a136eb-363e-4a24-0f54-70bb4f4bf800` — Narrador
- `5c28fef5-cff0-4ddd-b4af-100d29bad100` — Cosmos
- `62355ddb-0f6c-4251-5d8e-37a455e44000` — Urbano

## Date

Snapshot: 2026-06-29
