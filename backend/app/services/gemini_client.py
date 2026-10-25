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
        self.model = settings.GEMINI_MODEL
        self.keys_queue = [k.strip() for k in settings.GEMINI_API_KEYS.split(",") if k.strip()]
        if not self.keys_queue and settings.GEMINI_DIRECT_API_KEY:
            self.keys_queue = [settings.GEMINI_DIRECT_API_KEY.strip()]
        self.key_index = 0
        self.bad_keys = set()

    def _get_active_keys(self) -> List[str]:
        active = [k for k in self.keys_queue if k not in self.bad_keys]
        if not active and self.keys_queue:
            self.bad_keys.clear() # Reset if all were marked
            return self.keys_queue
        return active

    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_output: bool = False,
        inline_data: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Calls Gemini with automatic key rotation, busy server retry, and invalid key failover."""
        # 1. Try Cloudflare Worker Key Proxy first
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
            # Fall through to direct queue failover
            pass

        # 2. Direct Queue Failover with Error Detection (Busy retry & Invalid key skip)
        active_keys = self._get_active_keys()
        if not active_keys:
            return {"success": False, "error": "No Gemini API keys available in queue."}

        num_keys = len(active_keys)
        start_idx = self.key_index % num_keys
        self.key_index += 1

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            curr_key = active_keys[idx]
            direct_url = f"{GOOGLE_GEMINI_BASE}/v1beta/models/{self.model}:generateContent?key={curr_key}"

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

                    if is_bad_key:
                        self.bad_keys.add(curr_key)
                        continue # Try next key immediately

                    if is_busy:
                        await asyncio.sleep(0.1 + attempt * 0.05)
                        continue # Retry next key in queue

            except Exception:
                continue

        return {"success": False, "error": "All Gemini keys in the queue were busy or exhausted."}

    async def stream_generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams tokens from Gemini, retrying with the next key if busy or invalid."""
        # 1. Try Cloudflare Proxy first
        proxy_succeeded = False
        try:
            url = f"{self.proxy_url}/v1beta/models/{self.model}:streamGenerateContent?alt=sse"
            headers = {
                "Content-Type": "application/json",
                "X-Internal-Proxy-Secret": self.secret,
            }
            contents: List[Dict[str, Any]] = []
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

            proxy_timeout = httpx.Timeout(connect=1.5, read=35.0, write=5.0, pool=5.0)
            async with httpx.AsyncClient(timeout=proxy_timeout) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code == 200:
                        proxy_succeeded = True
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
        except Exception:
            proxy_succeeded = False

        if proxy_succeeded:
            return

        # 2. Direct Fallback Queue with Busy & Bad Key Error Detection
        active_keys = self._get_active_keys()
        if not active_keys:
            yield "All Gemini API keys in the queue were exhausted or unavailable."
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

        stream_delivered = False

        for attempt in range(num_keys):
            idx = (start_idx + attempt) % num_keys
            curr_key = active_keys[idx]
            direct_url = f"{GOOGLE_GEMINI_BASE}/v1beta/models/{self.model}:streamGenerateContent?alt=sse&key={curr_key}"

            try:
                async with httpx.AsyncClient(timeout=40.0) as client:
                    async with client.stream("POST", direct_url, json=payload) as response:
                        if response.status_code != 200:
                            err_body = (await response.aread()).decode("utf-8", errors="ignore")
                            is_bad_key = response.status_code in (400, 403) and ("API_KEY_INVALID" in err_body or "PERMISSION_DENIED" in err_body)
                            is_busy = response.status_code in (429, 500, 503, 504) or "RESOURCE_EXHAUSTED" in err_body

                            if is_bad_key:
                                self.bad_keys.add(curr_key)
                                continue # Try next key immediately

                            if is_busy:
                                await asyncio.sleep(0.1 + attempt * 0.05)
                                continue # Retry with next key in queue

                            continue

                        # Successfully streaming
                        stream_delivered = True
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

        if not stream_delivered:
            yield " [Notice: All 13 Gemini API keys were temporarily rate-limited or busy. Please retry in a few moments.]"

gemini_client = GeminiClient()
