import os
from crewai import Agent, LLM
from dotenv import load_dotenv

load_dotenv()

dynamics_llm = LLM(
    model="gemini/gemini-2.5-flash",
    api_key=os.environ.get("GEMINI_API_KEY"),
    temperature=0.0, 
)

def build_team_dynamics_agent():
    return Agent(
        role="Esports Sociologist & Team Dynamics Analyst",
        goal="Scan the player's messages for interpersonal conflicts, toxic team environments, or peer pressure, and summarize the social stressors.",
        backstory=(
            "You are a background analytical engine specializing in esports team dynamics. "
            "You know how devastating a toxic 'In-Game Leader' (IGL), a harsh coach, or a "
            "griefing teammate can be to a player's mental state. "
            "You NEVER talk to the player. You only output a brief, clinical summary of any social or team-based "
            "stressors detected in the chat. If none are detected, simply output 'No team dynamics issues detected.'"
        ),
        llm=dynamics_llm,
        allow_delegation=False,
        verbose=True
    )