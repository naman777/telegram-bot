import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{
  Bindings: {
    SECRET: string; // Your secret key for authentication
    GEMINI_API_KEY: string; // Your Google Gemini API key
  };
}>();

app.use(cors());
app.use("/*", cors());

app.post("/telegram", async (c) => {
  try {
    const body = await c.req.json();

    if (!body || !body.file_url) {
      return c.json({ success: false, error: "No file URL provided" }, 400);
    }

    const fileUrl = body.file_url;
    const fileType = body.file_type; // "image" or "audio"

    let extractedText = "";

    if (fileType === "image") {
      extractedText = await processImage(fileUrl, c.env.GEMINI_API_KEY);
    } else if (fileType === "audio") {
      extractedText = await processAudio(fileUrl, c.env.GEMINI_API_KEY);
    } else {
      return c.json({ success: false, error: "Unsupported file type" }, 400);
    }

    return c.json({ success: true, extractedText });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, error: "Something went wrong" }, 500);
  }
});

// Function to process image and extract text using Gemini API
async function processImage(imageUrl: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "image/jpeg", url: imageUrl } },
            ],
          },
        ],
      }),
    }
  );

  interface GeminiResponse {
    candidates?: { content: string }[];
  }

  const data: GeminiResponse = await response.json();
  return data?.candidates?.[0]?.content || "No text found in image.";
}

// Function to process audio and extract text using Gemini API
async function processAudio(audioUrl: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro-audio:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ inline_data: { mime_type: "audio/mp3", url: audioUrl } }],
          },
        ],
      }),
    }
  );

  interface GeminiResponse {
    candidates?: { content: string }[];
  }

  const data: GeminiResponse = await response.json();
  return data?.candidates?.[0]?.content || "No text found in audio.";
}

export default app;
