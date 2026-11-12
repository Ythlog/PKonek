"""Create the first Pasig admin account (run once after schema.sql).

    python -m accounts_complaints.create_admin --email admin@pasig.gov.ph --name "Pasig Admin"

The password is prompted for and never echoed or logged.
"""
import argparse
import getpass
import sys

from sqlalchemy import select

from .db import get_sessionmaker
from .models import User
from .security import hash_password
from .services import activity_log, audit


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a pasig_admin account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()

    email = args.email.strip().lower()
    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8 or len(password.encode("utf-8")) > 72:
        print("Password must be 8 to 72 bytes.", file=sys.stderr)
        return 1
    if password != getpass.getpass("Repeat password: "):
        print("Passwords do not match.", file=sys.stderr)
        return 1

    with get_sessionmaker()() as db:
        if db.scalar(select(User.id).where(User.email == email)):
            print(f"{email} already exists.", file=sys.stderr)
            return 1
        user = User(
            email=email, password_hash=hash_password(password),
            full_name=args.name.strip(), role="pasig_admin", is_active=True,
        )
        db.add(user)
        db.flush()
        audit.record(db, actor_user_id=None, entity_type="user", entity_id=user.id,
                     action="create", after=audit.snapshot(user))
        activity_log.record(db, activity_log.ACCOUNT_CREATED, user_id=user.id, email=email,
                            details={"by": "create_admin_cli", "role": "pasig_admin"})
        db.commit()
        print(f"Created pasig_admin {email} (id {user.id}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
