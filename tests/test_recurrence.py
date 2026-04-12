from __future__ import annotations

from datetime import date, datetime

from taskroot.db import Database
from taskroot.models import RecurRule, RecurType, Task
from taskroot.recurrence import (
    _clone_template_as_instance,
    fires_on,
    materialise_due,
    projected_occurrences,
)


def make_db(tmp_path):
    return Database(tmp_path / "test.db")


# -- fires_on ----------------------------------------------------------------

def test_daily_interval_one_fires_every_day():
    rule = RecurRule(type=RecurType.DAILY, interval=1)
    assert fires_on(rule, date(2026, 4, 11))
    assert fires_on(rule, date(2026, 4, 12))


def test_daily_interval_two_from_anchor():
    rule = RecurRule(type=RecurType.DAILY, interval=2)
    anchor = date(2026, 4, 1)
    assert fires_on(rule, date(2026, 4, 1), anchor=anchor)
    assert not fires_on(rule, date(2026, 4, 2), anchor=anchor)
    assert fires_on(rule, date(2026, 4, 3), anchor=anchor)


def test_weekly_on_monday_and_wednesday():
    rule = RecurRule(type=RecurType.WEEKLY, interval=1, days_of_week=[0, 2])
    # 2026-04-13 is a Monday, 04-14 Tuesday, 04-15 Wednesday
    assert fires_on(rule, date(2026, 4, 13))
    assert not fires_on(rule, date(2026, 4, 14))
    assert fires_on(rule, date(2026, 4, 15))


def test_monthly_day_of_month():
    rule = RecurRule(type=RecurType.MONTHLY, interval=1, day_of_month=11)
    assert fires_on(rule, date(2026, 4, 11))
    assert not fires_on(rule, date(2026, 4, 12))
    assert fires_on(rule, date(2026, 5, 11))


# -- projected_occurrences ---------------------------------------------------

def test_projected_occurrences_spans_range():
    rule = RecurRule(type=RecurType.WEEKLY, interval=1, days_of_week=[0])
    occ = projected_occurrences(rule, date(2026, 4, 1), date(2026, 5, 1))
    # Mondays in April 2026: 6, 13, 20, 27
    assert occ == [date(2026, 4, 6), date(2026, 4, 13), date(2026, 4, 20), date(2026, 4, 27)]


def test_projected_occurrences_empty_when_start_equals_end():
    rule = RecurRule(type=RecurType.DAILY, interval=1)
    start = date(2026, 4, 11)
    assert projected_occurrences(rule, start, start) == []


def test_projected_occurrences_empty_when_start_after_end():
    rule = RecurRule(type=RecurType.DAILY, interval=1)
    assert projected_occurrences(rule, date(2026, 4, 12), date(2026, 4, 11)) == []


# -- materialise_due ---------------------------------------------------------

# Use a fixed created_at well before the test day so the anchor-based
# interval check (delta >= 0) always passes.
_ANCHOR = datetime(2026, 4, 1, 4, 0)
_TEST_DAY = date(2026, 4, 11)


def test_materialise_due_creates_instance(tmp_path):
    db = make_db(tmp_path)
    template = Task(
        name="fix daily report",
        recur_rule=RecurRule(type=RecurType.DAILY, interval=1),
        created_at=_ANCHOR,
    )
    db.save_task(template)
    created = materialise_due(db, _TEST_DAY)
    assert len(created) == 1
    instance = created[0]
    assert instance.parent_id == template.id
    assert instance.work_date == _TEST_DAY
    assert instance.recur_rule is None


def test_materialise_due_is_idempotent(tmp_path):
    db = make_db(tmp_path)
    template = Task(
        name="fix daily task",
        recur_rule=RecurRule(type=RecurType.DAILY, interval=1),
        created_at=_ANCHOR,
    )
    db.save_task(template)
    materialise_due(db, _TEST_DAY)
    materialise_due(db, _TEST_DAY)
    instances = [t for t in db.list_tasks_by_work_date(_TEST_DAY) if t.parent_id == template.id]
    assert len(instances) == 1


def test_materialise_due_skips_completed_template(tmp_path):
    db = make_db(tmp_path)
    template = Task(
        name="fix completed template",
        recur_rule=RecurRule(type=RecurType.DAILY, interval=1),
        created_at=_ANCHOR,
        completed_at=datetime(2026, 4, 10, 12, 0),
    )
    db.save_task(template)
    assert materialise_due(db, _TEST_DAY) == []


def test_materialise_due_skips_non_firing_day(tmp_path):
    db = make_db(tmp_path)
    # Weekly on Monday (0) only; 2026-04-11 is a Saturday (5)
    template = Task(
        name="fix weekly monday",
        recur_rule=RecurRule(type=RecurType.WEEKLY, interval=1, days_of_week=[0]),
        created_at=_ANCHOR,
    )
    db.save_task(template)
    assert materialise_due(db, _TEST_DAY) == []


def test_materialise_due_returns_empty_for_no_templates(tmp_path):
    db = make_db(tmp_path)
    db.save_task(Task(name="fix plain task"))  # no recur_rule
    assert materialise_due(db, _TEST_DAY) == []


# -- _clone_template_as_instance ---------------------------------------------

def test_clone_preserves_task_fields():
    template = Task(
        name="fix the report",
        description="detailed description",
        expected_duration=30,
        is_low_thought=True,
        recur_rule=RecurRule(type=RecurType.DAILY, interval=1),
    )
    instance = _clone_template_as_instance(template, _TEST_DAY)
    assert instance.name == template.name
    assert instance.description == template.description
    assert instance.expected_duration == template.expected_duration
    assert instance.is_low_thought == template.is_low_thought


def test_clone_sets_instance_specific_fields():
    template = Task(
        name="fix weekly",
        recur_rule=RecurRule(type=RecurType.WEEKLY, interval=1, days_of_week=[0]),
    )
    day = date(2026, 4, 13)  # a Monday
    instance = _clone_template_as_instance(template, day)
    assert instance.parent_id == template.id
    assert instance.work_date == day
    assert instance.recur_rule is None
    assert instance.id != template.id
    assert instance.completed_at is None
