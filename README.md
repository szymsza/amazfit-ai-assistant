# AmazfitVoiceAssistant

A voice AI assistant mini-app for the Amazfit Balance smartwatch (Zepp OS). Record a voice question on the watch → audio sent via BLE to phone Side Service → forwarded to a Node.js backend → STT → LLM → TTS pipeline → response audio played back on the watch.

## Project structure

```
app/          Zepp OS mini-app (watch + phone side service)
  src/        TypeScript sources
    app.ts              App entry point
    app-side/index.ts   Phone Side Service (BLE → server → BLE)
    page/gt/home/       Watch UI (record button, state machine)
    setting/index.ts    Settings page
    utils/              Shared utilities + test audio buffer
    global.d.ts         Zepp OS type declarations
  app.json    Zepp OS config (app ID, permissions, device targets)
  assets/     Static assets (icons, fonts)
  shared/     Plain-JS polyfills (not TypeScript)

server/       Node.js/Express backend
  src/index.ts  POST /api/ask endpoint (STT → LLM → TTS pipeline)
  .env.example  Config template
```

## Build & run

### Watch app (auto-compile TS on changes)
```bash
cd app && npm run watch
```

### Run in simulator
```bash
cd app && npm run dev   # compile + zeus dev
```

### Build for device
```bash
cd app && npm run build   # compile + zeus build
```

### Run server (development)
```bash
cd server && npm run dev   # ts-node, no build step
```

### Run server (production)
```bash
cd server && npm run build && npm start
```

## Server config

Copy `server/.env.example` to `server/.env` and set:
- `API_TOKEN` — shared secret for Bearer token auth
- `PORT` — port to listen on (default 3000)

For simulator testing, update `DEFAULT_SERVER_URL` in `app/src/app-side/index.ts` to your machine's LAN IP.
