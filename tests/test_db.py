from datetime import date, datetime
from uuid import uuid4

from taskroot.db import Database
from taskroot.models import Distraction, Event, Task, TimeSession


def make_db(tmp_path):
    return Database(tmp_path / "test.db")


def test_task_round_trip(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the widget", work_date=date(2026, 4, 11))
    db.save_task(task)
    loaded = db.get_task(task.id)
    assert loaded is not None
    assert loaded.name == "fix the widget"
    assert loaded.work_date == date(2026, 4, 11)


def test_task_unknown_fields_round_trip(tmp_path):
    """The extensibility contract: unknown fields must survive a save/load."""
    db = make_db(tmp_path)
    payload = {
        "name": "fix the widget",
        "future_field": "should survive",
        "priority": 3,
    }
    task = Task.model_validate(payload)
    db.save_task(task)
    loaded = db.get_task(task.id)
    dumped = loaded.model_dump()
    assert dumped["future_field"] == "should survive"
    assert dumped["priority"] == 3


def test_list_tasks_by_work_date(tmp_path):
    db = make_db(tmp_path)
    db.save_task(Task(name="fix one", work_date=date(2026, 4, 11)))
    db.save_task(Task(name="fix two", work_date=date(2026, 4, 12)))
    today = db.list_tasks_by_work_date(date(2026, 4, 11))
    assert len(today) == 1
    assert today[0].name == "fix one"


def test_overdue_tasks(tmp_path):
    db = make_db(tmp_path)
    db.save_task(Task(name="fix stale", work_date=date(2026, 4, 1)))
    db.save_task(Task(name="fix future", work_date=date(2026, 4, 20)))
    overdue = db.list_overdue_tasks(date(2026, 4, 11))
    assert [t.name for t in overdue] == ["fix stale"]


def test_only_one_active_session(tmp_path):
    db = make_db(tmp_path)
    task_a = Task(name="fix alpha")
    task_b = Task(name="fix beta")
    db.save_task(task_a)
    db.save_task(task_b)

    s1 = TimeSession(task_id=task_a.id, started_at=datetime(2026, 4, 11, 10, 0))
    db.save_time_session(s1)
    assert db.get_active_session() is not None

    # simulate TimeTracker ending s1 before starting s2
    s1.ended_at = datetime(2026, 4, 11, 10, 30)
    db.save_time_session(s1)
    s2 = TimeSession(task_id=task_b.id, started_at=datetime(2026, 4, 11, 10, 30))
    db.save_time_session(s2)

    active = db.get_active_session()
    assert active is not None
    assert active.task_id == task_b.id


def test_distraction_inventory(tmp_path):
    db = make_db(tmp_path)
    db.save_distraction(Distraction(text="twitter", logged_at=datetime(2026, 4, 11, 10, 0)))
    db.save_distraction(Distraction(text="email", logged_at=datetime(2026, 4, 11, 11, 0)))
    rows = db.list_distractions_between(
        datetime(2026, 4, 11, 4, 0), datetime(2026, 4, 12, 4, 0)
    )
    # Reverse chronological per spec
    assert [d.text for d in rows] == ["email", "twitter"]


def test_event_round_trip(tmp_path):
    db = make_db(tmp_path)
    e = Event(name="standup", start=datetime(2026, 4, 11, 9, 0))
    db.save_event(e)
    rows = db.list_events_between(
        datetime(2026, 4, 11, 0, 0), datetime(2026, 4, 12, 0, 0)
    )
    assert len(rows) == 1
    assert rows[0].name == "standup"
