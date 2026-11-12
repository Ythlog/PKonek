from datetime import datetime, timedelta, timezone

from resolution.domain.metrics import (
    StatusChange,
    first_response_time,
    reopen_rate,
    resolution_time,
    sla_compliance_percent,
    verified_resolution_rate,
)


START = datetime(2025, 1, 1, tzinfo=timezone.utc)


def test_first_response_uses_first_official_or_admin_event():
    changes = [
        StatusChange("under_review", START + timedelta(minutes=5), "citizen"),
        StatusChange("in_progress", START + timedelta(minutes=9), "official"),
        StatusChange("under_review", START + timedelta(minutes=8), "admin"),
    ]
    assert first_response_time(START, changes) == timedelta(minutes=8)
    assert first_response_time(START, [changes[0]]) is None


def test_resolution_time_uses_first_done_mark_and_can_repeat():
    changes = [
        StatusChange("resolved_pending_verification", START + timedelta(hours=8), "official"),
        StatusChange("reopened", START + timedelta(hours=12), "citizen"),
        StatusChange("resolved_pending_verification", START + timedelta(hours=20), "official"),
    ]
    assert resolution_time(START, changes) == timedelta(hours=8)
    assert resolution_time(START, []) is None


def test_sla_compliance_uses_first_done_by_inclusive_original_due():
    due = START + timedelta(hours=10)
    assert sla_compliance_percent([(due, due), (due + timedelta(seconds=1), due), (None, due)]) == 100 / 3
    assert sla_compliance_percent([]) is None


def test_verified_resolution_rate_excludes_timeout_and_empty_votes():
    assert verified_resolution_rate(["confirmed", "rejected", "auto_timeout"]) == 50
    assert verified_resolution_rate(["auto_timeout"]) is None
    assert verified_resolution_rate([]) is None


def test_reopen_rate_counts_per_complaint_not_repeated_reopen_events():
    # Caller supplies one boolean per complaint, regardless of how many reopen cycles it had.
    assert reopen_rate([False, True, True, False]) == 50
    assert reopen_rate([]) is None
