import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }
  
  try {
    const body = await req.json();
    const { apiKey, contents, systemInstruction } = body;
    
    // In Edge runtime, environment variables are accessed differently sometimes, 
    // but process.env is usually polyfilled by Vercel for Edge env vars.
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    
    if (!keyToUse) {
      return new Response(JSON.stringify({ error: "No API key provided. Set it in settings or the environment." }), { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(keyToUse);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });

    const result = await model.generateContentStream({ contents });
    
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("Gemini proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

