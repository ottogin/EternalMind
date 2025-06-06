import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);

    const { data } = body;
    if (!data || !data.prompt) {
      console.error('No prompt provided in request');
      return new Response('No prompt provided', { status: 400 });
    }

    console.log('Creating OpenAI completion with prompt:', data.prompt);
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are an AI analyzing an alien communication signal. Your task is to help decode new symbols and explain their meaning based on the context provided. Be thorough in your analysis and explain your reasoning.'
        },
        {
          role: 'user',
          content: data.prompt
        }
      ],
    });

    // Convert the response to a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 