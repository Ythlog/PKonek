import pytest

from resolution.domain.state_machine import Actor, TransitionError, allowed_actors, validate_transition


def test_allowed_transitions_and_actors():
    assert allowed_actors("submitted", "under_review") == {Actor.OFFICIAL, Actor.ADMIN}
    assert allowed_actors("resolved_pending_verification", "resolved") == {Actor.CITIZEN, Actor.ADMIN, Actor.SYSTEM}
    assert allowed_actors("resolved_pending_verification", "reopened") == {Actor.CITIZEN, Actor.ADMIN}
    assert validate_transition("reopened", "in_progress", "official").target == "in_progress"


@pytest.mark.parametrize("source,target", [
    ("submitted", "resolved"),
    ("resolved", "rejected"),
    ("rejected", "in_progress"),
    ("in_progress", "resolved"),
    ("unknown", "submitted"),
])
def test_invalid_transition_pairs(source, target):
    with pytest.raises(TransitionError) as error:
        validate_transition(source, target, Actor.ADMIN, note="because")
    assert error.value.code == "INVALID_TRANSITION"


def test_actor_restrictions():
    with pytest.raises(TransitionError) as error:
        validate_transition("submitted", "in_progress", "citizen")
    assert error.value.code == "INVALID_TRANSITION"
    with pytest.raises(TransitionError) as error:
        validate_transition("resolved_pending_verification", "resolved", "official")
    assert error.value.code == "INVALID_TRANSITION"
    with pytest.raises(TransitionError) as error:
        validate_transition("resolved_pending_verification", "resolved", "system")
    assert error.value.code == "INVALID_TRANSITION"
    assert validate_transition("resolved_pending_verification", "resolved", "system", system_timeout=True).target == "resolved"


@pytest.mark.parametrize("source,target,actor", [
    ("submitted", "rejected", "official"),
    ("under_review", "rejected", "admin"),
    ("resolved", "under_review", "admin"),
    ("rejected", "under_review", "admin"),
])
def test_required_note(source, target, actor):
    with pytest.raises(TransitionError) as error:
        validate_transition(source, target, actor, note="  ")
    assert error.value.code == "NOTE_REQUIRED"
    assert validate_transition(source, target, actor, note="reason").requires_note


def test_done_requires_note_and_after_photo():
    with pytest.raises(TransitionError) as error:
        validate_transition("in_progress", "resolved_pending_verification", "official", has_after_photo=True)
    assert error.value.code == "NOTE_REQUIRED"
    with pytest.raises(TransitionError) as error:
        validate_transition("in_progress", "resolved_pending_verification", "official", note="Done")
    assert error.value.code == "AFTER_PHOTO_REQUIRED"
    rule = validate_transition("in_progress", "resolved_pending_verification", "official", note="Done", has_after_photo=True)
    assert rule.requires_after_photo


def test_admin_can_reopen_done_and_terminal_records_with_note():
    assert validate_transition("resolved_pending_verification", "reopened", "admin").target == "reopened"
    assert validate_transition("resolved", "under_review", "admin", note="Appeal accepted").target == "under_review"

