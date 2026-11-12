"""Shared domain constants; status identity is always resolved by code in SQL."""

STATUS_CODES = frozenset({
    "submitted", "under_review", "in_progress",
    "resolved_pending_verification", "resolved", "rejected", "reopened",
})
TERMINAL_STATUS_CODES = frozenset({"resolved", "rejected"})
USER_ROLES = frozenset({"citizen", "official", "pasig_admin"})

