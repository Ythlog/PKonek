import os

import pytest

# Integration tests run only against an explicit test database, never the shared .env one by accident.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from accounts_complaints import deps  # noqa: E402


@pytest.fixture(autouse=True)
def reset_rate_limits():
    for limiter in (deps.create_complaint_limiter, deps.support_limiter, deps.dup_check_limiter, deps.login_limiter):
        limiter.reset()
    yield
