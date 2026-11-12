"""Pure SLA deadline, clock, warning, and escalation calculations."""

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True, slots=True)
class SLAConfig:
    warning_ratio: float = 0.75
    escalation_l2_grace_ratio: float = 0.5
    reopen_sla_ratio: float = 0.5
    reopen_sla_min_hours: float = 4

    def __post_init__(self) -> None:
        if self.warning_ratio < 0:
            raise ValueError("warning_ratio must be non-negative")
        if self.escalation_l2_grace_ratio < 0:
            raise ValueError("escalation_l2_grace_ratio must be non-negative")
        if self.reopen_sla_ratio < 0:
            raise ValueError("reopen_sla_ratio must be non-negative")
        if self.reopen_sla_min_hours < 0:
            raise ValueError("reopen_sla_min_hours must be non-negative")


@dataclass(frozen=True, slots=True)
class SLAStatus:
    elapsed_ratio: float
    warning: bool
    overdue: bool
    escalation_level: int
    clock_paused: bool


def due_at(submitted_at: datetime, category_sla_hours: float) -> datetime:
    """Return the original deadline; input datetimes should be UTC-aware or consistently naive."""
    if category_sla_hours < 0:
        raise ValueError("category_sla_hours must be non-negative")
    return submitted_at + timedelta(hours=category_sla_hours)


def elapsed_ratio(
    submitted_at: datetime,
    now: datetime,
    category_sla_hours: float,
    *,
    paused_seconds: float = 0,
) -> float:
    """Compute active elapsed time divided by the original SLA duration."""
    if category_sla_hours <= 0:
        raise ValueError("category_sla_hours must be positive")
    if paused_seconds < 0:
        raise ValueError("paused_seconds must be non-negative")
    elapsed_seconds = max(0.0, (now - submitted_at).total_seconds() - paused_seconds)
    return elapsed_seconds / (category_sla_hours * 3600)


def sla_status(
    submitted_at: datetime,
    now: datetime,
    category_sla_hours: float,
    *,
    paused_seconds: float = 0,
    resolved_pending_verification: bool = False,
    config: SLAConfig = SLAConfig(),
) -> SLAStatus:
    """Return warning/overdue/escalation state, pausing while awaiting verification."""
    if category_sla_hours <= 0:
        raise ValueError("category_sla_hours must be positive")
    if resolved_pending_verification:
        ratio = 0.0
        return SLAStatus(ratio, False, False, 0, True)
    ratio = elapsed_ratio(submitted_at, now, category_sla_hours, paused_seconds=paused_seconds)
    overdue = ratio >= 1.0
    escalation_level = 0
    if overdue:
        escalation_level = 1
        if ratio >= 1.0 + config.escalation_l2_grace_ratio:
            escalation_level = 2
    return SLAStatus(
        elapsed_ratio=ratio,
        warning=ratio >= config.warning_ratio,
        overdue=overdue,
        escalation_level=escalation_level,
        clock_paused=False,
    )


def reopen_due_at(now: datetime, category_sla_hours: float, config: SLAConfig = SLAConfig()) -> datetime:
    """Start a fresh reopen cycle using max(configured SLA ratio, minimum hours)."""
    if category_sla_hours < 0:
        raise ValueError("category_sla_hours must be non-negative")
    cycle_hours = max(category_sla_hours * config.reopen_sla_ratio, config.reopen_sla_min_hours)
    return now + timedelta(hours=cycle_hours)

