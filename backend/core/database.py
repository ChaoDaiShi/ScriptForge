from functools import lru_cache
import os
import time
from pathlib import Path
from typing import Any, Callable, TypeVar

from dotenv import load_dotenv
from supabase import Client, create_client


# Load .env from the backend directory (parent of core/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class SupabaseConfigError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise SupabaseConfigError("SUPABASE_URL and SUPABASE_KEY are required")

    return create_client(url, key)


T = TypeVar('T')

def with_retry(max_retries: int = 3, delay: float = 1.0) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator to add retry logic to database operations"""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    print(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(delay * (2 ** attempt))  # Exponential backoff
            raise last_exception
        return wrapper
    return decorator


def probe_supabase() -> dict[str, Any]:
    try:
        client = get_supabase_client()
        client.table("scriptforge_health").select("id").limit(1).execute()
        return {"configured": True, "status": "ok"}
    except SupabaseConfigError as error:
        return {"configured": False, "status": "missing_config", "message": str(error)}
    except Exception as error:
        return {"configured": True, "status": "error", "message": str(error)}
