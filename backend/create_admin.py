#!/usr/bin/env python3
"""
create_admin.py

A simple CLI utility to create an admin user in the system.
Usage:
  uv run python create_admin.py --email admin@example.com --password secret123
"""

import argparse
import sys
import logging

from app.database import SessionLocal
from app.crud import get_admin_by_email, create_admin
from app.auth import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Create a new admin user.")
    parser.add_argument(
        "--email", 
        required=True, 
        help="The email address for the admin user."
    )
    parser.add_argument(
        "--password", 
        required=True, 
        help="The password for the admin user."
    )
    
    args = parser.parse_args()
    
    db = SessionLocal()
    try:
        # Check if the user already exists
        existing_admin = get_admin_by_email(db, args.email)
        if existing_admin:
            logger.info(f"An admin with email '{args.email}' already exists. Skipping creation.")
            sys.exit(0)
            
        # Hash password and create admin
        logger.info(f"Creating admin user '{args.email}'...")
        hashed_pw = get_password_hash(args.password)
        create_admin(db, email=args.email, hashed_password=hashed_pw)
        db.commit()
        
        logger.info("Admin user created successfully.")
    except Exception as e:
        logger.exception("Failed to create admin user.")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
