import os
import json
import base64
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

# Ordered list of Groq vision models to try (most capable first)
GROQ_VISION_MODELS = [
    ("meta-llama/llama-4-scout-17b-16e-instruct", "Groq Vision (Llama 4 Scout)"),
    ("meta-llama/llama-4-maverick-17b-128e-instruct", "Groq Vision (Llama 4 Maverick)"),
    ("llama-3.2-11b-vision-preview", "Groq Vision (Llama 3.2 11B)"),
]

async def call_groq(messages, image_data=None):
    if not client_groq:
        raise Exception("Groq client not initialised")

    if image_data:
        b64_image = base64.b64encode(image_data).decode("utf-8")
        # Build a vision-capable message list — system prompt as text, then image + user question
        vision_messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT + "\n\nAnalyze the medical image below and provide a structured JSON diagnosis response."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_image}"
                        }
                    }
                ]
            }
        ]
        # Append any prior conversation history
        for m in messages[1:]:  # skip first system message we already included
            if m.get("role") == "user" and isinstance(m.get("content"), str):
                vision_messages.append({"role": "user", "content": m["content"]})
            elif m.get("role") == "assistant":
                vision_messages.append({"role": "assistant", "content": m["content"]})

        # Try each vision model in order until one succeeds
        last_vision_error = ""
        for model_id, model_name in GROQ_VISION_MODELS:
            try:
                logger.info(f"Trying Groq vision model: {model_id}")
                completion = client_groq.chat.completions.create(
                    model=model_id,
                    messages=vision_messages,
                    temperature=0.2,
                )
                return completion.choices[0].message.content, model_name
            except Exception as ve:
                last_vision_error = str(ve)
                logger.warning(f"Vision model {model_id} failed: {ve}")
                continue

        raise Exception(f"All Groq vision models failed. Last error: {last_vision_error}")

    # Text-only path
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
    # Strategy: Try Groq first (supports vision via llama-4-scout), fallback to Gemini.
    # For images, skip Gemini if its quota is known to be exceeded.
    engines = [call_groq, call_gemini]

    # If there is an image, prefer Groq-only to avoid Gemini quota issues.
    # Gemini will still be tried as last resort for images too.
    
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
                    # Second pass with Wikipedia context (text-only — image already analysed)
                    content, model_name = await engine_func(refinement_messages, None)
                    result_json = clean_json_response(content)

            result_json["model_used"] = model_name
            return result_json
        except Exception as e:
            last_error = str(e)
            logger.error(f"Engine {engine_func.__name__} failure: {last_error}")
            # If Gemini quota exceeded and we have an image, surface a friendly message
            if "429" in last_error and image_bytes:
                logger.warning("Gemini quota exceeded for image analysis; all engines exhausted.")
            continue

    # Build a helpful error message based on the failure type
    if "429" in last_error or "quota" in last_error.lower():
        friendly = (
            "429 You exceeded your current quota, please check your plan and billing details. "
            "For more information on this error, head to: https://ai.dev/rate-limit. "
            "* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests"
        )
        raise HTTPException(status_code=500, detail=f"All AI engines failed. Last error: {friendly}")

    raise HTTPException(status_code=500, detail=f"All AI engines failed. Last error: {last_error}")

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  InferaDx Backend - http://127.0.0.1:8000")
    print("="*50 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
