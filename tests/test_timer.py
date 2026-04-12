from __future__ import annotations

from datetime import datetime

from taskroot.db import Database
from taskroot.models import Task
from taskroot.timer import TimeTracker


def make_db(tmp_path):
    return Database(tmp_path / "test.db")


def make_task(db: Database, name: str = "fix a bug") -> Task:
    task = Task(name=name)
    db.save_task(task)
    return task


def test_active_returns_none_when_idle(tmp_path):
    tracker = TimeTracker(make_db(tmp_path))
    assert tracker.active() is None


def test_start_creates_active_session(tmp_path):
    db = make_db(tmp_path)
    tracker = TimeTracker(db)
    task = make_task(db)
    session = tracker.start(task.id, now=datetime(2026, 4, 11, 10, 0))
    assert session.task_id == task.id
    assert session.ended_at is None
    assert tracker.active() is not None


def test_start_same_task_is_noop(tmp_path):
    db = make_db(tmp_path)
    tracker = TimeTracker(db)
    task = make_task(db)
    s1 = tracker.start(task.id, now=datetime(2026, 4, 11, 10, 0))
    s2 = tracker.start(task.id, now=datetime(2026, 4, 11, 10, 5))
    assert s1.id == s2.id
    assert tracker.active() is not None


def test_start_different_task_ends_previous(tmp_path):
    db = make_db(tmp_path)
    tracker = TimeTracker(db)
    task_a = make_task(db, "fix alpha")
    task_b = make_task(db, "fix beta")

    tracker.start(task_a.id, now=datetime(2026, 4, 11, 10, 0))
    tracker.start(task_b.id, now=datetime(2026, 4, 11, 10, 30))

    active = tracker.active()
    assert active is not None
    assert active.task_id == task_b.id

    sessions_a = db.list_sessions_for_task(task_a.id)
    assert len(sessions_a) == 1
    assert sessions_a[0].ended_at == datetime(2026, 4, 11, 10, 30)


def test_stop_ends_active_session(tmp_path):
    db = make_db(tmp_path)
    tracker = TimeTracker(db)
    task = make_task(db)
    tracker.start(task.id, now=datetime(2026, 4, 11, 10, 0))
    stopped = tracker.stop(now=datetime(2026, 4, 11, 10, 45))
    assert stopped is not None
    assert stopped.ended_at == datetime(2026, 4, 11, 10, 45)
    assert tracker.active() is None


def test_stop_when_idle_returns_none(tmp_path):
    tracker = TimeTracker(make_db(tmp_path))
    assert tracker.stop() is None


def test_duration_for_task_sums_multiple_sessions(tmp_path):
    db = make_db(tmp_path)
    tracker = TimeTracker(db)
    task = make_task(db)

    tracker.start(task.id, now=datetime(2026, 4, 11, 10, 0))
    tracker.stop(now=datetime(2026, 4, 11, 10, 30))   # 1800 s
    tracker.start(task.id, now=datetime(2026, 4, 11, 11, 0))
    tracker.stop(now=datetime(2026, 4, 11, 11, 15))   # 900 s

    assert tracker.duration_for_task(task.id) == 2700


def test_duration_for_task_no_sessions(tmp_path):
    db = make_db(tmp_path)
    tracker = TimeTracker(db)
    task = make_task(db)
    assert tracker.duration_for_task(task.id) == 0
