import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Model configuration - primary is ultra-fast gemini-3.5-flash-lite (<600ms latency)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const FALLBACK_MODELS = ["gemini-3-flash-preview"];

// Startup validation check
if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️ [WARNING] GEMINI_API_KEY is not configured. Server will run, but chat requests will fail until an API key is provided."
  );
}

// Request size limit
app.use(express.json({ limit: "5mb" }));

// Server-side session storage for durable chat persistence
const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Ignore
  }
}

let cachedSessions: any[] = [];
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
    cachedSessions = JSON.parse(raw);
    if (!Array.isArray(cachedSessions)) cachedSessions = [];
  }
} catch (e) {
  console.warn("Could not read sessions from file:", e);
}

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

// Lightweight in-memory rate limiter with generous threshold
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 150; // generous 150 requests/minute

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

  if (clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "localhost") {
    return next();
  }

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
      error: "Victor is handling high activity. Please wait a brief moment before sending your next message.",
    });
    return;
  }

  next();
};

// Apply rate limiter to chat routes
app.use("/api/chat", rateLimiter);

// Sessions persistence endpoints
app.get("/api/sessions", (_req: Request, res: Response) => {
  res.json({ sessions: cachedSessions });
});

app.post("/api/sessions", (req: Request, res: Response) => {
  const { sessions } = req.body;
  if (Array.isArray(sessions)) {
    cachedSessions = sessions.slice(0, 100);
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(cachedSessions), "utf-8");
    } catch (e) {
      console.warn("Could not save sessions to file:", e);
    }
  }
  res.json({ ok: true, count: cachedSessions.length });
});

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
    primaryModel: PRIMARY_MODEL,
    fallbackModels: FALLBACK_MODELS,
  });
});

// Unified Victor Intelligence System Instruction
const VICTOR_SYSTEM_INSTRUCTION = `You are Victor, a remarkably intelligent, versatile, and thoughtful AI assistant powered by Gemini.
Your name is Victor. When asked who you are or what your name is, warmly and naturally introduce yourself as Victor.

Your core capabilities and guidelines:
1. Conversational & Approachable:
   - Speak naturally, warmly, directly, and engagingly.
   - Avoid stiff, bureaucratic, or robotic boilerplate. Adapt flexibly to the user's topic and tone.
   - Excel at thoughtful discussions, storytelling, creative brainstorming, philosophical reflections, advice, and casual talk.

2. Document, Essay, & Report Writing:
   - When requested to write essays, reports, research summaries, articles, proposals, or formal documents, produce thorough, beautifully structured, and compelling pieces.
   - Utilize clear markdown formatting: title, executive summary / introduction, clear topical subheadings (##, ###), evidence-backed body arguments, and a thoughtful conclusion.
   - Adapt voice seamlessly to the desired format (academic, professional business report, analytical review, creative essay, or comprehensive guide).

3. Mathematical & STEM Problem-Solving:
   - When presented with mathematical problems (arithmetic, algebra, geometry, trigonometry, calculus, linear algebra, statistics, or word problems), automatically provide clear, step-by-step reasoning.
   - Render mathematical formulas, expressions, and equations using standard LaTeX notation ($...$ for inline equations, like $f'(x) = 2x$, and $$...$$ on its own line for display equations, like $$\\int x \\, dx = \\frac{x^2}{2} + C$$).
   - Clearly state the problem setup, show the logical steps, and highlight the final conclusion (e.g., **Final Answer:** $x = 5$).

4. Coding, Technical, & Deep Analysis:
   - Write clean, modern, well-commented code blocks with syntax highlighting.
   - Provide comprehensive, well-structured summaries, study notes, guides, and analyses with clear markdown headings and bullet points.`;

// Backward-compatible instructions map
const MODE_INSTRUCTIONS: Record<string, string> = {
  casual: VICTOR_SYSTEM_INSTRUCTION,
  math: VICTOR_SYSTEM_INSTRUCTION,
  general: VICTOR_SYSTEM_INSTRUCTION,
};

// Model selection helper with automated graceful fallback
async function getActiveStream(contents: any[], systemInstruction: string) {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  const ai = getGenAI();
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });
      return { responseStream, model };
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[Victor Model Fallback] Model ${model} failed (${err?.status || err?.message}). Trying next available model...`
      );
    }
  }

  throw lastError || new Error("All AI models are currently unavailable. Please try again.");
}

// Streaming Chat API endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  const { messages, customInstruction } = req.body;

  const validation = validateMessagesPayload(messages);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const selectedInstruction =
    typeof customInstruction === "string" && customInstruction.trim()
      ? customInstruction.trim()
      : VICTOR_SYSTEM_INSTRUCTION;

  const contents = validation.data.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  // Enable immediate delivery
  req.socket?.setNoDelay(true);
  res.socket?.setNoDelay(true);

  // Setup Server-Sent Events headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Track client abort correctly: res.on("close") when writable hasn't ended
  let isAborted = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      isAborted = true;
    }
  });

  // Set response timeout safeguard (45 seconds)
  const timeoutId = setTimeout(() => {
    if (!isAborted && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: "Victor response timed out. Please retry your request." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }, 45000);

  try {
    const { responseStream, model } = await getActiveStream(contents, selectedInstruction);

    for await (const chunk of responseStream) {
      if (isAborted || res.writableEnded) {
        break;
      }
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text, model })}\n\n`);
      }
    }

    clearTimeout(timeoutId);
    if (!isAborted && !res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (!isAborted && !res.writableEnded) {
      console.error("[Victor Chat] Streaming error:", error);
      const safeMessage = sanitizeErrorMessage(error);
      res.write(`data: ${JSON.stringify({ error: safeMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

// Fallback non-streaming endpoint
app.post("/api/chat/sync", async (req: Request, res: Response) => {
  const { messages, customInstruction } = req.body;

  const validation = validateMessagesPayload(messages);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const selectedInstruction =
    typeof customInstruction === "string" && customInstruction.trim()
      ? customInstruction.trim()
      : VICTOR_SYSTEM_INSTRUCTION;

  const contents = validation.data.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  const ai = getGenAI();
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: selectedInstruction,
        },
      });

      res.json({ text: response.text || "", model });
      return;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Sync Fallback] Model ${model} failed:`, err?.message || err);
    }
  }

  console.error("Gemini API sync error:", lastError);
  const safeMessage = sanitizeErrorMessage(lastError);
  res.status(500).json({ error: safeMessage });
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
    console.log(`Server listening on http://0.0.0.0:${PORT} [Primary Model: ${PRIMARY_MODEL}]`);
  });
}

startServer();
