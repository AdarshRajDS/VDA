# VDA 6.3 Auditor (browser extension)

Manifest V3 extension: side panel for VDA 6.3 audit header + questionnaire, with optional ChatGPT send/import on `chatgpt.com` / `chat.openai.com`.

## Why `dist/` is not on GitHub

`dist/` is the **build output** (compiled JS, packaged assets). It is listed in `.gitignore` so the repo stays small and you never commit stale bundles. **Always build on each machine** (or in CI) from the same `src/` and `public/`.

## Run on another machine (after `git clone`)

```bash
cd VDA   # or your clone folder name
npm install
npm run build
```

Then load the extension in Chrome or Edge:

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → select the **`dist`** folder inside the project (not the repo root).

The `prebuild` script copies the questionnaire JSON into `public/` before Vite builds; you need the questionnaire source file at the repo root (see `scripts/copy-questionnaire.mjs`) for a clean clone to build.

## Scripts

| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| `npm run build`| Production build → output in `dist/`         |
| `npm install`  | Install dependencies (run after clone)     |

More deployment and store notes: [DEPLOYMENT.md](./DEPLOYMENT.md).
