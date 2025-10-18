// supabase/functions/send-push-notification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotification {
  to: string;
  title: string;
  body: string;
  data: {
    confessionId: string;
    type: 'like' | 'comment';
    commentId?: string;
  };
  sound: 'default';
  badge: number;
}

serve(async (req) => {
  try {
    const { user_id, confession_id, type, comment_text, comment_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No push tokens found' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build notification
    let title = '';
    let body = '';

    if (type === 'like') {
      title = '❤️ Someone liked your secret';
      body = 'Your confession is getting attention!';
    } else if (type === 'comment') {
      title = '💬 New comment on your secret';
      const preview = comment_text.length > 50
        ? comment_text.substring(0, 50) + '...'
        : comment_text;
      body = preview;
    }

    // Send push notifications to all user's devices
    const notifications: PushNotification[] = tokens.map(token => ({
      to: token.token,
      title,
      body,
      data: {
        confessionId: confession_id,
        type,
        commentId: comment_id
      },
      sound: 'default',
      badge: 1
    }));

    // Send to Expo Push Notification service
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(notifications)
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

