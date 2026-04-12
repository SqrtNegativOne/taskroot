"""Pydantic v2 domain models for all TaskRoot entities.

All models use ``extra="allow"`` so that unknown fields survive round-trips
through the storage layer. This satisfies the Extensibility requirement in
plan.txt: new fields may be added to any entity at any time without a
schema migration, because the storage layer catches unknown keys into an
``extras`` JSON column and re-attaches them on load.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


_ALLOW_EXTRAS = ConfigDict(extra="allow")


class RecurType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class RecurRule(BaseModel):
    model_config = _ALLOW_EXTRAS

    type: RecurType
    interval: int = 1
    days_of_week: list[int] = Field(default_factory=list)  # 0=Mon .. 6=Sun
    day_of_month: int | None = None

    @field_validator("interval")
    @classmethod
    def _interval_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("interval must be ≥ 1")
        return v

    @field_validator("days_of_week")
    @classmethod
    def _days_in_range(cls, v: list[int]) -> list[int]:
        for d in v:
            if not 0 <= d <= 6:
                raise ValueError("days_of_week entries must be in 0..6")
        return v


class Task(BaseModel):
    model_config = _ALLOW_EXTRAS

    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str | None = None
    work_date: date | None = None
    deadline: date | None = None
    tag_ids: list[UUID] = Field(default_factory=list)
    parent_id: UUID | None = None
    recur_rule: RecurRule | None = None
    expected_duration: int | None = None  # minutes
    is_low_thought: bool | None = None
    scheduled_start: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: datetime | None = None

    @field_validator("name")
    @classmethod
    def _name_word_limit(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Task name is required")
        if len(stripped.split()) > 20:
            raise ValueError("Task name must be ≤ 20 words")
        return stripped

    @field_validator("description")
    @classmethod
    def _description_word_limit(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v.split()) > 100:
            raise ValueError("Description must be ≤ 100 words")
        return v


class Event(BaseModel):
    model_config = _ALLOW_EXTRAS

    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str | None = None
    start: datetime
    end: datetime | None = None

    @field_validator("name")
    @classmethod
    def _name_word_limit(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Event name is required")
        if len(stripped.split()) > 20:
            raise ValueError("Event name must be ≤ 20 words")
        return stripped


class TimeSession(BaseModel):
    model_config = _ALLOW_EXTRAS

    id: UUID = Field(default_factory=uuid4)
    task_id: UUID
    started_at: datetime
    ended_at: datetime | None = None

    @property
    def duration_seconds(self) -> int:
        end = self.ended_at or datetime.now()
        return max(0, int((end - self.started_at).total_seconds()))


class Distraction(BaseModel):
    model_config = _ALLOW_EXTRAS

    id: UUID = Field(default_factory=uuid4)
    text: str
    logged_at: datetime = Field(default_factory=datetime.now)


class Tag(BaseModel):
    model_config = _ALLOW_EXTRAS

    id: UUID = Field(default_factory=uuid4)
    name: str
