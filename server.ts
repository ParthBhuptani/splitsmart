import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Proxy Gemini API for bill parsing
  app.post("/api/parse-bill", async (req, res) => {
    try {
      const { text, image, mimeType } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      let contents: any;
      if (image) {
        contents = {
          parts: [
            { text: "Parse this bill image and extract items and their amounts. If some items are unclear, do your best to estimate the name and price." },
            { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } }
          ]
        };
      } else {
        contents = `Parse the following bill text and extract items and their amounts. 
        Text: "${text}"`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "The item name" },
                amount: { type: Type.NUMBER, description: "The item price or amount" }
              },
              required: ["name", "amount"]
            }
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("AI Parse Error:", error);
      res.status(500).json({ error: error.message || "Failed to parse bill" });
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
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SplitSmart server running on http://localhost:${PORT}`);
  });
}

startServer();
