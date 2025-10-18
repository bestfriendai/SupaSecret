// supabase/functions/generate-ai-secret/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc';
const AI_USER_ID = Deno.env.get('AI_USER_ID') || 'd2352851-cde9-43b6-9d33-9ac4b2ecc67a';

interface SecretConfig {
  tone: string;
  length: 'short' | 'medium' | 'long';
  category: string;
  hashtagCount: number;
  toxicityLevel: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate random config for variety
    const config = getRandomConfig();

    // Generate secret using Gemini 2.0 Flash
    const prompt = buildPrompt(config);
    const secret = await generateWithGemini(prompt);

    // Post to database with AI flag
    const { data, error } = await supabase
      .from('confessions')
      .insert({
        content: secret,
        user_id: AI_USER_ID,
        type: 'text',
        is_ai_generated: true,
        ai_metadata: {
          generated_at: new Date().toISOString(),
          model: 'gemini-2.0-flash-exp',
          config: config
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule incremental engagement for this AI secret
    await scheduleEngagement(data.id, false);

    return new Response(
      JSON.stringify({ success: true, confession_id: data.id }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function generateWithGemini(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 300,
          topP: 0.95,
          topK: 40
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

function buildPrompt(config: SecretConfig): string {
  const lengthMap = {
    short: '50-100',
    medium: '100-200',
    long: '200-400'
  };

  return `You are generating an anonymous confession for "Toxic Confessions" - a social app where people share their deepest, unfiltered secrets.

Write a confession that feels REAL and RAW, as if someone typed it quickly on their phone at 2am.

Requirements:
- Tone: ${config.tone}
- Length: ${lengthMap[config.length]} characters
- Category: ${config.category}
- Toxicity: ${config.toxicityLevel}
- Hashtags: ${config.hashtagCount} (if 0, don't include any. If 1-2, add relevant trending hashtags)

IMPORTANT: Do NOT include "Category:", "Toxicity:", or "Hashtags:" labels in your response. Just write the confession naturally.

HASHTAG EXAMPLES (use these types, make them relevant):
#toxic #regret #confession #guilty #shameless #revenge #cheating #lies #drama #messy #wild #crazy #oops #yolo #noregrets #sorrynotsorry #truth #real #exposed #secret #anonymous #confessing #spill #tea #receipts #caught #busted #mistake #whoops #fml #help

CRITICAL REALISM RULES (FOLLOW THESE STRICTLY):

1. LANGUAGE & STYLE:
   - Use casual, conversational language like texting a friend
   - Use contractions: "I'm", "don't", "can't", "won't", "didn't"
   - Use lowercase for emphasis: "i really messed up" or "this is so bad"
   - Include filler words: "like", "literally", "honestly", "basically", "kinda", "sorta"
   - Use "..." for trailing thoughts or dramatic pauses
   - Start sentences with: "so", "like", "honestly", "okay so", "i", "not gonna lie"

2. TYPOS & IMPERFECTIONS (use sparingly, 1-2 per confession):
   - "ur" instead of "your"
   - "u" instead of "you"
   - "tho" instead of "though"
   - "thru" instead of "through"
   - "rn" instead of "right now"
   - "bc" instead of "because"
   - Missing apostrophes: "dont", "cant", "im"
   - Double letters for emphasis: "sooo", "reallly", "omgg"

3. EMOJIS (use sparingly, 0-2 per confession):
   - 💀 (dead/dying laughing or embarrassed)
   - 😭 (crying/emotional)
   - 😅 (nervous laugh)
   - 🤷‍♀️ (shrug/whatever)
   - 🙈 (hiding/embarrassed)
   - 😬 (awkward/cringe)
   - Place naturally in the text, not at the end

4. SENTENCE STRUCTURE:
   - Vary length: mix short punchy sentences with longer rambling ones
   - Use run-on sentences occasionally (real people don't always use perfect grammar)
   - Fragment sentences for emphasis: "And yeah. That happened."
   - Ask rhetorical questions: "like what was i thinking?", "why did i do that?"

5. TONE VARIETY:
   - Confessional: "i need to get this off my chest..."
   - Regretful: "i feel so bad about this but..."
   - Shameless: "not even sorry tbh"
   - Anxious: "okay so this is eating me alive..."
   - Defiant: "judge me all you want but..."
   - Relieved: "finally telling someone about this..."

6. STORYTELLING:
   - Sometimes give context: "so this happened last week..."
   - Sometimes dive right in: "i cheated on my boyfriend"
   - End with a question or reflection: "am i wrong for this?", "idk what to do now"
   - Leave some things vague/mysterious (builds intrigue)

7. HASHTAGS (if specified):
   - Put at the VERY END after the confession
   - Make them relevant to the content
   - Use 1-2 max, never more
   - Separate with spaces: "#toxic #regret" not "#toxic#regret"

8. WHAT TO AVOID:
   - NO quotation marks around the confession
   - NO formal language or proper grammar
   - NO preachy tone or life advice
   - NO overly dramatic or fake-sounding stories
   - NO perfect punctuation (occasional missing periods is fine)
   - NO hashtags in the middle of text

9. AUTHENTICITY MARKERS:
   - Admit uncertainty: "i think", "maybe", "idk"
   - Show emotion: "i feel terrible", "im so embarrassed", "this is eating me up"
   - Be specific with details: ages, timeframes, relationships
   - Include internal conflict: "i know its wrong but...", "part of me feels bad but..."

10. EXAMPLES OF REALISTIC OPENINGS:
    - "okay so i need to confess something..."
    - "i did something really bad and..."
    - "not gonna lie, i..."
    - "so this happened last night and..."
    - "i feel terrible about this but..."
    - "honestly i dont even feel bad about..."
    - "this is gonna sound bad but..."

Return ONLY the confession text (with hashtags at the end if specified), nothing else. NO quotation marks.`;
}

function getRandomConfig(): SecretConfig {
  const tones = [
    'confessional', 'regretful', 'proud', 'anxious', 'relieved',
    'shameless', 'guilty', 'defiant', 'embarrassed', 'excited',
    'angry', 'sad', 'happy', 'scared', 'confused'
  ];

  const lengths = ['short', 'medium', 'long'] as const;

  const categories = [
    'relationship', 'work', 'family', 'personal', 'dark_humor',
    'money', 'friendship', 'secret_life', 'revenge', 'lies',
    'cheating', 'addiction', 'mental_health', 'school', 'college',
    'hookup', 'crush', 'ex', 'boss', 'coworker',
    'parents', 'siblings', 'roommate', 'neighbor', 'stranger',
    'online', 'social_media', 'dating_app', 'party', 'drunk',
    'high', 'illegal', 'embarrassing', 'cringe', 'petty'
  ];

  const toxicityLevels = ['mild', 'moderate', 'spicy', 'extra_spicy'];

  // 60% chance of having 1-2 hashtags
  let hashtagCount = 0;
  const rand = Math.random();
  if (rand < 0.6) {
    hashtagCount = Math.random() > 0.5 ? 2 : 1;
  }

  return {
    tone: tones[Math.floor(Math.random() * tones.length)],
    length: lengths[Math.floor(Math.random() * lengths.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    hashtagCount,
    toxicityLevel: toxicityLevels[Math.floor(Math.random() * toxicityLevels.length)]
  };
}

async function scheduleEngagement(confessionId: string, isRealUser: boolean): Promise<void> {
  await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/add-engagement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
    },
    body: JSON.stringify({
      confession_id: confessionId,
      is_real_user: isRealUser
    })
  });
}

