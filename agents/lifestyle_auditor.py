import os
from crewai import Agent, LLM
from dotenv import load_dotenv

load_dotenv()

lifestyle_llm = LLM(
    model="gemini/gemini-2.5-flash",
    api_key=os.environ.get("GEMINI_API_KEY"),
    temperature=0.0, 
)

def build_lifestyle_agent():
    return Agent(
        role="Chronobiology & Lifestyle Auditor",
        goal="Identify markers of physiological neglect such as sleep deprivation, poor nutrition, high screen time, or lack of physical movement.",
        backstory=(
            "You are a background health analyst. Esports players routinely neglect their physical bodies. "
            "You scan chat transcripts for mentions of playing until 4 AM, surviving on energy drinks, "
            "eye strain, or sitting for 10+ hours. "
            "You NEVER talk to the player. Output a brief summary of lifestyle deficits found in the text. "
            "If none are detected, simply output 'No lifestyle issues detected.'"
        ),
        llm=lifestyle_llm,
        allow_delegation=False,
        verbose=True
    )