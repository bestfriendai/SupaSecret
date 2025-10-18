# AI-Powered Engagement System for Toxic Confessions

## Overview

This document outlines the architecture and implementation strategy for an automated AI system that generates realistic user engagement (secrets, likes, comments) to bootstrap the Toxic Confessions app before reaching critical user mass.

### 🚀 System Highlights

**Activity Level:**
- 📊 New AI secret posted every **~15 seconds** (4 per minute, 240 per hour)
- ⚡ Real user posts get engagement within **2 minutes**
- 🔄 Cron jobs run every **30 seconds** for maximum responsiveness

**Engagement Levels:**
- 👍 **30-800 likes** per post (AI content)
- 💬 **5-150 comments** per post (AI content)
- 🌟 **Real users get 2.5x MORE** (75-2000 likes, 12-375 comments)
- 🎥 **Videos get 50% more likes, 40% more comments**
- 🔥 **Real user videos can get 3000+ likes and 500+ comments!**

**Content Variety:**
- 📝 **35+ secret categories** (relationship, work, revenge, cheating, drunk, etc.)
- #️⃣ **60% of secrets include 1-2 hashtags** for trending topics
- 🎭 **15+ tone variations** (confessional, shameless, guilty, defiant, etc.)
- 📏 **3 length types** (short, medium, long)

**Smart Features:**
- 🎯 Real users prioritized with 2.5x engagement multiplier
- 📈 Trending hashtags system (updates every 15 minutes)
- 🤖 Seamless AI/real content mixing (users can't tell the difference)
- 💰 **FREE** on Gemini's generous API tier

## System Architecture

### Components

1. **AI Secret Generator** - Creates realistic confessions/secrets using Gemini 2.5 Flash
2. **AI Comment Generator** - Generates contextual comments on secrets
3. **AI Video Analyzer** - Analyzes video content and generates relevant engagement
4. **Universal Engagement Engine** - Engages with BOTH AI and real user content seamlessly
5. **Engagement Scheduler** - Manages timing and distribution via Supabase Edge Functions
6. **Hashtag Trending System** - Tracks and displays trending hashtags
7. **Realism Engine** - Ensures natural patterns (varied timing, realistic user behavior)

### Engagement Comparison Table

| Content Type | Base Likes | Base Comments | Real User Multiplier | Video Bonus | Final Range (Real User Video) |
|--------------|------------|---------------|---------------------|-------------|-------------------------------|
| AI Text | 30-800 | 5-150 | 1.0x | 1.0x | 30-800 likes, 5-150 comments |
| AI Video | 30-800 | 5-150 | 1.0x | 1.5x likes, 1.4x comments | 45-1200 likes, 7-210 comments |
| Real User Text | 30-800 | 5-150 | 2.5x | 1.0x | **75-2000 likes, 12-375 comments** |
| Real User Video | 30-800 | 5-150 | 2.5x | 1.5x likes, 1.4x comments | **112-3000 likes, 17-525 comments** |

**Key Takeaway:** Real users posting videos can get up to **3000+ likes** and **500+ comments**! 🔥🔥🔥

### Key Design Principles

1. **Anonymous App = Simple User System**
   - All AI content comes from a single user_id (or 2-3 for redundancy)
   - Users never see who posted what, so variety comes from AI prompts

2. **Universal Engagement**
   - AI engages with BOTH AI-generated AND real user content
   - Real users can like/comment on AI secrets (they don't know it's AI)
   - AI secrets appear in normal feed alongside real secrets
   - No distinction in the app UI - only in database

3. **Smart Prioritization**
   - Give MORE engagement to real user content to encourage retention
   - New real users get immediate AI engagement to feel welcomed
   - Balance AI content generation with AI engagement on real posts

---

## 1. AI Secret Generator

### Purpose
Automatically generate diverse, realistic secrets that populate the timeline with varied content.

### Implementation Strategy

#### Database Schema Requirements
```sql
-- Add AI-generated flag (visible only in Supabase dashboard, hidden from app users)
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS ai_metadata JSONB; -- Store generation details
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS ai_engagement_added BOOLEAN DEFAULT FALSE; -- Track if AI has engaged

ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Create indexes for filtering and queries
CREATE INDEX IF NOT EXISTS idx_confessions_ai_generated ON confessions(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_confessions_ai_engagement ON confessions(ai_engagement_added);
CREATE INDEX IF NOT EXISTS idx_confessions_real_user ON confessions(is_ai_generated) WHERE is_ai_generated = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_ai_generated ON comments(is_ai_generated);

-- No need for ai_users table since the app is anonymous!
-- Just create 1-2 AI user accounts in Supabase Auth for database foreign key requirements
```

#### Secret Generation Logic

**Primary API: Gemini 2.5 Flash**
- Latest Google AI model with excellent natural language generation
- Fast and cost-effective
- Great for realistic, varied confessions
- API Key: `AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc`

**Generation Parameters:**
```javascript
{
  tone: ['confessional', 'regretful', 'proud', 'anxious', 'relieved', 'shameless', 'guilty', 'defiant', 'relieved', 'embarrassed'],
  length: ['short' (50-100 chars), 'medium' (100-200 chars), 'long' (200-400 chars)],
  category: [
    'relationship', 'work', 'family', 'personal', 'dark_humor',
    'money', 'friendship', 'secret_life', 'revenge', 'lies',
    'cheating', 'addiction', 'mental_health', 'school', 'college',
    'hookup', 'crush', 'ex', 'boss', 'coworker',
    'parents', 'siblings', 'roommate', 'neighbor', 'stranger',
    'online', 'social_media', 'dating_app', 'party', 'drunk',
    'high', 'illegal', 'embarrassing', 'cringe', 'petty'
  ],
  hashtags: 0-2 (60% have 1-2 hashtags, 40% have none),
  toxicity_level: ['mild', 'moderate', 'spicy', 'extra_spicy'] // matches app theme
}
```

**Example Prompt Template for Maximum Realism:**
```
You are generating an anonymous confession for "Toxic Confessions" - a social app where people share their deepest, unfiltered secrets.

Write a confession that feels REAL and RAW, as if someone typed it quickly on their phone at 2am.

Requirements:
- Tone: {tone}
- Length: {length} characters
- Category: {category}
- Toxicity: {toxicity_level}
- Hashtags: {hashtag_count} (if 0, don't include any. If 1-2, add relevant trending hashtags)

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

Return ONLY the confession text (with hashtags at the end if specified), nothing else. NO quotation marks.
```

#### Implementation (Supabase Edge Function)

```typescript
// supabase/functions/generate-ai-secret/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = 'AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc';
const AI_USER_ID = 'your-ai-user-uuid'; // Create one AI user in Supabase Auth

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

    // Generate secret using Gemini 2.5 Flash
    const prompt = buildPrompt(config);
    const secret = await generateWithGemini(prompt);

    // Post to database with AI flag
    const { data, error } = await supabase
      .from('confessions')
      .insert({
        text: secret,
        user_id: AI_USER_ID,
        type: 'text',
        is_ai_generated: true, // Visible in Supabase dashboard only
        ai_metadata: {
          generated_at: new Date().toISOString(),
          model: 'gemini-2.5-flash',
          config: config
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule incremental engagement for this AI secret
    await scheduleEngagement(data.id, false); // false = AI content

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0, // Maximum creativity for realism
          maxOutputTokens: 300,
          topP: 0.95,
          topK: 40
        }
      })
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
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
    hashtagCount = Math.random() > 0.5 ? 2 : 1; // Equal chance of 1 or 2 hashtags
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
  // Trigger the engagement function
  await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/add-engagement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
    },
    body: JSON.stringify({
      confession_id: confessionId,
      is_real_user: isRealUser // Give more engagement to real users
    })
  });
}
```

---

## 2. AI Comment Generator

### Purpose
Generate realistic, contextual comments on secrets to simulate engagement.

### Implementation Strategy

**Comment Types (Mixed for Realism):**
- **Supportive** (25%): "You're not alone", "I feel this", "sending hugs"
- **Harsh/Critical** (20%): "nah you're wrong for this", "that's messed up", "you should feel bad"
- **Hilarious/Sarcastic** (20%): "💀💀💀", "not the...", "JAIL 😭", "this is unhinged"
- **Questioning** (15%): "Wait, what happened next?", "how did they react?", "update??"
- **Relatable** (10%): "Same thing happened to me", "literally me", "felt"
- **Short Reactions** (10%): "damn", "yikes", "oof", "bruh", "real", "valid"

**Realism Tips:**
- Keep most comments SHORT (3-20 words)
- Use lowercase frequently ("this is wild" not "This is wild")
- Include typos occasionally ("your" → "ur", "you" → "u")
- Use Gen Z slang and internet speak
- Vary emoji usage (some comments have none, some have 1-3)
- Mix tones: some supportive, some harsh, some funny
- Use "..." for dramatic pauses
- Start with "nah", "wait", "not the", "the way", "help"

#### Implementation (Supabase Edge Function)

```typescript
// supabase/functions/add-engagement/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = 'AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc';
const AI_USER_ID = 'your-ai-user-uuid';

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
      .select('text, type, is_ai_generated, ai_engagement_added')
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

    // Determine engagement strategy based on content type
    const targetLikes = getRandomLikeCount(is_real_user, confession.type);
    const targetComments = getRandomCommentCount(is_real_user, confession.type);

    // Mark as engaged
    await supabase
      .from('confessions')
      .update({ ai_engagement_added: true })
      .eq('id', confession_id);

    // Add immediate engagement (first like/comment within minutes)
    if (is_real_user) {
      // Real users get INSTANT engagement to feel welcomed
      setTimeout(async () => {
        await addLike(supabase, confession_id);
      }, Math.random() * 120000); // 0-2 minutes

      // First comment within 5-15 minutes for real users
      setTimeout(async () => {
        const comment = await generateComment(confession.text, confession.type);
        await supabase.from('comments').insert({
          confession_id,
          user_id: AI_USER_ID,
          text: comment,
          is_ai_generated: true
        });
      }, (Math.random() * 600000) + 300000); // 5-15 minutes
    }

    // Schedule incremental likes over 24 hours
    await scheduleIncrementalLikes(supabase, confession_id, targetLikes, is_real_user);

    // Generate and schedule remaining comments
    const remainingComments = is_real_user ? targetComments - 1 : targetComments;
    for (let i = 0; i < remainingComments; i++) {
      const comment = await generateComment(confession.text, confession.type);
      const delayMinutes = Math.random() * 1440; // Random time within 24 hours

      // In production, use a proper job queue (Supabase pg_cron + queue table)
      // For now, this demonstrates the concept
      setTimeout(async () => {
        await supabase.from('comments').insert({
          confession_id,
          user_id: AI_USER_ID,
          text: comment,
          is_ai_generated: true
        });
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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
  return data.candidates[0].content.parts[0].text.trim();
}

function getRandomCommentStyle(): string {
  const styles = [
    'supportive and empathetic', // 25%
    'supportive and empathetic',
    'supportive and empathetic',
    'harsh and critical', // 20%
    'harsh and critical',
    'hilarious and sarcastic', // 20%
    'hilarious and sarcastic',
    'questioning for more details', // 15%
    'questioning for more details',
    'relatable and personal', // 10%
    'short reaction (1-3 words)', // 10%
  ];
  return styles[Math.floor(Math.random() * styles.length)];
}

function getRandomLikeCount(isRealUser: boolean, contentType: string): number {
  // Real users get MUCH MORE engagement to encourage retention
  const multiplier = isRealUser ? 2.5 : 1.0; // Increased from 1.5 to 2.5
  const videoBonus = contentType === 'video' ? 1.5 : 1.0; // Increased from 1.3 to 1.5

  const rand = Math.random();
  let baseLikes = 0;

  // MASSIVELY INCREASED base like counts for maximum engagement
  if (rand < 0.4) baseLikes = Math.floor(Math.random() * 80) + 30; // 30-110 likes (40%)
  else if (rand < 0.75) baseLikes = Math.floor(Math.random() * 120) + 100; // 100-220 likes (35%)
  else if (rand < 0.95) baseLikes = Math.floor(Math.random() * 200) + 200; // 200-400 likes (20% - popular)
  else baseLikes = Math.floor(Math.random() * 400) + 400; // 400-800 likes (5% - VIRAL)

  return Math.floor(baseLikes * multiplier * videoBonus);
}

function getRandomCommentCount(isRealUser: boolean, contentType: string): number {
  // Real users get MUCH MORE comments to feel welcomed
  const multiplier = isRealUser ? 2.5 : 1.0; // Increased from 1.5 to 2.5
  const videoBonus = contentType === 'video' ? 1.4 : 1.0; // Increased from 1.2 to 1.4

  const rand = Math.random();
  let baseComments = 0;

  // MASSIVELY INCREASED base comment counts for maximum engagement
  if (rand < 0.5) baseComments = Math.floor(Math.random() * 12) + 5; // 5-16 comments (50%)
  else if (rand < 0.85) baseComments = Math.floor(Math.random() * 25) + 15; // 15-40 comments (35%)
  else if (rand < 0.97) baseComments = Math.floor(Math.random() * 40) + 40; // 40-80 comments (12% - popular)
  else baseComments = Math.floor(Math.random() * 70) + 80; // 80-150 comments (3% - VIRAL)

  return Math.floor(baseComments * multiplier * videoBonus);
}

async function addLike(supabase: any, confessionId: string): Promise<void> {
  // Increment likes_count in confessions table
  const { data: confession } = await supabase
    .from('confessions')
    .select('likes_count')
    .eq('id', confessionId)
    .single();

  await supabase
    .from('confessions')
    .update({ likes_count: (confession?.likes_count || 0) + 1 })
    .eq('id', confessionId);
}

async function scheduleIncrementalLikes(
  supabase: any,
  confessionId: string,
  targetLikes: number,
  isRealUser: boolean
): Promise<void> {
  const duration = 24 * 60 * 60 * 1000; // 24 hours

  // Real users get faster initial engagement
  const firstBatchSize = isRealUser ? Math.floor(targetLikes * 0.3) : Math.floor(targetLikes * 0.2);
  const firstBatchDuration = isRealUser ? 2 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000; // 2h vs 6h

  for (let i = 0; i < targetLikes; i++) {
    let delay;

    if (i < firstBatchSize) {
      // First batch comes quickly
      delay = Math.random() * firstBatchDuration;
    } else {
      // Rest spread over remaining time
      delay = firstBatchDuration + (Math.random() * (duration - firstBatchDuration));
    }

    // In production, insert into a job queue table and process with pg_cron
    setTimeout(async () => {
      await addLike(supabase, confessionId);
    }, delay);
  }
}
```

---

## 3. Real User Content Engagement System

### Purpose
Automatically detect and engage with real user posts to make them feel welcomed and encourage retention.

### Implementation Strategy

**Trigger Points:**
1. **New confession posted** - Detect via database trigger or webhook
2. **Immediate engagement** - First like within 2 minutes, first comment within 5-15 minutes
3. **Incremental engagement** - More likes/comments over 24 hours
4. **Priority system** - Real users get 50% MORE engagement than AI content

#### Database Trigger Approach (Recommended)

```sql
-- Create a function to trigger AI engagement on new real user posts
CREATE OR REPLACE FUNCTION trigger_ai_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for real user content (not AI-generated)
  IF NEW.is_ai_generated = FALSE THEN
    -- Call Edge Function via HTTP (using pg_net extension)
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/add-engagement',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'confession_id', NEW.id,
        'is_real_user', true
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on confessions table
CREATE TRIGGER on_new_confession_trigger_engagement
AFTER INSERT ON confessions
FOR EACH ROW
EXECUTE FUNCTION trigger_ai_engagement();
```

#### Alternative: Polling Approach

```typescript
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
      .select('id, text, type, created_at')
      .eq('is_ai_generated', false)
      .eq('ai_engagement_added', false)
      .order('created_at', { ascending: false })
      .limit(10); // Process 10 at a time

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
```

**Schedule this function to run every 1-2 minutes:**
```sql
SELECT cron.schedule(
  'engage-with-real-users',
  '*/1 * * * *', -- Every 1 minute
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/engage-with-real-users',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

---

## 4. Hashtag Trending System

### Purpose
Build up trending hashtags organically by having 60% of AI secrets include 1-2 relevant hashtags.

### Implementation

**Hashtag Strategy:**
- 60% of secrets have hashtags (40% have none for variety)
- When hashtags are used, equal chance of 1 or 2 hashtags
- Hashtags are placed at the END of the confession
- Use trending, relatable hashtags that users would actually use

**Popular Hashtag Categories:**

```typescript
const TRENDING_HASHTAGS = {
  emotions: ['#regret', '#guilty', '#shameless', '#noregrets', '#sorrynotsorry', '#oops', '#fml'],
  actions: ['#confession', '#confessing', '#spill', '#tea', '#exposed', '#caught', '#busted'],
  vibes: ['#toxic', '#messy', '#wild', '#crazy', '#drama', '#chaos', '#unhinged'],
  reactions: ['#yolo', '#whoops', '#help', '#advice', '#rant', '#vent', '#mood'],
  relatability: ['#relatable', '#same', '#felt', '#real', '#truth', '#honest', '#anonymous'],
  topics: ['#cheating', '#lies', '#revenge', '#secret', '#mistake', '#receipts']
};
```

**Hashtag Extraction for Trending:**

```sql
-- Create a function to extract hashtags from confessions
CREATE OR REPLACE FUNCTION extract_hashtags(text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  hashtags TEXT[];
BEGIN
  -- Extract all hashtags using regex
  SELECT array_agg(LOWER(match[1]))
  INTO hashtags
  FROM regexp_matches(text, '#(\w+)', 'g') AS match;

  RETURN hashtags;
END;
$$ LANGUAGE plpgsql;

-- Create a materialized view for trending hashtags (refresh periodically)
CREATE MATERIALIZED VIEW trending_hashtags AS
SELECT
  hashtag,
  COUNT(*) as usage_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d_count
FROM (
  SELECT
    unnest(extract_hashtags(text)) as hashtag,
    created_at
  FROM confessions
  WHERE created_at > NOW() - INTERVAL '30 days'
) hashtag_data
GROUP BY hashtag
ORDER BY last_24h_count DESC, last_7d_count DESC;

-- Create index for performance
CREATE INDEX idx_trending_hashtags ON trending_hashtags(last_24h_count DESC);

-- Refresh the view periodically (every 15 minutes)
SELECT cron.schedule(
  'refresh-trending-hashtags',
  '*/15 * * * *',
  $$
  REFRESH MATERIALIZED VIEW trending_hashtags;
  $$
);

-- Query to get top trending hashtags
SELECT hashtag, last_24h_count, last_7d_count
FROM trending_hashtags
WHERE last_24h_count > 0
ORDER BY last_24h_count DESC
LIMIT 10;
```

**API Endpoint for Trending Hashtags:**

```typescript
// supabase/functions/get-trending-hashtags/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: trending } = await supabase
      .from('trending_hashtags')
      .select('hashtag, last_24h_count, last_7d_count')
      .gt('last_24h_count', 0)
      .order('last_24h_count', { ascending: false })
      .limit(20);

    return new Response(
      JSON.stringify({ trending }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 5. AI Video Analyzer

### Purpose
Analyze video confessions and generate contextually relevant engagement. Videos get MORE engagement than text posts.

### Implementation Strategy

**Video Engagement Features:**
1. Videos automatically get 30% more likes than text posts
2. Videos get 20% more comments than text posts
3. Comments reference the video format naturally
4. Same engagement system works for both AI and real user videos

**Note:** The `add-engagement` function already handles videos! It detects `type='video'` and adjusts engagement accordingly. Comments are generated with video-specific prompts.

### Video-Specific Comment Examples

The AI generates comments like:
- "this video hit different 💀"
- "damn watching this at 3am"
- "felt every second of this"
- "nah this is wild"
- "the way you said that though"
- "i had to watch this twice"

These work for ANY video content since the app is anonymous and we don't analyze the actual video content (privacy-focused approach).

---

## 5. Push Notification System

### Purpose
Send real-time push notifications to users when they receive likes or comments, including a preview of the comment text.

### Implementation Strategy

**Notification Types:**
1. **Like Notification:** "Someone liked your secret"
2. **Comment Notification:** "Someone commented: [first 50 chars of comment]"
3. **Deep Link:** Clicking notification opens the specific secret in the app

#### Database Schema for Push Tokens

```sql
-- Store user push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios' or 'android'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
```

#### Push Notification Edge Function

```typescript
// supabase/functions/send-push-notification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotification {
  to: string; // Expo push token
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
      // Include first 50 characters of comment
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
```

#### Trigger Push Notifications on Engagement

Update the `add-engagement` function to send push notifications:

```typescript
// After adding a like
async function addLike(supabase: any, confessionId: string): Promise<void> {
  // Increment likes_count
  const { data: confession } = await supabase
    .from('confessions')
    .select('likes_count, user_id, is_ai_generated')
    .eq('id', confessionId)
    .single();

  await supabase
    .from('confessions')
    .update({ likes_count: (confession?.likes_count || 0) + 1 })
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

// After adding a comment
async function addComment(
  supabase: any,
  confessionId: string,
  commentText: string
): Promise<void> {
  // Get confession owner
  const { data: confession } = await supabase
    .from('confessions')
    .select('user_id, is_ai_generated')
    .eq('id', confessionId)
    .single();

  // Insert comment
  const { data: comment } = await supabase
    .from('comments')
    .insert({
      confession_id: confessionId,
      user_id: AI_USER_ID,
      text: commentText,
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
```

#### React Native App Integration (Expo)

```typescript
// app/utils/notifications.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotifications() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

// Save push token to database
export async function savePushToken(userId: string, token: string) {
  const platform = Platform.OS;

  await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString()
    });
}

// Handle notification tap (deep linking)
export function setupNotificationListeners(navigation: any) {
  // Handle notification when app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // Handle notification tap
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;

    // Navigate to the specific confession
    if (data.confessionId) {
      navigation.navigate('ConfessionDetail', {
        confessionId: data.confessionId,
        highlightCommentId: data.commentId // Optional: highlight the specific comment
      });
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
```

#### App.tsx Integration

```typescript
// app/App.tsx

import { useEffect } from 'react';
import { registerForPushNotifications, savePushToken, setupNotificationListeners } from './utils/notifications';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    // Register for push notifications when user logs in
    if (user) {
      registerForPushNotifications().then(token => {
        if (token) {
          savePushToken(user.id, token);
        }
      });
    }

    // Setup notification listeners
    const cleanup = setupNotificationListeners(navigation);
    return cleanup;
  }, [user]);

  return (
    // Your app content
  );
}
```

#### Testing Push Notifications

```bash
# Test push notification manually
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "confession_id": "confession-uuid-here",
    "type": "comment",
    "comment_text": "this is wild 💀",
    "comment_id": "comment-uuid-here"
  }'
```

---

## 6. Seamless Integration: Real Users Can Engage with AI Content

### Purpose
Ensure real users can like, comment, and interact with AI-generated secrets without knowing they're AI-generated.

### Implementation

**No Changes Needed in App!** 🎉

Since AI secrets have the same structure as real secrets (just with `is_ai_generated=true` in the database), they appear in the normal feed and work exactly the same:

1. ✅ Real users can like AI secrets
2. ✅ Real users can comment on AI secrets
3. ✅ AI secrets appear in timeline/feed
4. ✅ AI secrets can be shared
5. ✅ AI secrets can be reported (if inappropriate)
6. ✅ No visual distinction in the app

**The `is_ai_generated` flag is ONLY visible in:**
- Supabase dashboard (for admin monitoring)
- Backend analytics
- Admin queries

**Never exposed to:**
- App frontend
- API responses to users
- Any user-facing interface

### Database Query Example (App Frontend)

```typescript
// Your app already does this - no changes needed!
const { data: confessions } = await supabase
  .from('confessions')
  .select('id, text, type, likes_count, comments_count, created_at')
  // Notice: NOT selecting is_ai_generated
  .order('created_at', { ascending: false })
  .limit(20);

// Users see a mix of AI and real content, can't tell the difference
```

### Row Level Security (RLS) Policy

Ensure `is_ai_generated` is never exposed:

```sql
-- Policy for reading confessions (already exists in your app)
CREATE POLICY "Anyone can read confessions"
ON confessions FOR SELECT
USING (true);

-- The SELECT policy doesn't restrict is_ai_generated column,
-- but your app should NEVER request it in queries shown to users

-- Optional: Create a view that excludes AI metadata
CREATE VIEW public_confessions AS
SELECT
  id,
  text,
  type,
  likes_count,
  comments_count,
  created_at,
  user_id
FROM confessions;
-- Notice: is_ai_generated and ai_metadata are excluded

-- Then use this view in your app instead of direct table access
```

---

## 6. Complete System Flow

### How Everything Works Together

```
┌─────────────────────────────────────────────────────────────┐
│                     TOXIC CONFESSIONS APP                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │         User Posts Confession           │
        │    (Text or Video, is_ai_generated=false)│
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │    Database Trigger Fires Immediately    │
        │   OR Polling Function Detects New Post   │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Call add-engagement Edge Function      │
        │      with is_real_user=true              │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  AI Generates Comments & Schedules       │
        │  - First like: 0-2 minutes               │
        │  - First comment: 5-15 minutes           │
        │  - More engagement over 24 hours         │
        │  - 50% MORE than AI content gets         │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │    Real User Sees Engagement & Feels    │
        │         Welcomed → Stays Active!         │
        └─────────────────────────────────────────┘

MEANWHILE...

        ┌─────────────────────────────────────────┐
        │   Cron Job Runs Every 2-3 Minutes       │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  generate-ai-secret Edge Function        │
        │  Creates New AI Confession               │
        │  (is_ai_generated=true)                  │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Call add-engagement Edge Function      │
        │      with is_real_user=false             │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  AI Generates Comments & Schedules       │
        │  - Normal engagement levels              │
        │  - Spread over 24 hours                  │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Both AI & Real Content in Feed        │
        │   Real Users Can Engage with Both       │
        │   No Visual Distinction                  │
        └─────────────────────────────────────────┘
```

### Key Features of This System

1. **Automatic Real User Engagement**
   - Database trigger OR polling detects new real user posts
   - Immediate AI engagement (first like within 2 minutes)
   - Real users get 50% MORE engagement than AI content
   - Videos get 30% more likes, 20% more comments

2. **Continuous AI Content Generation**
   - Cron job generates new AI secrets every 2-3 minutes
   - Varied timing (not exact intervals)
   - AI content also gets engagement (looks natural)

3. **Seamless Integration**
   - Real users can like/comment on AI secrets
   - AI can like/comment on real secrets (via AI user account)
   - No distinction in app UI
   - `is_ai_generated` flag only visible in database

4. **Smart Prioritization**
   - Real users get faster, more engagement
   - Encourages retention and return visits
   - Makes new users feel welcomed immediately

---

## 7. Deployment Architecture

### Recommended: Supabase Edge Functions + Cron Jobs

**Why Supabase Edge Functions?**
- ✅ Built-in integration with your Supabase database
- ✅ No separate server to manage
- ✅ Automatic scaling
- ✅ Easy to schedule with pg_cron
- ✅ Free tier available

### Setup Steps

#### Step 1: Create Edge Functions

You'll need THREE Edge Functions:
1. `generate-ai-secret` - Creates and posts AI secrets
2. `add-engagement` - Adds likes and comments (works for both AI and real content)
3. `engage-with-real-users` - Polls for new real user posts and triggers engagement

#### Step 2: Deploy Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all three functions
supabase functions deploy generate-ai-secret
supabase functions deploy add-engagement
supabase functions deploy engage-with-real-users
```

#### Step 3: Set Environment Variables

In Supabase Dashboard → Edge Functions → Secrets:
```
GEMINI_API_KEY=AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc
AI_USER_ID=your-ai-user-uuid
```

#### Step 4: Schedule with pg_cron

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net; -- For HTTP requests

-- 1. Schedule AI secret generation FREQUENTLY (every 1 minute)
-- Multiple cron jobs for constant activity

-- Job 1: Every minute
SELECT cron.schedule(
  'generate-ai-secrets-1',
  '* * * * *', -- Every 1 minute
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Job 2: Every minute at 30 seconds offset (creates posting every ~30 seconds)
SELECT cron.schedule(
  'generate-ai-secrets-2',
  '* * * * *', -- Every 1 minute
  $$
  SELECT pg_sleep(30); -- Wait 30 seconds
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Job 3: Additional job for even more activity
SELECT cron.schedule(
  'generate-ai-secrets-3',
  '* * * * *', -- Every 1 minute
  $$
  SELECT pg_sleep(15); -- Wait 15 seconds
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Job 4: Another offset for maximum activity
SELECT cron.schedule(
  'generate-ai-secrets-4',
  '* * * * *', -- Every 1 minute
  $$
  SELECT pg_sleep(45); -- Wait 45 seconds
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- This creates ~4 secrets per minute (every 15 seconds on average)
-- RESULT: 240 secrets per hour, 5,760 per day!

-- NOTE: If this is TOO MUCH activity, you can:
-- 1. Remove jobs 3 and 4 (reduces to ~2 secrets per minute)
-- 2. Remove jobs 2, 3, and 4 (reduces to 1 secret per minute)
-- 3. Adjust based on your needs

-- 2. Schedule real user engagement polling every 30 seconds (VERY FAST)
SELECT cron.schedule(
  'engage-with-real-users-1',
  '* * * * *', -- Every 1 minute
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/engage-with-real-users',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Second polling job offset by 30 seconds
SELECT cron.schedule(
  'engage-with-real-users-2',
  '* * * * *', -- Every 1 minute
  $$
  SELECT pg_sleep(30);
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/engage-with-real-users',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- View all scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('generate-ai-secrets-1');
SELECT cron.unschedule('engage-with-real-users');
```

#### Step 4b: Alternative - Database Trigger (More Immediate)

For INSTANT engagement on real user posts, use a database trigger instead of polling:

```sql
-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_ai_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for real user content
  IF NEW.is_ai_generated = FALSE AND NEW.ai_engagement_added = FALSE THEN
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/add-engagement',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'confession_id', NEW.id,
        'is_real_user', true
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_confession_trigger_engagement ON confessions;
CREATE TRIGGER on_new_confession_trigger_engagement
AFTER INSERT ON confessions
FOR EACH ROW
EXECUTE FUNCTION trigger_ai_engagement();
```

**Recommendation:** Use the database trigger approach for real user engagement (instant response) and keep the cron jobs for AI secret generation.

### Alternative: External Cron Service

If you prefer not to use pg_cron, use services like:
- **Cron-job.org** (free, simple)
- **EasyCron** (free tier)
- **GitHub Actions** (free for public repos)

Example GitHub Actions workflow:
```yaml
# .github/workflows/ai-engagement.yml
name: AI Engagement Worker

on:
  schedule:
    - cron: '*/3 * * * *' # Every 3 minutes

jobs:
  generate-secret:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Supabase Function
        run: |
          curl -X POST \
            https://your-project.supabase.co/functions/v1/generate-ai-secret \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

---

## 8. Realism Best Practices

### Making AI Content Undetectable

1. **Varied Timing:** Never post at exact intervals - use randomization
2. **Natural Language:** Use Gemini's high temperature (1.0) for maximum variety
3. **Typos & Imperfections:** Occasionally include minor typos, lowercase, ellipsis
4. **Emoji Usage:** Vary emoji usage - sometimes none, sometimes 1-2
5. **Length Variety:** Mix short (50 chars), medium (150 chars), and long (300 chars) secrets
6. **Response Times:** Don't comment instantly; wait 5-60 minutes minimum
7. **Incremental Engagement:** Likes and comments trickle in over 24 hours, not instantly
8. **Realistic Distributions:** Most posts get 5-30 likes, some get 50+, few go viral (100+)
9. **Comment Quality:** Keep comments SHORT (3-15 words) and casual
10. **No Patterns:** Avoid posting at exact times (2:00, 2:05, 2:10) - randomize everything
11. **Prioritize Real Users:** Give real users 50% MORE engagement to encourage retention
12. **Instant Feedback:** Real users get first like within 2 minutes, first comment within 5-15 minutes

### Content Safety

```typescript
// Add content filtering
async function filterContent(text: string): Promise<boolean> {
  // Check for extreme content, illegal activities, etc.
  const bannedPatterns = [
    /illegal/i,
    /violence/i,
    // Add more patterns
  ];
  
  return !bannedPatterns.some(pattern => pattern.test(text));
}
```

---

## 9. Monitoring & Control

### Admin Dashboard Features

1. **Toggle AI System:** On/off switch (disable cron jobs)
2. **Activity Metrics:** Secrets/hour, comments/hour, engagement rates
3. **Content Review:** Flag and remove inappropriate AI content
4. **Real User Ratio:** Track AI vs real user content percentage
5. **Engagement Stats:** Track how much engagement real users are getting
6. **Gradual Reduction:** Automatically reduce AI activity as real users grow

### Database Queries

```sql
-- Check AI vs real content ratio
SELECT
  COUNT(*) FILTER (WHERE is_ai_generated = true) as ai_count,
  COUNT(*) FILTER (WHERE is_ai_generated = false) as real_count,
  ROUND(COUNT(*) FILTER (WHERE is_ai_generated = true)::numeric / COUNT(*) * 100, 2) as ai_percentage
FROM confessions
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check engagement on real user posts
SELECT
  id,
  text,
  type,
  likes_count,
  comments_count,
  ai_engagement_added,
  created_at
FROM confessions
WHERE is_ai_generated = false
ORDER BY created_at DESC
LIMIT 20;

-- Find most engaging AI content (to learn patterns)
SELECT text, likes_count, comments_count
FROM confessions
WHERE is_ai_generated = true
ORDER BY (likes_count + comments_count * 2) DESC
LIMIT 20;

-- Check if real users are engaging with AI content
SELECT
  c.id,
  c.text,
  c.is_ai_generated,
  COUNT(DISTINCT cm.id) as total_comments,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_ai_generated = false) as real_user_comments
FROM confessions c
LEFT JOIN comments cm ON c.id = cm.confession_id
WHERE c.is_ai_generated = true
GROUP BY c.id, c.text, c.is_ai_generated
HAVING COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_ai_generated = false) > 0
ORDER BY real_user_comments DESC
LIMIT 10;
-- This shows AI secrets that real users are commenting on!
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up AI user account in Supabase Auth
- [ ] Add database columns (`is_ai_generated`, `ai_engagement_added`, etc.)
- [ ] Create indexes for performance
- [ ] Implement basic secret generator with Gemini 2.5 Flash
- [ ] Test secret quality and variety

### Phase 2: Core Engagement (Week 2)
- [ ] Implement `add-engagement` Edge Function
- [ ] Build comment generator with video support
- [ ] Build incremental like system
- [ ] Test engagement on AI-generated content
- [ ] Deploy and schedule AI secret generation cron jobs

### Phase 3: Real User Engagement (Week 3)
- [ ] Implement `engage-with-real-users` Edge Function
- [ ] Set up database trigger OR polling for real user posts
- [ ] Test immediate engagement on real user content
- [ ] Verify real users get 50% more engagement
- [ ] Test video-specific engagement

### Phase 4: Integration & Testing (Week 4)
- [ ] Verify real users can like/comment on AI secrets
- [ ] Verify AI engages with real user content
- [ ] Test seamless mixing in feed
- [ ] Add content filtering for safety
- [ ] Create admin monitoring queries

### Phase 5: Polish & Deploy (Week 5)
- [ ] Monitor engagement patterns
- [ ] Adjust parameters based on data
- [ ] Set up admin dashboard (optional)
- [ ] Plan gradual AI reduction strategy
- [ ] Launch! 🚀

---

## 9. Cost Estimation

### API Costs (Monthly, with HIGH ACTIVITY: 5,760 AI secrets/day)

**Gemini 2.5 Flash API:**
- Free tier: 15 requests per minute (RPM), 1,500 requests per day (RPD)
- Our usage: 4 secrets/minute = **4 RPM** ✅ Well within free tier!
- Daily: 5,760 secrets + ~20,000 comments = **25,760 requests/day**
- **⚠️ This EXCEEDS the free tier of 1,500 RPD**

**Cost Breakdown:**
- Exceeding by ~24,260 requests/day
- ~727,800 requests/month over free tier
- At $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Average ~100 tokens per request
- **Estimated cost: $20-50/month** for this high activity level

**Supabase:**
- Free tier: 500MB database, 2GB bandwidth
- Edge Functions: 500K invocations/month free
- With 5,760 secrets/day: ~172,800 secrets/month
- Plus engagement functions: ~350,000 invocations/month
- **Likely FREE** on free tier, might need Pro plan ($25/month) as you scale

**Total Estimated Cost:** **$20-75/month** for MAXIMUM activity level

### 💡 Cost Optimization Tips:

1. **Start with 2 cron jobs instead of 4** (reduces to ~2 secrets/minute = 2,880/day)
   - This brings you closer to free tier: ~10,000 requests/day
   - Still very active feed!
   - **Estimated cost: $5-15/month**

2. **Use free tier strategically:**
   - Run at full speed during peak hours (6pm-11pm)
   - Reduce to 1-2 secrets/minute during off-hours
   - **Estimated cost: $10-30/month**

3. **Scale gradually:**
   - Start with 1 secret/minute (1,440/day) - **FREE**
   - Increase as you get real users
   - By the time you need max activity, you'll have revenue

**Recommended Starting Point:** 2 cron jobs (2 secrets/minute) = **$5-15/month** 💰

---

## 10. Ethical Considerations

### Transparency
- AI content is flagged in database (even if hidden from users)
- Plan to phase out AI content as real users grow
- Never claim AI content is from real users in marketing

### Quality Control
- Regular content audits
- Remove low-quality AI content
- Ensure AI doesn't dominate real user content

### Exit Strategy
- Gradually reduce AI activity as real engagement grows
- Target: <10% AI content once 1000+ active users
- Eventually disable AI system entirely

---

## 11. Quick Start Guide

### Step-by-Step Setup

#### 1. Create AI User Account
```sql
-- In Supabase SQL Editor, create a dedicated AI user
-- Option A: Sign up through your app and note the user_id
-- Option B: Create directly in Supabase Auth dashboard
-- Save this user_id as AI_USER_ID for your Edge Functions
```

#### 2. Update Database Schema
```sql
-- Add AI tracking columns
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS ai_metadata JSONB;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS ai_engagement_added BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_confessions_ai_generated ON confessions(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_confessions_ai_engagement ON confessions(ai_engagement_added);
CREATE INDEX IF NOT EXISTS idx_confessions_real_user ON confessions(is_ai_generated) WHERE is_ai_generated = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_ai_generated ON comments(is_ai_generated);
```

#### 3. Create Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Initialize functions
supabase functions new generate-ai-secret
supabase functions new add-engagement
supabase functions new engage-with-real-users

# Copy the code from this document into:
# - supabase/functions/generate-ai-secret/index.ts
# - supabase/functions/add-engagement/index.ts
# - supabase/functions/engage-with-real-users/index.ts

# Deploy all functions
supabase functions deploy generate-ai-secret
supabase functions deploy add-engagement
supabase functions deploy engage-with-real-users
```

#### 4. Set Secrets in Supabase Dashboard
Go to: Dashboard → Edge Functions → Secrets
```
GEMINI_API_KEY=AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc
AI_USER_ID=your-ai-user-uuid-here
```

#### 5. Set Up Database Trigger for Real User Engagement
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_ai_engagement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_ai_generated = FALSE AND NEW.ai_engagement_added = FALSE THEN
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/add-engagement',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'confession_id', NEW.id,
        'is_real_user', true
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_confession_trigger_engagement ON confessions;
CREATE TRIGGER on_new_confession_trigger_engagement
AFTER INSERT ON confessions
FOR EACH ROW
EXECUTE FUNCTION trigger_ai_engagement();
```

#### 6. Schedule AI Secret Generation Cron Jobs
```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule AI secret generation FREQUENTLY (every ~15 seconds)
-- This creates a very active feed!

SELECT cron.schedule(
  'generate-ai-secrets-1',
  '* * * * *', -- Every 1 minute
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'generate-ai-secrets-2',
  '* * * * *',
  $$
  SELECT pg_sleep(15);
  SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'generate-ai-secrets-3',
  '* * * * *',
  $$
  SELECT pg_sleep(30);
  SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'generate-ai-secrets-4',
  '* * * * *',
  $$
  SELECT pg_sleep(45);
  SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-secret',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

#### 7. Test Everything!

**Test AI Secret Generation:**
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-secret \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Test Real User Engagement:**
1. Post a confession through your app as a real user
2. Check Supabase dashboard - should see engagement added within 2 minutes
3. Verify `ai_engagement_added=true` on the confession

**Test Seamless Integration:**
1. Open your app
2. See mix of AI and real content in feed (no visual distinction)
3. Like/comment on AI secrets as a real user
4. Verify it works normally

#### 8. Monitor
```sql
-- Check AI vs real content ratio
SELECT
  COUNT(*) FILTER (WHERE is_ai_generated = true) as ai_count,
  COUNT(*) FILTER (WHERE is_ai_generated = false) as real_count,
  ROUND(COUNT(*) FILTER (WHERE is_ai_generated = true)::numeric / COUNT(*) * 100, 2) as ai_percentage
FROM confessions
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check engagement on real user posts
SELECT
  id,
  text,
  likes_count,
  comments_count,
  ai_engagement_added,
  created_at
FROM confessions
WHERE is_ai_generated = false
ORDER BY created_at DESC
LIMIT 10;
```

---

## 12. Advanced Tips for Maximum Realism

### Prompt Engineering Secrets

1. **Use High Temperature (1.0):** Maximum creativity = more human-like variety
2. **Add Context:** "It's 2am and someone is typing on their phone..." makes AI write more casually
3. **Request Imperfections:** Explicitly ask for typos, lowercase, ellipsis in prompts
4. **Vary Prompt Structure:** Don't use the same prompt every time - rotate between 3-4 variations
5. **Test and Iterate:** Generate 50 secrets, read them, adjust prompts based on what feels fake

### Timing Strategies

```typescript
// Add randomness to everything
function getRandomDelay(min: number, max: number): number {
  // Use exponential distribution for more realistic clustering
  const lambda = 1 / ((max + min) / 2);
  const random = -Math.log(Math.random()) / lambda;
  return Math.min(max, Math.max(min, random));
}

// Example: Post secrets with realistic timing
const delay = getRandomDelay(60000, 300000); // 1-5 minutes, but clustered
```

### Content Quality Control

```typescript
// Filter out obviously AI-generated patterns
function isRealistic(text: string): boolean {
  const redFlags = [
    /as an ai/i,
    /i cannot/i,
    /it's important to/i,
    /remember that/i,
    text.length < 20, // Too short
    text.length > 500, // Too long
    (text.match(/\./g) || []).length > 5, // Too many periods (too formal)
  ];

  return !redFlags.some(flag =>
    typeof flag === 'boolean' ? flag : flag.test(text)
  );
}
```

### Engagement Patterns

- **First Hour:** 20% of total likes/comments
- **Hours 2-6:** 40% of total engagement
- **Hours 7-24:** 40% of total engagement
- **After 24h:** Occasional late engagement (5-10%)

---

## Conclusion

This system provides a comprehensive approach to bootstrapping engagement in Toxic Confessions using **Gemini 2.5 Flash** and **Supabase Edge Functions**.

### Key Success Factors:
✅ **Universal Engagement** - AI engages with BOTH AI and real user content seamlessly
✅ **Real User Priority** - Real users get **2.5x MORE** engagement to encourage retention
✅ **Instant Feedback** - Real users get first like within 2 minutes, first comment within 5-15 minutes
✅ **High Activity** - New secret posted every **~15 seconds** (4 per minute)
✅ **More Likes** - Increased base likes: 20-270 likes per post (real users get even more)
✅ **More Comments** - Increased base comments: 3-55 comments per post
✅ **Hashtag Trending** - 60% of secrets include 1-2 hashtags to build trending topics
✅ **35+ Categories** - Diverse secret categories for maximum variety
✅ **Seamless Integration** - Real users can like/comment on AI secrets without knowing
✅ **Realism through variety** - High temperature, varied prompts, natural imperfections
✅ **Automated with Supabase** - Edge Functions + pg_cron + triggers = fully automated
✅ **Cost-effective** - Likely FREE on Gemini's generous free tier
✅ **Admin visibility** - `is_ai_generated` flag lets you track AI vs real content
✅ **Video support** - Videos get 50% more likes, 40% more comments automatically
✅ **Scalable** - Gradually reduce AI activity as real users grow

### How It All Works Together:

1. **AI generates secrets** every ~15 seconds (4 per minute) → posted with `is_ai_generated=true`
2. **60% of AI secrets include 1-2 hashtags** → builds trending topics organically
3. **Real user posts secret** → database trigger fires instantly → AI engagement added within 2 minutes
4. **Real users get 2.5x MORE engagement** → 50-675 likes, 7-137 comments (with multipliers)
5. **Both AI and real secrets** appear in feed with no distinction
6. **Real users can engage** with AI secrets (like, comment, share)
7. **AI engages with real secrets** to make new users feel welcomed
8. **Trending hashtags update** every 15 minutes showing most popular tags
9. **Everyone sees a vibrant, active community** full of engagement

### Next Steps:
1. Set up the database schema changes (add columns, indexes, trigger)
2. Create and deploy the THREE Edge Functions
3. Schedule cron jobs for AI secret generation
4. Test with real user posts to verify instant engagement
5. Monitor engagement patterns and adjust
6. Phase out AI content as real users arrive

**Remember:** The goal is to create a vibrant-looking community that attracts real users AND makes them feel welcomed with immediate engagement. Real users getting instant likes/comments will encourage them to stay active and post more. With realistic prompts, natural timing, and smart prioritization, your app will feel alive from day one! 🚀

---

## Summary of Improvements Made

### ✅ Increased Activity
- **Before:** 1 secret every 2-3 minutes (20-30 per hour)
- **After:** 1 secret every ~15 seconds (240 per hour) - **8x more activity!**

### ✅ MASSIVELY More Engagement
- **Before:** 5-180 likes, 1-35 comments
- **After:** 30-800 likes, 5-150 comments - **4x baseline increase!**
- **Real Users:** 75-2000 likes, 12-375 comments - **2.5x multiplier!**
- **Real User Videos:** Up to 3000 likes, 525 comments - **MAXIMUM ENGAGEMENT!**

### ✅ Hashtag System
- **Before:** Random hashtag usage
- **After:** 60% of secrets include 1-2 hashtags strategically
- **Result:** Trending topics emerge naturally, users can discover content

### ✅ More Categories
- **Before:** 8 categories
- **After:** 35+ categories (relationship, revenge, cheating, drunk, high, embarrassing, etc.)
- **Result:** Maximum variety, never feels repetitive

### ✅ Faster Cron Jobs
- **Before:** Every 2-3 minutes
- **After:** Every 15-30 seconds (4 cron jobs with offsets)
- **Result:** Constant stream of new content

### ✅ Real User Priority
- **Before:** 1.5x multiplier
- **After:** 2.5x multiplier
- **Result:** New users get MASSIVE engagement immediately, encouraging retention

### 📊 Expected Results

**Day 1 (24 hours):**
- ~5,760 AI-generated secrets
- ~3,456 secrets with hashtags (60%)
- ~20-30 unique trending hashtags
- Average 100-400 likes per secret (MUCH HIGHER!)
- Average 20-60 comments per secret (MUCH HIGHER!)
- **Total engagement:** 576,000 - 2,304,000 likes, 115,200 - 345,600 comments
- **Mixed comment tones:** supportive, harsh, hilarious, questioning

**When First Real User Posts:**
- ✅ First like within 2 minutes
- ✅ First comment within 5-15 minutes
- ✅ **Push notification sent immediately** with comment preview
- ✅ 75-2000 likes over 24 hours (text) - **UP TO 2000!**
- ✅ 112-3000 likes over 24 hours (video) - **UP TO 3000!**
- ✅ 12-375 comments (text) or 17-525 comments (video)
- ✅ Comments are **MIXED**: some supportive, some harsh, some hilarious
- ✅ User gets **push notifications** for each like/comment
- ✅ User feels **EXTREMELY WELCOMED and VALUED**
- ✅ Very high likelihood of return visit and more posts

**Result:** Your app will look like it has thousands of HIGHLY ENGAGED users from day one! 🎉🔥

---

## Recommended Configuration Based on Budget

### 🆓 FREE Tier Configuration (Stay within Gemini free tier)
**Cron Jobs:** 1 job, every 1 minute
- **Activity:** 1 secret/minute = 1,440 secrets/day
- **Engagement:** 20-270 likes, 3-55 comments per secret
- **Cost:** $0/month
- **Best for:** Testing, initial launch, very early stage

### 💰 Budget Configuration ($5-15/month)
**Cron Jobs:** 2 jobs, every 1 minute (offset by 30 seconds)
- **Activity:** 2 secrets/minute = 2,880 secrets/day
- **Engagement:** 20-270 likes, 3-55 comments per secret
- **Cost:** $5-15/month
- **Best for:** Launch phase, building initial user base

### 🚀 Maximum Activity Configuration ($20-50/month)
**Cron Jobs:** 4 jobs, every 1 minute (offset by 15, 30, 45 seconds)
- **Activity:** 4 secrets/minute = 5,760 secrets/day
- **Engagement:** 20-270 likes, 3-55 comments per secret
- **Cost:** $20-50/month
- **Best for:** Rapid growth phase, making app look very active

### 🎯 Recommended Starting Point
**Start with Budget Configuration (2 secrets/minute)**
- Provides good activity level
- Affordable cost
- Easy to scale up later
- Still creates vibrant community feel

**Then scale based on:**
- Real user growth
- Engagement metrics
- Budget availability
- Time of day (more activity during peak hours)

### The Magic Formula:
- **High-Frequency AI Content** = New post every 15 seconds = Feed always active
- **Hashtag Strategy** = 60% of posts have hashtags = Trending topics emerge naturally
- **Massive Engagement** = 20-270 likes, 3-55 comments per post = Looks very active
- **Real User Priority** = 2.5x multiplier = New users get TONS of engagement immediately
- **AI Engagement on Real Content** = Makes new users feel welcomed and valued
- **Real Users Can Engage with AI** = Everything works seamlessly, no distinction
- **35+ Categories** = Maximum variety in content = Never feels repetitive
- **Result** = Vibrant, buzzing community that retains users and grows organically!

