from functools import lru_cache
import os
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client


load_dotenv()


class SupabaseConfigError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise SupabaseConfigError("SUPABASE_URL and SUPABASE_KEY are required")

    return create_client(url, key)


def probe_supabase() -> dict[str, Any]:
    try:
        client = get_supabase_client()
        client.table("scriptforge_health").select("id").limit(1).execute()
        return {"configured": True, "status": "ok"}
    except SupabaseConfigError as error:
        return {"configured": False, "status": "missing_config", "message": str(error)}
    except Exception as error:
        return {"configured": True, "status": "error", "message": str(error)}
