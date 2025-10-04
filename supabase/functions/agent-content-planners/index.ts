import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agent 3: Specialized Content Planners (The Creative Departments)
 * Model: gemini-2.0-flash
 * Role: Generate draft-level creative assets in parallel
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_2_output } = await req.json();

    // Run all three planners in parallel
    const [copywriting, socialMedia, visuals] = await Promise.all([
      runCopywritingPlanner(agent_2_output),
      runSocialMediaPlanner(agent_2_output),
      runVisualsPlanner(agent_2_output),
    ]);

    const result = {
      copy_drafts: copywriting,
      social_drafts: socialMedia,
      visual_concept_draft: visuals,
    };

    console.log('Content Plans Generated');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-content-planners:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function runCopywritingPlanner(strategicBrief: any) {
  const systemPrompt = `You are the Copywriting Planner. Focus on voice, tone, and persuasion.
Create 3 headline options, 2 body paragraph options, and 3 CTA variations.
Return ONLY valid JSON with:
{
  "headline_options": ["...", "...", "..."],
  "body_paragraph_options": ["...", "..."],
  "cta_variations": ["...", "...", "..."]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Strategic Brief:\n${JSON.stringify(strategicBrief, null, 2)}` }
      ],
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

async function runSocialMediaPlanner(strategicBrief: any) {
  const systemPrompt = `You are the Social Media Planner. Focus on platform-specific formats and engagement.
Create Instagram caption, Facebook post, hashtag strategy, and story idea.
Return ONLY valid JSON with:
{
  "instagram_caption": "...",
  "facebook_post": "...",
  "hashtag_strategy": {
    "core": ["...", "..."],
    "niche": ["...", "..."],
    "local": ["..."]
  },
  "story_idea": "..."
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Strategic Brief:\n${JSON.stringify(strategicBrief, null, 2)}` }
      ],
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

async function runVisualsPlanner(strategicBrief: any) {
  const systemPrompt = `You are the Visuals Planner. Translate strategy into visual concepts.
Return ONLY valid JSON with:
{
  "mood": "...",
  "core_concept": "...",
  "key_visual_elements": ["...", "...", "..."],
  "compositional_notes": "..."
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Strategic Brief:\n${JSON.stringify(strategicBrief, null, 2)}` }
      ],
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}
