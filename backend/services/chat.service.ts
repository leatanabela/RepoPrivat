import { supabaseAdmin } from '../config/supabase';
import { AI_SERVICE_URL } from '../config/constants';

export async function createSession(userId: string, title?: string) {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: title || 'New Conversation',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getSessions(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getSessionMessages(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendMessage(
  sessionId: string,
  userId: string,
  message: string
) {
  // Save user message
  const { error: userMsgError } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    });

  if (userMsgError) throw new Error(userMsgError.message);

  // Get chat history for context
  const history = await getSessionMessages(sessionId);
  const chatHistory = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Call AI service
  const res = await fetch(`${AI_SERVICE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: message,
      session_id: sessionId,
      user_id: userId,
      chat_history: chatHistory,
    }),
  });

  if (!res.ok) {
    throw new Error('AI service failed to respond');
  }

  const aiResponse = await res.json();

  // Save assistant message
  const { data: assistantMsg, error: aiMsgError } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: aiResponse.answer,
      sources: aiResponse.sources || [],
    })
    .select()
    .single();

  if (aiMsgError) throw new Error(aiMsgError.message);

  // Update session title from first message
  if (history.length <= 1) {
    const title = message.length > 60 ? message.substring(0, 57) + '...' : message;
    await supabaseAdmin
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId);
  }

  return {
    userMessage: { role: 'user', content: message },
    assistantMessage: assistantMsg,
  };
}

export async function deleteSession(sessionId: string) {
  // Messages are cascade-deleted
  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
  return { success: true };
}
