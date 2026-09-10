import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Model configuration - configurable via environment variable
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// Startup validation check
if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️ [WARNING] GEMINI_API_KEY is not configured. Server will run, but chat requests will fail until an API key is provided."
  );
}

// Request size limit
app.use(express.json({ limit: "2mb" }));

// Standard CORS configuration
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Lightweight in-memory rate limiter to prevent abuse
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/minute per client

// Prune stale rate-limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const now = Date.now();
  let record = rateLimitMap.get(clientIp);

  if (!record || record.resetAt <= now) {
    record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(clientIp, record);
    return next();
  }

  record.count += 1;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: "Rate limit exceeded. Please wait a moment before sending more messages.",
    });
    return;
  }

  next();
};

// Apply rate limiter to API routes
app.use("/api/chat", rateLimiter);

// Initialize Google GenAI client lazily
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || "";
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Error message sanitization helper
function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const message = error instanceof Error ? error.message : String(error);

  // Strip file paths, raw credentials, or sensitive headers
  if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
    return "The configured Gemini API key is invalid or expired. Please check settings.";
  }
  if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("resource exhausted")) {
    return "Victor is currently experiencing high demand. Please pause a few seconds and try again.";
  }
  if (message.includes("503") || message.toLowerCase().includes("unavailable")) {
    return "The AI service is temporarily unavailable. Please retry in a few moments.";
  }
  if (message.includes("safety") || message.includes("blocked")) {
    return "This request could not be completed because it was flagged by safety filters.";
  }

  // Provide clean, readable summary without internal stack traces
  return message.slice(0, 200).replace(/(\/|\b)[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)+/g, "[path]");
}

// Sanitize & validate incoming messages
interface IncomingMessage {
  role: string;
  content: string;
}

function validateMessagesPayload(messages: unknown): { valid: boolean; error?: string; data?: IncomingMessage[] } {
  if (!messages || !Array.isArray(messages)) {
    return { valid: false, error: "Invalid payload: 'messages' must be an array." };
  }
  if (messages.length === 0) {
    return { valid: false, error: "Payload error: 'messages' array cannot be empty." };
  }
  if (messages.length > 100) {
    return { valid: false, error: "Chat history too long. Please start a new conversation." };
  }

  const sanitized: IncomingMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== "object") {
      return { valid: false, error: `Invalid message at index ${i}.` };
    }
    const role = (m as any).role;
    const content = (m as any).content;

    if (role !== "user" && role !== "assistant" && role !== "model") {
      return { valid: false, error: `Invalid role '${role}' at index ${i}.` };
    }

    if (typeof content !== "string") {
      return { valid: false, error: `Message content must be a string at index ${i}.` };
    }

    const trimmed = content.trim();
    // Latest message must not be empty
    if (i === messages.length - 1 && trimmed.length === 0) {
      return { valid: false, error: "Cannot send an empty or whitespace-only message." };
    }

    // Limit individual message size to 30,000 characters
    if (content.length > 30000) {
      return { valid: false, error: `Message at index ${i} exceeds the maximum length of 30,000 characters.` };
    }

    sanitized.push({
      role: role === "assistant" || role === "model" ? "model" : "user",
      content,
    });
  }

  return { valid: true, data: sanitized };
}

// Health check endpoint (secured - no key exposure)
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "Victor AI",
    model: GEMINI_MODEL,
  });
});

// Mode system prompt configurations
const MODE_INSTRUCTIONS: Record<string, string> = {
  math: `You are Victor, an expert, encouraging mathematical tutor and STEM solver.
Your name is Victor. If asked who you are or what your name is, warmly introduce yourself as Victor.
Your job is to help users solve mathematical problems ranging from basic arithmetic and algebra to calculus, linear algebra, statistics, geometry, and word problems.
Key rules:
1. Always break down solutions into clear, logical steps.
2. Present mathematical formulas, equations, and expressions using standard LaTeX notation ($...$ for inline math and $$...$$ on its own line for display equations). For example, use $\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ or $x^2 + 5x + 6 = 0$.
3. When solving problems, first clarify the given information and goal, then show each transformation or calculation step-by-step.
4. Highlight the final answer clearly (e.g. **Final Answer:** $x = 3$).
5. Provide a quick verification or sanity check when applicable to build understanding.
6. If the user asks conceptually, explain the underlying intuition with simple real-world analogies.`,

  casual: `You are Victor, a friendly, witty, and thoughtful conversational companion, just like ChatGPT and Gemini.
Your name is Victor. If asked who you are, what your name is, or who built you, introduce yourself proudly and casually as Victor.
You enjoy casual chats, brainstorming, sharing fun facts, listening, and discussing any topic the user is curious about.
Keep your tone natural, warm, conversational, and direct. Avoid stiff corporate boilerplate. Use light formatting where helpful.`,

  general: `You are Victor, an intelligent, versatile AI assistant.
Your name is Victor. If asked who you are, introduce yourself as Victor.
Help the user with a wide variety of tasks: answering general questions, drafting text, explaining concepts, coding, summarizing, and reasoning.
Provide well-structured, comprehensive, and accurate answers with markdown formatting where appropriate.`,
};

// Streaming Chat API endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  const { messages, mode = "casual", customInstruction } = req.body;

  const validation = validateMessagesPayload(messages);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const selectedInstruction =
    typeof customInstruction === "string" && customInstruction.trim()
      ? customInstruction.trim()
      : MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.casual;

  const contents = validation.data.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  // Setup Server-Sent Events headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable proxy buffering
  res.flushHeaders?.();

  let isClosed = false;
  req.on("close", () => {
    isClosed = true;
  });

  // Set response timeout safeguard (60 seconds)
  const timeoutId = setTimeout(() => {
    if (!isClosed) {
      res.write(`data: ${JSON.stringify({ error: "Request timed out after 60 seconds." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }, 60000);

  try {
    const ai = getGenAI();

    const responseStream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: selectedInstruction,
      },
    });

    for await (const chunk of responseStream) {
      if (isClosed) break;
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    clearTimeout(timeoutId);
    if (!isClosed) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (!isClosed) {
      console.error("Gemini API streaming error:", error);
      const safeMessage = sanitizeErrorMessage(error);
      res.write(`data: ${JSON.stringify({ error: safeMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

// Fallback non-streaming endpoint
app.post("/api/chat/sync", async (req: Request, res: Response) => {
  const { messages, mode = "casual", customInstruction } = req.body;

  const validation = validateMessagesPayload(messages);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const selectedInstruction =
    typeof customInstruction === "string" && customInstruction.trim()
      ? customInstruction.trim()
      : MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.casual;

  const contents = validation.data.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: selectedInstruction,
      },
    });

    res.json({ text: response.text || "" });
  } catch (error: unknown) {
    console.error("Gemini API sync error:", error);
    const safeMessage = sanitizeErrorMessage(error);
    res.status(500).json({ error: safeMessage });
  }
});

async function startServer() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} [Model: ${GEMINI_MODEL}]`);
  });
}

startServer();
