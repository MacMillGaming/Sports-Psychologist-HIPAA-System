import os
import requests
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.orchestrator import process_player_message
from database.models import SessionLocal, TelemetryLog, Team, Player, Staff, engine, Base

load_dotenv()

app = FastAPI(title="Prism AI API")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

# --- DATABASE SETUP & SEEDER ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def seed_database():
    db = SessionLocal()
    
    if not db.query(Staff).filter(Staff.username == "manager").first():
        manager = Staff(username="manager", password="password123", name="General Manager", role="manager")
        db.add(manager)
        
    coach = db.query(Staff).filter(Staff.username == "coach").first()
    if not coach:
        coach = Staff(username="coach", password="password123", name="Head Coach", role="coach")
        db.add(coach)
        db.commit()
        db.refresh(coach)
        
    if not db.query(Team).filter(Team.name == "Prism Academy").first():
        team = Team(name="Prism Academy", coach_id=coach.id)
        db.add(team)
        
    if not db.query(Team).filter(Team.name == "Prism Varsity").first():
        team2 = Team(name="Prism Varsity")
        db.add(team2)
        
    db.commit()
    db.close()

# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections:
            await connection.send_json(data)

manager = ConnectionManager()

def trigger_blind_pager(team_name: str):
    if not DISCORD_WEBHOOK_URL: return
    payload = {"content": f"🚨 **SYSTEM ALERT: TIER 1 CRISIS DETECTED** 🚨\n\nA critical psychological trigger has been logged on the active roster for **{team_name}**.\n\nImmediate review required."}
    try:
        requests.post(DISCORD_WEBHOOK_URL, json=payload)
    except:
        pass

# --- CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Prism AI Backend Online"}

# --- AUTH ENDPOINT ---
class AuthRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/verify")
async def verify_staff(request: AuthRequest, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.username == request.username).first()
    if staff and staff.password == request.password:
        return {"id": str(staff.id), "name": staff.name, "role": staff.role}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- MANAGER ORG ENDPOINTS ---
@app.get("/api/org")
async def get_org_data(db: Session = Depends(get_db)):
    coaches = db.query(Staff).filter(Staff.role == "coach").all()
    teams = db.query(Team).all()
    players = db.query(Player).all()
    
    return {
        "coaches": [{"id": c.id, "name": c.name} for c in coaches],
        "teams": [{"id": t.id, "name": t.name, "coach_id": t.coach_id} for t in teams],
        "players": [{"id": p.id, "gamertag": p.gamertag, "team_id": p.team_id, "email": p.email} for p in players]
    }

class AssignRequest(BaseModel):
    entity_type: str
    entity_id: int
    target_id: int

@app.post("/api/org/assign")
async def assign_entity(req: AssignRequest, db: Session = Depends(get_db)):
    if req.entity_type == "team":
        team = db.query(Team).filter(Team.id == req.entity_id).first()
        team.coach_id = req.target_id
    elif req.entity_type == "player":
        player = db.query(Player).filter(Player.id == req.entity_id).first()
        player.team_id = req.target_id
    db.commit()
    return {"status": "success"}

class StaffCreateRequest(BaseModel):
    name: str
    username: str
    password: str
    role: str = "coach"

@app.post("/api/org/staff")
async def create_staff(req: StaffCreateRequest, db: Session = Depends(get_db)):
    existing_staff = db.query(Staff).filter(Staff.username == req.username).first()
    if existing_staff:
        raise HTTPException(status_code=400, detail="Username already exists.")
    
    new_staff = Staff(
        name=req.name, 
        username=req.username, 
        password=req.password, 
        role=req.role
    )
    db.add(new_staff)
    db.commit()
    
    return {"status": "success", "message": f"Coach {req.name} provisioned."}

# --- CHAT & TELEMETRY ---
class ChatRequest(BaseModel):
    message: str
    history: str = ""
    email: str  
    name: str   

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.email == request.email).first()
    
    if not player:
        team = db.query(Team).filter(Team.name == "Prism Academy").first()
        player = Player(email=request.email, gamertag=request.name, role="Player", team_id=team.id)
        db.add(player)
        db.commit()
        db.refresh(player)
    
    # Memory Pipeline
    past_logs = db.query(TelemetryLog).filter(TelemetryLog.player_id == player.id).order_by(TelemetryLog.timestamp.desc()).limit(3).all()
    
    memory_string = "No prior history on file."
    if past_logs:
        memory_string = ""
        for log in reversed(past_logs):
            memory_string += f"- Player Trigger: '{log.trigger_message}' | Evaluated Tier: {log.crisis_eval}\n"

    agent_results = process_player_message(request.message, request.history, memory_string)

    if "Tier 1" in agent_results["evaluation"]:
        trigger_blind_pager(player.team.name)
    
    new_log = TelemetryLog(
        trigger_message=request.message,
        crisis_eval=agent_results["evaluation"],
        team_dynamics=agent_results["dynamics_insight"],
        lifestyle=agent_results["lifestyle_insight"],
        player_id=player.id 
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    live_data = {
        "crisis": new_log.crisis_eval,
        "dynamics": new_log.team_dynamics,
        "lifestyle": new_log.lifestyle,
        "time": new_log.timestamp.isoformat(),
        "gamertag": player.gamertag,
        "email": player.email, # <-- EMAIL ADDED HERE
        "role": player.role,
        "team": player.team.name,
        "coach_id": player.team.coach_id 
    }
    asyncio.create_task(manager.broadcast_json(live_data))
    return {"reply": agent_results["reply"]}

@app.get("/api/telemetry")
async def get_telemetry(coach_id: int = Query(None), db: Session = Depends(get_db)):
    query = db.query(TelemetryLog).join(Player).join(Team)
    
    if coach_id:
        query = query.filter(Team.coach_id == coach_id)
        
    logs = query.order_by(TelemetryLog.timestamp.desc()).all()
    
    formatted_logs = [{
        "crisis": log.crisis_eval,
        "dynamics": log.team_dynamics,
        "lifestyle": log.lifestyle,
        "time": log.timestamp.isoformat(),
        "gamertag": log.player.gamertag,
        "email": log.player.email, # <-- EMAIL ADDED HERE
        "role": log.player.role,
        "team": log.player.team.name
    } for log in logs]
    return {"logs": formatted_logs}

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)