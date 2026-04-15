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


def test_get_event_returns_saved_event(tmp_path):
    db = make_db(tmp_path)
    e = Event(name="standup", start=datetime(2026, 4, 11, 9, 0))
    db.save_event(e)
    loaded = db.get_event(e.id)
    assert loaded is not None
    assert loaded.id == e.id
    assert loaded.name == "standup"


def test_get_event_returns_none_for_missing_id(tmp_path):
    from uuid import uuid4
    db = make_db(tmp_path)
    assert db.get_event(uuid4()) is None


def test_delete_event_removes_it(tmp_path):
    db = make_db(tmp_path)
    e = Event(name="standup", start=datetime(2026, 4, 11, 9, 0))
    db.save_event(e)
    db.delete_event(e.id)
    assert db.get_event(e.id) is None


def test_delete_event_absent_from_list(tmp_path):
    db = make_db(tmp_path)
    e = Event(name="standup", start=datetime(2026, 4, 11, 9, 0))
    db.save_event(e)
    db.delete_event(e.id)
    rows = db.list_events_between(
        datetime(2026, 4, 11, 0, 0), datetime(2026, 4, 12, 0, 0)
    )
    assert rows == []


# -- list_open_tasks ---------------------------------------------------------

def test_list_open_tasks_excludes_completed(tmp_path):
    db = make_db(tmp_path)
    db.save_task(Task(name="fix open"))
    db.save_task(Task(name="fix done", completed_at=datetime(2026, 4, 11, 12, 0)))
    names = [t.name for t in db.list_open_tasks()]
    assert "fix open" in names
    assert "fix done" not in names


def test_list_open_tasks_empty_db(tmp_path):
    assert make_db(tmp_path).list_open_tasks() == []


# -- list_sessions_for_task / list_sessions_between --------------------------

def test_list_sessions_for_task(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the bug")
    db.save_task(task)
    s1 = TimeSession(task_id=task.id, started_at=datetime(2026, 4, 11, 10, 0),
                     ended_at=datetime(2026, 4, 11, 10, 30))
    s2 = TimeSession(task_id=task.id, started_at=datetime(2026, 4, 11, 11, 0),
                     ended_at=datetime(2026, 4, 11, 11, 15))
    db.save_time_session(s1)
    db.save_time_session(s2)
    sessions = db.list_sessions_for_task(task.id)
    assert len(sessions) == 2
    assert sessions[0].started_at == datetime(2026, 4, 11, 10, 0)
    assert sessions[1].started_at == datetime(2026, 4, 11, 11, 0)


def test_list_sessions_for_task_returns_empty_when_none(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the bug")
    db.save_task(task)
    assert db.list_sessions_for_task(task.id) == []


def test_list_sessions_between(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the bug")
    db.save_task(task)
    s_in = TimeSession(task_id=task.id, started_at=datetime(2026, 4, 11, 10, 0))
    s_out = TimeSession(task_id=task.id, started_at=datetime(2026, 4, 12, 10, 0))
    db.save_time_session(s_in)
    db.save_time_session(s_out)
    sessions = db.list_sessions_between(
        datetime(2026, 4, 11, 4, 0), datetime(2026, 4, 12, 4, 0)
    )
    assert len(sessions) == 1
    assert sessions[0].task_id == task.id


# -- tags --------------------------------------------------------------------

def test_tag_save_and_list(tmp_path):
    from taskroot.models import Tag
    db = make_db(tmp_path)
    tag = Tag(name="deep-work")
    db.save_tag(tag)
    tags = db.list_tags()
    assert len(tags) == 1
    assert tags[0].name == "deep-work"
    assert tags[0].id == tag.id


def test_tags_listed_alphabetically(tmp_path):
    from taskroot.models import Tag
    db = make_db(tmp_path)
    db.save_tag(Tag(name="work"))
    db.save_tag(Tag(name="admin"))
    db.save_tag(Tag(name="health"))
    assert [t.name for t in db.list_tags()] == ["admin", "health", "work"]


def test_tag_update_on_conflict(tmp_path):
    from taskroot.models import Tag
    db = make_db(tmp_path)
    tag = Tag(name="original")
    db.save_tag(tag)
    tag.name = "updated"
    db.save_tag(tag)
    tags = db.list_tags()
    assert len(tags) == 1
    assert tags[0].name == "updated"


# -- transaction rollback ----------------------------------------------------

def test_transaction_rollback_on_exception(tmp_path):
    import pytest
    db = make_db(tmp_path)
    with pytest.raises(RuntimeError):
        with db.transaction() as conn:
            conn.execute(
                "INSERT INTO meta(key, value) VALUES (?, ?)",
                ("rollback_sentinel", "1"),
            )
            raise RuntimeError("forced rollback")
    row = db._conn.execute(
        "SELECT value FROM meta WHERE key = ?", ("rollback_sentinel",)
    ).fetchone()
    assert row is None


# -- NULL / bool field handling -----------------------------------------------

def test_task_null_recur_rule_round_trips(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the bug", recur_rule=None)
    db.save_task(task)
    assert db.get_task(task.id).recur_rule is None


def test_task_is_low_thought_true_round_trips(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the bug", is_low_thought=True)
    db.save_task(task)
    assert db.get_task(task.id).is_low_thought is True


def test_task_is_low_thought_false_round_trips(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the bug", is_low_thought=False)
    db.save_task(task)
    assert db.get_task(task.id).is_low_thought is False


def test_task_is_low_thought_none_round_trips(tmp_path):
    db = make_db(tmp_path)
    task = Task(name="fix the bug", is_low_thought=None)
    db.save_task(task)
    assert db.get_task(task.id).is_low_thought is None
