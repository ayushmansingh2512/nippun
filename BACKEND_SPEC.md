# Backend, Cloudflare Key Router & Neon DB Specification

## 1. Cloudflare Worker: Gemini API Key Pool (`cloudflare-proxy/src/index.ts`)
- **Purpose:** Prevent rate-limiting (`429 Too Many Requests`) during multi-agent orchestration by rotating across a pool of Gemini API keys stored in Cloudflare Secrets (`GEMINI_API_KEYS="key1,key2,key3,..."`).
- **Mechanism:**
  - Receives standard Gemini `generateContent` / `streamGenerateContent` payloads from the FastAPI backend, authenticated via a shared `X-Internal-Proxy-Secret` header.
  - Selects a key using random/round-robin selection (or tracks cooldowns in Cloudflare KV).
  - If a key returns `429` or `503`, automatically retries the request with the next healthy key in the pool before returning the stream to FastAPI.

## 2. Neon PostgreSQL Schema (`backend/app/models/schema.py`)
Use `SQLAlchemy 2.0` async models with `asyncpg` connected to Neon DB (`DATABASE_URL` with `?sslmode=require`):
1. **`users`**:
   - `id` (UUID, PK), `email` (String, Unique), `full_name` (String), `google_oauth_tokens` (Encrypted JSONB for Gmail/Calendar access), `created_at`.
2. **`medical_reports`**:
   - `id` (UUID, PK), `user_id` (FK), `file_name` (String), `raw_text` (Text), `extracted_biomarkers` (JSONB — e.g., `{"hemoglobin": "13.2 g/dL", "vitamin_d": "18 ng/mL", "flags": ["Low Vitamin D"]}`), `uploaded_at`.
3. **`health_plans`**:
   - `id` (UUID, PK), `user_id` (FK), `report_id` (FK), `medications_advice` (JSONB), `exercise_protocol` (JSONB), `disclaimer_acknowledged` (Boolean).
4. **`appointments`**:
   - `id` (UUID, PK), `user_id` (FK), `doctor_name` (String), `specialty` (String), `clinic_address` (String), `doctor_email` (String), `status` (`PENDING_EMAIL` | `CONFIRMED` | `CALENDAR_MARKED`), `gmail_thread_id` (String), `gcal_event_id` (String), `scheduled_time` (DateTime).
5. **`agent_messages`**:
   - `id` (UUID, PK), `user_id` (FK), `session_id` (UUID), `agent_type` (`clover` | `flower` | `square` | `ghost` | `user`), `content` (Text), `tool_calls` (JSONB), `created_at`.

## 3. FastAPI Multi-Agent Orchestrator (`backend/app/agents/`)
All LLM calls route through `CLOUDFLARE_GEMINI_PROXY_URL`.

1. **`ReportIngestAgent` (Avatar: `clover`):**
   - Accepts PDF/Image uploads (`POST /api/v1/reports/upload`).
   - Uses Gemini Vision / multimodal extraction via the Cloudflare proxy to extract structured JSON biomarkers, normal ranges, and abnormal flags, saving them to Neon DB.
2. **`PharmacologyAgent` (Avatar: `flower`):**
   - Reads `extracted_biomarkers` + user symptoms from Neon DB.
   - Suggests OTC/supplement support, nutritional adjustments, and questions to ask the physician, paired with mandatory clinical safety disclaimers.
3. **`KinesiologyAgent` (Avatar: `square`):**
   - Generates a structured weekly exercise and mobility table tailored to the user's biomarkers, recovery capacity, and constraints.
4. **`DoctorConciergeAgent` (Avatar: `ghost`):**
   - **Tool 1 (`find_nearby_doctors`):** Queries Google Places API / OpenStreetMap Overpass API using user coordinates and required specialty (e.g., General Physician, Endocrinologist, Physiotherapist).
   - **Tool 2 (`send_appointment_email`):** Uses Gmail API (`users.messages.send`) to dispatch a structured appointment request email to the clinic/doctor with the patient's preferred time slots and a brief summary.
   - **Tool 3 (`sync_calendar_and_confirm`):** Checks confirmation (or triggers on confirmation webhook/manual approval) and inserts the event into the user's primary Google Calendar (`events.insert`), returning the calendar link and updating the UI state.

## 4. Real-Time Avatar State Sync (SSE)
- Endpoint: `POST /api/v1/chat/stream`
- Emits Server-Sent Events (SSE) with event types:
  - `agent_state`: `{"agent": "clover", "state": "working"}` $\rightarrow$ Frontend switches `<BotAvatar state="working" />`.
  - `agent_poke`: `{"agent": "ghost"}` $\rightarrow$ Frontend triggers `sim.poke()` when an appointment is booked.
  - `token`: Streams markdown text chunks into the right-hand drawer.
  - `tool_result`: Renders interactive Doctor Cards or Calendar Confirmation badges in the drawer.