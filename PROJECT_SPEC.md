# A24 Editorial Multi-Agent Healthcare Platform — Master Specification

## 1. Architecture & Data Flow
1. **Frontend (`frontend/`)**: Vite + React + TypeScript + Zustand (`useHealthcareStore.ts`). Renders an A24-styled viewport (`#f2f2f2` background, `PPEiko` serif headings, `PPNeueMontreal` body, `PPMuseum` eyebrows, and `/textures/noise.avif` film grain overlay).
2. **Stage (`DiagonalAvatarArc.tsx`)**: Replaces the A24 3D CD carousel with 4 interactive 2D Canvas plush avatars (`BotAvatarCanvas.tsx`). Clicking any avatar slides the stage left (`46vw`) and opens `AgentWorkspaceDrawer.tsx` (`54vw`) from the right.
3. **Backend (`backend/`)**: FastAPI + Async SQLAlchemy + Neon PostgreSQL (`asyncpg`). Exposes REST endpoints (`routes.py`) and Server-Sent Events (`sse_stream.py`) to stream multi-agent thoughts, avatar state transitions (`default` | `working` | `sleeping` | `poke`), and tool executions in real time.
4. **LLM Key Router (`cloudflare-proxy/`)**: Cloudflare Worker (`src/index.ts`) holding a pool of Gemini API keys (`GEMINI_API_KEYS`). Routes requests round-robin with automatic failover on HTTP `429` or `5xx`.

## 2. The Four Healthcare Agents
| Agent File | BotAvatar Type | Color | Responsibilities |
| :--- | :--- | :--- | :--- |
| `report_parser_agent.py` | `clover` (Eyes) | `#2563eb` | Parses uploaded PDF/Image lab reports (`ocr_pdf_parser.py`), extracts biomarkers, flags abnormal values, and saves to Neon DB (`report.py`). |
| `clinical_advisor_agent.py` | `flower` (Mouth) | `#16a34a` | Reads extracted biomarkers from Neon DB and generates tailored **Medication/Supplement Guidance** + **Exercise/Mobility Protocols** with clinical safety disclaimers. |
| `doctor_discovery_agent.py` | `square` (Eyes) | `#db2777` | Queries nearby specialists (`doctor_discovery.py` via Overpass/Google Places API) matching the patient's flagged conditions and location. |
| `scheduler_actuator_agent.py` | `ghost` (Eyes) | `#e2e8f0` | Dispatches appointment request emails via Gmail (`gmail_actuator.py`) and locks confirmed slots onto the user's Google Calendar (`gcal_actuator.py`), updating `appointment.py`. |