import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-3.8-flash",
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

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Invalid messages payload. Array expected." });
    return;
  }

  const selectedInstruction =
    customInstruction || MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.casual;

  // Format message history for @google/genai
  // Roles must be 'user' or 'model'
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" || m.role === "model" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Setup Server-Sent Events headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const ai = getGenAI();

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: selectedInstruction,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Gemini API streaming error:", error);
    const errorMessage =
      error?.message || "An error occurred while generating response.";
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// Fallback non-streaming endpoint
app.post("/api/chat/sync", async (req: Request, res: Response) => {
  const { messages, mode = "casual", customInstruction } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Invalid messages payload." });
    return;
  }

  const selectedInstruction =
    customInstruction || MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.casual;

  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" || m.role === "model" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: selectedInstruction,
      },
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Gemini API sync error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate AI response",
    });
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
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
