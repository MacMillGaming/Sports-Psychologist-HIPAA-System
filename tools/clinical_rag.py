import os
import chromadb
from chromadb.utils import embedding_functions
from crewai.tools import tool

# 1. Initialize the Vector Database in memory
chroma_client = chromadb.Client()

# 2. Use a free, local embedding model (this downloads automatically on first run)
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# 3. Create a collection (like a table in SQL)
collection = chroma_client.get_or_create_collection(name="clinical_kb", embedding_function=sentence_transformer_ef)

# 4. Read our text files and load them into the Vector DB
def seed_knowledge_base():
    if collection.count() == 0:
        print(">>> Loading Clinical Guidelines into Vector DB... <<<")
        kb_dir = "knowledge_base"
        if os.path.exists(kb_dir):
            docs = []
            ids = []
            for filename in os.listdir(kb_dir):
                if filename.endswith(".txt"):
                    with open(os.path.join(kb_dir, filename), "r", encoding="utf-8") as f:
                        text = f.read()
                        # Split the document into individual protocols
                        chunks = text.split("\n\n")
                        for i, chunk in enumerate(chunks):
                            if chunk.strip():
                                docs.append(chunk.strip())
                                ids.append(f"{filename}_chunk_{i}")
            if docs:
                collection.add(documents=docs, ids=ids)

seed_knowledge_base()

# 5. Create the Tool that CrewAI will use
@tool("Search Clinical Guidelines")
def search_clinical_guidelines(query: str) -> str:
    """
    Search the clinical knowledge base for relevant CBT techniques, team protocols, or psychological interventions.
    Use this tool BEFORE responding if the player expresses tilt, burnout, or team toxicity to find evidence-based advice.
    """
    results = collection.query(query_texts=[query], n_results=1) # Get the #1 most relevant protocol
    
    if results and results["documents"] and results["documents"][0]:
        docs = results["documents"][0]
        return "FOUND CLINICAL PROTOCOL:\n" + "\n".join(docs)
    return "No specific guidelines found. Rely on general psychological knowledge."