# Discipline Tracker Pro

A professional, feature-rich productivity and discipline tracking web application built with vanilla HTML, CSS, and JavaScript — powered by Firebase for real-time cross-device sync.

Track your time, compete against your personal SHADOW, follow an AI-generated learning roadmap, and maintain streaks — all for free with no backend required.

---

## 🎯 Core Features

### ⏱️ Time Tracking
- **Real-time Stopwatch** with precise start/stop controls
- **Sleep Tracking** — dedicated sleep session logging
- **Active Task Indicator** — always visible while a session runs
- **Auto-Save** — all data persists in localStorage and syncs to Firebase

### 📋 Task Management
- Log tasks with automatic timestamps and duration
- Categorize as productive, sleep, or distraction
- **Quick-Start Favorites** — save frequent tasks, sync across devices
- **Task History** — view every session logged today
- **Color-coded display** — Green = productive, Purple = sleep

### ⭐ Quick Start Favorites — Cross-Device Sync
- Favorites are stored in Firebase under `users/{uid}/state/favorites`
- Adding or removing a favorite on one device updates all others **instantly** via `onSnapshot` listener
- No page refresh required

### ☁️ Cloud Sync & Authentication
- **Google Sign-In** via Firebase Authentication
- **Cross-device timer sync** — stopping a timer on one device stops it on all others instantly
- **Offline Mode** — full local functionality, syncs when reconnected
- **Login Gate** — app is locked behind authentication; anonymous access is blocked

### 📊 Statistics Dashboard
- Productive Time, Sleep Time, Total Tracked — all real-time
- Day Streak with milestone notifications

### 🔥 Streak System
- Tracks consecutive days with logged activity
- Milestone messages at Day 1, 7, 30, 365

---

## 🌑 SHADOW Engine

The SHADOW Engine is a competitive self-improvement system. Your SHADOW is your strongest historical 7-day rolling average — and every day you race to beat it.

### How It Works
- **Shadow Average**: Best 7-day rolling average you've achieved
- **Competitive Pressure**: Real-time gap vs your SHADOW shown in minutes and percent
- **Momentum**: 📈 Growing / ➡️ Stable / 📉 Declining

### Rank Tiers

| Tier | Minutes/day | Badge |
|------|-------------|-------|
| Initiate | 0+ | Baseline |
| Builder | 120+ | Builder |
| Operator | 180+ | Operator |
| Executor | 240+ | Executor |
| Elite | 300+ | Elite |
| Apex | 360+ | Apex |
| Overdrive | 420+ | Legend |

### Status Indicators
- 🟢 **STANDARD BROKEN** (100%+): Exceeded your SHADOW
- 🔵 **AT THE GATE** (90–99%): Almost there
- 🟡 **TRAILING** (70–89%): Behind but in range
- 🔴 **OUT OF RANGE** (<70%): Significant gap

---

## 🗺️ AI Roadmap Generator

Generate a structured learning roadmap using the **Gemini 2.0 Flash** API (free tier), or import your own JSON roadmap manually.

### Two Creation Modes

#### ✨ Generate with AI
1. Open the **Roadmap Console** from the main toolbar
2. Enter your **Gemini API key** (from [aistudio.google.com](https://aistudio.google.com)) — stored locally only
3. Type a topic (e.g. "Analog IC Design")
4. Click **Generate** — the app calls the Gemini API and builds your roadmap

#### 📥 Import JSON Roadmap
Paste a roadmap JSON manually using this exact schema:
```json
{
  "topic": "Analog IC Design",
  "modules": [
    {
      "moduleNumber": 1,
      "moduleTitle": "DIODES",
      "days": [
        { "day": 1, "title": "Basic Semiconductor Physics", "status": "completed" },
        { "day": 2, "title": "Diode Models", "status": "active" },
        { "day": 3, "title": "Operating Point Analysis", "status": "locked" }
      ]
    }
  ]
}
```
Click **Example** inside the Import panel to prefill a sample.

### Roadmap Features
- **Duplicate prevention** — if a roadmap for the same topic already exists, you'll be asked before overwriting
- **Cross-device sync** — roadmap stored in Firebase at `users/{uid}/roadmap/main`; changes sync across devices
- **Empty state** — if no roadmap exists, app displays "Roadmap not generated yet" with generator access
- **Delete button** — remove your roadmap permanently (with confirmation)
- **Progress tracking** — mark days as complete, locked/active state auto-advances
- **Edit mode** — rename modules and edit day topics inline
- **SHADOW integration** — active roadmap day appears in daily mission goals

### Loading Indicators
The generator shows step-by-step status:
- 🔍 Checking for existing roadmap...
- ✨ Generating AI roadmap...
- 📦 Parsing response...
- 💾 Saving roadmap...
- ✅ Done!

### API Error Messages
| Status | Message |
|--------|---------|
| 400/403 | Invalid API key — check at aistudio.google.com |
| 404 | Model not found — check your key |
| 429 | Rate limit hit — wait 60 seconds (quota is fine) |
| 503 | Gemini temporarily unavailable |

---

## 📈 Analytics & Reporting
- **Productivity Trend Graph** (7d / 30d / 3m / 6m / 1y)
- **Sleep Analysis Chart** — bar chart with the same range options
- **Performance Report** — monthly breakdown, daily table, print-ready
- **Export Data** — download all data as CSV or JSON

---

## 💡 Flow Protocol Engine
- **Flow State Tracking** — record when you enter productive flow
- **War Mode** — high-focus task triggers
- **Attention Stretch** — configurable focus intervals
- **Kill Switch** — emergency reset of active session

---

## 🎨 Design

- Dark professional theme with glassmorphism effects
- Responsive: Desktop (1400px) → Tablet (768px) → Mobile (480px)
- Smooth animations, hover effects, micro-transitions
- Font Awesome 6.4.0 icons
- Google Fonts (Inter / system-ui)
- Zero build step — pure HTML/CSS/JS

---

## 🚀 Quick Start

### Requirements
- A web server (e.g. Live Server, GitHub Pages, Vercel) — `file:///` protocol blocks Firebase Auth
- A Firebase project with Firestore + Authentication enabled
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com) (only needed for AI roadmap generation)

### Installation
```bash
git clone https://github.com/yourname/Discipline-main.git
cd Discipline-main
# Open with Live Server or deploy to Vercel/GitHub Pages
```

### Login
The app opens a **login gate** — click "Sign in with Google" to access the app. All data is user-isolated.

---

## 💾 Firebase Data Structure

```
users/
└── {uid}/
    ├── state/
    │   ├── timer          # Active timer state (cross-device sync)
    │   └── favorites      # Quick-start favorites list
    ├── roadmap/
    │   └── main           # User's AI or imported roadmap
    └── (tasks, streak, user doc...)
```

All Firebase writes happen **only on meaningful events** (start, stop, save) — not on every second. Designed to stay within the free tier indefinitely.

---

## 🔧 Technical Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full breakdown of the class system and module structure.

### Technologies
| Layer | Technology |
|-------|-----------|
| Structure | HTML5 semantic markup |
| Styling | CSS3 (custom properties, Grid, Flexbox, animations) |
| Logic | Vanilla JavaScript ES6+ (class-based modules) |
| Auth & DB | Firebase SDK v10 (Auth + Firestore) |
| Charts | Chart.js |
| Icons | Font Awesome 6.4.0 |
| AI | Google Gemini 2.0 Flash API |

---

## 📄 License

Free to use, modify, and distribute. No attribution required.

---

**Version**: 3.0 Pro (AI Roadmap · Cross-Device Sync · Login Gate · SHADOW Engine · Flow Protocol)
**Last Updated**: March 2026
**Built with ❤️ for discipline and personal mastery**
