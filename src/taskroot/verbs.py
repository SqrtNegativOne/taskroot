"""Verb-prefix validator for task names.

Per plan.txt: the first word of every task name must be a recognised
English verb. Tasks that fail this check are *hard rejected* with an
inline error — no warning, no override.

The verb list lives in ``data/verbs.txt`` as one base-form verb per
line. At startup it is loaded into an in-memory set for O(1) lookup.

The interesting question this module answers is **what "the first word"
means**. A user typing "Fix the bug" should pass — but so should "fixed
the bug" (past tense), "Following up with Sam" (gerund), and arguably
"Follow up" (phrasal). The :func:`normalise_first_word` function decides
how aggressive to be. It is deliberately small and easy to swap.
"""
from __future__ import annotations

import re
from functools import lru_cache
from importlib.resources import files
from pathlib import Path

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]*")


class VerbValidationError(ValueError):
    """Raised when a task name does not begin with a recognised verb."""


@lru_cache(maxsize=1)
def load_verbs() -> frozenset[str]:
    """Load the bundled verb list. Cached for the life of the process."""
    data = files("taskroot.data").joinpath("verbs.txt").read_text(encoding="utf-8")
    return _parse_verb_file(data)


def load_verbs_from_path(path: Path) -> frozenset[str]:
    """Load a verb list from an arbitrary path (useful for tests and
    user-extended lists)."""
    return _parse_verb_file(path.read_text(encoding="utf-8"))


def _parse_verb_file(text: str) -> frozenset[str]:
    verbs: set[str] = set()
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        verbs.add(line.lower())
    return frozenset(verbs)


def first_word(name: str) -> str | None:
    """Extract the first word-like token from a task name."""
    match = _WORD_RE.search(name)
    return match.group(0) if match else None


def normalise_first_word(word: str) -> list[str]:
    """Return candidate base forms for ``word`` to check against the verb set.

    **Policy: strict base form only.** Task names must begin with the
    imperative / base form of a verb — "Fix the bug", not "Fixed the
    bug", "Fixing the bug", "Following up with Sam", or "Studies the
    data". Rationale: a task is a command addressed to your future
    self, and commands are imperative. "Fixed the bug" describes
    something already done; it is not a task at all, and silently
    accepting it would let log entries leak into the capture pile.

    The function lowercases the word and strips surrounding punctuation
    and nothing else. It returns a single-element list because the call
    site iterates — if the policy ever expands, adding candidates here
    is the single point of change.
    """
    return [word.lower().strip("'-")]


def is_task_name_verb_led(name: str, verbs: frozenset[str] | None = None) -> bool:
    """Return True if the first word of ``name`` is a recognised verb."""
    verbs = verbs if verbs is not None else load_verbs()
    word = first_word(name)
    if word is None:
        return False
    return any(candidate in verbs for candidate in normalise_first_word(word))


def validate_task_name(name: str, verbs: frozenset[str] | None = None) -> None:
    """Raise :class:`VerbValidationError` if ``name`` is not verb-led."""
    if not is_task_name_verb_led(name, verbs):
        word = first_word(name) or ""
        raise VerbValidationError(
            f"Task name must begin with a verb. '{word}' is not recognised."
        )
