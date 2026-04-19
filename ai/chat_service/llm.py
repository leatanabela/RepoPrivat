from collections.abc import AsyncGenerator
import asyncio
import queue
import logging
import ollama
from ai.config import settings

logger = logging.getLogger(__name__)


def _build_messages(prompt: str, system_prompt: str | None = None) -> list[dict]:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    return messages


def _sync_generate(prompt: str, system_prompt: str | None = None, format: str | None = None) -> str:
    """Synchronous LLM call. Use generate_response (async) in async contexts."""
    kwargs = {
        "model": settings.LLM_MODEL,
        "messages": _build_messages(prompt, system_prompt),
        "keep_alive": "30m",
    }
    if format:
        kwargs["format"] = format

    response = ollama.chat(**kwargs)
    message = response.get("message")
    if not message or "content" not in message:
        raise ValueError("Invalid response from LLM model")
    return message["content"]


async def generate_response(prompt: str, system_prompt: str | None = None, format: str | None = None) -> str:
    """Generate a response (non-blocking - runs in thread pool)."""
    return await asyncio.to_thread(_sync_generate, prompt, system_prompt, format)


# Legacy sync API for backward compat
def generate_response_sync(prompt: str, system_prompt: str | None = None, format: str | None = None) -> str:
    return _sync_generate(prompt, system_prompt, format)


async def generate_response_stream(
    prompt: str, system_prompt: str | None = None
) -> AsyncGenerator[str, None]:
    """True streaming: producer in thread, async consumer via queue."""
    messages = _build_messages(prompt, system_prompt)
    q: queue.Queue[str | None] = queue.Queue()
    error_holder: list[Exception] = []

    def _produce():
        try:
            stream = ollama.chat(
                model=settings.LLM_MODEL,
                messages=messages,
                stream=True,
                keep_alive="30m",
            )
            for chunk in stream:
                content = chunk.get("message", {}).get("content", "")
                if content:
                    q.put(content)
        except Exception as e:
            logger.exception("LLM stream producer error")
            error_holder.append(e)
        finally:
            q.put(None)  # sentinel

    # Run blocking Ollama iteration in a worker thread
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _produce)

    # Yield tokens as they arrive; event loop stays free for other requests
    while True:
        token = await asyncio.to_thread(q.get)
        if token is None:
            break
        yield token

    if error_holder:
        raise error_holder[0]
