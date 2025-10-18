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
      // Different timing for text vs video
      const isVideo = confession.type === 'video';

      if (isVideo) {
        // Videos: First like within 10-20 seconds (people watch then like)
        setTimeout(async () => {
          await addLike(supabase, confession_id);
        }, (Math.random() * 10 * 1000) + (10 * 1000)); // 10-20 seconds

        // Videos: First comment 30-50 seconds after first like
        setTimeout(async () => {
          const comment = await generateComment(confession.content, confession.type);
          await addComment(supabase, confession_id, comment);
        }, (Math.random() * 20 * 1000) + (40 * 1000)); // 40-60 seconds
      } else {
        // Text: First like within 3-8 seconds (instant read and like)
        setTimeout(async () => {
          await addLike(supabase, confession_id);
        }, (Math.random() * 5 * 1000) + (3 * 1000)); // 3-8 seconds

        // Text: First comment 20-30 seconds after first like
        setTimeout(async () => {
          const comment = await generateComment(confession.content, confession.type);
          await addComment(supabase, confession_id, comment);
        }, (Math.random() * 10 * 1000) + (23 * 1000)); // 23-33 seconds
      }
    }

    // Schedule incremental likes (ultra-fast for text, slower for video)
    await scheduleIncrementalLikes(supabase, confession_id, targetLikes, is_real_user, confession.type);

    // Generate and schedule remaining comments (ULTRA-FAST engagement)
    const remainingComments = is_real_user ? targetComments - 1 : targetComments;
    const isVideo = confession.type === 'video';

    for (let i = 0; i < remainingComments; i++) {
      const comment = await generateComment(confession.content, confession.type);

      let delaySeconds;
      if (isVideo) {
        // Videos: Comments come in slower (people watch first)
        // 50% in first 5 minutes, 50% in 5-30 minutes
        if (Math.random() < 0.5) {
          delaySeconds = Math.random() * (5 * 60); // 0-5 minutes
        } else {
          delaySeconds = (5 * 60) + (Math.random() * (25 * 60)); // 5-30 minutes
        }
      } else {
        // Text: ULTRA-FAST comments! (20-30 seconds after likes)
        // 70% in first 2 minutes, 30% in 2-10 minutes
        if (Math.random() < 0.7) {
          delaySeconds = Math.random() * (2 * 60); // 0-2 minutes
        } else {
          delaySeconds = (2 * 60) + (Math.random() * (8 * 60)); // 2-10 minutes
        }
      }

      setTimeout(async () => {
        await addComment(supabase, confession_id, comment);
      }, delaySeconds * 1000);
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

Generate a UNIQUE, realistic comment in this style: ${commentStyle}

CRITICAL: Be creative and varied! Avoid generic responses. Each comment should feel different.

Requirements:
- Keep it SHORT (3-25 words max)
- Sound natural and casual
- Use lowercase frequently
- Include emojis sparingly (💀😭😅🤣🙈😬🫣👀🤨)
- Match the style: ${commentStyle}
- BE SPECIFIC and creative, not generic

Examples by style:
SUPPORTIVE: "you're not alone in this", "sending love", "proud of u for sharing", "this takes courage fr"
HARSH: "nah you're wrong for this", "that's messed up ngl", "you should apologize", "this ain't it"
HILARIOUS: "JAIL 😭😭", "not the...", "this is unhinged behavior", "💀💀💀", "the way i gasped"
QUESTIONING: "wait what happened after", "how did they react??", "need an update", "okay but why tho"
RELATABLE: "literally me", "same energy", "felt this", "this is my roman empire"
SHORT: "damn", "yikes", "oof", "valid", "real", "felt", "iconic", "unhinged"
SHOCKED: "WHAT", "no way", "i'm screaming", "my jaw dropped", "excuse me???"
ADVICE: "you should talk to them", "therapy might help", "just apologize already"
STORYTELLING: "this happened to me once...", "my friend did the same thing", "reminds me of when..."
PHILOSOPHICAL: "we all make mistakes", "life is complicated", "nobody's perfect"
ROASTING: "bestie no", "the audacity", "you thought this was okay??", "respectfully, what"
CONSPIRACY: "something doesn't add up", "there's more to this story", "i feel like you're leaving something out"
INVESTED: "i need updates on this", "following for part 2", "this is better than netflix"
DEFENDING: "people are too harsh", "you did what you had to", "i get why you did it"
RED FLAGS: "🚩🚩🚩", "run", "this is toxic behavior", "that's manipulative"
SELF-CENTERED: "this reminds me of MY situation", "i would never", "when this happened to ME..."

Return ONLY the comment text, nothing else.`;
  } else {
    prompt = `Read this anonymous confession: "${secretText}"

Generate a UNIQUE, realistic comment response in this style: ${commentStyle}

CRITICAL: Be creative and varied! Reference specific details from the confession. Avoid generic responses like "this is wild" or "i can't". Each comment should feel different and authentic.

REALISM RULES (CRITICAL - FOLLOW STRICTLY):
- Keep it SHORT (3-30 words max, most should be under 15)
- Use lowercase frequently ("this is wild" not "This Is Wild")
- Include typos/text speak (30% of comments): "ur", "u", "tho", "bc", "rn", "tbh", "ngl", "fr", "w/", "prolly"
- Missing punctuation: no periods, occasional missing apostrophes ("dont", "cant", "im")
- Gen Z slang: "fr", "ngl", "lowkey", "highkey", "deadass", "no cap", "valid", "unhinged", "ate", "slay", "periodt", "bestie", "sis", "fam"
- Common starts: "nah", "wait", "not the", "the way", "help", "bro", "bestie", "okay but", "imagine", "pls", "literally"
- Dramatic punctuation: "...", "???", "!!!", "?!?!"
- Multiple emojis for emphasis: "💀💀💀", "😭😭"
- Include emojis (40% of comments): 💀😭😅🤣🙈😬🫣👀🤨🚩🥴😳🤡
- Reference SPECIFIC details from confession (names, situations, actions)
- Sound like someone typing fast on their phone at 2am
- Vary length: some 3 words, some 20+ words
- Some comments should be just emojis or reactions: "💀💀💀", "WHAT", "nah"

Examples by style:
SUPPORTIVE:
- "you're not alone fr"
- "sending hugs 🫂"
- "proud of u for sharing this"
- "it's gonna be okay"
- "this takes real courage"
- "you deserve better than this"

HARSH/CRITICAL:
- "nah you're wrong for this"
- "that's messed up ngl"
- "you should feel bad about this"
- "this ain't it chief"
- "yikes... not okay"
- "you need to apologize asap"
- "how did u think this was fine"

HILARIOUS/SARCASTIC:
- "JAIL 😭😭😭"
- "not the [something from confession]..."
- "this is unhinged behavior"
- "💀💀💀 i can't"
- "help why did u do this"
- "the audacity"
- "bestie what"
- "the way i GASPED"
- "this is sending me"
- "i'm crying at this"

QUESTIONING:
- "wait what happened after??"
- "how did they react"
- "need an update on this"
- "okay but then what"
- "did u ever tell them"
- "what did they say tho"
- "i need the full story"

RELATABLE:
- "literally me"
- "same thing happened to me"
- "felt this in my soul"
- "this is so real"
- "i've been there"
- "this is my life story"
- "are we the same person"

SHORT REACTIONS:
- "damn"
- "yikes"
- "oof"
- "bruh"
- "valid"
- "real"
- "felt"
- "iconic"
- "unhinged"
- "ate"

SHOCKED/DRAMATIC:
- "WHAT"
- "no way"
- "i'm screaming"
- "my jaw dropped"
- "excuse me???"
- "HELLO???"
- "i'm sorry WHAT"
- "the way my eyes widened"

ADVICE-GIVING:
- "you should talk to them"
- "therapy might help ngl"
- "just apologize already"
- "communication is key here"
- "you need to set boundaries"
- "time to move on fr"

STORYTELLING:
- "this happened to me once and..."
- "my friend did the same thing"
- "reminds me of when i..."
- "i know someone who..."
- "similar situation but..."

PHILOSOPHICAL:
- "we all make mistakes"
- "life is complicated"
- "nobody's perfect"
- "everyone has regrets"
- "it's part of being human"

PLAYFULLY ROASTING:
- "bestie no"
- "the audacity"
- "you thought this was okay??"
- "respectfully, what"
- "not you doing this"
- "the way you really said that"

CONSPIRACY VIBES:
- "something doesn't add up"
- "there's more to this story"
- "i feel like you're leaving something out"
- "this sounds suspicious"
- "what aren't u telling us"

OVERLY INVESTED:
- "i need updates on this"
- "following for part 2"
- "this is better than netflix"
- "i'm too invested now"
- "please post an update"
- "i need to know what happens"

DEFENDING:
- "people are too harsh"
- "you did what you had to"
- "i get why you did it"
- "everyone would do the same"
- "don't listen to the haters"

RED FLAGS:
- "🚩🚩🚩"
- "run"
- "this is toxic behavior"
- "that's manipulative"
- "major red flag"
- "get out of there"

SELF-CENTERED:
- "this reminds me of MY situation"
- "i would never"
- "when this happened to ME..."
- "okay but i did something similar"
- "this is literally about me"

ULTRA-REALISTIC ADDITIONS (use these patterns):
- Keyboard smash: "JDJDJDJD", "SKSKSK", "PLSSS"
- Repeated letters: "omgggg", "yesss", "noooo", "waittt", "bruhhhh"
- All caps reactions: "STOP", "WHAT", "NO", "JAIL", "HELP", "BYE"
- Question combos: "wait what??", "huh???", "excuse me?!?!"
- Laugh typing: "LMAO", "LMFAO", "IM DEAD", "IM CRYING"
- Time references: "at 3am??", "on a tuesday?!", "during work??"
- Age reactions: "at 25??", "you're 19?!", "he's HOW old"
- Money reactions: "for $20??", "$500?!?!", "that much??"
- Specific callbacks: quote exact phrases from confession
- Real talk: "real talk tho", "on god", "i swear", "deadass"
- Disbelief: "aint no way", "you lying", "cap", "fake", "this cant be real"

VARY YOUR RESPONSES (critical for realism):
- 20% should be just 1-3 words: "damn", "yikes", "valid", "💀💀💀"
- 30% should be 4-8 words: "nah this is crazy fr"
- 30% should be 9-15 words: "wait so you really did that and thought it was okay??"
- 20% should be 16-30 words: longer reactions with multiple thoughts

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
          temperature: 1.4,  // Maximum creativity for human-like variety
          maxOutputTokens: 80,
          topP: 0.99,  // Maximum diversity
          topK: 64,  // Maximum variety
          candidateCount: 1
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
    // Most common (40% - supportive/funny/relatable)
    'supportive and empathetic',
    'supportive and empathetic',
    'supportive and empathetic',
    'hilarious and sarcastic',
    'hilarious and sarcastic',
    'hilarious and sarcastic',
    'hilarious and sarcastic',
    'relatable and personal',
    'relatable and personal',
    'relatable and personal',

    // Common (30% - reactions)
    'short reaction (1-3 words)',
    'short reaction (1-3 words)',
    'short reaction (1-3 words)',
    'shocked and dramatic',
    'shocked and dramatic',
    'shocked and dramatic',
    'questioning for more details',
    'questioning for more details',

    // Less common (20% - critical/advice)
    'harsh and critical',
    'harsh and critical',
    'advice-giving',
    'calling out red flags',
    'playfully roasting',

    // Rare (10% - unique styles)
    'storytelling (share similar experience)',
    'philosophical or deep',
    'conspiracy theorist vibes',
    'overly invested in drama',
    'defending the person',
    'making it about themselves',
    'keyboard smash reaction',
    'all caps screaming',
    'disbelief and skepticism',
    'nostalgic and reminiscing',
    'giving tough love',
    'being messy and stirring drama',
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
    .select('likes_count, likes, views, user_id, is_ai_generated')
    .eq('id', confessionId)
    .single();

  const newCount = (confession?.likes_count || 0) + 1;

  // Increase views by 10-20x for each like (simulating people viewing before liking)
  const viewsIncrease = Math.floor(Math.random() * 11) + 10; // 10-20 views per like
  const newViews = (confession?.views || 0) + viewsIncrease;

  await supabase
    .from('confessions')
    .update({
      likes_count: newCount,
      likes: newCount,  // Keep both columns in sync
      views: newViews   // Increase views
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
    .select('user_id, is_ai_generated, views')
    .eq('id', confessionId)
    .single();

  // Increase views by 10-20x for each comment (simulating people viewing before commenting)
  const viewsIncrease = Math.floor(Math.random() * 11) + 10; // 10-20 views per comment
  const newViews = (confession?.views || 0) + viewsIncrease;

  // Update views
  await supabase
    .from('confessions')
    .update({ views: newViews })
    .eq('id', confessionId);

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
  isRealUser: boolean,
  contentType: string = 'text'
): Promise<void> {
  // ULTRA-FAST engagement: Faster than any other platform!
  // Goal: Make users feel INSTANT gratification and attention

  const isVideo = contentType === 'video';

  if (isVideo) {
    // Videos: Slower initial burst (people need time to watch)
    // - 20% in first minute (watching + liking)
    // - 40% in 1-5 minutes (viral discovery)
    // - 30% in 5-30 minutes (trending)
    // - 10% in 30min-2 hours (long tail)

    const batch1Size = Math.floor(targetLikes * 0.20);  // 20% in first minute
    const batch2Size = Math.floor(targetLikes * 0.40);  // 40% in 1-5 min
    const batch3Size = Math.floor(targetLikes * 0.30);  // 30% in 5-30 min
    const batch4Size = targetLikes - batch1Size - batch2Size - batch3Size; // 10% in 30min-2hrs

    for (let i = 0; i < targetLikes; i++) {
      let delay;

      if (i < batch1Size) {
        // First 20% in first minute (watching + liking)
        delay = Math.random() * (60 * 1000);
      } else if (i < batch1Size + batch2Size) {
        // Next 40% in 1-5 minutes (viral discovery)
        delay = (60 * 1000) + (Math.random() * (4 * 60 * 1000));
      } else if (i < batch1Size + batch2Size + batch3Size) {
        // Next 30% in 5-30 minutes (trending)
        delay = (5 * 60 * 1000) + (Math.random() * (25 * 60 * 1000));
      } else {
        // Final 10% in 30min-2 hours (long tail)
        delay = (30 * 60 * 1000) + (Math.random() * (90 * 60 * 1000));
      }

      setTimeout(async () => {
        await addLike(supabase, confessionId);
      }, delay);
    }
  } else {
    // Text: ULTRA-FAST burst! (Faster than TikTok, Instagram, Twitter)
    // Goal: 10-100 likes in first minute!
    // - 50% in first minute (INSTANT attention - 10-100 likes!)
    // - 30% in 1-5 minutes (continued viral growth)
    // - 15% in 5-15 minutes (trending)
    // - 5% in 15min-1 hour (long tail)

    const batch1Size = Math.floor(targetLikes * 0.50);  // 50% in first minute!
    const batch2Size = Math.floor(targetLikes * 0.30);  // 30% in 1-5 min
    const batch3Size = Math.floor(targetLikes * 0.15);  // 15% in 5-15 min
    const batch4Size = targetLikes - batch1Size - batch2Size - batch3Size; // 5% in 15min-1hr

    for (let i = 0; i < targetLikes; i++) {
      let delay;

      if (i < batch1Size) {
        // First 50% in first minute (INSTANT GRATIFICATION!)
        delay = Math.random() * (60 * 1000);
      } else if (i < batch1Size + batch2Size) {
        // Next 30% in 1-5 minutes (continued growth)
        delay = (60 * 1000) + (Math.random() * (4 * 60 * 1000));
      } else if (i < batch1Size + batch2Size + batch3Size) {
        // Next 15% in 5-15 minutes (trending)
        delay = (5 * 60 * 1000) + (Math.random() * (10 * 60 * 1000));
      } else {
        // Final 5% in 15min-1 hour (long tail)
        delay = (15 * 60 * 1000) + (Math.random() * (45 * 60 * 1000));
      }

      setTimeout(async () => {
        await addLike(supabase, confessionId);
      }, delay);
    }
  }
}

