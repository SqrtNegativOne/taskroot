import pytest

from taskroot.verbs import (
    VerbValidationError,
    _parse_verb_file,
    first_word,
    is_task_name_verb_led,
    normalise_first_word,
    validate_task_name,
)


def test_first_word_strips_leading_punctuation():
    assert first_word("  Fix the bug") == "Fix"
    assert first_word("- write tests") == "write"


def test_first_word_on_empty_string():
    assert first_word("") is None
    assert first_word("   ") is None


def test_verb_led_passes_base_form():
    assert is_task_name_verb_led("Fix the bug")
    assert is_task_name_verb_led("write tests")
    assert is_task_name_verb_led("REVIEW pr 42")  # case insensitive


def test_verb_led_rejects_noun():
    assert not is_task_name_verb_led("Bug in login")


def test_validate_raises_on_non_verb():
    with pytest.raises(VerbValidationError):
        validate_task_name("Bug in login")


def test_validate_accepts_verb():
    validate_task_name("fix the bug")  # must not raise


def test_strict_policy_rejects_past_tense():
    # "Fixed the bug" is a log entry, not a task.
    assert not is_task_name_verb_led("Fixed the bug")


def test_strict_policy_rejects_gerund():
    # "Following up with Sam" describes ongoing action, not a command.
    assert not is_task_name_verb_led("Following up with Sam")


def test_strict_policy_rejects_third_person_s():
    # "Studies the data" — third-person present is not imperative.
    assert not is_task_name_verb_led("Studies the data")


# -- _parse_verb_file --------------------------------------------------------

def test_parse_verb_file_basic():
    verbs = _parse_verb_file("fix\nwrite\nreview\n")
    assert verbs == frozenset({"fix", "write", "review"})


def test_parse_verb_file_ignores_comment_lines():
    verbs = _parse_verb_file("# header comment\nfix\n# another\nwrite\n")
    assert "fix" in verbs
    assert "write" in verbs
    assert "# header comment" not in verbs


def test_parse_verb_file_ignores_blank_lines():
    verbs = _parse_verb_file("\n\nfix\n\nwrite\n\n")
    assert verbs == frozenset({"fix", "write"})


def test_parse_verb_file_lowercases_entries():
    verbs = _parse_verb_file("Fix\nWRITE\nReview")
    assert "fix" in verbs
    assert "write" in verbs
    assert "review" in verbs
    assert "Fix" not in verbs


def test_parse_verb_file_strips_whitespace():
    verbs = _parse_verb_file("  fix  \n  write  \n")
    assert "fix" in verbs
    assert "write" in verbs


# -- normalise_first_word ----------------------------------------------------

def test_normalise_lowercases():
    assert "fix" in normalise_first_word("Fix")


def test_normalise_strips_leading_apostrophe():
    assert "fix" in normalise_first_word("'fix")


def test_normalise_strips_leading_hyphen():
    assert "fix" in normalise_first_word("-fix")


# -- numeric first token falls through as non-verb ---------------------------

def test_numeric_first_token_is_not_verb_led():
    # first_word skips non-alpha chars; "123" yields "tasks" as first word
    assert not is_task_name_verb_led("123 tasks to complete")
