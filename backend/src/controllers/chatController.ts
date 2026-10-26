import { Request, Response } from "express";
import { pool } from "../db";
import { AiServiceError, callAiService } from "../services/aiService";
import { buildChatContext } from "../services/chatContext";

const MAX_MESSAGE_LENGTH = 500;
// How many earlier messages the AI sees (keeps the request small)
const HISTORY_FOR_AI = 6;
const HISTORY_SHOWN = 60;

type ChatAnswer = { answer: string; suggestions: string[] };

// GET /api/chat - the user's conversation, oldest first
export async function getConversation(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT id, role, content, created_at FROM (
       SELECT id, role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY id DESC LIMIT $2
     ) last ORDER BY id`,
    [req.userId, HISTORY_SHOWN]
  );
  res.json(result.rows);
}

// POST /api/chat { message, language }
// Builds a summary of the user's own data, asks the AI, and saves the question and answer together.
// If the AI fails, nothing is saved.
export async function sendMessage(req: Request, res: Response) {
  const userId = req.userId!;
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const language = ["en", "fr", "ar"].includes(req.body?.language) ? req.body.language : "en";

  if (!message) return res.status(400).json({ error: "Write a question first" });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Questions are limited to ${MAX_MESSAGE_LENGTH} characters` });
  }

  const [context, history] = await Promise.all([
    buildChatContext(userId),
    pool.query(
      `SELECT role, content FROM (
         SELECT id, role, content FROM chat_messages WHERE user_id = $1 ORDER BY id DESC LIMIT $2
       ) last ORDER BY id`,
      [userId, HISTORY_FOR_AI]
    ),
  ]);

  let reply: ChatAnswer;
  try {
    const raw = await callAiService<ChatAnswer>("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.rows, context, language }),
    });
    const answer = typeof raw?.answer === "string" ? raw.answer.trim().slice(0, 4000) : "";
    if (!answer) throw new AiServiceError("The assistant returned an empty answer");
    reply = {
      answer,
      suggestions: (Array.isArray(raw.suggestions) ? raw.suggestions : [])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 120))
        .slice(0, 3),
    };
  } catch (error) {
    if (error instanceof AiServiceError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  const saved = await pool.query(
    `INSERT INTO chat_messages (user_id, role, content)
     VALUES ($1, 'user', $2), ($1, 'assistant', $3)
     RETURNING id, role, content, created_at`,
    [userId, message, reply.answer]
  );

  res.status(201).json({ messages: saved.rows, suggestions: reply.suggestions });
}

// DELETE /api/chat - start a new conversation
export async function clearConversation(req: Request, res: Response) {
  await pool.query("DELETE FROM chat_messages WHERE user_id = $1", [req.userId]);
  res.status(204).end();
}
