import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import TypeDecorator, CHAR
from app.core.database import Base

class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type.
    Uses PostgreSQL's UUID type if available, otherwise CHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(str(value)))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value))
        return value

class User(Base):
    __tablename__ = "users"

    username = Column(String(64), primary_key=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    google_oauth_tokens = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    username = Column(String(64), ForeignKey("users.username", ondelete="CASCADE"), nullable=True, index=True)
    file_name = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=True)
    extracted_biomarkers = Column(JSON, nullable=False, default=dict)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class HealthPlan(Base):
    __tablename__ = "health_plans"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    username = Column(String(64), ForeignKey("users.username", ondelete="CASCADE"), nullable=True, index=True)
    report_id = Column(GUID, ForeignKey("medical_reports.id", ondelete="SET NULL"), nullable=True, index=True)
    medications_advice = Column(JSON, nullable=False, default=dict)
    exercise_protocol = Column(JSON, nullable=False, default=dict)
    disclaimer_acknowledged = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    username = Column(String(64), ForeignKey("users.username", ondelete="CASCADE"), nullable=True, index=True)
    doctor_name = Column(String(255), nullable=False)
    specialty = Column(String(255), nullable=False)
    clinic_address = Column(String(512), nullable=False)
    doctor_email = Column(String(255), nullable=True)
    status = Column(String(64), default="PENDING_EMAIL", nullable=False)
    gmail_thread_id = Column(String(128), nullable=True)
    gcal_event_id = Column(String(128), nullable=True)
    scheduled_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    username = Column(String(64), ForeignKey("users.username", ondelete="CASCADE"), nullable=True, index=True)
    session_id = Column(GUID, default=uuid.uuid4, index=True)
    agent_type = Column(String(64), nullable=False)
    content = Column(Text, nullable=False)
    tool_calls = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
