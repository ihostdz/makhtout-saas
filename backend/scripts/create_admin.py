#!/usr/bin/env python3
"""
Script d'initialisation d'un administrateur Makhtout.

Usage:
    cd backend
    python -m scripts.create_admin admin@example.com "MotDePasseFort" "Admin Nom"

Le script crée l'utilisateur avec is_admin=True s'il n'existe pas,
ou promeut un utilisateur existant en administrateur.
"""

import argparse
import sys

sys.path.insert(0, ".")

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User
from app.routers.auth import get_password_hash


def create_or_promote_admin(email: str, password: str, full_name: str | None = None) -> User:
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            if user.is_admin:
                print(f"[INFO] {email} est déjà administrateur.")
                return user
            user.is_admin = True
            if full_name and not user.full_name:
                user.full_name = full_name
            db.commit()
            print(f"[OK] {email} a été promu administrateur.")
            return user

        hashed = get_password_hash(password)
        admin = User(
            email=email,
            hashed_password=hashed,
            full_name=full_name,
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"[OK] Administrateur créé : {email}")
        return admin
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Créer ou promouvoir un administrateur Makhtout")
    parser.add_argument("email", help="Adresse e-mail de l'administrateur")
    parser.add_argument("password", help="Mot de passe")
    parser.add_argument("--full-name", "-n", help="Nom complet", default=None)
    args = parser.parse_args()

    create_or_promote_admin(args.email, args.password, args.full_name)


if __name__ == "__main__":
    main()
