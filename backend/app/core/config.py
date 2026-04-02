import os

_ENV = os.getenv("ENV", "development")

_secret = os.getenv("SECRET_KEY", "")
if not _secret and _ENV == "production":
    raise RuntimeError("SECRET_KEY must be set in production")
SECRET_KEY = _secret or "dev-secret-change-me-in-production"

_encryption_key = os.getenv("ENCRYPTION_KEY", "")
if not _encryption_key and _ENV == "production":
    raise RuntimeError("ENCRYPTION_KEY must be set in production")
ENCRYPTION_KEY = _encryption_key or "dev-encryption-key-change-me"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
