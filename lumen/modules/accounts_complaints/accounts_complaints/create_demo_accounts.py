"""Create the three PKonek demo accounts in the configured database.

Run from this module's environment:
    python -m accounts_complaints.create_demo_accounts

The command prompts for a password, never prints it, and skips accounts that
already exist so it cannot silently reset a real user's credentials.
"""
import getpass
import sys

from sqlalchemy import select
from sqlalchemy.exc import OperationalError

from .db import get_engine, get_sessionmaker
from .models import User
from .security import hash_password
from .services import activity_log, audit

DEMO_USERS = (
    ("citizen@pkonek.demo", "PKonek Demo Citizen", "citizen", None),
    ("official@pkonek.demo", "PKonek Demo Official", "official", "Kapitolyo"),
    ("admin@pkonek.demo", "PKonek Demo Administrator", "pasig_admin", None),
)


def main() -> int:
    # Confirm the database is reachable before asking for a password.
    try:
        with get_engine().connect():
            pass
    except OperationalError as exc:
        original = getattr(exc, "orig", exc)
        print("Could not connect to the configured MySQL database.", file=sys.stderr)
        print("Check DATABASE_URL host and port in lumen/.env against the Aiven service's connection details.", file=sys.stderr)
        print("Also confirm the service is running and your network/IP is allowed.", file=sys.stderr)
        print(f"Connection detail: {original}", file=sys.stderr)
        return 1

    password = getpass.getpass("Password for new demo accounts (min 8 chars): ")
    if len(password) < 8 or len(password.encode("utf-8")) > 72:
        print("Password must be 8 to 72 bytes.", file=sys.stderr)
        return 1
    if password != getpass.getpass("Repeat password: "):
        print("Passwords do not match.", file=sys.stderr)
        return 1

    created: list[tuple[str, str]] = []
    skipped: list[str] = []
    with get_sessionmaker()() as db:
        password_hash = hash_password(password)
        for email, name, role, barangay in DEMO_USERS:
            email = email.lower()
            if db.scalar(select(User.id).where(User.email == email)):
                skipped.append(email)
                continue
            user = User(
                email=email,
                password_hash=password_hash,
                full_name=name,
                role=role,
                barangay=barangay,
                is_active=True,
            )
            db.add(user)
            db.flush()
            audit.record(
                db,
                actor_user_id=None,
                entity_type="user",
                entity_id=user.id,
                action="create",
                after=audit.snapshot(user),
            )
            activity_log.record(
                db,
                activity_log.ACCOUNT_CREATED,
                user_id=user.id,
                email=email,
                details={"by": "create_demo_accounts_cli", "role": role},
            )
            created.append((email, role))
        db.commit()

    for email, role in created:
        print(f"Created {role}: {email}")
    for email in skipped:
        print(f"Skipped existing account: {email} (password and role were not changed)")
    if not created:
        print("No new accounts created.")
    print("Use the password entered above for newly created accounts only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
