from functools import lru_cache

from .music_service import MusicService


@lru_cache(maxsize=1)
def get_music_service() -> MusicService:
    return MusicService()
