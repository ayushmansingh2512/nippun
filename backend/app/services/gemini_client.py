import os
import json
import asyncio
import httpx
from typing import AsyncGenerator, Optional, Dict, Any, List
from app.core.config import settings

GOOGLE_GEMINI_BASE = "https://generativelanguage.googleapis.com"

class GeminiClient:
    def __init__(self):
        self.proxy_url = settings.CLOUDFLARE_GEMINI_PROXY_URL.rstrip("/")
        self.secret = settings.INTERNAL_PROXY_SECRET
        self.model = settings.GEMINI_MODEL or "gemini-3.5-flash"
        self.key_index = 0
        self.bad_keys = set()
        self._proxy_failed = False

    def _get_all_configured_keys(self) -> List[str]:
        """Collects keys dynamically from .env on disk, settings, and OS environment."""
        keys: List[str] = []

        # Read directly from .env files for instant hot-reload
        env_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"),
            ".env"
        ]
        for ep in env_paths:
            if os.path.exists(ep):
                try:
                    with open(ep, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("GEMINI_API_KEYS="):
                                raw = line.split("=", 1)[1].strip().strip("\"'")
                                for k in raw.split(","):
                                    kc = k.strip()
                                    if kc and kc not in keys:
                                        keys.append(kc)
                            elif line.startswith("GEMINI_DIRECT_API_KEY="):
                                raw = line.split("=", 1)[1].strip().strip("\"'")
                                if raw and raw not in keys:
                                    keys.append(raw)
                except Exception:
                    pass

        if keys:
            return keys

        # Fallback to pydantic settings or environment if .env was empty
        if settings.GEMINI_DIRECT_API_KEY and settings.GEMINI_DIRECT_API_KEY.strip() not in keys:
            keys.append(settings.GEMINI_DIRECT_API_KEY.strip())
        if settings.GEMINI_API_KEYS:
            for k in settings.GEMINI_API_KEYS.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)
        if not keys:
            for env_var in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]:
                val = os.environ.get(env_var, "").strip().strip("\"'")
                if val and val not in keys:
                    keys.append(val)
        return keys

    def _get_active_keys(self) -> List[str]:
        all_keys = self._get_all_configured_keys()
        active = [k for k in all_keys if k not in self.bad_keys]
        return active

    def _get_candidate_models(self) -> List[str]:
        """Returns ordered list of Gemini flash models to try."""
        primary = self.model or "gemini-3.5-flash"
        candidates = [primary]
        for m in ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash"]:
            if m not in candidates:
                candidates.append(m)
        return candidates

    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_output: bool = False,
        inline_data: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Calls Gemini with automatic key rotation, busy server retry, and model failover."""
        # 1. Try Cloudflare Worker Proxy if not previously failed
        if not self._proxy_failed and "127.0.0.1" not in self.proxy_url:
            try:
                url = f"{self.proxy_url}/v1beta/models/{self.model}:generateContent"
                headers = {
                    "Content-Type": "application/json",
                    "X-Internal-Proxy-Secret": self.secret,
                }
                parts: List[Dict[str, Any]] = []
                if inline_data:
                    mime = inline_data.get("mimeType") or inline_data.get("mime_type") or "application/pdf"
                    b64_str = inline_data.get("data") or ""
                    parts.append({"inlineData": {"mimeType": mime, "data": b64_str}})
                parts.append({"text": prompt})

                payload: Dict[str, Any] = {
                    "contents": [{"role": "user", "parts": parts}],
                    "generationConfig": {"temperature": 0.2},
                }
                if system_instruction:
                    payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
                if json_output:
                    payload["generationConfig"]["responseMimeType"] = "application/json"

                proxy_timeout = httpx.Timeout(connect=1.5, read=25.0, write=5.0, pool=5.0)
                async with httpx.AsyncClient(timeout=proxy_timeout) as client:
                    res = await client.post(url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        return {"success": True, "text": text, "raw": data}
            except Exception:
                self._proxy_failed = True

        # 2. Direct Queue Failover with Error Detection & Model Fallback
        active_keys = self._get_active_keys()
        if not active_keys:
            return {"success": False, "error": "No Gemini API keys available."}

        num_keys = len(active_keys)
        start_idx = self.key_index % num_keys
        self.key_index += 1

        candidate_models = self._get_candidate_models()

        for model_name in candidate_models:
            for attempt in range(num_keys):
                idx = (start_idx + attempt) % num_keys
                curr_key = active_keys[idx]
                direct_url = f"{GOOGLE_GEMINI_BASE}/v1beta/models/{model_name}:generateContent?key={curr_key}"

                parts = []
                if inline_data:
                    mime = inline_data.get("mimeType") or inline_data.get("mime_type") or "application/pdf"
                    b64_str = inline_data.get("data") or ""
                    parts.append({"inlineData": {"mimeType": mime, "data": b64_str}})
                parts.append({"text": prompt})

                payload = {
                    "contents": [{"role": "user", "parts": parts}],
                    "generationConfig": {"temperature": 0.2},
                }
                if system_instruction:
                    payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
                if json_output:
                    payload["generationConfig"]["responseMimeType"] = "application/json"

                try:
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        res = await client.post(direct_url, json=payload)

                        if res.status_code == 200:
                            data = res.json()
                            text = data["candidates"][0]["content"]["parts"][0]["text"]
                            return {"success": True, "text": text, "raw": data}

                        err_text = res.text
                        is_bad_key = res.status_code in (400, 403) and ("API_KEY_INVALID" in err_text or "PERMISSION_DENIED" in err_text)
                        is_busy = res.status_code in (429, 500, 503, 504) or "RESOURCE_EXHAUSTED" in err_text
                        is_bad_model = res.status_code == 404

                        if is_bad_model:
                            break # Try next candidate model

                        if is_bad_key:
                            self.bad_keys.add(curr_key)
                            continue

                        if is_busy:
                            await asyncio.sleep(0.1 + attempt * 0.05)
                            continue

                except Exception:
                    continue

        return {"success": False, "error": "All Gemini keys in the queue were busy, invalid, or exhausted."}

    async def stream_generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams tokens from Gemini, retrying with next key / model if busy or invalid."""
        active_keys = self._get_active_keys()
        if not active_keys:
            return

        num_keys = len(active_keys)
        start_idx = self.key_index % num_keys
        self.key_index += 1

        contents = []
        if history:
            for item in history:
                contents.append({
                    "role": item.get("role", "user"),
                    "parts": [{"text": item.get("content", "")}],
                })
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {"temperature": 0.4},
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        candidate_models = self._get_candidate_models()

        for model_name in candidate_models:
            for attempt in range(num_keys):
                idx = (start_idx + attempt) % num_keys
                curr_key = active_keys[idx]
                direct_url = f"{GOOGLE_GEMINI_BASE}/v1beta/models/{model_name}:streamGenerateContent?alt=sse&key={curr_key}"

                try:
                    async with httpx.AsyncClient(timeout=35.0) as client:
                        async with client.stream("POST", direct_url, json=payload) as response:
                            if response.status_code != 200:
                                err_body = (await response.aread()).decode("utf-8", errors="ignore")
                                is_bad_key = response.status_code in (400, 403) and ("API_KEY_INVALID" in err_body or "PERMISSION_DENIED" in err_body)
                                is_busy = response.status_code in (429, 500, 503, 504) or "RESOURCE_EXHAUSTED" in err_body
                                is_bad_model = response.status_code == 404

                                if is_bad_model:
                                    break # Try next candidate model

                                if is_bad_key:
                                    self.bad_keys.add(curr_key)
                                    if len(self.bad_keys) >= len(active_keys):
                                        return # All keys are bad/leaked, fast fail
                                    continue

                                if is_busy:
                                    await asyncio.sleep(0.1 + attempt * 0.05)
                                    continue

                                continue

                            # Successfully connected & streaming
                            async for line in response.aiter_lines():
                                line = line.strip()
                                if not line or not line.startswith("data: "):
                                    continue
                                json_str = line[6:]
                                if json_str == "[DONE]":
                                    break
                                try:
                                    chunk_data = json.loads(json_str)
                                    candidates = chunk_data.get("candidates", [])
                                    if candidates:
                                        parts = candidates[0].get("content", {}).get("parts", [])
                                        for p in parts:
                                            if "text" in p:
                                                yield p["text"]
                                except json.JSONDecodeError:
                                    continue
                            return
                except Exception:
                    continue

gemini_client = GeminiClient()
