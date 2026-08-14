/**
 * IspaniGo SA - OpenRouter API proxy
 * Kept at /api/gemini.js so the existing frontend does not need to change.
 * Vercel Serverless Function.
 *
 * Required environment variable:
 *   OPENROUTER_API_KEY
 *
 * Optional:
 *   OPENROUTER_MODEL (defaults to openrouter/free)
 */

const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
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

  if (!process.env.OPENROUTER_API_KEY) {
    return json(res, 500, {
      error: "OPENROUTER_API_KEY is not configured on the server."
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
      role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
      content: m.content.slice(0, MAX_INPUT_CHARS)
    }));

  const totalChars = safeSystem.length + safeMessages.reduce(
    (sum, m) => sum + m.content.length, 0
  );

  if (totalChars > MAX_INPUT_CHARS) {
    return json(res, 413, { error: "The request is too large." });
  }

  const maxTokens = Math.min(
    Math.max(Number.isFinite(requestedTokens) ? requestedTokens : 800, 100),
    MAX_OUTPUT_TOKENS
  );

  // OpenRouter's chat-completions endpoint is OpenAI-compatible.
  // The free router automatically selects an available free model.
  const payload = {
    model: MODEL,
    messages: [
      ...(safeSystem ? [{ role: "system", content: safeSystem }] : []),
      ...safeMessages
    ],
    max_tokens: maxTokens
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://ispanigo-sa.vercel.app",
        "X-Title": "IspaniGo SA"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || `OpenRouter API returned HTTP ${response.status}.`;
      console.error("OpenRouter API error:", response.status, message);
      return json(res, response.status >= 500 ? 502 : response.status, { error: message });
    }

    const text = data?.choices?.[0]?.message?.content;
    const finalText = typeof text === "string" ? text.trim() : "";

    if (!finalText) {
      return json(res, 502, { error: "OpenRouter returned no text. Please try again." });
    }

    return json(res, 200, { text: finalText });
  } catch (error) {
    console.error("OpenRouter proxy error:", error);
    return json(res, 502, { error: "Unable to reach the OpenRouter AI service right now." });
  }
};
