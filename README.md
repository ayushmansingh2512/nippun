# A24 Multi-Agent Healthcare Platform

Autonomous Clinical Telemetry, Specialized Multi-Agent Diagnostics, and Google Workspace Actuation built with A24 Film Aesthetic.

---

## 🌟 Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Cloudflare Gemini Key Rotator       │
                      │  (Round-Robin + Failover on 429/503)   │
                      └──────────────────┬─────────────────────┘
                                         │
┌─────────────────────────┐              │ LLM Requests
│   Frontend (Vite+React) │              │
│   • A24 Diagonal Stage  │ ◄────────────┤
│   • BotAvatar 2D Canvas │  SSE Stream  │
│   • Workspace Drawer    │              ▼
└───────────┬─────────────┘    ┌───────────────────────────────────┐
            │                  │      FastAPI Backend Engine       │
            └─────────────────►│ • Clover (Lab OCR & Biomarkers)   │
                REST & Events  │ • Flower (Pharma & Supplements)   │
                               │ • Square (Kinesiology Split)      │
                               │ • Ghost (Places, Gmail, GCal)     │
                               └─────────────────┬─────────────────┘
                                                 │
                                                 ▼
                               ┌───────────────────────────────────┐
                               │     Neon Serverless PostgreSQL    │
                               │  (Users, Reports, Appointments)   │
                               └───────────────────────────────────┘
```

---

## 🚀 Quickstart Guide

### 1. Cloudflare Proxy (`cloudflare-proxy/`)
```bash
cd cloudflare-proxy
npm install
npm run dev
# Proxy runs on http://127.0.0.1:8787
```

### 2. FastAPI Backend (`backend/`)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows PowerShell: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main.py:app --reload --port 8000
```
- Interactive Swagger docs: `http://localhost:8000/docs`

### 3. Vite + React Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 🧪 Key Features
- **A24 Editorial Film Grain & Typography**: Swiss layouts, Newsreader editorial serif, Space Grotesk, Space Mono.
- **BotAvatar Procedural Physics**: Blinking vinyl avatars with squash-and-stretch poke physics.
- **SSE Real-Time Synchronization**: Backend pushes agent working states directly to canvas avatars.
- **Autonomous Actuators**: OpenStreetMap specialist discovery, automated Gmail appointment requests, and 1-click Google Calendar insertion.
