"""Day-cycle boundary logic.

In TaskRoot a "day" begins at 04:00 and ends at 03:59 the following morning.
This module converts real clock time into a "day key" (a naive calendar
date) that the rest of the system uses to group tasks, sessions, and
distractions.

Example: at 2026-04-11 02:30 the day key is 2026-04-10.
         at 2026-04-11 05:00 the day key is 2026-04-11.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

DAY_START_HOUR = 4


def day_key(now: datetime) -> date:
    """Return the TaskRoot day key for a wall-clock datetime."""
    if now.hour < DAY_START_HOUR:
        return (now - timedelta(days=1)).date()
    return now.date()


def day_bounds(key: date) -> tuple[datetime, datetime]:
    """Return the [start, end) wall-clock bounds of a TaskRoot day.

    The day identified by ``key`` begins at 04:00 on ``key`` and ends at
    04:00 on the following calendar date. The returned interval is
    half-open: start is inclusive, end is exclusive.
    """
    start = datetime.combine(key, time(DAY_START_HOUR, 0))
    end = start + timedelta(days=1)
    return start, end


def is_in_day(when: datetime, key: date) -> bool:
    start, end = day_bounds(key)
    return start <= when < end


def today(now: datetime | None = None) -> date:
    """Convenience: the current day key. ``now`` override is for tests."""
    return day_key(now or datetime.now())
