from __future__ import annotations

from taskroot.models import Task
from taskroot.similarity import DEFAULT_THRESHOLD, find_similar


def make_task(name: str) -> Task:
    return Task(name=name)


def test_empty_query_returns_empty():
    candidates = [make_task("fix the bug"), make_task("write tests")]
    assert find_similar("", candidates) == []


def test_whitespace_query_returns_empty():
    candidates = [make_task("fix the bug")]
    assert find_similar("   ", candidates) == []


def test_empty_candidates_returns_empty():
    assert find_similar("fix bug", []) == []


def test_exact_match_scores_high():
    task = make_task("fix the login bug")
    results = find_similar("fix the login bug", [task])
    assert len(results) == 1
    assert results[0].task.id == task.id
    assert results[0].score >= 90


def test_below_threshold_filtered_out():
    candidates = [make_task("fix the bug"), make_task("write docs")]
    results = find_similar("zzz completely unrelated xyz", candidates, threshold=DEFAULT_THRESHOLD)
    assert results == []


def test_limit_is_respected():
    candidates = [make_task(f"fix issue {i}") for i in range(10)]
    results = find_similar("fix issue", candidates, limit=3)
    assert len(results) <= 3


def test_case_insensitive_matching():
    task = make_task("fix the bug")
    results = find_similar("FIX THE BUG", [task])
    assert len(results) == 1
    assert results[0].task.id == task.id


def test_returns_suggestion_objects():
    task = make_task("fix the bug")
    results = find_similar("fix bug", [task])
    assert len(results) >= 1
    suggestion = results[0]
    assert hasattr(suggestion, "task")
    assert hasattr(suggestion, "score")
    assert isinstance(suggestion.score, float)
