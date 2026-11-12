"""Merged complaint timeline schema."""
from datetime import datetime
from pydantic import BaseModel


class TimelineItem(BaseModel):
    type: str
    timestamp: datetime
    display_text: str
