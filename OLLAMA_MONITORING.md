# 🖥️ Monitoring Ollama — Terminal Guide

How to watch your local AI (Ollama) talk to the Discipline Tracker app in real-time.

---

## Quick Setup — Open Two Terminals

### Terminal 1 — Live Log Watcher
Press `Win + R` → type `powershell` → Enter, then paste:

```powershell
Get-Content "$env:LOCALAPPDATA\Ollama\server.log" -Wait -Tail 50
```

Leave this open. Every time your app talks to Ollama, a new line appears here.

---

### Terminal 2 — Model Status (refreshes every 3s)
Press `Win + R` → type `powershell` → Enter, then paste:

```powershell
while ($true) { ollama ps; Start-Sleep 3; Clear-Host }
```

When Insights is generating, you'll see:

```
NAME           ID        SIZE    PROCESSOR    UNTIL
qwen2.5:3b     abc123    2.1 GB  100% GPU     5 minutes from now
```

When idle/done → the model disappears from the list.

---

## What You'll See When Insights Loads

```
[GIN] 2026/10/25 - 13:22:01 | 200 |   12.3ms  | POST "/api/tags"       ← connection check
[GIN] 2026/10/25 - 13:22:02 | 200 | 14.872s   | POST "/api/generate"   ← AI generating
```

| Log Line | Meaning |
|---|---|
| `GET /api/tags 200` | App checked Ollama is alive |
| `POST /api/generate 200 ~15s` | App sent your data, AI is thinking |
| `POST /api/generate 200 ~0ms` | Returned from 24h cache (no AI call needed) |
| `POST /api/generate 500` | Error — model crashed or ran out of memory |

---

## Other Useful Commands

```powershell
# Is Ollama running at all?
Get-Process | Where-Object {$_.Name -like "*ollama*"}

# Quick ping — lists your models if Ollama is up
Invoke-RestMethod http://localhost:11434/api/tags | ConvertTo-Json

# List all models you have downloaded
ollama list
```

---

## Visual Layout — What to Have Open

```
┌─────────────────────────────┐  ┌──────────────────────────────┐
│  Terminal 1 (Log Watcher)   │  │  Terminal 2 (Model Status)   │
│                             │  │                              │
│  GET /api/tags  200  12ms   │  │  NAME        SIZE   GPU      │
│  POST /api/generate  14.8s  │  │  qwen2.5:3b  2.1G   100%    │
└─────────────────────────────┘  └──────────────────────────────┘
           ┌──────────────────────────────────────┐
           │  Browser — Discipline Tracker        │
           │  🤖 Generating with qwen2.5:3b...    │
           └──────────────────────────────────────┘
```

All three showing activity at the same time = your app is successfully talking to Ollama ✅

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Log file not found | Ollama was never run — open Ollama from Start Menu first |
| `ollama ps` shows nothing | No model loaded yet — open Insights to trigger a load |
| `POST /api/generate 404` | Wrong model name in `CONFIG.OLLAMA.MODEL` in `app.js` |
| `POST /api/generate` takes 5+ min | `qwen2.5:3b` is running on CPU only — check GPU drivers |
| No log lines appear when Insights opens | CORS blocked — check `OLLAMA_ORIGINS` env var |

### Set OLLAMA_ORIGINS (required for browser access)
```powershell
# Run once in PowerShell as Admin, then restart Ollama
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "Machine")
```

Or more restrictively (replace with your actual URL):
```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "http://localhost:5500,file://", "Machine")
```

---

## How the App Uses Ollama

```
Open Insights
     │
     ├─ 📡 Checks if Ollama is connected (GET /api/tags)
     │
     ├─ ⚙️  Runs instant rule-based analysis (no network)
     │
     ├─ 🤖  If connected → POST /api/generate (sends your study data)
     │         └─ ~15-30 seconds for qwen2.5:3b to respond
     │
     └─ ✅  Renders unified view (rule-based + AI merged)

Cache: AI result is cached for 24 hours.
       Clicking Refresh bypasses the cache and calls Ollama again.
```
