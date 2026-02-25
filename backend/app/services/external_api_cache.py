"""
Simple in-memory cache for external API requests (e.g. news, weather).
Same URL returns cached result for 1 hour.
"""
import asyncio
import logging
import time
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 3600  # 1 hour

# key -> (expiry_ts, status_code, body)
_cache: dict[str, tuple[float, int, dict | list]] = {}
_lock = asyncio.Lock()


def _make_cache_key(url: str, params: dict | None) -> str:
    """Build a deterministic cache key from URL and query params."""
    if not params:
        return url
    # Sort keys so same params in different order yield same key
    encoded = urlencode(sorted(params.items()), doseq=True)
    return f"{url}?{encoded}"


class _CachedResponse:
    """Minimal response-like object for cached data."""

    def __init__(self, status_code: int, data: dict | list):
        self.status_code = status_code
        self._data = data

    def json(self) -> dict | list:
        return self._data


async def cached_get(
    client: httpx.AsyncClient,
    url: str,
    *,
    params: dict | None = None,
    **kwargs: object,
) -> httpx.Response | _CachedResponse:
    """
    GET the URL with optional params; return cached result if the same URL
    was requested within the last hour.
    """
    key = _make_cache_key(url, params)
    async with _lock:
        if key in _cache:
            expiry_ts, status_code, body = _cache[key]
            if time.monotonic() < expiry_ts:
                logger.debug("Cache hit for %s", key[:80])
                return _CachedResponse(status_code, body)
            del _cache[key]

    # Cache miss: perform request
    response = await client.get(url, params=params, **kwargs)
    try:
        body = response.json()
    except Exception:
        # Don't cache non-JSON responses
        return response

    expiry_ts = time.monotonic() + CACHE_TTL_SECONDS
    async with _lock:
        _cache[key] = (expiry_ts, response.status_code, body)

    return response
