import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { triggerDailyExamNotifications } from "./src/lib/examNotifier.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON body parser for API requests
  app.use(express.json());

  // API route to proxy Gemini calls
  app.post("/api/gemini", async (req, res) => {
    try {
      const { apiKey, contents, systemInstruction } = req.body;
      
      // Use the provided API key (from user settings) OR fallback to the environment key
      const keyToUse = apiKey || process.env.GEMINI_API_KEY;
      
      if (!keyToUse) {
        return res.status(401).json({ error: "No API key provided. Set it in settings or the environment." });
      }

      const genAI = new GoogleGenerativeAI(keyToUse);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });

      const result = await model.generateContentStream({ contents });
      
      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of result.stream) {
        const text = chunk.text();
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();

    } catch (error: any) {
      console.error("Gemini proxy error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API route to trigger daily exam notifications (can be called by a cron job)
  app.post("/api/trigger-exam-notifications", async (req, res) => {
    try {
      // Optional: Add a simple secret key check here to prevent unauthorized triggering
      // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      //   return res.status(401).json({ error: "Unauthorized" });
      // }

      const result = await triggerDailyExamNotifications();
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      console.error("Exam notification cron error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support client-side routing
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
