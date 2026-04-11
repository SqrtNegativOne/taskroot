"""Fuzzy similarity for the Capture phase.

While the user types a task name, similar existing tasks should be
surfaced in real time so they don't re-enter an already-captured item.
This module is the search side of that feature; the UI is responsible
for debouncing and rendering.

We use RapidFuzz's WRatio scorer: case-insensitive, token-aware, and
fast enough that we can re-score the full open-task list on every
keystroke for realistic N (hundreds of open tasks). If the list ever
grows past ~5000, switch to a prefix index.
"""
from __future__ import annotations

from dataclasses import dataclass

from rapidfuzz import fuzz, process

from .models import Task

# Anything below this score is dropped from the suggestion list. Tuned
# on the conservative side — we'd rather miss a borderline match than
# drown the user in false positives while they type.
DEFAULT_THRESHOLD = 72


@dataclass(slots=True)
class Suggestion:
    task: Task
    score: float


def find_similar(
    query: str,
    candidates: list[Task],
    *,
    limit: int = 5,
    threshold: int = DEFAULT_THRESHOLD,
) -> list[Suggestion]:
    """Return the top ``limit`` tasks whose names fuzzily match ``query``."""
    if not query.strip() or not candidates:
        return []
    by_name = {str(t.id): t for t in candidates}
    names = {str(t.id): t.name for t in candidates}
    hits = process.extract(
        query,
        names,
        scorer=fuzz.WRatio,
        limit=limit,
        score_cutoff=threshold,
    )
    return [Suggestion(task=by_name[key], score=score) for _, score, key in hits]
