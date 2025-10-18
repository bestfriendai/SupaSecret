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
          temperature: 1.4,  // Maximum creativity for human-like variety
          maxOutputTokens: 350,
          topP: 0.99,  // Maximum diversity
          topK: 64,  // Maximum variety
          candidateCount: 1,
          stopSequences: []
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
- Hashtags: ${config.hashtagCount} (if 0, don't include any. If 1-2, CREATE UNIQUE hashtags based on the specific content of your confession)

IMPORTANT: Do NOT include "Category:", "Toxicity:", or "Hashtags:" labels in your response. Just write the confession naturally.

HASHTAG INSTRUCTIONS (ONLY IF SPECIFIED):
- Most confessions DON'T need hashtags - only add them if it feels natural
- When you do add hashtags, make them feel ORGANIC and CASUAL
- Use lowercase, simple, relatable tags that real people would use
- Avoid overly specific or compound hashtags (no #crushconfession or #pettyrevenge)
- Think like someone casually adding a tag, not trying to be discovered

GOOD NATURAL HASHTAGS (simple, casual, relatable):
- Emotions: #sad #happy #angry #guilty #proud #embarrassed #confused
- Situations: #work #college #party #family #dating #breakup #drama
- Reactions: #oops #yikes #help #ugh #whatever #mood #same
- Relationships: #ex #crush #toxic #single #complicated
- Actions: #cheated #lied #stole #ghosted #blocked #deleted
- Time: #lastnight #today #yesterday #weekend
- Feelings: #regret #noshame #sorry #notsorry #mybad

BAD BOT-LIKE HASHTAGS (avoid these):
- ❌ #crushconfession (too specific/compound)
- ❌ #pettyrevenge (sounds like a category)
- ❌ #datingfails (too Instagram-influencer)
- ❌ #officedrama (too formal)
- ❌ #sorrynotsorry (overused cliché)

EXAMPLES OF NATURAL USAGE:
- "i cheated on my boyfriend last night and i feel terrible #guilty"
- "told my boss what i really think about him #oops"
- "my ex texted me at 3am... i replied #weak"
- "stole my roommate's food again #notsorry"
- "kissed my best friend's crush at the party #drama"
- NO HASHTAG: "i've been lying to my parents about college for 2 years" (most confessions don't need tags!)

CRITICAL REALISM RULES (FOLLOW THESE STRICTLY):

1. LANGUAGE & STYLE:
   - Use casual, conversational language like texting a friend
   - Use contractions: "I'm", "don't", "can't", "won't", "didn't"
   - Use lowercase for emphasis: "i really messed up" or "this is so bad"
   - Include filler words: "like", "literally", "honestly", "basically", "kinda", "sorta"
   - Use "..." for trailing thoughts or dramatic pauses
   - Start sentences with: "so", "like", "honestly", "okay so", "i", "not gonna lie"

2. TYPOS & IMPERFECTIONS (CRITICAL - use 2-4 per confession for realism):
   - Text speak: "ur", "u", "tho", "thru", "rn", "bc", "w/", "tbh", "ngl", "fr", "lowkey", "highkey"
   - Missing apostrophes: "dont", "cant", "im", "didnt", "wasnt", "isnt", "wouldnt", "shouldnt"
   - Missing capitals: start sentences lowercase sometimes
   - Double letters for emphasis: "sooo", "reallly", "omgg", "yesss", "noooo", "wtff"
   - Typos that happen on phone keyboards: "teh" (the), "adn" (and), "hte" (the), "jsut" (just)
   - Run-on sentences without commas
   - Missing periods at the end
   - "alot" instead of "a lot"
   - "prolly" instead of "probably"
   - "gonna", "wanna", "gotta"

3. EMOJIS (use 0-3 per confession, placed naturally):
   - 💀 (dead/dying laughing or embarrassed) - MOST COMMON
   - 😭 (crying/emotional) - VERY COMMON
   - 😅 (nervous laugh)
   - 🤷‍♀️ or 🤷 (shrug/whatever)
   - 🙈 (hiding/embarrassed)
   - 😬 (awkward/cringe)
   - 🥴 (drunk/messy)
   - 😳 (shocked/caught)
   - 🤡 (feeling stupid)
   - 🚩 (red flag)
   - Place naturally MID-SENTENCE, not just at the end
   - Can use multiple of same emoji for emphasis: "💀💀💀"

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
   - Keep them SIMPLE, CASUAL, and LOWERCASE
   - Use single-word tags that feel natural: #guilty #oops #drama #toxic #ex
   - Avoid compound words or overly specific tags
   - Most confessions DON'T need hashtags - only add if it feels organic
   - Use 1 hashtag max (rarely 2)
   - Separate with spaces: "#guilty #oops" not "#guilty#oops"
   - Examples:
     * Cheating story → #guilty or #cheated (NOT #cheatingconfession)
     * Work story → #work or #boss (NOT #officedrama)
     * Ex story → #ex or #toxic (NOT #exboyfriend)
     * Party story → #lastnight or #oops (NOT #partyregrets)

8. WHAT TO AVOID:
   - NO quotation marks around the confession
   - NO formal language or proper grammar
   - NO preachy tone or life advice
   - NO overly dramatic or fake-sounding stories
   - NO perfect punctuation (occasional missing periods is fine)
   - NO hashtags in the middle of text

9. AUTHENTICITY MARKERS (CRITICAL FOR REALISM):
   - Admit uncertainty: "i think", "maybe", "idk", "not sure", "kinda", "sorta"
   - Show emotion: "i feel terrible", "im so embarrassed", "this is eating me up", "im freaking out"
   - Be specific with details: exact ages (23, 19, 26), timeframes (last tuesday, 3 months ago), relationships (coworker, roommate's bf)
   - Include internal conflict: "i know its wrong but...", "part of me feels bad but...", "i shouldnt have but..."
   - Time references: "last night", "yesterday", "last week", "a few months ago", "back in college", "when i was 19"
   - Real-world details: specific places (starbucks, target, the gym), apps (tinder, snapchat, instagram), situations (zoom call, group chat)
   - Relationship specifics: "my bf of 2 years", "this girl from work", "my roommate's friend", "my ex from high school"
   - Money amounts: "$20", "$500", "like $100"
   - Quantities: "3 times", "every day for a week", "twice"

10. EXAMPLES OF REALISTIC OPENINGS:
    - "okay so i need to confess something..."
    - "i did something really bad and..."
    - "not gonna lie, i..."
    - "so this happened last night and..."
    - "i feel terrible about this but..."
    - "honestly i dont even feel bad about..."
    - "this is gonna sound bad but..."
    - "throwaway bc people know my main but..."
    - "idk if this makes me a bad person but..."
    - "been holding this in for months..."

11. ULTRA-REALISTIC PATTERNS (use these to seem 100% human):
    - Start mid-thought: "so basically what happened was..."
    - Self-awareness: "i know this sounds fake but i swear its real"
    - Defensive: "before yall judge me...", "dont come for me but..."
    - Seeking validation: "am i the asshole here?", "tell me im not crazy"
    - Time stamps: "this was like 2am", "happened on a tuesday", "back in march"
    - Specific ages: "when i was 22", "hes 26", "shes 19"
    - Platform references: "saw on his instagram", "she posted on her story", "found his tinder"
    - Real situations: "during a zoom meeting", "at target", "in the uber", "at the gym"
    - Consequences: "now everyone knows", "she found out", "got fired", "we broke up"
    - Current status: "we're still together", "havent talked since", "blocked me", "still friends somehow"

12. VARY YOUR STYLE (don't follow a formula):
    - Some confessions are one long paragraph
    - Some have short sentences. Like this. For impact.
    - Some ramble and go on and on without much structure just typing whatever comes to mind
    - Some are super short and direct
    - Mix it up constantly - no two confessions should feel the same

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

  // Only 30% chance of having hashtags (most posts don't have them)
  let hashtagCount = 0;
  const rand = Math.random();
  if (rand < 0.3) {
    // 70% chance of 1 hashtag, 30% chance of 2 hashtags
    hashtagCount = Math.random() > 0.7 ? 2 : 1;
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

