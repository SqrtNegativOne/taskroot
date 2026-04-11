"""Recurrence expansion.

Per plan.txt, TaskRoot uses the **instance model** for recurrence:

- A task with a ``recur_rule`` is a *template*. It is never completed.
- When the day a rule fires arrives, a new *instance* task is created
  at 04:00 linked to the template via ``parent_id``.
- Calendar views show *projected* occurrences for future dates by
  computing them from the rule on the fly — no task objects are created
  in advance.

This module has two responsibilities:

1. :func:`fires_on` — does a rule fire on a given date?
2. :func:`materialise_due` — create instance tasks for all templates
   whose rule fires on ``today`` but which have no instance for today yet.
   Called once at day rollover (or on first launch of a new day).
"""
from __future__ import annotations

from datetime import date, datetime
from uuid import uuid4

from .db import Database
from .models import RecurRule, RecurType, Task


def fires_on(rule: RecurRule, day: date, *, anchor: date | None = None) -> bool:
    """Return True if ``rule`` fires on ``day``.

    ``anchor`` is the "day 0" for interval calculations — typically the
    date the rule was created. If omitted, interval calculations treat
    every day where the other constraints match as a firing day.
    """
    if rule.type == RecurType.DAILY:
        if anchor is None:
            return rule.interval == 1
        delta = (day - anchor).days
        return delta >= 0 and delta % rule.interval == 0

    if rule.type == RecurType.WEEKLY:
        if day.weekday() not in rule.days_of_week:
            return False
        if anchor is None:
            return True
        weeks = ((day - anchor).days) // 7
        return weeks >= 0 and weeks % rule.interval == 0

    if rule.type == RecurType.MONTHLY:
        if rule.day_of_month is None:
            return False
        if day.day != rule.day_of_month:
            return False
        if anchor is None:
            return True
        months = (day.year - anchor.year) * 12 + (day.month - anchor.month)
        return months >= 0 and months % rule.interval == 0

    return False


def projected_occurrences(
    rule: RecurRule,
    start: date,
    end: date,
    *,
    anchor: date | None = None,
) -> list[date]:
    """Return every date in ``[start, end)`` where ``rule`` fires.

    Used by calendar views to render future occurrences without
    materialising instance tasks.
    """
    out: list[date] = []
    cursor = start
    while cursor < end:
        if fires_on(rule, cursor, anchor=anchor):
            out.append(cursor)
        cursor = date.fromordinal(cursor.toordinal() + 1)
    return out


def _template_has_instance_on(db: Database, template_id, day: date) -> bool:
    existing = db.list_tasks_by_work_date(day)
    return any(t.parent_id == template_id for t in existing)


def _clone_template_as_instance(template: Task, day: date) -> Task:
    """Build an instance Task from a template. ``recur_rule`` is dropped —
    instances are normal tasks; only templates carry the rule."""
    return Task(
        id=uuid4(),
        name=template.name,
        description=template.description,
        work_date=day,
        deadline=None,
        tag_ids=list(template.tag_ids),
        parent_id=template.id,
        recur_rule=None,
        expected_duration=template.expected_duration,
        is_low_thought=template.is_low_thought,
        created_at=datetime.now(),
        completed_at=None,
    )


def materialise_due(db: Database, day: date) -> list[Task]:
    """Create instance tasks for every template whose rule fires on ``day``.

    Idempotent: if an instance already exists for (template, day), no
    new one is created. Safe to call multiple times during startup.
    """
    created: list[Task] = []
    for task in db.list_open_tasks():
        if task.recur_rule is None:
            continue
        anchor = task.created_at.date() if task.created_at else None
        if not fires_on(task.recur_rule, day, anchor=anchor):
            continue
        if _template_has_instance_on(db, task.id, day):
            continue
        instance = _clone_template_as_instance(task, day)
        db.save_task(instance)
        created.append(instance)
    return created
