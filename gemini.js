/**
 * IspaniGo SA - Gemini API proxy
 * Vercel Serverless Function
 *
 * Required environment variable:
 *   GEMINI_API_KEY
 *
 * Optional:
 *   GEMINI_MODEL (defaults to gemini-3.5-flash)
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const MAX_INPUT_CHARS = 50000;
const MAX_OUTPUT_TOKENS = 1200;

function json(res, status, body) {
  return res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(res, 500, {
      error: "GEMINI_API_KEY is not configured on the server."
    });
  }

  const body = req.body || {};
  const system = typeof body.system === "string" ? body.system : "";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const requestedTokens = Number(body.maxTokens);

  if (!messages.length) {
    return json(res, 400, { error: "No messages were supplied." });
  }

  const safeSystem = system.slice(0, 16000);
  const safeMessages = messages
    .filter(m => m && typeof m.content === "string")
    .slice(-20)
    .map(m => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_INPUT_CHARS) }]
    }));

  const totalChars =
    safeSystem.length +
    safeMessages.reduce((sum, m) => sum + m.parts[0].text.length, 0);

  if (totalChars > MAX_INPUT_CHARS) {
    return json(res, 413, { error: "The request is too large." });
  }

  const maxOutputTokens = Math.min(
    Math.max(Number.isFinite(requestedTokens) ? requestedTokens : 800, 100),
    MAX_OUTPUT_TOKENS
  );

  const payload = {
    system_instruction: {
      parts: [{ text: safeSystem }]
    },
    contents: safeMessages,
    generationConfig: {
      maxOutputTokens,
      temperature: 0.6
    }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `Gemini API returned HTTP ${response.status}.`;
      return json(res, response.status >= 500 ? 502 : response.status, {
        error: message
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.filter(part => typeof part.text === "string")
        .map(part => part.text)
        .join("\n")
        .trim() || "";

    if (!text) {
      return json(res, 502, {
        error: "Gemini returned no text. Please try again."
      });
    }

    return json(res, 200, { text });
  } catch (error) {
    console.error("Gemini proxy error:", error);
    return json(res, 502, {
      error: "Unable to reach the Gemini AI service right now."
    });
  }
};
