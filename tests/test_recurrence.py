from datetime import date

from taskroot.models import RecurRule, RecurType
from taskroot.recurrence import fires_on, projected_occurrences


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


def test_projected_occurrences_spans_range():
    rule = RecurRule(type=RecurType.WEEKLY, interval=1, days_of_week=[0])
    occ = projected_occurrences(rule, date(2026, 4, 1), date(2026, 5, 1))
    # Mondays in April 2026: 6, 13, 20, 27
    assert occ == [date(2026, 4, 6), date(2026, 4, 13), date(2026, 4, 20), date(2026, 4, 27)]
