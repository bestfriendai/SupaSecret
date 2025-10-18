// supabase/functions/engage-with-real-users/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find real user posts that haven't received AI engagement yet
    const { data: confessions } = await supabase
      .from('confessions')
      .select('id, content, type, created_at')
      .eq('is_ai_generated', false)
      .eq('ai_engagement_added', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!confessions || confessions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No new real user posts to engage with' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Trigger engagement for each real user post
    for (const confession of confessions) {
      await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/add-engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          confession_id: confession.id,
          is_real_user: true
        })
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        engaged_with: confessions.length,
        confession_ids: confessions.map(c => c.id)
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

