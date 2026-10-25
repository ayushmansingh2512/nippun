# Antigravity Execution Roadmap

## Phase 1: Cloudflare Gemini Key Proxy
- [x] Initialize `cloudflare-proxy/` with `wrangler.toml`.
- [x] Implement `src/index.ts` to parse `env.GEMINI_API_KEYS` (comma-separated list), forward requests to `https://generativelanguage.googleapis.com/v1beta/models/...`, and fail over on HTTP 429/5xx.

## Phase 2: FastAPI Backend & Neon Database
- [x] Initialize `backend/` with `requirements.txt` (`fastapi`, `uvicorn`, `sqlalchemy[asyncio]`, `asyncpg`, `pydantic`, `httpx`, `python-multipart`, `google-api-python-client`, `google-auth-oauthlib`).
- [x] Configure `app/core/database.py` with Neon PostgreSQL pooled connection string.
- [x] Create database schema for `users`, `medical_reports`, `health_plans`, `appointments`, and `agent_messages`.
- [x] Implement the 4 agent modules (`report_parser`, `clinical_advisor`, `kinesiology_advisor`, `doctor_discovery`) and the SSE streaming router (`/api/v1/chat/stream`).
- [x] Wire up Gmail and Google Calendar service actuators with fallback sandbox mode for college demo reliability.

## Phase 3: A24 Editorial Frontend & BotAvatar Integration
- [x] Initialize `frontend/` with Vite + React + TypeScript.
- [x] Implement the `BotAvatar` procedural 2D canvas engine with plastic specular highlights, blinking expressions, and physics.
- [x] Add A24 CSS variables, `.grain` noise overlay, and typography in `frontend/src/index.css`.
- [x] Build `<A24HealthcareStage />`:
  - Render the 4 agent avatars (`clover`, `flower`, `square`, `ghost`) along the diagonal 3D trajectory.
  - Render the A24 top-left metadata block (`.experience_info`) and bottom telemetry block (`.testimonial_wrap`).
- [x] Build the Click Transition & `<AgentWorkspaceDrawer />`:
  - Animate the active avatar from center to left on click.
  - Slide in the right-hand workspace drawer with tabs for **Chat & Triage**, **Medical Reports**, **Exercise & Meds**, and **Doctor & Calendar Sync**.