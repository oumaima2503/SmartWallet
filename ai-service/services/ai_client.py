"""One place to call the AI model. AI_PROVIDER in .env chooses "groq" or "gemini".

generate_json() always returns an object validated with a pydantic schema,
so receipts.py and reports.py don't depend on the provider."""

import base64
import json
import os

import httpx
from pydantic import BaseModel, ValidationError

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
TIMEOUT_SECONDS = 60


class AIServiceError(Exception):
    """Raised when the AI call fails. status is the HTTP code to return."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def provider():
    return os.getenv("AI_PROVIDER", "groq").lower()


def is_configured():
    key = "GEMINI_API_KEY" if provider() == "gemini" else "GROQ_API_KEY"
    return bool(os.getenv(key))


def generate_json(prompt: str, schema: type[BaseModel], system_instruction: str, image: bytes | None = None):
    """Sends the prompt (and an optional JPEG image) and returns an instance of schema."""
    if provider() == "gemini":
        return _gemini(prompt, schema, system_instruction, image)
    return _groq(prompt, schema, system_instruction, image)


# ---------- Groq (OpenAI-compatible API) ----------

def _groq(prompt, schema, system_instruction, image):
    # The model sometimes returns a badly formatted answer: one more try usually fixes it
    try:
        return _groq_once(prompt, schema, system_instruction, image)
    except AIServiceError as error:
        if error.status != 502:
            raise
        return _groq_once(prompt, schema, system_instruction, image)


def _groq_once(prompt, schema, system_instruction, image):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise AIServiceError("GROQ_API_KEY is not set in ai-service/.env", status=503)

    # Groq has no schema option, so the schema is described in the instructions
    # and the answer is validated with pydantic below
    system = (
        f"{system_instruction}\n\nAnswer with ONE JSON object only, matching this JSON schema:\n"
        f"{json.dumps(schema.model_json_schema())}"
    )

    if image is not None:
        model = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
        image_url = "data:image/jpeg;base64," + base64.b64encode(image).decode()
        user_content = [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": image_url}}]
    else:
        model = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b")
        user_content = prompt

    try:
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_content}],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            },
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise AIServiceError("Groq could not be reached. Check your internet connection.", status=503) from error

    if response.status_code != 200:
        try:
            detail = response.json().get("error", {}).get("message", "")
        except ValueError:
            detail = response.text[:200]
        if response.status_code in (401, 403):
            message = "Groq refused the API key. Check GROQ_API_KEY in ai-service/.env."
        elif response.status_code == 404 or "model" in detail.lower() and "not" in detail.lower():
            message = f"The Groq model '{model}' is not available. Check the model names in ai-service/.env."
        elif response.status_code == 429:
            message = "The Groq free quota is used up for now. Try again in a minute."
        else:
            message = f"Groq request failed: {detail or response.status_code}"
        raise AIServiceError(message, status=503)

    try:
        text = response.json()["choices"][0]["message"]["content"] or ""
        return schema.model_validate_json(text)
    except (ValidationError, ValueError, KeyError, IndexError, TypeError) as error:
        raise AIServiceError("The AI returned a response that does not match the expected format") from error


# ---------- Google Gemini ----------

_gemini_client = None


def _gemini(prompt, schema, system_instruction, image):
    from google import genai
    from google.genai import errors, types

    global _gemini_client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise AIServiceError("GEMINI_API_KEY is not set in ai-service/.env", status=503)
    if _gemini_client is None:
        # GEMINI_VERTEX=true for a Google Cloud (Vertex AI express) key; default is a Google AI Studio key
        use_vertex = os.getenv("GEMINI_VERTEX", "false").lower() == "true"
        _gemini_client = genai.Client(vertexai=use_vertex, api_key=api_key)

    model = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    contents = [prompt] if image is None else [types.Part.from_bytes(data=image, mime_type="image/jpeg"), prompt]

    try:
        response = _gemini_client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=schema,
                temperature=0.2,
            ),
        )
    except errors.APIError as error:
        if error.code in (401, 403) and "has not been used in project" in (error.message or ""):
            message = "The Vertex AI API is not enabled in your Google Cloud project. Enable it, or use a Google AI Studio key."
        elif error.code in (401, 403):
            message = "Gemini refused the API key (blocked key or project). Create a new key in Google AI Studio."
        elif error.code == 404:
            message = f"The Gemini model '{model}' is not available (retired or wrong name). Check GEMINI_MODEL in ai-service/.env."
        elif error.code == 429:
            message = "The Gemini free quota is used up for now. Try again in a minute."
        else:
            message = f"Gemini request failed: {error.message or error}"
        # 503 = the AI feature is unavailable; the rest of the app keeps working
        raise AIServiceError(message, status=503) from error

    if response.parsed is None:
        raise AIServiceError("Gemini returned a response that does not match the expected format")
    return response.parsed
