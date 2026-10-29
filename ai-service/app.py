import json
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from services.ai_client import AIServiceError, is_configured, provider
from services.image import InvalidImageError, prepare_image
from services.receipts import analyze_receipt
from services.reports import analyze_month
from services.chat import answer_question

# override=True: the auto-reloader keeps old values otherwise, so .env changes would need a full restart
load_dotenv(override=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB
CORS(app)


# Only the Express backend may call this service (when INTERNAL_API_KEY is set)
@app.before_request
def check_internal_key():
    # strip(): a space or line break pasted into the hosting dashboard must not break the key
    expected = (os.getenv("INTERNAL_API_KEY") or "").strip()
    if expected and request.path != "/health" and (request.headers.get("X-Internal-Key") or "").strip() != expected:
        return jsonify({"error": "Unauthorized"}), 401


@app.errorhandler(AIServiceError)
def handle_ai_error(error):
    return jsonify({"error": str(error)}), error.status


@app.errorhandler(413)
def handle_too_large(_error):
    return jsonify({"error": "The image is too large (max 10 MB)"}), 413


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "ai-service", "ai_provider": provider(), "ai_configured": is_configured()})


@app.post("/receipts/analyze")
def receipts_analyze():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No image received"}), 400

    try:
        categories = json.loads(request.form.get("categories", "[]"))
    except json.JSONDecodeError:
        return jsonify({"error": "categories must be a JSON list"}), 400
    if not isinstance(categories, list) or not all(isinstance(c, str) for c in categories):
        return jsonify({"error": "categories must be a JSON list of names"}), 400

    try:
        image = prepare_image(file.read())
    except InvalidImageError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify(analyze_receipt(image, categories))


@app.post("/reports/analyze")
def reports_analyze():
    body = request.get_json(silent=True) or {}
    statistics = body.get("statistics")
    if not isinstance(statistics, dict) or "totals" not in statistics:
        return jsonify({"error": "statistics are missing"}), 400
    return jsonify(analyze_month(statistics, body.get("language", "en")))


@app.post("/chat")
def chat():
    body = request.get_json(silent=True) or {}
    message = body.get("message")
    context = body.get("context")
    if not isinstance(message, str) or not message.strip() or not isinstance(context, dict):
        return jsonify({"error": "message and context are required"}), 400
    history = body.get("history") if isinstance(body.get("history"), list) else []
    return jsonify(answer_question(message.strip()[:500], history, context, body.get("language", "en")))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
