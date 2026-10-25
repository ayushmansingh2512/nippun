# A24 Multi-Agent Healthcare Platform — Project Specification

## 1. Project Overview & Aesthetic Direction
This project implements an autonomous healthcare platform crafted in the **A24 film aesthetic** (monochrome minimalism, Swiss typography, film-grain texture, high-contrast metadata layouts, tactile vinyl bot avatars).

### Key Architectural Pillars
1. **Cloudflare Gemini Key Rotator Proxy (`cloudflare-proxy/`)**:
   - Manages a pool of Gemini API keys configured in Cloudflare Secrets.
   - Rotates keys round-robin with automatic failover upon HTTP 429 (Rate Limit) or 503 errors to guarantee zero downtime during live multi-agent demonstrations.
2. **FastAPI Multi-Agent Backend (`backend/`)**:
   - Built with async SQLAlchemy 2.0 and `asyncpg` supporting **Neon Serverless PostgreSQL**.
   - Implements real-time Server-Sent Events (SSE) streaming (`POST /api/v1/chat/stream`) that synchronizes frontend avatar physical states (`working`, `poked`, `default`).
   - Four specialized autonomous agents:
     - **CLOVER // INGEST**: Medical Report & Lab OCR parser extracting biomarker metrics, ranges, and diagnostic flags.
     - **FLOWER // RX GUIDE**: Pharmacology advisor formulating supplement protocols, timing, contraindication checks, and questions for physicians.
     - **SQUARE // KINESIS**: Kinesiology & mobility coach formulating 7-day training splits targeted at glycemic clearance and mitochondrial density.
     - **GHOST // DISPATCH**: Autonomous concierge actuator discovering nearby specialists via OpenStreetMap / Places, dispatching consultation emails via Gmail API, and locking events in Google Calendar.
3. **A24 Editorial Frontend (`frontend/`)**:
   - Built with Vite, React 18, TypeScript, and TailwindCSS.
   - Houses the procedural **`BotAvatar` 2D Canvas Engine** rendering interactive physics, vinyl plastic sheen, blinking expressions, and orbital activity states.
   - Features the diagonal 3D stage arc and the right-hand slide-over **Agent Workspace Drawer** with 4 interactive tabs.
