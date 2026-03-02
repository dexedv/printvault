from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
from config import settings


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=settings.debug
)


def get_session():
    with Session(engine) as session:
        yield session


def init_db():
    """Initialize database tables"""
    from db.models import Project, ProjectVersion, File, PrintProfile, Filament, Printer, PrintJob, JobSnapshot
    SQLModel.metadata.create_all(engine)


def get_db():
    """Dependency for FastAPI routes"""
    with Session(engine) as session:
        yield session
