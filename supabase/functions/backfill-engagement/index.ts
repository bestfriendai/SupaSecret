// supabase/functions/backfill-engagement/index.ts
// One-time function to add engagement to all existing secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all confessions that don't have engagement yet
    const { data: confessions, error } = await supabase
      .from('confessions')
      .select('id, content, type, is_ai_generated')
      .eq('ai_engagement_added', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!confessions || confessions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No confessions need backfilling' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Backfilling engagement for ${confessions.length} confessions`);

    // Process each confession
    let processed = 0;
    let failed = 0;

    for (const confession of confessions) {
      try {
        // Call add-engagement function for each confession
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/add-engagement`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              confession_id: confession.id,
              is_real_user: !confession.is_ai_generated
            })
          }
        );

        if (response.ok) {
          processed++;
          console.log(`✅ Processed confession ${confession.id}`);
        } else {
          failed++;
          console.error(`❌ Failed confession ${confession.id}: ${await response.text()}`);
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        failed++;
        console.error(`❌ Error processing confession ${confession.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: confessions.length,
        processed,
        failed,
        message: `Backfilled engagement for ${processed} confessions`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

