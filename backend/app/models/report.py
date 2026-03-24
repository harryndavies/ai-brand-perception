import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel, JSON, Column


class Report(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    brand: str
    competitors: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = Field(default="pending")  # pending | processing | complete | failed
    sentiment_score: Optional[float] = None
    pillars: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    model_perceptions: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    competitor_positions: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    trend_data: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
