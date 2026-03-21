import json
import re

def parse_json_from_llm(raw_text: str) -> dict:
    """
    Parses a JSON block from the LLM output securely.
    Handles Markdown formatted JSON blocks and generic backticks.
    """
    try:
        # Strip markdown json block
        text = re.sub(r'```json\n?(.*?)\n?```', r'\1', raw_text, flags=re.DOTALL)
        # Also try to strip generic backticks
        text = re.sub(r'```\n?(.*?)\n?```', r'\1', text, flags=re.DOTALL)
        return json.loads(text.strip())
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON from LLM: {e}\nRaw Text: {raw_text}")
        return {}
