import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AI_SERVICE_URL } from '@/lib/constants';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const { question, session_id, chat_history } = body;

  // Call AI service streaming endpoint
  const aiResponse = await fetch(`${AI_SERVICE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      session_id,
      user_id: user.id,
      chat_history: chat_history || [],
    }),
  });

  if (!aiResponse.ok) {
    return new Response('AI service error', { status: 502 });
  }

  // Forward the SSE stream
  return new Response(aiResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
