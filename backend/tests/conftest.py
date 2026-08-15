import os
import sys
from datetime import timedelta
from io import BytesIO
from typing import Generator

import pytest
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Permet de tester avec SQLite malgré l'utilisation de JSONB (PostgreSQL)
from sqlalchemy.dialects import postgresql
postgresql.JSONB = sqlalchemy.JSON

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.routers.auth import create_access_token, get_password_hash


class InMemoryStorageService:
    """Stockage objet en mémoire pour les tests."""

    def __init__(self):
        self._store = {}

    def upload_file(self, object_name: str, data: bytes, content_type: str) -> str:
        self._store[object_name] = data
        return object_name

    def get_file(self, object_name: str) -> bytes:
        return self._store[object_name]

    def delete_file(self, object_name: str):
        self._store.pop(object_name, None)


@pytest.fixture(scope="session")
def engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(engine) -> Generator:
    connection = engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(bind=connection)
    session = SessionLocal()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Remplace le stockage MinIO par un stockage en mémoire
    from app.services import storage_service as storage_module
    fake_storage = InMemoryStorageService()
    monkeypatch.setattr(storage_module, "storage_service", fake_storage)

    # Remplace python-magic par une détection basique
    import magic

    def fake_from_buffer(content, mime=False):
        if mime:
            if content[:8] == b"\x89PNG\r\n\x1a\n":
                return "image/png"
            if content[:3] == b"\xff\xd8\xff":
                return "image/jpeg"
            return "application/octet-stream"
        return "data"

    monkeypatch.setattr(magic, "from_buffer", fake_from_buffer)

    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def create_user(db_session):
    def _create(email: str, password: str, is_admin: bool = False):
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name="Test User",
            is_active=True,
            is_admin=is_admin,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    return _create


@pytest.fixture
def auth_client(client, create_user):
    def _auth(email: str = "user@example.com", password: str = "Password123", is_admin: bool = False):
        user = create_user(email, password, is_admin)
        token = create_access_token({"sub": user.id}, expires_delta=timedelta(minutes=30))
        client.headers["Authorization"] = f"Bearer {token}"
        return client, user
    return _auth


@pytest.fixture
def fake_image() -> BytesIO:
    """Génère un faux PNG valide de 1x1 pixel."""
    return BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82")
