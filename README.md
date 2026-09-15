# Prism Sports Psychology System
**Enterprise Clinical Intelligence & Coaching Command Center for Esports**

Prism AI is a HIPAA-compliant, multi-tenant SaaS platform designed to monitor, evaluate, and support the psychological well-being of competitive esports athletes. It bridges the gap between raw LLM chat interfaces and actionable sports science analytics by deploying a Multi-Agent AI system paired with real-time telemetry.

## Key Features

*   **Multi-Agent Clinical Board:** Powered by CrewAI, athlete messages are routed through a background panel of experts (Crisis Evaluator, Team Dynamics Analyst, Lifestyle Auditor) before generating a context-aware therapeutic response.
*   **Retrieval-Augmented Generation (RAG):** The AI does not guess. It queries a local ChromaDB vector database ingested with clinical sports psychology guidelines to prescribe accurate, textbook protocols (e.g., box breathing for cognitive fatigue).
*   **Dual-Memory Pipeline:** The AI maintains *Short-Term Memory* for active conversations and *Long-Term Memory* by querying the athlete's past telemetry logs from the SQLite database to track recurring issues.
*   **Real-Time Coach Telemetry:** A Next.js dashboard uses WebSockets to instantly push player readiness scores and clinical alert tiers directly to the coaching staff without violating HIPAA by exposing raw chat logs.
*   **Interactive Analytics:** Recharts-powered data visualization, including a Team Stability Trend line chart and a Friction/Toxicity Heatmap, allowing coaches to spot burnout trends before they become crises.
*   **Automated Emergency Dispatch:** If a Tier 1 (Red Alert) crisis is detected by the AI, the backend automatically fires a blind pager alert to a secure Discord Webhook.
*   **Multi-Tenant Organization Architecture:** A General Manager console for provisioning staff accounts, creating teams, and securely assigning rosters.

## Technology Stack

**Backend & AI Engine**
*   Python 3 / FastAPI
*   CrewAI (Agentic Orchestration)
*   ChromaDB & SentenceTransformers (`all-MiniLM-L6-v2`) for RAG
*   SQLite + SQLAlchemy (Relational Database & ORM)
*   WebSockets (Real-time data streaming)

**Frontend Application**
*   Next.js / React
*   Tailwind CSS
*   Recharts (Data Visualization)
*   NextAuth (Authentication)

---

## Getting Started (Local Development)

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/prism-ai.git](https://github.com/yourusername/prism-ai.git)
cd prism-ai
```

### 2. Backend Setup (Python)
Navigate to the root directory and set up your virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy crewai chromadb sentence-transformers python-dotenv requests
```

Create a `.env` file in the root directory and add your keys:
```env
GOOGLE_API_KEY=your_google_api_key_here
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
```

Start the FastAPI server:
```bash
uvicorn main:app --reload
```
*The backend will be running on `http://localhost:8000`*

### 3. Frontend Setup (Next.js)
Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend-ui
npm install
npm install recharts lucide-react next-auth
```

Start the Next.js development server:
```bash
npm run dev
```
*The frontend will be running on `http://localhost:3000`*

---

## User Personas & Navigation

*   **The Athlete (Player Chat):** Log in with a unique email to chat with Dr. Prism. Discuss game-related stress, team friction, or fatigue to trigger the AI evaluation pipeline.
*   **The Head Coach (Command Center):** Log in as a provisioned coach to view the real-time WebSocket dashboard. Use the Team Switcher to monitor different rosters, view the stability trend graphs, and receive instant alert updates.
*   **The General Manager (Admin):** Log in with admin credentials to access the organizational chart. Provision new coach accounts and dynamically reassign players to different rosters.

## Future Roadmap / Deployment
*   [ ] Deploy Next.js frontend to **Vercel**
*   [ ] Deploy FastAPI backend and SQLite to **Render** or **Railway**
*   [ ] Migrate local SQLite database to Managed PostgreSQL for scale
*   [ ] Integrate wearable health data API (e.g., Whoop or Oura) into the AI evaluation context

---
*Disclaimer: Prism AI is a prototype application. The AI models provide simulated clinical analysis for development and demonstration purposes and should not replace professional medical advice.*
