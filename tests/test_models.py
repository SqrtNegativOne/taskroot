from __future__ import annotations

from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from taskroot.models import Event, RecurRule, RecurType, Tag, Task, TimeSession


# -- Task name validator -----------------------------------------------------

def test_task_empty_name_rejected():
    with pytest.raises(ValidationError):
        Task(name="")


def test_task_whitespace_only_name_rejected():
    with pytest.raises(ValidationError):
        Task(name="   ")


def test_task_name_at_word_limit_accepted():
    name = "fix " + " ".join(["a"] * 19)  # exactly 20 words
    t = Task(name=name)
    assert len(t.name.split()) == 20


def test_task_name_over_word_limit_rejected():
    name = "fix " + " ".join(["a"] * 20)  # 21 words
    with pytest.raises(ValidationError):
        Task(name=name)


def test_task_name_is_stripped():
    t = Task(name="  fix the bug  ")
    assert t.name == "fix the bug"


# -- Task description validator ----------------------------------------------

def test_task_description_at_word_limit_accepted():
    desc = " ".join(["word"] * 100)  # exactly 100 words
    t = Task(name="fix the thing", description=desc)
    assert t.description is not None


def test_task_description_over_word_limit_rejected():
    desc = " ".join(["word"] * 101)  # 101 words
    with pytest.raises(ValidationError):
        Task(name="fix the thing", description=desc)


def test_task_none_description_accepted():
    t = Task(name="fix the thing", description=None)
    assert t.description is None


# -- Event name validator ----------------------------------------------------

def test_event_empty_name_rejected():
    with pytest.raises(ValidationError):
        Event(name="", start=datetime(2026, 4, 11, 9, 0))


def test_event_name_over_word_limit_rejected():
    name = "standup " + " ".join(["a"] * 20)  # 21 words
    with pytest.raises(ValidationError):
        Event(name=name, start=datetime(2026, 4, 11, 9, 0))


def test_event_name_stripped():
    e = Event(name="  standup  ", start=datetime(2026, 4, 11, 9, 0))
    assert e.name == "standup"


# -- RecurRule validators ----------------------------------------------------

def test_recur_rule_interval_zero_rejected():
    with pytest.raises(ValidationError):
        RecurRule(type=RecurType.DAILY, interval=0)


def test_recur_rule_interval_negative_rejected():
    with pytest.raises(ValidationError):
        RecurRule(type=RecurType.DAILY, interval=-1)


def test_recur_rule_interval_one_accepted():
    rule = RecurRule(type=RecurType.DAILY, interval=1)
    assert rule.interval == 1


def test_recur_rule_days_of_week_out_of_range_high():
    with pytest.raises(ValidationError):
        RecurRule(type=RecurType.WEEKLY, days_of_week=[7])


def test_recur_rule_days_of_week_negative():
    with pytest.raises(ValidationError):
        RecurRule(type=RecurType.WEEKLY, days_of_week=[-1])


def test_recur_rule_days_of_week_valid_range():
    rule = RecurRule(type=RecurType.WEEKLY, days_of_week=[0, 6])
    assert rule.days_of_week == [0, 6]


# -- TimeSession.duration_seconds --------------------------------------------

def test_duration_seconds_closed_session():
    s = TimeSession(
        task_id=uuid4(),
        started_at=datetime(2026, 4, 11, 10, 0),
        ended_at=datetime(2026, 4, 11, 10, 30),
    )
    assert s.duration_seconds == 1800


def test_duration_seconds_clamps_negative():
    s = TimeSession(
        task_id=uuid4(),
        started_at=datetime(2026, 4, 11, 10, 30),
        ended_at=datetime(2026, 4, 11, 10, 0),
    )
    assert s.duration_seconds == 0


def test_duration_seconds_open_session_is_nonnegative():
    s = TimeSession(task_id=uuid4(), started_at=datetime(2026, 4, 11, 10, 0))
    assert s.duration_seconds >= 0


# -- Tag ---------------------------------------------------------------------

def test_tag_creation():
    tag = Tag(name="deep-work")
    assert tag.name == "deep-work"
    assert tag.id is not None


def test_tag_extra_fields_round_trip():
    tag = Tag.model_validate({"name": "admin", "colour": "#ff0000"})
    dumped = tag.model_dump()
    assert dumped["colour"] == "#ff0000"
