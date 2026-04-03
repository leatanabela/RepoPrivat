'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function createChatSession(title?: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Neautentificat');

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      title: title || 'Conversație nouă',
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
      // Generate a short descriptive title from the question
      let title = content.trim();
      // Use first sentence if available
      const sentenceEnd = title.search(/[.!?]\s/);
      if (sentenceEnd > 0 && sentenceEnd < 50) {
        title = title.substring(0, sentenceEnd + 1);
      } else if (title.length > 40) {
        // Truncate at last word boundary before 40 chars
        const truncated = title.substring(0, 40);
        const lastSpace = truncated.lastIndexOf(' ');
        title = (lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated) + '...';
      }
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
