'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function createChatSession(title?: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Neautentificat');

  const now = new Date();
  const defaultTitle = now.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      title: title || defaultTitle,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getChatSessions() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getChatMessages(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteChatSession(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function saveUserMessage(sessionId: string, content: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update session title from first relevant message (skip greetings/vague)
  const greetingPattern = /^\s*(bun[aă]|salut|hey|hello|hi|ce faci|cum e[sș]ti|noroc|servus|hei|neata|zi[- ]?mi ceva|spune[- ]?mi ceva|ce (stii|știi|poti|poți)|ajuta[- ]?ma|ajută[- ]?mă|cu ce (ma|mă) (poti|poți) ajuta|am nevoie de ajutor|cine esti|cine ești|prezinta[- ]?te|prezintă[- ]?te)\s*[?!.,]*\s*$/i;
  const isGreetingOrVague = greetingPattern.test(content.trim());

  if (!isGreetingOrVague) {
    // Check if session still has default title
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('title')
      .eq('id', sessionId)
      .single();

    const isDefaultTitle = !session?.title || session.title === 'Conversație nouă' || /^\d{2}\.\d{2}\.\d{4}/.test(session.title);
    if (session && isDefaultTitle) {
      const title = content.length > 60 ? content.substring(0, 57) + '...' : content;
      await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId);
    }
  }

  return data;
}

export async function saveAssistantMessage(sessionId: string, content: string, sources: unknown[] = []) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content,
      sources,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
