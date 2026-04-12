"""Python ↔ Svelte bridge API.

This is the object exposed to the webview as ``window.pywebview.api``
(via pywebview) — every method here becomes an async JavaScript call
from Svelte. Keep it thin: parse/validate args, delegate to services,
return plain dicts/lists. Don't put business logic here.

Design notes:

- All entity fields cross the bridge as JSON-friendly dicts, not
  Pydantic models. Svelte doesn't care about our types; it wants
  ``{id, name, ...}``.
- Errors are returned as ``{"error": str}`` rather than raised, so the
  UI can render them inline without a thrown-exception round trip
  through the webview layer.
- The bridge runs on a background thread in pywebview; the Database
  uses ``check_same_thread=False`` so that's fine.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Protocol
from uuid import UUID

from pydantic import ValidationError

from .db import Database
from .day import day_bounds, today
from .models import Distraction, Event, Task
from .recurrence import materialise_due
from .similarity import find_similar
from .timer import TimeTracker
from .verbs import VerbValidationError, validate_task_name


class WindowController(Protocol):
    """Structural type for the object returned by :mod:`taskroot.app`.

    Kept as a Protocol so that the API class has no hard dependency on
    pywebview or pystray; tests and alternative shells can hand in any
    object with ``show``/``hide``/``quit`` methods.
    """

    def show(self) -> None: ...
    def hide(self) -> None: ...
    def quit(self) -> None: ...


def _error(message: str) -> dict[str, Any]:
    return {"error": message}


def _ok(payload: Any = None) -> dict[str, Any]:
    return {"ok": True, "data": payload}


class Api:
    """The object handed to pywebview as its JS API."""

    def __init__(self, db: Database) -> None:
        self._db = db
        self._timer = TimeTracker(db)
        self._controller: WindowController | None = None

    def bind_controller(self, controller: WindowController) -> None:
        """Give the API a handle on the window controller.

        Called by :mod:`taskroot.app` after the window exists. Stays
        optional so the API class remains constructible in tests
        without spinning up a real window.
        """
        self._controller = controller

    # -- window control (callable from the Svelte UI) ----------------- #

    def hide_window(self) -> dict[str, Any]:
        if self._controller is not None:
            self._controller.hide()
        return _ok()

    def quit_app(self) -> dict[str, Any]:
        if self._controller is not None:
            self._controller.quit()
        return _ok()

    # -- bootstrap ---------------------------------------------------- #

    def bootstrap(self) -> dict[str, Any]:
        """Run day-rollover housekeeping and return the initial UI state."""
        day = today()
        materialise_due(self._db, day)
        return _ok(
            {
                "day": day.isoformat(),
                "active_session": self._session_payload(self._timer.active()),
            }
        )

    # -- capture ------------------------------------------------------ #

    def capture_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        name = (payload.get("name") or "").strip()
        try:
            validate_task_name(name)
        except VerbValidationError as e:
            return _error(str(e))
        try:
            task = Task.model_validate(payload)
        except ValidationError as e:
            return _error(e.errors()[0]["msg"])
        self._db.save_task(task)
        return _ok(self._task_payload(task))

    def similar_tasks(self, query: str) -> dict[str, Any]:
        candidates = self._db.list_open_tasks()
        hits = find_similar(query, candidates)
        return _ok(
            [
                {"task": self._task_payload(h.task), "score": h.score}
                for h in hits
            ]
        )

    # -- queries ------------------------------------------------------ #

    def list_today_tasks(self) -> dict[str, Any]:
        day = today()
        tasks = self._db.list_tasks_by_work_date(day)
        return _ok([self._task_payload(t) for t in tasks])

    def list_overdue(self) -> dict[str, Any]:
        tasks = self._db.list_overdue_tasks(today())
        return _ok([self._task_payload(t) for t in tasks])

    # -- timer -------------------------------------------------------- #

    def start_timer(self, task_id: str) -> dict[str, Any]:
        session = self._timer.start(UUID(task_id))
        return _ok(self._session_payload(session))

    def stop_timer(self) -> dict[str, Any]:
        session = self._timer.stop()
        return _ok(self._session_payload(session))

    def active_timer(self) -> dict[str, Any]:
        return _ok(self._session_payload(self._timer.active()))

    # -- calendar events ---------------------------------------------- #

    def list_day_events(self) -> dict[str, Any]:
        """All CalendarEvents for today (04:00-boundary day)."""
        start, end = day_bounds(today())
        events = self._db.list_events_between(start, end)
        return _ok([e.model_dump(mode="json") for e in events])

    def create_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Create a calendar event from the widget's dateClick."""
        try:
            event = Event.model_validate(payload)
        except ValidationError as e:
            return _error(e.errors()[0]["msg"])
        self._db.save_event(event)
        return _ok(event.model_dump(mode="json"))

    def update_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Update an event's start/end after drag or resize."""
        try:
            event = Event.model_validate(payload)
        except ValidationError as e:
            return _error(e.errors()[0]["msg"])
        self._db.save_event(event)
        return _ok(event.model_dump(mode="json"))

    def delete_event(self, event_id: str) -> dict[str, Any]:
        """Remove an event (× button on widget)."""
        self._db.delete_event(UUID(event_id))
        return _ok()

    def schedule_task(self, task_id: str, start: str, end: str) -> dict[str, Any]:
        """Place a task at a specific time on the day column."""
        task = self._db.get_task(UUID(task_id))
        if not task:
            return _error("Task not found")
        task.scheduled_start = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        task.expected_duration = int(
            (end_dt - task.scheduled_start).total_seconds() / 60
        )
        self._db.save_task(task)
        return _ok(self._task_payload(task))

    # -- distractions ------------------------------------------------- #

    def log_distraction(self, text: str) -> dict[str, Any]:
        text = (text or "").strip()
        if not text:
            return _error("Distraction text cannot be empty")
        d = Distraction(text=text)
        self._db.save_distraction(d)
        return _ok({"id": str(d.id), "text": d.text, "logged_at": d.logged_at.isoformat()})

    # -- serialization helpers --------------------------------------- #

    @staticmethod
    def _task_payload(task: Task) -> dict[str, Any]:
        return task.model_dump(mode="json")

    @staticmethod
    def _session_payload(session) -> dict[str, Any] | None:
        if session is None:
            return None
        return session.model_dump(mode="json")
