import express, { Request, Response, NextFunction } from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
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
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

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

let cachedTasks: any[] = [];
try {
  if (fs.existsSync(TASKS_FILE)) {
    const raw = fs.readFileSync(TASKS_FILE, "utf-8");
    cachedTasks = JSON.parse(raw);
    if (!Array.isArray(cachedTasks)) cachedTasks = [];
  }
} catch (e) {
  console.warn("Could not read tasks from file:", e);
}

// User-specific partitioned store for tasks, sessions, and personalization
interface UserStoreRecord {
  email: string;
  name?: string;
  tasks: any[];
  sessions: any[];
  memories?: any[];
  personalizationEnabled?: boolean;
  customInstructions?: string;
  updatedAt: number;
}

const USERS_FILE = path.join(DATA_DIR, "users_data.json");
let usersStore: Record<string, UserStoreRecord> = {};
try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    usersStore = JSON.parse(raw) || {};
  }
} catch (e) {
  console.warn("Could not read users_data from file:", e);
}

function saveUsersStore() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersStore, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save usersStore to file:", e);
  }
}

function extractUserEmail(req: Request): string | null {
  const headerEmail = (req.headers["x-user-email"] as string)?.trim().toLowerCase();
  const queryEmail = (req.query.email as string)?.trim().toLowerCase();
  const bodyEmail = (req.body?.email as string)?.trim().toLowerCase();
  const candidate = headerEmail || queryEmail || bodyEmail || "";
  if (candidate && candidate.includes("@") && candidate.includes(".")) {
    return candidate;
  }
  return null;
}

// Standard CORS configuration
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, x-user-email"
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

// Authentication & Profile Sign-In endpoint
app.post("/api/auth/signin", (req: Request, res: Response) => {
  const { email, name, currentTasks } = req.body;
  const userEmail = (email || "").trim().toLowerCase();
  if (!userEmail || !userEmail.includes("@") || !userEmail.includes(".")) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  if (!usersStore[userEmail]) {
    usersStore[userEmail] = {
      email: userEmail,
      name: name ? String(name).trim() : undefined,
      tasks: Array.isArray(currentTasks) ? currentTasks.slice(0, 200) : [],
      sessions: [],
      updatedAt: Date.now(),
    };
    saveUsersStore();
  } else {
    // If local tasks are supplied, merge them smoothly
    if (Array.isArray(currentTasks) && currentTasks.length > 0) {
      const existingIds = new Set((usersStore[userEmail].tasks || []).map((t: any) => t.id));
      const newTasks = currentTasks.filter((t: any) => t && t.id && !existingIds.has(t.id));
      usersStore[userEmail].tasks = [...newTasks, ...(usersStore[userEmail].tasks || [])].slice(0, 200);
    }
    if (name) {
      usersStore[userEmail].name = String(name).trim();
    }
    usersStore[userEmail].updatedAt = Date.now();
    saveUsersStore();
  }

  res.json({
    ok: true,
    user: {
      email: userEmail,
      name: usersStore[userEmail].name,
      signedInAt: Date.now(),
    },
    tasks: usersStore[userEmail].tasks || [],
    sessions: usersStore[userEmail].sessions || [],
  });
});

// Sessions persistence endpoints (isolated per user)
app.get("/api/sessions", (req: Request, res: Response) => {
  const userEmail = extractUserEmail(req);
  if (!userEmail) {
    // Guest mode: do not return shared global sessions to anonymous users
    return res.json({ sessions: [], isGuest: true });
  }
  const userRecord = usersStore[userEmail];
  res.json({ sessions: userRecord ? userRecord.sessions : [], isGuest: false, email: userEmail });
});

app.post("/api/sessions", (req: Request, res: Response) => {
  const userEmail = extractUserEmail(req);
  const { sessions } = req.body;
  if (!userEmail) {
    // Guest mode: acknowledged, kept on client
    return res.json({ ok: true, isGuest: true, count: Array.isArray(sessions) ? sessions.length : 0 });
  }
  if (Array.isArray(sessions)) {
    if (!usersStore[userEmail]) {
      usersStore[userEmail] = {
        email: userEmail,
        tasks: [],
        sessions: [],
        updatedAt: Date.now(),
      };
    }
    usersStore[userEmail].sessions = sessions.slice(0, 100);
    usersStore[userEmail].updatedAt = Date.now();
    saveUsersStore();
  }
  res.json({ ok: true, count: usersStore[userEmail]?.sessions?.length || 0, email: userEmail });
});

// Tasks persistence endpoints (isolated per user)
app.get("/api/tasks", (req: Request, res: Response) => {
  const userEmail = extractUserEmail(req);
  if (!userEmail) {
    // Guest mode: do not expose any other user's tasks
    return res.json({ tasks: [], isGuest: true });
  }
  const userRecord = usersStore[userEmail];
  res.json({ tasks: userRecord ? userRecord.tasks : [], isGuest: false, email: userEmail });
});

app.post("/api/tasks", (req: Request, res: Response) => {
  const userEmail = extractUserEmail(req);
  const { tasks } = req.body;
  if (!userEmail) {
    // Guest mode: acknowledge without overwriting cloud storage
    return res.json({ ok: true, isGuest: true, count: Array.isArray(tasks) ? tasks.length : 0 });
  }
  if (Array.isArray(tasks)) {
    if (!usersStore[userEmail]) {
      usersStore[userEmail] = {
        email: userEmail,
        tasks: [],
        sessions: [],
        updatedAt: Date.now(),
      };
    }
    usersStore[userEmail].tasks = tasks.slice(0, 200);
    usersStore[userEmail].updatedAt = Date.now();
    saveUsersStore();
  }
  res.json({ ok: true, count: usersStore[userEmail]?.tasks?.length || 0, email: userEmail });
});

// Personalization & Long-Term Memory persistence endpoints
app.get("/api/personalization", (req: Request, res: Response) => {
  const userEmail = extractUserEmail(req);
  if (!userEmail || !usersStore[userEmail]) {
    return res.json({ enabled: true, memories: [], customInstructions: "" });
  }
  const rec = usersStore[userEmail];
  res.json({
    enabled: rec.personalizationEnabled ?? true,
    memories: rec.memories || [],
    customInstructions: rec.customInstructions || "",
  });
});

app.post("/api/personalization", (req: Request, res: Response) => {
  const userEmail = extractUserEmail(req);
  const { enabled, memories, customInstructions } = req.body;
  if (userEmail) {
    if (!usersStore[userEmail]) {
      usersStore[userEmail] = {
        email: userEmail,
        tasks: [],
        sessions: [],
        updatedAt: Date.now(),
      };
    }
    if (typeof enabled === "boolean") {
      usersStore[userEmail].personalizationEnabled = enabled;
    }
    if (Array.isArray(memories)) {
      usersStore[userEmail].memories = memories.slice(0, 100);
    }
    if (typeof customInstructions === "string") {
      usersStore[userEmail].customInstructions = customInstructions.slice(0, 1000);
    }
    usersStore[userEmail].updatedAt = Date.now();
    saveUsersStore();
  }
  res.json({ ok: true });
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
const VICTOR_SYSTEM_INSTRUCTION = `# IDENTITY & PERSONA
You are Victor, an intelligent, personal AI companion, technical ally, and conversational collaborator.
- Tone: Natural, friendly, casual, perceptive, and sharp. Speak like an exceptionally smart friend.
- Avoid robotic or mechanical clichés: Never say things like "Affirmative", "Autonomous protocol activated", "Action executed", "System operational", or "That is working".
- Be genuine, encouraging, and clear. Speak in normal, casual conversational language.

# ADAPTIVE CONVERSATIONAL INTELLIGENCE
- Meet the user where they are: Base your responses and conversation strictly on what the user is actively talking about.
- If the user discusses coding, technology, Python, or engineering: Provide clear code, sound principles, clean formatting, and step-by-step logic.
- If the user discusses cooking, food, writing, creative ideas, science, philosophy, or day-to-day life: Fully immerse into that topic with curiosity, helpfulness, and conversational depth.
- Do NOT make unprompted assumptions about the user's personal milestones, and do NOT inject unrelated topics (such as college applications or scholarships) unless the user explicitly introduces them.
- Maintain smooth context continuity across the conversation.

# IN-APP ACTIONS, TASKS & LONG-TERM MEMORY
You can directly manage the user's dashboard, missions, and memory.
When the user asks you to take an in-app action (adding a task, completing a task, switching theme, saving a note, or remembering a fact/preference about them across chats), speak casually and naturally, and append an action directive block at the very end of your response formatted like this:

\`\`\`action
{"type": "add_task", "title": "Build Python CLI parser", "category": "code", "priority": "high"}
\`\`\`

Supported Action Types:
- Add a task: \`{"type": "add_task", "title": "...", "category": "projects" | "code" | "general" | "personal" | "learning", "priority": "high" | "medium" | "low", "dueDate": "optional date"}\`
- Complete a task: \`{"type": "complete_task", "title": "..."}\`
- Delete a task: \`{"type": "delete_task", "title": "..."}\`
- Change theme: \`{"type": "set_theme", "theme": "dark" | "light"}\`
- Save a note: \`{"type": "save_note", "title": "...", "content": "..."}\`
- Save long-term memory: \`{"type": "save_memory", "fact": "The specific preference, interest, or background detail to remember"}\`
- Send an email: \`{"type": "send_email", "to": "email@domain.com", "subject": "Subject text", "body": "Body text"}\`
- Draft an email: \`{"type": "draft_email", "to": "email@domain.com", "subject": "Subject text", "body": "Body text"}\`
- Read or search emails: \`{"type": "read_emails", "query": "search query"}\`
- Create a Google Doc: \`{"type": "create_doc", "title": "Doc Title", "content": "Full draft content for the document"}\`
- Schedule a Calendar Event: \`{"type": "create_calendar_event", "title": "Meeting / Event Title", "startDateTime": "2026-09-22T14:00:00Z", "endDateTime": "2026-09-22T15:00:00Z", "content": "Agenda"}\`
- Check Upcoming Calendar: \`{"type": "read_calendar"}\`

# EXECUTIVE ASSISTANT & WORKSPACE CAPABILITIES
When the user asks you to email someone, draft an email, draft a Google Doc, create notes in Docs, or schedule an event on Google Calendar:
1. Speak in a helpful, conversational tone and describe what you've prepared or created.
2. Include the corresponding action directive block (\`send_email\`, \`draft_email\`, \`read_emails\`, \`create_doc\`, \`create_calendar_event\`, or \`read_calendar\`).
3. For sending emails: Summarize the recipient and subject clearly so the user can review before it's sent.
4. For Google Docs: Generate well-structured, thorough content in the \`content\` field so the document is immediately usable.
5. For Calendar: Always use standard ISO 8601 timestamps for \`startDateTime\` and \`endDateTime\`. The current year is 2026.

Important: Keep your confirmation completely natural! For example, say "I've drafted that Google Doc for you!" or "I scheduled that meeting on your calendar!" or "Done, marked that complete!" Never sound like a robot.`;

// Backward-compatible instructions map
const MODE_INSTRUCTIONS: Record<string, string> = {
  casual: VICTOR_SYSTEM_INSTRUCTION,
  math: VICTOR_SYSTEM_INSTRUCTION,
  general: VICTOR_SYSTEM_INSTRUCTION,
};

// Model selection helper with automated graceful fallback and native code execution
async function getActiveStream(contents: any[], systemInstruction: string) {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  const ai = getGenAI();
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      // First attempt: with native Gemini code execution tool
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          tools: [{ codeExecution: {} }],
        },
      });
      return { responseStream, model };
    } catch (err: any) {
      console.warn(
        `[Victor Model Stream] Model ${model} with tools had notice (${err?.status || err?.message}). Retrying without tool flag...`
      );
      try {
        const fallbackStream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
          },
        });
        return { responseStream: fallbackStream, model };
      } catch (innerErr: any) {
        lastError = innerErr;
        console.warn(
          `[Victor Model Fallback] Model ${model} failed entirely (${innerErr?.status || innerErr?.message}). Trying next available model...`
        );
      }
    }
  }

  throw lastError || new Error("All AI models are currently unavailable. Please try again.");
}

// Streaming Chat API endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  const { messages, customInstruction, personalizationContext } = req.body;

  const validation = validateMessagesPayload(messages);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error });
    return;
  }

  let baseInstruction =
    typeof customInstruction === "string" && customInstruction.trim()
      ? customInstruction.trim()
      : VICTOR_SYSTEM_INSTRUCTION;

  if (typeof personalizationContext === "string" && personalizationContext.trim()) {
    baseInstruction += "\n\n" + personalizationContext.trim();
  }

  const selectedInstruction = baseInstruction;

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
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.executableCode) {
            res.write(`data: ${JSON.stringify({ executableCode: part.executableCode, model })}\n\n`);
          }
          if (part.codeExecutionResult) {
            res.write(`data: ${JSON.stringify({ codeExecutionResult: part.codeExecutionResult, model })}\n\n`);
          }
        }
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
  const { messages, customInstruction, personalizationContext } = req.body;

  const validation = validateMessagesPayload(messages);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error });
    return;
  }

  let baseInstruction =
    typeof customInstruction === "string" && customInstruction.trim()
      ? customInstruction.trim()
      : VICTOR_SYSTEM_INSTRUCTION;

  if (typeof personalizationContext === "string" && personalizationContext.trim()) {
    baseInstruction += "\n\n" + personalizationContext.trim();
  }

  const selectedInstruction = baseInstruction;

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

// ==========================================
// Gemini Multimodal Live API (Bidirectional Audio)
// ==========================================
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  try {
    const host = request.headers.host || "localhost";
    const parsedUrl = new URL(request.url || "", `http://${host}`);
    if (parsedUrl.pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  } catch (err) {
    console.warn("[Live WS Upgrade Error]:", err);
    socket.destroy();
  }
});

wss.on("connection", async (clientWs: WebSocket, req: http.IncomingMessage) => {
  const host = req.headers.host || "localhost";
  const parsedUrl = new URL(req.url || "", `http://${host}`);
  const requestedVoice = parsedUrl.searchParams.get("voice") || "Zephyr";

  const validVoices = ["Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Aoede"];
  const voiceName = validVoices.includes(requestedVoice) ? requestedVoice : "Zephyr";

  let liveSession: any = null;
  let isAlive = true;

  try {
    const ai = getGenAI();
    console.log(`[Gemini Live] Initializing bidirectional session (Voice: ${voiceName})...`);

    liveSession = await ai.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
        systemInstruction: VICTOR_SYSTEM_INSTRUCTION,
      },
      callbacks: {
        onopen: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: "ready",
              model: "gemini-3.8-live",
              voice: voiceName,
            }));
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (!isAlive || clientWs.readyState !== WebSocket.OPEN) return;

          if (message.setupComplete) {
            clientWs.send(JSON.stringify({ type: "setup_complete" }));
          }

          if (message.serverContent) {
            const parts = message.serverContent.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({
                    type: "audio",
                    audio: part.inlineData.data,
                  }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({
                    type: "text",
                    text: part.text,
                  }));
                }
              }
            }

            if (message.serverContent.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            if (message.serverContent.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turn_complete" }));
            }
          }
        },
        onerror: (err: any) => {
          console.error("[Gemini Live Error]:", err?.message || err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: "error",
              error: sanitizeErrorMessage(err),
            }));
          }
        },
        onclose: (e: any) => {
          console.log("[Gemini Live Closed]:", e?.code, e?.reason);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "closed" }));
          }
        },
      },
    });

    clientWs.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "audio" && msg.data) {
          liveSession?.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if (msg.type === "text" && msg.text) {
          liveSession?.sendRealtimeInput({
            text: msg.text,
          });
        }
      } catch (err) {
        console.warn("[Client WS Message Parse Error]:", err);
      }
    });

    clientWs.on("close", () => {
      isAlive = false;
      try {
        liveSession?.close();
      } catch {}
    });

    clientWs.on("error", () => {
      isAlive = false;
      try {
        liveSession?.close();
      } catch {}
    });

  } catch (err: any) {
    console.error("[Gemini Live Connect Init Failed]:", err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: "error",
        error: sanitizeErrorMessage(err),
      }));
      clientWs.close();
    }
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} [Primary Model: ${PRIMARY_MODEL}]`);
    console.log(`⚡ Gemini Multimodal Live WebSocket ready on ws://0.0.0.0:${PORT}/api/live`);
  });
}

startServer();
