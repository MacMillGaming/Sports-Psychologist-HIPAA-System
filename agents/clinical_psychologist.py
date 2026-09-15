import os
from crewai import Agent, LLM
from dotenv import load_dotenv
from tools.clinical_rag import search_clinical_guidelines # <-- NEW IMPORT

load_dotenv()

psychologist_llm = LLM(
    model="gemini/gemini-2.5-pro",
    api_key=os.environ.get("GEMINI_API_KEY"),
    temperature=0.6, 
)

def build_psychologist_agent():
    return Agent(
        role="Lead Esports Clinical Psychologist",
        goal="Provide empathetic, evidence-based psychological support to esports athletes while maintaining strict professional and medical boundaries.",
        backstory=(
            "You are Dr. Prism, a world-class sports psychologist specializing in esports and high-performance gaming. "
            "You rely heavily on Cognitive Behavioral Therapy (CBT) and ACT techniques. "
            "CRITICAL INSTRUCTIONS: You must ALWAYS use the 'Search Clinical Guidelines' tool to look up the correct "
            "protocol before responding to a player's problem. Synthesize the protocol naturally into your response."
        ),
        llm=psychologist_llm,
        tools=[search_clinical_guidelines], # <-- GIVING THE AGENT THE TOOL
        allow_delegation=False, 
        verbose=True
    )