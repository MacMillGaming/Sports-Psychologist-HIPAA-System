import os
import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

# --- CONFIGURATION ---
KNOWLEDGE_DIR = "./knowledge_base"
DB_DIR = "./chroma_db"
CHUNK_SIZE = 1000  # Number of characters per chunk
OVERLAP = 200      # Overlap to maintain context between chunks

print("🧠 Booting Prism AI Knowledge Ingestion Engine...")

# 1. Initialize Vector Database & AI Embedding Model
chroma_client = chromadb.PersistentClient(path=DB_DIR)
collection = chroma_client.get_or_create_collection(name="clinical_guidelines")
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_text_chunks(text):
    """Splits text into overlapping chunks for superior AI recall."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start += (CHUNK_SIZE - OVERLAP)
    return chunks

def process_pdfs():
    # Ensure the directory exists
    if not os.path.exists(KNOWLEDGE_DIR):
        os.makedirs(KNOWLEDGE_DIR)
        print(f"📁 Created {KNOWLEDGE_DIR} directory. Drop PDFs here!")
        return

    files = [f for f in os.listdir(KNOWLEDGE_DIR) if f.endswith('.pdf')]
    if not files:
        print("⚠️ No PDFs found in the knowledge_base folder.")
        return

    for filename in files:
        print(f"\n📖 Reading: {filename}...")
        filepath = os.path.join(KNOWLEDGE_DIR, filename)
        
        # Read the PDF
        reader = PdfReader(filepath)
        raw_text = ""
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                raw_text += text + "\n"
                
        # Chunk the text
        print(f"✂️  Slicing {filename} into contextual chunks...")
        chunks = get_text_chunks(raw_text)
        
        # Generate Embeddings & Save to Database
        print(f"🧬 Embedding {len(chunks)} chunks into ChromaDB...")
        
        # We process in batches to prevent memory overload
        for i, chunk in enumerate(chunks):
            # Create a unique ID for every chunk (e.g., "manual.pdf_chunk_5")
            chunk_id = f"{filename}_chunk_{i}"
            
            # Convert the text into an AI math vector
            vector = model.encode(chunk).tolist()
            
            # Store it permanently
            collection.upsert(
                ids=[chunk_id],
                embeddings=[vector],
                documents=[chunk],
                metadatas=[{"source": filename, "chunk": i}]
            )
            
        print(f"✅ Successfully ingested {filename}!")

if __name__ == "__main__":
    process_pdfs()
    print("\n🚀 Ingestion Complete. Dr. Prism is now smarter.")