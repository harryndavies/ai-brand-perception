import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.auth import create_access_token, hash_password
from app.core.database import get_session
from app.main import app
from app.models.user import User
from app.models.report import Report  # noqa: F401 – registers table

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(TEST_ENGINE)
    yield
    SQLModel.metadata.drop_all(TEST_ENGINE)


def _get_test_session():
    with Session(TEST_ENGINE) as session:
        yield session


@pytest.fixture(name="session")
def session_fixture():
    with Session(TEST_ENGINE) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture():
    app.dependency_overrides[get_session] = _get_test_session
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user_fixture(session):
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=hash_password("password123"),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(test_user):
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}
