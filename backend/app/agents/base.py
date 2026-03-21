from typing import Any

class BaseAgent:
    """Base class defining the standard interface for all agents."""
    async def run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("Each agent must implement the async run method.")
