"""SQLite persistence layer.

Design goals (from plan.txt):

1. **Write-on-change, not on a timer.** Every mutation commits before
   returning. Only the Shutdown ritual reflections may be lost to a
   crash.

2. **Unknown-field round-trip.** Each entity row has an ``extras`` JSON
   column that captures any fields not in the explicit schema. On read,
   extras are merged back into the Pydantic model so the caller sees a
   single flat object. This means we can add new fields to the Pydantic
   models at any time without a SQL migration.

3. **Queryable known fields.** Core fields (dates, parent_id,
   completed_at) stay as proper columns so indexes work and calendar
   views are fast.

The module exposes a :class:`Database` class holding a single sqlite3
connection and small repository methods grouped by entity. There is no
ORM — at this scale it's more friction than value.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable
from uuid import UUID

from .models import (
    Distraction,
    Event,
    RecurRule,
    Tag,
    Task,
    TimeSession,
)

SCHEMA_VERSION = 1

# Core schema. ``extras`` columns are JSON blobs for the unknown-fields
# round-trip. Dates and datetimes are stored as ISO 8601 strings — SQLite
# has no native date type but ISO strings sort lexicographically, so
# range queries on work_date / deadline / started_at just work.
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    work_date TEXT,
    deadline TEXT,
    parent_id TEXT,
    recur_rule TEXT,           -- JSON or NULL
    expected_duration INTEGER,
    is_low_thought INTEGER,    -- 0/1 or NULL
    scheduled_start TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    extras TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS tasks_work_date_idx ON tasks(work_date);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks(deadline);
CREATE INDEX IF NOT EXISTS tasks_parent_idx ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS tasks_completed_idx ON tasks(completed_at);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    extras TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start TEXT NOT NULL,
    end TEXT,
    extras TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS events_start_idx ON events(start);

CREATE TABLE IF NOT EXISTS time_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    extras TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_task_idx ON time_sessions(task_id);
CREATE INDEX IF NOT EXISTS sessions_started_idx ON time_sessions(started_at);
CREATE INDEX IF NOT EXISTS sessions_active_idx ON time_sessions(ended_at)
    WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS distractions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    logged_at TEXT NOT NULL,
    extras TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS distractions_logged_idx ON distractions(logged_at);
"""

# Core fields written as proper columns on tasks. Anything not in this
# set — including fields added later to the Task model — is routed to
# ``extras``. Keep this list in sync with :data:`SCHEMA_SQL`.
_TASK_CORE_FIELDS = frozenset({
    "id",
    "name",
    "description",
    "work_date",
    "deadline",
    "tag_ids",  # handled out-of-band via task_tags join table
    "parent_id",
    "recur_rule",
    "expected_duration",
    "is_low_thought",
    "scheduled_start",
    "created_at",
    "completed_at",
})

_EVENT_CORE_FIELDS = frozenset({
    "id", "name", "description", "start", "end",
})

_SESSION_CORE_FIELDS = frozenset({
    "id", "task_id", "started_at", "ended_at",
})

_DISTRACTION_CORE_FIELDS = frozenset({
    "id", "text", "logged_at",
})

_TAG_CORE_FIELDS = frozenset({"id", "name"})


# --------------------------------------------------------------------------- #
# serialization helpers
# --------------------------------------------------------------------------- #

def _iso(value: datetime | date | None) -> str | None:
    return value.isoformat() if value is not None else None


def _parse_datetime(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _split_extras(
    model_data: dict[str, Any], core_fields: frozenset[str]
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Split a model's ``model_dump()`` output into (core, extras)."""
    core = {k: v for k, v in model_data.items() if k in core_fields}
    extras = {k: v for k, v in model_data.items() if k not in core_fields}
    return core, extras


def _merge_extras(row_core: dict[str, Any], extras_json: str) -> dict[str, Any]:
    extras = json.loads(extras_json) if extras_json else {}
    # Core wins on conflicts — the authoritative value lives in the column.
    return {**extras, **row_core}


# --------------------------------------------------------------------------- #
# Database
# --------------------------------------------------------------------------- #

class Database:
    """Single-connection SQLite wrapper.

    SQLite is fine with one long-lived connection for a single-user
    desktop app — no pool needed. We enable WAL mode so crashes don't
    corrupt the DB and foreign keys so cascades work.
    """

    def __init__(self, path: Path | str = "taskroot.db") -> None:
        self._path = Path(path)
        self._conn = sqlite3.connect(
            self._path,
            detect_types=sqlite3.PARSE_DECLTYPES,
            check_same_thread=False,
            isolation_level=None,  # autocommit; we use explicit transactions
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(SCHEMA_SQL)
        self._set_meta("schema_version", str(SCHEMA_VERSION))

    @property
    def path(self) -> Path:
        return self._path

    def close(self) -> None:
        self._conn.close()

    # -- meta --------------------------------------------------------- #

    def _set_meta(self, key: str, value: str) -> None:
        self._conn.execute(
            "INSERT INTO meta(key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )

    def _get_meta(self, key: str) -> str | None:
        row = self._conn.execute(
            "SELECT value FROM meta WHERE key = ?", (key,)
        ).fetchone()
        return row["value"] if row else None

    # -- transactions ------------------------------------------------- #

    @contextmanager
    def transaction(self):
        """Wrap a block in a SQLite transaction."""
        self._conn.execute("BEGIN")
        try:
            yield self._conn
        except Exception:
            self._conn.execute("ROLLBACK")
            raise
        else:
            self._conn.execute("COMMIT")

    # ================================================================ #
    # Tasks
    # ================================================================ #

    def save_task(self, task: Task) -> Task:
        data = task.model_dump(mode="json")
        tag_ids = data.pop("tag_ids", [])
        core, extras = _split_extras(data, _TASK_CORE_FIELDS)
        with self.transaction() as conn:
            conn.execute(
                """
                INSERT INTO tasks (
                    id, name, description, work_date, deadline,
                    parent_id, recur_rule, expected_duration,
                    is_low_thought, scheduled_start, created_at, completed_at, extras
                ) VALUES (
                    :id, :name, :description, :work_date, :deadline,
                    :parent_id, :recur_rule, :expected_duration,
                    :is_low_thought, :scheduled_start, :created_at, :completed_at, :extras
                )
                ON CONFLICT(id) DO UPDATE SET
                    name              = excluded.name,
                    description       = excluded.description,
                    work_date         = excluded.work_date,
                    deadline          = excluded.deadline,
                    parent_id         = excluded.parent_id,
                    recur_rule        = excluded.recur_rule,
                    expected_duration = excluded.expected_duration,
                    is_low_thought    = excluded.is_low_thought,
                    scheduled_start   = excluded.scheduled_start,
                    created_at        = excluded.created_at,
                    completed_at      = excluded.completed_at,
                    extras            = excluded.extras
                """,
                {
                    "id": str(core["id"]),
                    "name": core["name"],
                    "description": core.get("description"),
                    "work_date": core.get("work_date"),
                    "deadline": core.get("deadline"),
                    "parent_id": (
                        str(core["parent_id"]) if core.get("parent_id") else None
                    ),
                    "recur_rule": (
                        json.dumps(core["recur_rule"])
                        if core.get("recur_rule")
                        else None
                    ),
                    "expected_duration": core.get("expected_duration"),
                    "is_low_thought": (
                        int(core["is_low_thought"])
                        if core.get("is_low_thought") is not None
                        else None
                    ),
                    "scheduled_start": core.get("scheduled_start"),
                    "created_at": core["created_at"],
                    "completed_at": core.get("completed_at"),
                    "extras": json.dumps(extras),
                },
            )
            conn.execute("DELETE FROM task_tags WHERE task_id = ?", (str(task.id),))
            conn.executemany(
                "INSERT INTO task_tags(task_id, tag_id) VALUES (?, ?)",
                [(str(task.id), str(tid)) for tid in tag_ids],
            )
        return task

    def get_task(self, task_id: UUID) -> Task | None:
        row = self._conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (str(task_id),)
        ).fetchone()
        if row is None:
            return None
        return self._row_to_task(row)

    def list_tasks_by_work_date(self, day: date) -> list[Task]:
        rows = self._conn.execute(
            "SELECT * FROM tasks WHERE work_date = ? ORDER BY created_at",
            (day.isoformat(),),
        ).fetchall()
        return [self._row_to_task(r) for r in rows]

    def list_open_tasks(self) -> list[Task]:
        rows = self._conn.execute(
            "SELECT * FROM tasks WHERE completed_at IS NULL ORDER BY created_at"
        ).fetchall()
        return [self._row_to_task(r) for r in rows]

    def list_overdue_tasks(self, as_of: date) -> list[Task]:
        rows = self._conn.execute(
            """
            SELECT * FROM tasks
            WHERE completed_at IS NULL
              AND work_date IS NOT NULL
              AND work_date < ?
            ORDER BY work_date
            """,
            (as_of.isoformat(),),
        ).fetchall()
        return [self._row_to_task(r) for r in rows]

    def _row_to_task(self, row: sqlite3.Row) -> Task:
        tag_rows = self._conn.execute(
            "SELECT tag_id FROM task_tags WHERE task_id = ?", (row["id"],)
        ).fetchall()
        core = {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "work_date": row["work_date"],
            "deadline": row["deadline"],
            "parent_id": row["parent_id"],
            "recur_rule": (
                json.loads(row["recur_rule"]) if row["recur_rule"] else None
            ),
            "expected_duration": row["expected_duration"],
            "is_low_thought": (
                bool(row["is_low_thought"])
                if row["is_low_thought"] is not None
                else None
            ),
            "scheduled_start": row["scheduled_start"],
            "created_at": row["created_at"],
            "completed_at": row["completed_at"],
            "tag_ids": [tr["tag_id"] for tr in tag_rows],
        }
        return Task.model_validate(_merge_extras(core, row["extras"]))

    # ================================================================ #
    # Events
    # ================================================================ #

    def save_event(self, event: Event) -> Event:
        data = event.model_dump(mode="json")
        core, extras = _split_extras(data, _EVENT_CORE_FIELDS)
        self._conn.execute(
            """
            INSERT INTO events (id, name, description, start, end, extras)
            VALUES (:id, :name, :description, :start, :end, :extras)
            ON CONFLICT(id) DO UPDATE SET
                name        = excluded.name,
                description = excluded.description,
                start       = excluded.start,
                end         = excluded.end,
                extras      = excluded.extras
            """,
            {
                "id": str(core["id"]),
                "name": core["name"],
                "description": core.get("description"),
                "start": core["start"],
                "end": core.get("end"),
                "extras": json.dumps(extras),
            },
        )
        return event

    def list_events_between(
        self, start: datetime, end: datetime
    ) -> list[Event]:
        rows = self._conn.execute(
            "SELECT * FROM events WHERE start >= ? AND start < ? ORDER BY start",
            (start.isoformat(), end.isoformat()),
        ).fetchall()
        return [self._row_to_event(r) for r in rows]

    def get_event(self, event_id: UUID) -> Event | None:
        row = self._conn.execute(
            "SELECT * FROM events WHERE id = ?", (str(event_id),)
        ).fetchone()
        return self._row_to_event(row) if row else None

    def delete_event(self, event_id: UUID) -> None:
        self._conn.execute("DELETE FROM events WHERE id = ?", (str(event_id),))

    def _row_to_event(self, row: sqlite3.Row) -> Event:
        core = {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "start": row["start"],
            "end": row["end"],
        }
        return Event.model_validate(_merge_extras(core, row["extras"]))

    # ================================================================ #
    # TimeSessions
    # ================================================================ #

    def save_time_session(self, session: TimeSession) -> TimeSession:
        data = session.model_dump(mode="json")
        core, extras = _split_extras(data, _SESSION_CORE_FIELDS)
        self._conn.execute(
            """
            INSERT INTO time_sessions (id, task_id, started_at, ended_at, extras)
            VALUES (:id, :task_id, :started_at, :ended_at, :extras)
            ON CONFLICT(id) DO UPDATE SET
                task_id    = excluded.task_id,
                started_at = excluded.started_at,
                ended_at   = excluded.ended_at,
                extras     = excluded.extras
            """,
            {
                "id": str(core["id"]),
                "task_id": str(core["task_id"]),
                "started_at": core["started_at"],
                "ended_at": core.get("ended_at"),
                "extras": json.dumps(extras),
            },
        )
        return session

    def get_active_session(self) -> TimeSession | None:
        row = self._conn.execute(
            "SELECT * FROM time_sessions WHERE ended_at IS NULL LIMIT 1"
        ).fetchone()
        return self._row_to_session(row) if row else None

    def list_sessions_for_task(self, task_id: UUID) -> list[TimeSession]:
        rows = self._conn.execute(
            "SELECT * FROM time_sessions WHERE task_id = ? ORDER BY started_at",
            (str(task_id),),
        ).fetchall()
        return [self._row_to_session(r) for r in rows]

    def list_sessions_between(
        self, start: datetime, end: datetime
    ) -> list[TimeSession]:
        rows = self._conn.execute(
            """
            SELECT * FROM time_sessions
            WHERE started_at >= ? AND started_at < ?
            ORDER BY started_at
            """,
            (start.isoformat(), end.isoformat()),
        ).fetchall()
        return [self._row_to_session(r) for r in rows]

    def _row_to_session(self, row: sqlite3.Row) -> TimeSession:
        core = {
            "id": row["id"],
            "task_id": row["task_id"],
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
        }
        return TimeSession.model_validate(_merge_extras(core, row["extras"]))

    # ================================================================ #
    # Distractions
    # ================================================================ #

    def save_distraction(self, distraction: Distraction) -> Distraction:
        data = distraction.model_dump(mode="json")
        core, extras = _split_extras(data, _DISTRACTION_CORE_FIELDS)
        self._conn.execute(
            """
            INSERT INTO distractions (id, text, logged_at, extras)
            VALUES (:id, :text, :logged_at, :extras)
            ON CONFLICT(id) DO UPDATE SET
                text      = excluded.text,
                logged_at = excluded.logged_at,
                extras    = excluded.extras
            """,
            {
                "id": str(core["id"]),
                "text": core["text"],
                "logged_at": core["logged_at"],
                "extras": json.dumps(extras),
            },
        )
        return distraction

    def list_distractions_between(
        self, start: datetime, end: datetime
    ) -> list[Distraction]:
        rows = self._conn.execute(
            """
            SELECT * FROM distractions
            WHERE logged_at >= ? AND logged_at < ?
            ORDER BY logged_at DESC
            """,
            (start.isoformat(), end.isoformat()),
        ).fetchall()
        return [self._row_to_distraction(r) for r in rows]

    def _row_to_distraction(self, row: sqlite3.Row) -> Distraction:
        core = {
            "id": row["id"],
            "text": row["text"],
            "logged_at": row["logged_at"],
        }
        return Distraction.model_validate(_merge_extras(core, row["extras"]))

    # ================================================================ #
    # Tags
    # ================================================================ #

    def save_tag(self, tag: Tag) -> Tag:
        data = tag.model_dump(mode="json")
        core, extras = _split_extras(data, _TAG_CORE_FIELDS)
        self._conn.execute(
            """
            INSERT INTO tags (id, name, extras) VALUES (:id, :name, :extras)
            ON CONFLICT(id) DO UPDATE SET
                name   = excluded.name,
                extras = excluded.extras
            """,
            {
                "id": str(core["id"]),
                "name": core["name"],
                "extras": json.dumps(extras),
            },
        )
        return tag

    def list_tags(self) -> list[Tag]:
        rows = self._conn.execute("SELECT * FROM tags ORDER BY name").fetchall()
        return [
            Tag.model_validate(
                _merge_extras(
                    {"id": r["id"], "name": r["name"]}, r["extras"]
                )
            )
            for r in rows
        ]
