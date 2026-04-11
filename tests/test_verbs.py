import pytest

from taskroot.verbs import (
    VerbValidationError,
    first_word,
    is_task_name_verb_led,
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
