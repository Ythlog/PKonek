from datetime import datetime, timedelta, timezone

import pytest

from resolution.domain.sla import SLAConfig, due_at, elapsed_ratio, reopen_due_at, sla_status


T0 = datetime(2025, 1, 1, tzinfo=timezone.utc)


def test_due_at_uses_category_sla():
    assert due_at(T0, 24) == T0 + timedelta(hours=24)
    with pytest.raises(ValueError):
        due_at(T0, -1)


def test_elapsed_ratio_clamps_before_start_and_accounts_for_pause():
    assert elapsed_ratio(T0, T0 - timedelta(hours=1), 10) == 0
    assert elapsed_ratio(T0, T0 + timedelta(hours=10), 10, paused_seconds=5 * 3600) == 0.5
    with pytest.raises(ValueError):
        elapsed_ratio(T0, T0, 0)
    with pytest.raises(ValueError):
        elapsed_ratio(T0, T0, 1, paused_seconds=-1)


def test_warning_exactly_at_75_percent_and_just_before():
    before = sla_status(T0, T0 + timedelta(hours=7, minutes=29, seconds=59), 10)
    exact = sla_status(T0, T0 + timedelta(hours=7, minutes=30), 10)
    assert before.warning is False
    assert exact.warning is True
    assert exact.overdue is False
    assert exact.escalation_level == 0


def test_overdue_and_escalation_boundaries():
    exact_due = sla_status(T0, T0 + timedelta(hours=10), 10)
    assert exact_due.overdue is True
    assert exact_due.escalation_level == 1
    before_l2 = sla_status(T0, T0 + timedelta(hours=14, minutes=59, seconds=59), 10)
    exact_l2 = sla_status(T0, T0 + timedelta(hours=15), 10)
    assert before_l2.escalation_level == 1
    assert exact_l2.escalation_level == 2


def test_thresholds_are_configurable():
    config = SLAConfig(warning_ratio=0.5, escalation_l2_grace_ratio=0.25)
    status = sla_status(T0, T0 + timedelta(hours=12, minutes=30), 10, config=config)
    assert status.warning and status.overdue and status.escalation_level == 2


def test_paused_verification_clock_and_previously_paused_seconds():
    paused = sla_status(T0, T0 + timedelta(days=20), 10, resolved_pending_verification=True)
    assert paused.clock_paused is True
    assert paused.elapsed_ratio == 0
    assert paused.warning is paused.overdue is False
    assert paused.escalation_level == 0
    continued = sla_status(T0, T0 + timedelta(hours=12), 10, paused_seconds=4 * 3600)
    assert continued.elapsed_ratio == 0.8
    assert continued.warning and not continued.overdue


def test_reopen_cycle_uses_ratio_or_minimum_and_can_repeat_from_new_now():
    config = SLAConfig(reopen_sla_ratio=0.5, reopen_sla_min_hours=4)
    first_now = T0 + timedelta(days=1)
    first_due = reopen_due_at(first_now, 20, config)
    assert first_due == first_now + timedelta(hours=10)
    second_now = first_due + timedelta(hours=7)
    second_due = reopen_due_at(second_now, 20, config)
    assert second_due == second_now + timedelta(hours=10)
    assert second_due > first_due
    assert reopen_due_at(T0, 6, config) == T0 + timedelta(hours=4)
    assert reopen_due_at(T0, 0, config) == T0 + timedelta(hours=4)

