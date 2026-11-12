"""Pure complaint status transition rules.

No database IDs are used here: status values are the shared schema's stable codes.
"""

from dataclasses import dataclass
from enum import Enum


class Actor(str, Enum):
    CITIZEN = "citizen"
    OFFICIAL = "official"
    ADMIN = "admin"
    SYSTEM = "system"


class TransitionError(ValueError):
    """A rejected status change with a stable machine-readable code."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class Transition:
    source: str
    target: str
    allowed_actors: frozenset[Actor]
    requires_note: bool = False
    requires_after_photo: bool = False


_OFFICIAL = frozenset({Actor.OFFICIAL})
_ADMIN = frozenset({Actor.ADMIN})
_OFFICIAL_ADMIN = frozenset({Actor.OFFICIAL, Actor.ADMIN})
_CITIZEN_ADMIN = frozenset({Actor.CITIZEN, Actor.ADMIN})
_SYSTEM = frozenset({Actor.SYSTEM})

_TRANSITIONS = (
    Transition("submitted", "under_review", _OFFICIAL_ADMIN),
    Transition("submitted", "in_progress", _OFFICIAL_ADMIN),
    Transition("submitted", "rejected", _OFFICIAL_ADMIN, requires_note=True),
    Transition("under_review", "in_progress", _OFFICIAL_ADMIN),
    Transition("under_review", "rejected", _OFFICIAL_ADMIN, requires_note=True),
    Transition("in_progress", "resolved_pending_verification", _OFFICIAL_ADMIN, requires_note=True, requires_after_photo=True),
    Transition("in_progress", "under_review", _OFFICIAL_ADMIN),
    Transition("resolved_pending_verification", "resolved", _CITIZEN_ADMIN),
    Transition("resolved_pending_verification", "resolved", _SYSTEM),
    Transition("resolved_pending_verification", "reopened", _CITIZEN_ADMIN),
    Transition("reopened", "under_review", _OFFICIAL_ADMIN),
    Transition("reopened", "in_progress", _OFFICIAL_ADMIN),
    Transition("resolved", "under_review", _ADMIN, requires_note=True),
    Transition("rejected", "under_review", _ADMIN, requires_note=True),
)

_BY_PAIR: dict[tuple[str, str], tuple[Transition, ...]] = {}
for _transition in _TRANSITIONS:
    _key = (_transition.source, _transition.target)
    _BY_PAIR[_key] = (*_BY_PAIR.get(_key, ()), _transition)


def allowed_actors(source: str, target: str) -> frozenset[Actor]:
    """Return the actor roles permitted for a valid transition pair."""
    transitions = _BY_PAIR.get((source, target))
    if not transitions:
        raise TransitionError("INVALID_TRANSITION", f"Transition {source!r} -> {target!r} is not allowed")
    actors = frozenset(actor for transition in transitions for actor in transition.allowed_actors)
    return actors


def validate_transition(
    source: str,
    target: str,
    actor: Actor | str,
    *,
    note: str | None = None,
    has_after_photo: bool = False,
    system_timeout: bool = False,
) -> Transition:
    """Validate a proposed transition and return its rule, or raise TransitionError."""
    try:
        actor_value = actor if isinstance(actor, Actor) else Actor(actor)
    except ValueError as exc:
        raise TransitionError("INVALID_TRANSITION", f"Unknown actor {actor!r}") from exc

    candidates = _BY_PAIR.get((source, target), ())
    if not candidates:
        raise TransitionError("INVALID_TRANSITION", f"Transition {source!r} -> {target!r} is not allowed")
    rule = next((candidate for candidate in candidates if actor_value in candidate.allowed_actors), None)
    if rule is None:
        raise TransitionError("INVALID_TRANSITION", f"Actor {actor_value.value!r} cannot perform {source!r} -> {target!r}")
    if actor_value is Actor.SYSTEM and source == "resolved_pending_verification" and target == "resolved" and not system_timeout:
        raise TransitionError("INVALID_TRANSITION", "System may resolve only as an automatic verification timeout")
    if rule.requires_note and not (note and note.strip()):
        raise TransitionError("NOTE_REQUIRED", f"A note is required for {source!r} -> {target!r}")
    if rule.requires_after_photo and not has_after_photo:
        raise TransitionError("AFTER_PHOTO_REQUIRED", "An after-photo reference is required to submit for verification")
    return rule

