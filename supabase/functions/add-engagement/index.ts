// supabase/functions/add-engagement/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc';
const AI_USER_ID = Deno.env.get('AI_USER_ID') || 'd2352851-cde9-43b6-9d33-9ac4b2ecc67a';

serve(async (req) => {
  try {
    const { confession_id, is_real_user = false } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the confession details
    const { data: confession } = await supabase
      .from('confessions')
      .select('content, type, is_ai_generated, ai_engagement_added')
      .eq('id', confession_id)
      .single();

    if (!confession) throw new Error('Confession not found');

    // Skip if AI engagement already added
    if (confession.ai_engagement_added) {
      return new Response(
        JSON.stringify({ success: true, message: 'Engagement already added' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine engagement strategy
    const targetLikes = getRandomLikeCount(is_real_user, confession.type);
    const targetComments = getRandomCommentCount(is_real_user, confession.type);

    // Mark as engaged
    await supabase
      .from('confessions')
      .update({ ai_engagement_added: true })
      .eq('id', confession_id);

    // Add immediate engagement for real users
    if (is_real_user) {
      // First like within 0-10 seconds
      setTimeout(async () => {
        await addLike(supabase, confession_id);
      }, Math.random() * 10000);

      // First comment within 30-60 seconds
      setTimeout(async () => {
        const comment = await generateComment(confession.content, confession.type);
        await addComment(supabase, confession_id, comment);
      }, (Math.random() * 30000) + 30000);
    }

    // Schedule incremental likes (all within 5 minutes)
    await scheduleIncrementalLikes(supabase, confession_id, targetLikes, is_real_user);

    // Generate and schedule remaining comments (all within 5 minutes)
    const remainingComments = is_real_user ? targetComments - 1 : targetComments;
    for (let i = 0; i < remainingComments; i++) {
      const comment = await generateComment(confession.content, confession.type);
      const delayMinutes = Math.random() * 5; // Random within 5 minutes

      setTimeout(async () => {
        await addComment(supabase, confession_id, comment);
      }, delayMinutes * 60 * 1000);
    }

    return new Response(
      JSON.stringify({
        success: true,
        target_likes: targetLikes,
        target_comments: targetComments,
        is_real_user
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

async function generateComment(secretText: string, contentType: string = 'text'): Promise<string> {
  const commentStyle = getRandomCommentStyle();

  let prompt = '';

  if (contentType === 'video') {
    prompt = `Someone posted an anonymous video confession on Toxic Confessions app.

Generate a realistic comment in this style: ${commentStyle}

Requirements:
- Keep it SHORT (3-20 words max)
- Sound natural and casual
- Use lowercase frequently
- Include emojis sparingly (💀😭😅🤣🙈)
- Match the style: ${commentStyle}

Examples by style:
SUPPORTIVE: "you're not alone in this", "sending love", "proud of u for sharing"
HARSH: "nah you're wrong for this", "that's messed up ngl", "you should apologize"
HILARIOUS: "JAIL 😭😭", "not the...", "this is unhinged behavior", "💀💀💀"
QUESTIONING: "wait what happened after", "how did they react??", "need an update"
RELATABLE: "literally me", "same energy", "felt this"
SHORT: "damn", "yikes", "oof", "valid", "real"

Return ONLY the comment text, nothing else.`;
  } else {
    prompt = `Read this anonymous confession: "${secretText}"

Generate a realistic comment response in this style: ${commentStyle}

CRITICAL REALISM RULES:
- Keep it SHORT (3-20 words max)
- Use lowercase frequently ("this is wild" not "This Is Wild")
- Include typos occasionally: "ur" instead of "your", "u" instead of "you", "tho" instead of "though"
- Use Gen Z slang: "fr", "ngl", "lowkey", "highkey", "deadass", "no cap", "valid", "unhinged"
- Start with: "nah", "wait", "not the", "the way", "help", "bro", "bestie"
- Use "..." for dramatic effect
- Include emojis sparingly (💀😭😅🤣🙈😬)
- Match the vibe of the confession
- Sound like a real person scrolling at 1am

Examples by style:
SUPPORTIVE:
- "you're not alone fr"
- "sending hugs 🫂"
- "proud of u for sharing this"
- "it's gonna be okay"

HARSH/CRITICAL:
- "nah you're wrong for this"
- "that's messed up ngl"
- "you should feel bad about this"
- "this ain't it chief"
- "yikes... not okay"

HILARIOUS/SARCASTIC:
- "JAIL 😭😭😭"
- "not the [something from confession]..."
- "this is unhinged behavior"
- "💀💀💀 i can't"
- "help why did u do this"
- "the audacity"
- "bestie what"

QUESTIONING:
- "wait what happened after??"
- "how did they react"
- "need an update on this"
- "okay but then what"

RELATABLE:
- "literally me"
- "same thing happened to me"
- "felt this in my soul"
- "this is so real"

SHORT REACTIONS:
- "damn"
- "yikes"
- "oof"
- "bruh"
- "valid"
- "real"
- "felt"

Return ONLY the comment text, nothing else. NO quotation marks.`;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 50,
          topP: 0.95
        }
      })
    }
  );

  const data = await response.json();

  // Better error handling
  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  if (!data.candidates || !data.candidates[0]) {
    throw new Error('Invalid response from Gemini API: No candidates');
  }

  const candidate = data.candidates[0];

  // Check if content and parts exist
  if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
    throw new Error(`Invalid response structure. Finish reason: ${candidate.finishReason}`);
  }

  return candidate.content.parts[0].text.trim();
}

function getRandomCommentStyle(): string {
  const styles = [
    'supportive and empathetic',
    'supportive and empathetic',
    'supportive and empathetic',
    'harsh and critical',
    'harsh and critical',
    'hilarious and sarcastic',
    'hilarious and sarcastic',
    'questioning for more details',
    'questioning for more details',
    'relatable and personal',
    'short reaction (1-3 words)',
  ];
  return styles[Math.floor(Math.random() * styles.length)];
}

function getRandomLikeCount(isRealUser: boolean, contentType: string): number {
  const multiplier = isRealUser ? 2.5 : 1.0;
  const videoBonus = contentType === 'video' ? 1.5 : 1.0;

  const rand = Math.random();
  let baseLikes = 0;

  // Much higher like counts
  if (rand < 0.4) baseLikes = Math.floor(Math.random() * 150) + 50;      // 50-200 likes (40%)
  else if (rand < 0.75) baseLikes = Math.floor(Math.random() * 250) + 200; // 200-450 likes (35%)
  else if (rand < 0.95) baseLikes = Math.floor(Math.random() * 400) + 450; // 450-850 likes (20%)
  else baseLikes = Math.floor(Math.random() * 650) + 850;                  // 850-1500 likes (5% - VIRAL!)

  return Math.floor(baseLikes * multiplier * videoBonus);
}

function getRandomCommentCount(isRealUser: boolean, contentType: string): number {
  const multiplier = isRealUser ? 2.5 : 1.0;
  const videoBonus = contentType === 'video' ? 1.4 : 1.0;

  const rand = Math.random();
  let baseComments = 0;

  // Comments should be 7-15x less than likes
  // Average likes: ~300, so comments should be ~20-40
  if (rand < 0.5) baseComments = Math.floor(Math.random() * 8) + 5;      // 5-12 comments (50%)
  else if (rand < 0.85) baseComments = Math.floor(Math.random() * 15) + 12; // 12-27 comments (35%)
  else if (rand < 0.97) baseComments = Math.floor(Math.random() * 25) + 30; // 30-55 comments (12%)
  else baseComments = Math.floor(Math.random() * 50) + 60;                  // 60-110 comments (3% - VIRAL!)

  return Math.floor(baseComments * multiplier * videoBonus);
}

async function addLike(supabase: any, confessionId: string): Promise<void> {
  const { data: confession } = await supabase
    .from('confessions')
    .select('likes_count, likes, user_id, is_ai_generated')
    .eq('id', confessionId)
    .single();

  const newCount = (confession?.likes_count || 0) + 1;

  await supabase
    .from('confessions')
    .update({
      likes_count: newCount,
      likes: newCount  // Keep both columns in sync
    })
    .eq('id', confessionId);

  // Send push notification to confession owner (if real user)
  if (!confession.is_ai_generated) {
    await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/send-push-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        user_id: confession.user_id,
        confession_id: confessionId,
        type: 'like'
      })
    });
  }
}

async function addComment(
  supabase: any,
  confessionId: string,
  commentText: string
): Promise<void> {
  const { data: confession } = await supabase
    .from('confessions')
    .select('user_id, is_ai_generated')
    .eq('id', confessionId)
    .single();

  const { data: comment } = await supabase
    .from('replies')
    .insert({
      confession_id: confessionId,
      user_id: AI_USER_ID,
      content: commentText,
      is_ai_generated: true
    })
    .select()
    .single();

  // Send push notification to confession owner (if real user)
  if (!confession.is_ai_generated) {
    await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/send-push-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        user_id: confession.user_id,
        confession_id: confessionId,
        type: 'comment',
        comment_text: commentText,
        comment_id: comment.id
      })
    });
  }
}

async function scheduleIncrementalLikes(
  supabase: any,
  confessionId: string,
  targetLikes: number,
  isRealUser: boolean
): Promise<void> {
  // All likes delivered within 5 minutes
  const duration = 5 * 60 * 1000; // 5 minutes

  // 70% of likes in first 2 minutes, rest spread over remaining 3 minutes
  const firstBatchSize = Math.floor(targetLikes * 0.7);
  const firstBatchDuration = 2 * 60 * 1000; // 2 minutes

  for (let i = 0; i < targetLikes; i++) {
    let delay;

    if (i < firstBatchSize) {
      // First 70% within 2 minutes
      delay = Math.random() * firstBatchDuration;
    } else {
      // Remaining 30% spread over 2-5 minutes
      delay = firstBatchDuration + (Math.random() * (duration - firstBatchDuration));
    }

    setTimeout(async () => {
      await addLike(supabase, confessionId);
    }, delay);
  }
}

