"""
Database Setup for SportLens AI

Configures SQLAlchemy with SQLite for persistent session storage.
Features:
- SQLite for demo/development (no external dependencies)
- SQLAlchemy ORM for type-safe queries
- Automatic table creation
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

# Database configuration
DATABASE_PATH = os.getenv("DATABASE_PATH", "sportlens.db")
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Create engine with SQLite-specific configuration
# StaticPool keeps connection in memory (good for SQLite)
# check_same_thread=False allows multiple threads (needed for FastAPI)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False  # Set to True for SQL debugging
)

# Session factory for creating database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for all models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency for getting database session.
    
    Usage in routes:
        @router.get("/sessions")
        async def get_sessions(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables.
    Call this at startup.
    """
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    # Create tables when module is run directly
    init_db()
    print(f"✅ Database initialized at {DATABASE_PATH}")
