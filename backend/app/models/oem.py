import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.database import Base


class Oem(Base):
    __tablename__ = "oems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)

    # Optional location metadata (aligned with Supplier for consistency)
    location = Column(String, nullable=True)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    region = Column(String, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
