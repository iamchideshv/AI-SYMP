import os
import json
import uvicorn
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import wikipedia
from dotenv import load_dotenv
import google.generativeai as genai


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("inferadx-backend")

# Load environment variables
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
loaded = load_dotenv(dotenv_path=ENV_PATH, override=True)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

logger.info(f"Loaded dotenv from {ENV_PATH}: {loaded}")
if not GEMINI_API_KEY and not GROQ_API_KEY:
    logger.error("❌ CRITICAL: No API keys found in .env (GEMINI_API_KEY or GROQ_API_KEY). Backend will fail.")
else:
    logger.info(f"✅ API Keys identified: Groq={'Yes' if GROQ_API_KEY else 'No'}, Gemini={'Yes' if GEMINI_API_KEY else 'No'}")

app = FastAPI(title="InferaDx API", description="AI Symptom Deductor Backend")

# Ensure React frontend can reach us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Simplified for dev, refine for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialise clients
client_groq = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    client_gemini = genai.GenerativeModel('gemini-2.0-flash')
else:
    client_gemini = None

def get_wikipedia_context(diagnoses: List[dict]) -> str:
    """Fetch detailed medical sections from Wikipedia to improve accuracy."""
    context_parts = []
    target_sections = ["Signs and symptoms", "Symptoms", "Diagnosis", "Clinical features"]
    
    for d in diagnoses[:4]:
        name = d.get("name")
        if not name: continue
        try:
            # Refine search query for better medical results
            search_query = f"{name} medicine" if "disease" not in name.lower() and "syndrome" not in name.lower() else name
            search_results = wikipedia.search(search_query)
            
            if not search_results:
                search_results = wikipedia.search(name)
            
            if search_results:
                page_title = search_results[0]
                try:
                    page = wikipedia.page(page_title, auto_suggest=False)
                    found_section = False
                    for section in page.sections:
                        # Prioritize clinical symptoms/diagnosis sections
                        if any(target.lower() in section.lower() for target in target_sections):
                            content = page.section(section)
                            if content:
                                context_parts.append(f"Condition: {name}\nWikipedia Context [{section}]: {content[:1000]}...")
                                found_section = True
                                break
                    
                    if not found_section:
                        context_parts.append(f"Condition: {name}\nWikipedia Summary: {page.summary[:800]}...")
                except Exception:
                    summary = wikipedia.summary(page_title, sentences=4, auto_suggest=True)
                    context_parts.append(f"Condition: {name}\nWikipedia Summary: {summary}")
        except Exception as e:
            logger.warning(f"Wikipedia search failed for {name}: {e}")
            
    return "\n\n".join(context_parts)


SYSTEM_PROMPT = """
You are InferaDx, an advanced medical AI symptom deductor specialized in General Medicine, Oncology, and Neurology. Your objective is to reach a SINGLE final diagnosis through targeted questioning.

DIAGNOSTIC CONVERGENCE FLOW:
1. PHASE: INITIAL (Discovery)
   - Based on first symptoms, identify exactly 4 potential conditions.
   - Present them with confidence scores.
   - MANDATORY: Always ask 1-2 generic or specific clarifying questions to start narrowing down.
   - Set "phase": "initial".

2. PHASE: REFINING (Deduction)
   - Narrow the candidates to 2-3 most likely ones.
   - MANDATORY: Ask EXACTLY ONE high-impact clarifying question designed to distinguish between these candidates.
   - USE THE PROVIDED WIKIPEDIA CONTEXT to find distinguishing features.
   - Set "phase": "refining".

3. PHASE: FINAL (Diagnosis)
   - Once certain (confidence > 0.90) or sufficient questions are answered, provide exactly 1 final condition.
   - Provide clear, supportive reasoning and next steps.
   - Set "phase": "final".

RULES:
- Marks specialized cases (Cancer/Neurology) with "requires_specialist": true.
- ALWAYS include a disclaimer (InferaDx is not a human doctor) at the beginning of the "insight".
- If medical context is provided, you MUST incorporate relevant clinical facts and your reasoning about them into your "insight".
- DO NOT mention "Wikipedia" or cite it as a source. Use the information naturally as your own clinical reasoning.
- DO NOT put any clinical reasoning, disclaimers, or citations in the "question" field.
- The "question" field MUST contain ONLY the targeted clarifying question(s) for the user.
- Output MUST be valid raw JSON only.

HOME REMEDY RULES:
- If a user asks for "home remedies" for a specific condition, you MUST:
  1. Start with a MANDATORY STRICT DISCLAIMER in the "insight": "⚠️ MEDICAL WARNING: Home remedies are NOT preferred and are not a substitute for professional medical care. For [Condition Name], you must consult a doctor strictly. Do not rely solely on these suggestions."
  2. Provide remedies ONLY as a numbered list in the "insight", keeping them safe and general.
  3. Reiterate in the "insight": "Consulting a healthcare professional is the only recommended path for an accurate diagnosis and treatment."

RESPONSE FORMAT:
{
  "phase": "initial" | "refining" | "final",
  "insight": "Clinical reasoning and disclaimer (strictly shown in the teal diagnosis card).",
  "question": "Your targeted narrow-down question ONLY (strictly shown in the blue question box).",
  "diagnoses": [
    { "name": "Condition Name", "confidence": 0.95, "requires_specialist": true }
  ],
  "model_used": "Model Name"
}
"""


class ChatRequest(BaseModel):
    message: str
    history: list = []

def clean_json_response(content: str) -> dict:
    """Helper to extract JSON from AI response even if wrapped in markdown."""
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]
    return json.loads(content.strip())

async def call_groq(messages, image_data=None):
    if not client_groq:
        raise Exception("Groq client not initialised")
    
    if image_data:
        raise Exception("Groq engine does not yet support vision analysis in this pipeline.")

    completion = client_groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    return completion.choices[0].message.content, "Groq (Llama 3.3)"

async def call_gemini(messages, image_data=None):
    if not client_gemini:
        raise Exception("Gemini client not initialised")
    
    # Format message history for Gemini
    prompt_parts = [SYSTEM_PROMPT]
    for m in messages:
        role = "User" if m["role"] == "user" else "Assistant"
        prompt_parts.append(f"{role}: {m['content']}")
    
    if image_data:
        # Multi-modal call
        response = client_gemini.generate_content([
            "\n".join(prompt_parts),
            { "mime_type": "image/jpeg", "data": image_data }
        ])
    else:
        # Text only
        response = client_gemini.generate_content("\n".join(prompt_parts))
    
    return response.text, "Google Gemini 2.0 Flash"

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok", 
        "backend": "InferaDx FastAPI",
        "engines": {
            "groq": "available" if client_groq else "missing_key",
            "gemini": "available" if client_gemini else "missing_key"
        }
    }

@app.post("/api/chat")
async def chat_with_ai(
    message: str = Form(...),
    history: str = Form("[]"),
    image: Optional[UploadFile] = File(None)
):
    history_list = json.loads(history)
    messages = [{"role": "user", "content": SYSTEM_PROMPT}]
    for msg in history_list:
        role = "user" if msg.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": message})
    logger.info(f"Incoming request: message='{message}', history_len={len(history_list)}")

    image_bytes = None
    if image:
        image_bytes = await image.read()

    last_error = ""
    # Strategy: If image is present, Gemini is the only choice. Otherwise try Groq, fallback to Gemini.
    engines = [call_gemini] if image_bytes else [call_groq, call_gemini]
    
    for engine_func in engines:
        try:
            # First pass: Get initial intuition/candidates
            content, model_name = await engine_func(messages, image_bytes)
            result_json = clean_json_response(content)
            
            # Refinement Loop: If we have candidates and it's not a final diagnosis yet,
            # we fetch Wikipedia context to help the model refine or ask better questions.
            if result_json.get("diagnoses") and result_json.get("phase") != "final":
                wiki_context = get_wikipedia_context(result_json["diagnoses"])
                if wiki_context:
                    logger.info(f"Enhancing message with Wikipedia context for: {[d['name'] for d in result_json['diagnoses']]}")
                    # Create a refined prompt with the context
                    refinement_messages = messages.copy()
                    refinement_messages.append({
                        "role": "user", 
                        "content": f"SYSTEM UPDATE: Here is additional clinical context for the candidates you identified:\n\n{wiki_context}\n\nBased on this, please refine your response. If you need more info, ask targeted questions. If the context makes you certain, move to phase 'final'. Remember: DO NOT cite Wikipedia."
                    })
                    # Second pass with Wikipedia context
                    content, model_name = await engine_func(refinement_messages, image_bytes)
                    result_json = clean_json_response(content)

            result_json["model_used"] = model_name
            return result_json
        except Exception as e:
            last_error = str(e)
            logger.error(f"Engine failure: {last_error}")
            continue

    raise HTTPException(status_code=500, detail=f"All AI engines failed. Last error: {last_error}")

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  InferaDx Backend - http://127.0.0.1:8000")
    print("="*50 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
