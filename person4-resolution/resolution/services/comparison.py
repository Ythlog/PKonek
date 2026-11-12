"""Optional before/after comparison seam. Default implementation does no work."""
from typing import Any, Protocol


class BeforeAfterComparer(Protocol):
    def compare(self, complaint_id: int, before_media_id: int, after_media_id: int) -> Any | None:
        """Return a JSON-serializable comparison or None when unavailable."""


class NullComparer:
    def compare(self, complaint_id: int, before_media_id: int, after_media_id: int) -> None:
        return None
