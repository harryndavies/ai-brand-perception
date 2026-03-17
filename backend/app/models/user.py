import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    hashed_password: str
    team: str = Field(default="Default")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
