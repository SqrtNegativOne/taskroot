"""Time-tracking service.

The Do phase's time tracker guarantees: **exactly one active
TimeSession at a time**. Starting a new session auto-ends the current
one. This module centralises that invariant so phases don't each
re-implement it (and get it wrong differently).
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from .db import Database
from .models import TimeSession


class TimeTracker:
    def __init__(self, db: Database) -> None:
        self._db = db

    def active(self) -> TimeSession | None:
        return self._db.get_active_session()

    def start(self, task_id: UUID, *, now: datetime | None = None) -> TimeSession:
        """Start a session on ``task_id``, auto-ending any active session."""
        now = now or datetime.now()
        current = self._db.get_active_session()
        if current is not None:
            if current.task_id == task_id:
                return current  # already running — no-op
            current.ended_at = now
            self._db.save_time_session(current)
        session = TimeSession(id=uuid4(), task_id=task_id, started_at=now)
        self._db.save_time_session(session)
        return session

    def stop(self, *, now: datetime | None = None) -> TimeSession | None:
        """Stop the active session. Return it, or None if nothing was running."""
        current = self._db.get_active_session()
        if current is None:
            return None
        current.ended_at = now or datetime.now()
        self._db.save_time_session(current)
        return current

    def duration_for_task(self, task_id: UUID) -> int:
        """Total seconds tracked across all sessions for a task."""
        sessions = self._db.list_sessions_for_task(task_id)
        return sum(s.duration_seconds for s in sessions)
