import os
import json
import uvicorn
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import google.generativeai as genai
from dotenv import load_dotenv


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mediai-backend")

# Load environment variables
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=ENV_PATH)

app = FastAPI(title="MediAI API", description="AI Symptom Deductor Backend")

# Ensure React frontend can reach us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Simplified for dev, refine for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialise clients
client_groq = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    client_gemini = genai.GenerativeModel('gemini-2.0-flash')
else:
    client_gemini = None


SYSTEM_PROMPT = """
You are MediAI, an advanced medical AI symptom deductor with specialized knowledge in General Medicine, Oncology (Cancer), and Neurology (Brain Issues).

GOALS:
1. Analyze patient symptoms and return potential conditions with confidence scores.
2. If symptoms suggest specialized issues (e.g., neurological tremors, cognitive decline, persistent localized lumps, unexplained weight loss), provide deeper clinical context.
3. If an image is provided (e.g., skin rash, eye redness), analyze the visual textures, colors, and patterns.
4. Provide 'Home Remedies' if the user asks for them (for non-critical symptoms).
5. Provide 'Solutions' or clinical treatment paths if requested.

RULES for Specialization:
- If a diagnosis involves cancer or brain/nervous system issues, mark it with "requires_specialist": true in the JSON.
- ALWAYS include a disclaimer that these are NOT professional medical advice.

RESPONSE FORMAT:
You MUST respond purely with a JSON object. No markdown block wrappers.
{
  "message": "A helpful string explaining the findings.",
  "diagnoses": [
    { "name": "Condition Name", "confidence": 0.85, "requires_specialist": true/false }
  ],
  "model_used": "Model Name"
}

Constraints:
- Max 4 diagnoses.
- Output MUST be purely valid raw JSON.
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
    
    return response.text, "Google Gemini 1.5 Flash"

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok", 
        "backend": "MediAI FastAPI",
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
            content, model_name = await engine_func(messages, image_bytes)
            result_json = clean_json_response(content)
            result_json["model_used"] = model_name
            return result_json
        except Exception as e:
            last_error = str(e)
            logger.error(f"Engine failure: {last_error}")
            continue

    raise HTTPException(status_code=500, detail=f"All AI engines failed. Last error: {last_error}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
