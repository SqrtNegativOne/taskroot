from datetime import date, datetime

from taskroot.day import day_bounds, day_key, is_in_day, today


def test_before_4am_rolls_back():
    assert day_key(datetime(2026, 4, 11, 2, 30)) == date(2026, 4, 10)


def test_at_4am_is_new_day():
    assert day_key(datetime(2026, 4, 11, 4, 0)) == date(2026, 4, 11)


def test_after_4am_is_new_day():
    assert day_key(datetime(2026, 4, 11, 5, 0)) == date(2026, 4, 11)


def test_just_before_midnight_is_same_day():
    assert day_key(datetime(2026, 4, 11, 23, 59)) == date(2026, 4, 11)


def test_bounds_span_24_hours():
    start, end = day_bounds(date(2026, 4, 11))
    assert start == datetime(2026, 4, 11, 4, 0)
    assert end == datetime(2026, 4, 12, 4, 0)


def test_is_in_day_excludes_end():
    key = date(2026, 4, 11)
    assert is_in_day(datetime(2026, 4, 11, 4, 0), key)
    assert is_in_day(datetime(2026, 4, 11, 23, 59), key)
    assert is_in_day(datetime(2026, 4, 12, 3, 59), key)
    assert not is_in_day(datetime(2026, 4, 12, 4, 0), key)
    assert not is_in_day(datetime(2026, 4, 11, 3, 59), key)


# -- today() wrapper ---------------------------------------------------------

def test_today_with_override_before_4am():
    assert today(datetime(2026, 4, 11, 2, 30)) == date(2026, 4, 10)


def test_today_with_override_after_4am():
    assert today(datetime(2026, 4, 11, 5, 0)) == date(2026, 4, 11)


def test_today_without_override_returns_a_date():
    result = today()
    assert isinstance(result, date)
