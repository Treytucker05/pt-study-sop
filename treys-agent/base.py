import json
from datetime import datetime, timezone
from pathlib import Path

import requests


class Agent:
    def __init__(self, name: str) -> None:
        self.name = name
        # HARD-CODED API KEY (User provided)
        self.api_key = "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"

        self.repo_root = Path(__file__).resolve().parents[4]
        self.tutor_path = self.repo_root / "projects" / "treys-agent" / "TUTOR.md"
        self.permissions_path = self.repo_root / ".claude" / "permissions.json"
        self.log_path = self.repo_root / "logs" / "agent_audit.jsonl"
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _utc_now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _log(self, event: str, data: dict) -> None:
        record = {"ts": self._utc_now(), "event": event, **data}
        try:
            with self.log_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=True) + "\n")
        except Exception:
            pass

    def _load_permissions(self) -> dict:
        default = {"allow_execution": [], "require_confirmation": []}
        try:
            return json.loads(self.permissions_path.read_text(encoding="utf-8"))
        except Exception:
            return default

    def _read_system_memory(self) -> str:
        try:
            return self.tutor_path.read_text(encoding="utf-8")
        except Exception:
            return "No system memory found. Proceeding with defaults."

    def _perceive(self, user_input: str) -> dict:
        system_memory = self._read_system_memory()
        return {"user_input": user_input, "system_memory": system_memory}

    def _decide(self, perception: dict) -> dict:
        payload = {
            "model": "google/gemini-2.0-flash-001",
            "messages": [
                {
                    "role": "system",
                    "content": f"""You are {self.name}, an expert PT Study Assistant.

=== SYSTEM CONSTITUTION (TUTOR.md) ===
{perception['system_memory']}
=======================================

Use the context provided to help the user.""",
                },
                {"role": "user", "content": perception["user_input"]},
            ],
        }
        return {"action": "llm_chat", "payload": payload}

    def _check_permissions(self, decision: dict) -> tuple[bool, str]:
        if decision.get("action") != "tool_call":
            return True, ""
        permissions = self._load_permissions()
        command = decision.get("command", "")
        if command in permissions.get("require_confirmation", []):
            return False, f"[BLOCKED] Permission required for: {command}"
        return True, ""

    def _act(self, decision: dict) -> str:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Treys Agent",
        }

        try:
            response = requests.post(
                url, headers=headers, data=json.dumps(decision["payload"]), timeout=15
            )
            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"]
            return f"[API Error] {response.status_code}: {response.text}"
        except Exception as e:
            return f"[Connection Error] {e}"

    def think(self, user_input: str) -> str:
        perception = self._perceive(user_input)
        self._log("perception", {"has_memory": bool(perception["system_memory"])})

        decision = self._decide(perception)
        self._log("decision", {"action": decision.get("action")})

        allowed, reason = self._check_permissions(decision)
        if not allowed:
            self._log("blocked", {"reason": reason})
            return reason

        result = self._act(decision)
        self._log("action_result", {"status": "ok" if not result.startswith("[") else "error"})
        return result
