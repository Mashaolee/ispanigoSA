# IspaniGo SA — Gemini AI Prototype

This version connects the IspaniGo SA prototype to Google's Gemini API through a server-side Vercel Function.

## AI features

- AI Career Assistant
- Live text mock interview
- Voice mock interview (browser speech recognition + Gemini)
- CV/pitch review
- Candidate-CV-aware responses

## Why there is a backend

The Gemini API key must **not** be placed inside `index.html` or any frontend JavaScript. The browser calls `/api/gemini`, and the Vercel Function keeps `GEMINI_API_KEY` private.

## Deploy with Vercel

1. Create a Gemini API key in Google AI Studio.
2. Import this folder into Vercel.
3. In Vercel, open **Project Settings → Environment Variables**.
4. Add:

   `GEMINI_API_KEY` = your Gemini API key

5. Optional model variable:

   `GEMINI_MODEL` = `gemini-3.5-flash`

6. Redeploy.
7. Open the deployed IspaniGo website and test **AI Assistant** and **Mock Interview**.

## Local development

Install Vercel CLI if you want to test the serverless function locally:

```bash
npm i -g vercel
vercel dev
```

Set `GEMINI_API_KEY` in your local environment before running.

Do not commit `.env` files or API keys.

## GitHub Pages note

GitHub Pages can host the `index.html`, but it cannot securely run the `/api/gemini` Node function. For the fully working AI version, deploy the whole project to Vercel (or another serverless backend host).

## Included presentation

`IspaniGo_SA_4_Minute_Presentation.pptx`
