from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime

# Define the SQLite database connection
SQLALCHEMY_DATABASE_URL = "sqlite:///./esports_telemetry.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 1. STAFF (Managers & Coaches) ---
class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String) # Storing plain text for MVP, use bcrypt in production!
    name = Column(String)
    role = Column(String) # "manager" or "coach"
    
    # A Coach manages multiple Teams
    teams = relationship("Team", back_populates="coach")

# --- 2. TEAMS ---
class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    # A Team belongs to one Coach
    coach_id = Column(Integer, ForeignKey("staff.id"))
    coach = relationship("Staff", back_populates="teams")
    
    # A Team has many Players
    players = relationship("Player", back_populates="team")

# --- 3. PLAYERS ---
class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)  # Google Auth Bridge
    gamertag = Column(String) 
    role = Column(String, default="Player")
    
    # A Player belongs to a Team
    team_id = Column(Integer, ForeignKey("teams.id"))
    team = relationship("Team", back_populates="players")
    
    # One Player has many Telemetry Logs
    logs = relationship("TelemetryLog", back_populates="player")

# --- 4. TELEMETRY LOGS ---
class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    trigger_message = Column(String)
    crisis_eval = Column(String)
    team_dynamics = Column(String)
    lifestyle = Column(String)
    
    # A Log belongs to a Player
    player_id = Column(Integer, ForeignKey("players.id"))
    player = relationship("Player", back_populates="logs")

# Create all tables in the database
Base.metadata.create_all(bind=engine)