from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class AgentResponse(BaseModel):
    agent_id: str
    agent_name: str
    message: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    structured_data: Optional[Dict[str, Any]] = None

class BaseAgent:
    def __init__(self, agent_id: str, name: str, role: str, avatar_type: str):
        self.agent_id = agent_id
        self.name = name
        self.role = role
        self.avatar_type = avatar_type
