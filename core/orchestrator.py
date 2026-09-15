import chromadb
from sentence_transformers import SentenceTransformer
from crewai import Process, Crew, Task
from crewai.tools import tool

from agents.clinical_psychologist import build_psychologist_agent
from agents.crisis_evaluator import build_crisis_evaluator_agent
from agents.team_dynamics_analyst import build_team_dynamics_agent
from agents.lifestyle_auditor import build_lifestyle_agent

print("🔌 Connecting CrewAI to Clinical Vector Database...")
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="clinical_guidelines")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

@tool("Search Clinical Guidelines")
def search_clinical_guidelines(query: str) -> str:
    """Search the official clinical guidelines database for psychological protocols, definitions of tilt, and tiered interventions. Use this whenever evaluating player symptoms."""
    try:
        query_vector = embedding_model.encode(query).tolist()
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=2
        )
        if results['documents'] and results['documents'][0]:
            return "\n\n".join(results['documents'][0])
        return "No relevant clinical guidelines found."
    except Exception as e:
        return f"Database search failed: {str(e)}"

# We now explicitly accept both short-term and long-term memory
def process_player_message(player_message: str, chat_history: str = "", long_term_memory: str = ""):
    psychologist = build_psychologist_agent()
    evaluator = build_crisis_evaluator_agent()
    dynamics_analyst = build_team_dynamics_agent()
    lifestyle_auditor = build_lifestyle_agent()

    evaluation_task = Task(
        description=f"Analyze this message for safety crises: '{player_message}'. Output strictly JSON: {{\"tier\": 1|2|3, \"reason\": \"...\"}}",
        expected_output="JSON string with 'tier' and 'reason'.",
        agent=evaluator,
        tools=[search_clinical_guidelines]
    )

    dynamics_task = Task(
        description=f"Analyze this message for team/social issues: '{player_message}'.",
        expected_output="A brief summary of team stressors, or 'None'.",
        agent=dynamics_analyst
    )

    lifestyle_task = Task(
        description=f"Analyze this message for sleep/lifestyle issues: '{player_message}'.",
        expected_output="A brief summary of lifestyle stressors, or 'None'.",
        agent=lifestyle_auditor
    )

    # THE ULTIMATE PROMPT: Injects Short-Term, Long-Term, and Background Insights
    therapy_task = Task(
        description=(
            f"Respond to the player's new message.\n"
            f"--- CURRENT CHAT HISTORY ---\n{chat_history}\n----------------------------\n\n"
            f"--- CLINICAL FILE: PAST SESSIONS ---\n{long_term_memory}\n------------------------------------\n\n"
            f"New Message: '{player_message}'\n\n"
            f"Use the insights from your background experts, the chat history, and the player's past sessions to subtly inform your therapeutic approach. "
            f"DO NOT mention the experts or quote them. If the player brings up a recurring issue from their past sessions, acknowledge it naturally. "
            f"If the player is experiencing a specific psychological issue, search the guidelines for the exact protocol. "
            f"Speak directly and empathetically to the player."
        ),
        expected_output="A conversational, empathetic text response from Dr. Prism.",
        agent=psychologist,
        context=[evaluation_task, dynamics_task, lifestyle_task],
        tools=[search_clinical_guidelines]
    )

    crew = Crew(
        agents=[evaluator, dynamics_analyst, lifestyle_auditor, psychologist],
        tasks=[evaluation_task, dynamics_task, lifestyle_task, therapy_task],
        process=Process.sequential, 
        verbose=True
    )

    crew.kickoff()
    
    return {
        "reply": therapy_task.output.raw,
        "evaluation": evaluation_task.output.raw,
        "dynamics_insight": dynamics_task.output.raw,
        "lifestyle_insight": lifestyle_task.output.raw
    }