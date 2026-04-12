from __future__ import annotations

from datetime import date, datetime
from unittest.mock import MagicMock

import pytest

import taskroot.api as api_module
from taskroot.api import Api, _error, _ok
from taskroot.db import Database
from taskroot.models import Task


def make_db(tmp_path):
    return Database(tmp_path / "test.db")


def make_api(tmp_path):
    return Api(make_db(tmp_path))


# -- helper functions --------------------------------------------------------

def test_error_helper():
    assert _error("oops") == {"error": "oops"}


def test_ok_helper_with_payload():
    assert _ok({"x": 1}) == {"ok": True, "data": {"x": 1}}


def test_ok_helper_no_payload():
    assert _ok() == {"ok": True, "data": None}


# -- capture_task ------------------------------------------------------------

def test_capture_task_happy_path(tmp_path):
    api = make_api(tmp_path)
    result = api.capture_task({"name": "fix the bug"})
    assert "error" not in result
    assert result["ok"] is True
    assert result["data"]["name"] == "fix the bug"


def test_capture_task_invalid_verb_returns_error(tmp_path):
    api = make_api(tmp_path)
    result = api.capture_task({"name": "Bug in login"})
    assert "error" in result
    assert "verb" in result["error"].lower()


def test_capture_task_name_too_long_returns_error(tmp_path):
    api = make_api(tmp_path)
    long_name = "fix " + " ".join(["the"] * 20)  # 21 words
    result = api.capture_task({"name": long_name})
    assert "error" in result


def test_capture_task_empty_name_returns_error(tmp_path):
    api = make_api(tmp_path)
    result = api.capture_task({"name": ""})
    assert "error" in result


def test_capture_task_persists_to_db(tmp_path):
    db = make_db(tmp_path)
    api = Api(db)
    api.capture_task({"name": "fix the widget"})
    open_tasks = db.list_open_tasks()
    assert any(t.name == "fix the widget" for t in open_tasks)


# -- similar_tasks -----------------------------------------------------------

def test_similar_tasks_returns_matches(tmp_path):
    db = make_db(tmp_path)
    api = Api(db)
    db.save_task(Task(name="fix the login bug"))
    result = api.similar_tasks("fix login bug")
    assert result["ok"] is True
    assert len(result["data"]) >= 1


def test_similar_tasks_empty_query_returns_empty(tmp_path):
    db = make_db(tmp_path)
    api = Api(db)
    db.save_task(Task(name="fix the bug"))
    result = api.similar_tasks("")
    assert result["ok"] is True
    assert result["data"] == []


def test_similar_tasks_response_shape(tmp_path):
    db = make_db(tmp_path)
    api = Api(db)
    db.save_task(Task(name="fix the bug"))
    result = api.similar_tasks("fix the bug")
    assert result["ok"] is True
    assert len(result["data"]) >= 1
    hit = result["data"][0]
    assert "task" in hit
    assert "score" in hit


# -- log_distraction ---------------------------------------------------------

def test_log_distraction_happy_path(tmp_path):
    api = make_api(tmp_path)
    result = api.log_distraction("twitter")
    assert result["ok"] is True
    assert result["data"]["text"] == "twitter"
    assert "id" in result["data"]
    assert "logged_at" in result["data"]


def test_log_distraction_empty_returns_error(tmp_path):
    api = make_api(tmp_path)
    result = api.log_distraction("")
    assert "error" in result


def test_log_distraction_whitespace_returns_error(tmp_path):
    api = make_api(tmp_path)
    result = api.log_distraction("   ")
    assert "error" in result


def test_log_distraction_strips_whitespace(tmp_path):
    api = make_api(tmp_path)
    result = api.log_distraction("  email  ")
    assert result["ok"] is True
    assert result["data"]["text"] == "email"


# -- timer -------------------------------------------------------------------

def test_start_timer_returns_session(tmp_path):
    db = make_db(tmp_path)
    api = Api(db)
    task = Task(name="fix the bug")
    db.save_task(task)
    result = api.start_timer(str(task.id))
    assert result["ok"] is True
    assert result["data"]["task_id"] == str(task.id)
    assert result["data"]["ended_at"] is None


def test_stop_timer_returns_ended_session(tmp_path):
    db = make_db(tmp_path)
    api = Api(db)
    task = Task(name="fix the bug")
    db.save_task(task)
    api.start_timer(str(task.id))
    result = api.stop_timer()
    assert result["ok"] is True
    assert result["data"]["ended_at"] is not None


def test_stop_timer_when_idle_returns_null_data(tmp_path):
    api = make_api(tmp_path)
    result = api.stop_timer()
    assert result["ok"] is True
    assert result["data"] is None


def test_active_timer_returns_none_when_idle(tmp_path):
    api = make_api(tmp_path)
    result = api.active_timer()
    assert result["ok"] is True
    assert result["data"] is None


def test_active_timer_returns_session_when_running(tmp_path):
    db = make_db(tmp_path)
    api = Api(db)
    task = Task(name="fix the bug")
    db.save_task(task)
    api.start_timer(str(task.id))
    result = api.active_timer()
    assert result["ok"] is True
    assert result["data"] is not None
    assert result["data"]["task_id"] == str(task.id)


# -- window control ----------------------------------------------------------

def test_hide_window_without_controller_returns_ok(tmp_path):
    api = make_api(tmp_path)
    result = api.hide_window()
    assert result["ok"] is True


def test_quit_app_without_controller_returns_ok(tmp_path):
    api = make_api(tmp_path)
    result = api.quit_app()
    assert result["ok"] is True


class _FakeController:
    def __init__(self):
        self.hidden = False
        self.quit_called = False

    def show(self): pass
    def hide(self): self.hidden = True
    def quit(self): self.quit_called = True


def test_hide_window_delegates_to_controller(tmp_path):
    api = make_api(tmp_path)
    ctrl = _FakeController()
    api.bind_controller(ctrl)
    api.hide_window()
    assert ctrl.hidden is True


def test_quit_app_delegates_to_controller(tmp_path):
    api = make_api(tmp_path)
    ctrl = _FakeController()
    api.bind_controller(ctrl)
    api.quit_app()
    assert ctrl.quit_called is True


# -- bootstrap ---------------------------------------------------------------

def test_bootstrap_returns_day_and_no_active_session(tmp_path, monkeypatch):
    monkeypatch.setattr(api_module, "today", lambda: date(2026, 4, 11))
    api = make_api(tmp_path)
    result = api.bootstrap()
    assert result["ok"] is True
    assert result["data"]["day"] == "2026-04-11"
    assert result["data"]["active_session"] is None


def test_bootstrap_materialises_due_templates(tmp_path, monkeypatch):
    from datetime import datetime as dt
    from taskroot.models import RecurRule, RecurType
    monkeypatch.setattr(api_module, "today", lambda: date(2026, 4, 11))
    db = make_db(tmp_path)
    api = Api(db)
    # created_at must be on or before the test day so the anchor check passes
    template = Task(
        name="fix daily report",
        recur_rule=RecurRule(type=RecurType.DAILY, interval=1),
        created_at=dt(2026, 4, 1, 4, 0),
    )
    db.save_task(template)
    api.bootstrap()
    instances = db.list_tasks_by_work_date(date(2026, 4, 11))
    assert any(t.parent_id == template.id for t in instances)


# -- list_today_tasks --------------------------------------------------------

def test_list_today_tasks(tmp_path, monkeypatch):
    monkeypatch.setattr(api_module, "today", lambda: date(2026, 4, 11))
    db = make_db(tmp_path)
    api = Api(db)
    db.save_task(Task(name="fix the widget", work_date=date(2026, 4, 11)))
    db.save_task(Task(name="fix tomorrow", work_date=date(2026, 4, 12)))
    result = api.list_today_tasks()
    assert result["ok"] is True
    assert len(result["data"]) == 1
    assert result["data"][0]["name"] == "fix the widget"


# -- list_overdue ------------------------------------------------------------

def test_list_overdue(tmp_path, monkeypatch):
    monkeypatch.setattr(api_module, "today", lambda: date(2026, 4, 11))
    db = make_db(tmp_path)
    api = Api(db)
    db.save_task(Task(name="fix old task", work_date=date(2026, 4, 1)))
    db.save_task(Task(name="fix future", work_date=date(2026, 4, 20)))
    result = api.list_overdue()
    assert result["ok"] is True
    assert len(result["data"]) == 1
    assert result["data"][0]["name"] == "fix old task"
