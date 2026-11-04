"""Hermes: a Telegram group-chat bot for the IVDR automation project.

Capabilities:
- Command responses (/start, /help, /status, /ask, /id, /ping)
- AI conversation backed by an OpenAI-compatible chat endpoint
- IVDR workflow notifications pulled from the FastAPI backend
- Scheduled / automatic group posts via the bot job queue

Run with:  python -m hermes
"""

__all__ = ["__version__"]

__version__ = "0.1.0"
